/**
 * Regression coverage for the TUI zoom-into-running-agent view.
 *
 * Uses the same direct-prototype-call style as interactive-mode-suspend.test.ts:
 * we don't boot a real `InteractiveMode` (that requires a TUI, terminal, and
 * runtime host). Instead, we call the zoom methods against a hand-built
 * `this` context wired with a real `Container` from pi-tui and the real
 * `LocalAgentTask` + task-message buffer, so the assertions exercise the
 * actual production code paths.
 */

import { Container } from "@earendil-works/pi-tui";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import {
	attachAgentRecentRunController,
	clearAgentRecentRunsForTests,
	finishAgentRecentRun,
	startAgentRecentRun,
} from "../src/core/agents/status.ts";
import type { AgentRunDetails } from "../src/core/agents/types.ts";
import {
	appendTaskMessage,
	clearTaskMessagesForTests,
	getTaskMessages,
	LocalAgentTask,
} from "../src/core/tasks/index.ts";
import { ZoomedTaskComponent } from "../src/modes/interactive/components/zoomed-task.ts";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";

type ZoomContext = {
	zoomedTaskId: string | undefined;
	zoomedComponent: ZoomedTaskComponent | undefined;
	preZoomChatChildren: unknown[];
	zoomAutoPopTimer: ReturnType<typeof setTimeout> | undefined;
	unsubscribeZoomStatus: undefined | (() => void);
	chatContainer: Container;
	footer: { invalidate(): void };
	ui: { requestRender(): void };
	showWarning(message: string): void;
	warnings: string[];
	// Stubs needed by makeZoomedSessionConfig (added in Phase 2b).
	hideThinkingBlock: boolean;
	sessionManager: { getCwd(): string };
	settingsManager: { getShowImages(): boolean; getImageWidthCells(): number };
	getMarkdownThemeWithSettings(): object;
};

const proto = InteractiveMode.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

function makeContext(): ZoomContext {
	const ctx = makeRawContext();
	// Set the prototype so internal `this.scheduleZoomTerminalCheck()` and
	// friends resolve through the real InteractiveMode prototype chain.
	Object.setPrototypeOf(ctx, InteractiveMode.prototype);
	return ctx;
}

function makeRawContext(): ZoomContext {
	const chatContainer = new Container();
	// Pre-zoom children: a stand-in for normal chat scrollback.
	chatContainer.addChild(new Container());
	chatContainer.addChild(new Container());
	const ctx: ZoomContext = {
		zoomedTaskId: undefined,
		zoomedComponent: undefined,
		preZoomChatChildren: [],
		zoomAutoPopTimer: undefined,
		unsubscribeZoomStatus: undefined,
		chatContainer,
		footer: { invalidate: vi.fn() },
		ui: { requestRender: vi.fn() },
		warnings: [],
		showWarning(message: string) {
			this.warnings.push(message);
		},
		// Phase 2b stubs for makeZoomedSessionConfig
		hideThinkingBlock: false,
		sessionManager: { getCwd: () => "/tmp" },
		settingsManager: { getShowImages: () => false, getImageWidthCells: () => 60 },
		getMarkdownThemeWithSettings: () => ({}),
	};
	return ctx;
}

function startRun(taskLabel: string) {
	return startAgentRecentRun("single", [{ agent: "scout", task: taskLabel }], { background: true });
}

function makeRunDetails(status: AgentRunDetails["status"] = "completed"): AgentRunDetails {
	return {
		agent: "scout",
		source: "builtin",
		task: "x",
		status,
		context: {
			mode: "default",
			includeTranscript: false,
			includeProjectContext: true,
			includeSkills: true,
			includeAppendSystemPrompt: true,
		},
		effectiveTools: [],
		deniedTools: [],
		durationMs: 1,
		toolCallCount: 0,
		messageCount: 1,
		recentToolCalls: [],
		recentOutputSnippets: [],
		loadedSkills: [],
		invokedSkills: { count: 0, names: [] },
		sessionId: "s",
	};
}

describe("InteractiveMode zoom-into-running-agent", () => {
	beforeAll(() => {
		initTheme("dark", false);
	});
	beforeEach(() => {
		clearAgentRecentRunsForTests();
		clearTaskMessagesForTests();
	});
	afterEach(() => {
		clearAgentRecentRunsForTests();
		clearTaskMessagesForTests();
		vi.useRealTimers();
	});

	test("enterZoomFromHotkey warns and no-ops when no running tasks", () => {
		const ctx = makeContext();
		proto.enterZoomFromHotkey.call(ctx);
		expect(ctx.warnings).toEqual(["No running background agent to zoom into."]);
		expect(ctx.zoomedTaskId).toBeUndefined();
	});

	test("enterZoom swaps chatContainer children for a ZoomedTaskComponent", () => {
		const ctx = makeContext();
		const run = startRun("a");
		const originalChildren = [...ctx.chatContainer.children];

		proto.enterZoom.call(ctx, run.id);

		expect(ctx.zoomedTaskId).toBe(run.id);
		expect(ctx.zoomedComponent).toBeInstanceOf(ZoomedTaskComponent);
		expect(ctx.chatContainer.children).toEqual([ctx.zoomedComponent]);
		expect(ctx.preZoomChatChildren).toEqual(originalChildren);
	});

	test("injectIntoZoomedTask appends user_injected immediately and calls LocalAgentTask.injectMessage", async () => {
		const ctx = makeContext();
		const run = startRun("a");
		// Provide a controller so interrupt+resume can run. We don't actually
		// need a working resume here — injectMessage only needs interrupt to
		// succeed before resume returns a benign failure. The point of the
		// test is to verify the user_injected event lands immediately so the
		// UI shows it before the child agent picks it up.
		const interrupt = vi.fn(async () => undefined);
		const resume = vi.fn(async () => undefined);
		attachAgentRecentRunController(run.id, { interrupt, resume });
		proto.enterZoom.call(ctx, run.id);

		await (proto.injectIntoZoomedTask.call(ctx, "please refocus on auth.ts") as Promise<void>);

		const events = getTaskMessages(run.id);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ kind: "user_injected", text: "please refocus on auth.ts" });
		expect(interrupt).toHaveBeenCalledTimes(1);
		// resume is invoked by LocalAgentTask.injectMessage once the run is
		// "interrupted" and resumable; the resumable check fails here because
		// there is no real session path. That is fine — the contract this
		// test guards is "user_injected event lands immediately".
	});

	test("exitZoom disposes the zoomed component and restores the pre-zoom children", () => {
		const ctx = makeContext();
		const run = startRun("a");
		const originalChildren = [...ctx.chatContainer.children];
		proto.enterZoom.call(ctx, run.id);
		expect(ctx.chatContainer.children).not.toEqual(originalChildren);

		proto.exitZoom.call(ctx);

		expect(ctx.zoomedTaskId).toBeUndefined();
		expect(ctx.zoomedComponent).toBeUndefined();
		expect(ctx.chatContainer.children).toEqual(originalChildren);
	});

	test("cycleZoom('next') swaps to the next running task and reuses the chatContainer slot", async () => {
		const ctx = makeContext();
		const a = startRun("a");
		await new Promise((resolve) => setTimeout(resolve, 4));
		const b = startRun("b");

		proto.enterZoom.call(ctx, a.id);
		proto.cycleZoom.call(ctx, "next");

		expect(ctx.zoomedTaskId).toBe(b.id);
		// Still exactly one child in chatContainer (the new zoom component).
		expect(ctx.chatContainer.children).toHaveLength(1);
		expect(ctx.chatContainer.children[0]).toBe(ctx.zoomedComponent);
	});

	test("scheduleZoomTerminalCheck auto-pops after STOPPED_DISPLAY_MS on terminal status", () => {
		vi.useFakeTimers();
		const ctx = makeContext();
		const run = startRun("a");
		proto.enterZoom.call(ctx, run.id);

		// Drive the run to terminal.
		finishAgentRecentRun(run, { mode: "single", status: "completed", runs: [makeRunDetails("completed")] });
		// subscribeAgentRecentRuns inside enterZoom notifies → scheduleZoomTerminalCheck
		// fires synchronously, arming the timer. Step time forward past the threshold.
		expect(ctx.zoomAutoPopTimer).toBeDefined();
		vi.advanceTimersByTime(3001);

		expect(ctx.zoomedTaskId).toBeUndefined();
		expect(ctx.zoomedComponent).toBeUndefined();
	});

	test("ZoomedTaskComponent renders the buffered tail and re-renders on appendTaskMessage", async () => {
		const run = startRun("a");
		const fakeUi = { requestRender: vi.fn() };
		const component = new ZoomedTaskComponent(
			run.id,
			fakeUi as unknown as ConstructorParameters<typeof ZoomedTaskComponent>[1],
		);
		try {
			// Initial render: no events yet → shows the placeholder text.
			const before = component.render(80).join("\n");
			expect(before).toContain("Zoom \u203a");
			expect(before).toContain("waiting");

			appendTaskMessage(run.id, { kind: "tool_start", ts: 1, toolName: "read", argsPreview: "src/foo.ts" });
			appendTaskMessage(run.id, { kind: "tool_end", ts: 2, toolName: "read" });
			appendTaskMessage(run.id, { kind: "assistant_text", ts: 3, text: "Hello from child" });
			appendTaskMessage(run.id, { kind: "user_injected", ts: 4, text: "go faster" });

			// Subscription notifications are coalesced via queueMicrotask for
			// perf; flush before asserting on rendered output.
			await Promise.resolve();
			await Promise.resolve();

			const after = component.render(80).join("\n");
			expect(after).toContain("read");
			expect(after).toContain("Hello from child");
			expect(after).toContain("go faster");
		} finally {
			component.dispose();
		}
	});

	test("LocalAgentTask verbs are reachable from runZoomedTaskVerb", async () => {
		const ctx = makeContext();
		const run = startRun("a");
		const cancel = vi.fn(async () => undefined);
		const interrupt = vi.fn(async () => undefined);
		attachAgentRecentRunController(run.id, { cancel, interrupt });
		proto.enterZoom.call(ctx, run.id);

		await (proto.runZoomedTaskVerb.call(ctx, "requestShutdown") as Promise<void>);
		expect(interrupt).toHaveBeenCalledTimes(1);

		await (proto.runZoomedTaskVerb.call(ctx, "kill") as Promise<void>);
		expect(cancel).toHaveBeenCalledTimes(1);

		// Sanity: LocalAgentTask exposes both verbs.
		expect(typeof LocalAgentTask.requestShutdown).toBe("function");
		expect(typeof LocalAgentTask.kill).toBe("function");
	});
});

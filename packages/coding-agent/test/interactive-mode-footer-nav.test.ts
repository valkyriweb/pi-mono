/**
 * Regression coverage for Phase 2a: footer pill navigation state machine.
 *
 * Tests the footerFocusPrev / footerFocusNext / clearFooterFocus /
 * enterZoomFromFooter methods via the same direct-prototype-call style as
 * interactive-mode-zoom.test.ts — no real TUI or runtime required.
 */

import { Container } from "@earendil-works/pi-tui";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { clearAgentRecentRunsForTests, startAgentRecentRun } from "../src/core/agents/status.js";
import { clearTaskMessagesForTests } from "../src/core/tasks/index.js";
import type { FooterComponent } from "../src/modes/interactive/components/footer.js";
import type { ZoomedTaskComponent } from "../src/modes/interactive/components/zoomed-task.js";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

type FooterNavContext = {
	zoomedTaskId: string | undefined;
	zoomedComponent: ZoomedTaskComponent | undefined;
	preZoomChatChildren: unknown[];
	zoomAutoPopTimer: ReturnType<typeof setTimeout> | undefined;
	unsubscribeZoomStatus: undefined | (() => void);
	footerSelectedTaskId: string | undefined;
	chatContainer: Container;
	footer: FooterComponent & { selectedId: string | undefined };
	ui: { requestRender(): void };
	showWarning(message: string): void;
	warnings: string[];
	// Phase 2b stubs for makeZoomedSessionConfig (called inside enterZoom).
	hideThinkingBlock: boolean;
	sessionManager: { getCwd(): string };
	settingsManager: { getShowImages(): boolean; getImageWidthCells(): number };
	getMarkdownThemeWithSettings(): object;
};

const proto = InteractiveMode.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

function makeContext(): FooterNavContext {
	const chatContainer = new Container();
	chatContainer.addChild(new Container());

	// Minimal footer stub that tracks setFooterSelectedTaskId calls.
	const stub: {
		selectedId: string | undefined;
		setFooterSelectedTaskId(id: string | undefined): void;
		invalidate(): void;
	} = {
		selectedId: undefined,
		setFooterSelectedTaskId(id: string | undefined) {
			this.selectedId = id;
		},
		invalidate: vi.fn(),
	};
	const footerStub = stub as unknown as FooterComponent & { selectedId: string | undefined };

	const ctx: FooterNavContext = {
		zoomedTaskId: undefined,
		zoomedComponent: undefined,
		preZoomChatChildren: [],
		zoomAutoPopTimer: undefined,
		unsubscribeZoomStatus: undefined,
		footerSelectedTaskId: undefined,
		chatContainer,
		footer: footerStub,
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

	Object.setPrototypeOf(ctx, InteractiveMode.prototype);
	return ctx;
}

function call(ctx: object, method: string, ...args: unknown[]): unknown {
	return proto[method]?.call(ctx, ...args);
}

function startRun(label: string) {
	return startAgentRecentRun("single", [{ agent: "scout", task: label }], { background: true });
}

describe("InteractiveMode footer nav — Phase 2a state machine", () => {
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
	});

	test("footerFocusPrev selects a task when nothing selected", () => {
		const ctx = makeContext();
		const r1 = startRun("task 1");
		const r2 = startRun("task 2");
		call(ctx, "footerFocusPrev");
		// A task should be selected (last in sorted order).
		expect(ctx.footerSelectedTaskId).toBeDefined();
		expect([r1.id, r2.id]).toContain(ctx.footerSelectedTaskId);
	});

	test("footerFocusNext selects a task when nothing selected", () => {
		const ctx = makeContext();
		const r1 = startRun("task A");
		const r2 = startRun("task B");
		call(ctx, "footerFocusNext");
		// A task should be selected (first in sorted order).
		expect(ctx.footerSelectedTaskId).toBeDefined();
		expect([r1.id, r2.id]).toContain(ctx.footerSelectedTaskId);
	});

	test("cycling prev/next with 2 tasks wraps around", () => {
		const ctx = makeContext();
		const r1 = startRun("task 1");
		const r2 = startRun("task 2");
		const ids = new Set([r1.id, r2.id]);

		call(ctx, "footerFocusNext"); // selects first
		const first = ctx.footerSelectedTaskId!;
		expect(ids).toContain(first);

		call(ctx, "footerFocusNext"); // selects second
		const second = ctx.footerSelectedTaskId!;
		expect(second).not.toBe(first);
		expect(ids).toContain(second);

		call(ctx, "footerFocusNext"); // wraps back to first
		expect(ctx.footerSelectedTaskId).toBe(first);
	});

	test("clearFooterFocus clears selection and notifies footer", () => {
		const ctx = makeContext();
		startRun("task");
		call(ctx, "footerFocusNext"); // select something
		expect(ctx.footerSelectedTaskId).toBeDefined();

		call(ctx, "clearFooterFocus");
		expect(ctx.footerSelectedTaskId).toBeUndefined();
		expect(ctx.footer.selectedId).toBeUndefined();
	});

	test("enterZoomFromFooter zooms into selected task and clears selection", () => {
		const ctx = makeContext();
		const run = startRun("zoom-me");
		call(ctx, "footerFocusNext");
		expect(ctx.footerSelectedTaskId).toBe(run.id);

		call(ctx, "enterZoomFromFooter");

		// Selection cleared, zoom entered.
		expect(ctx.footerSelectedTaskId).toBeUndefined();
		expect(ctx.zoomedTaskId).toBe(run.id);
	});

	test("clearFooterFocus is a no-op when nothing selected", () => {
		const ctx = makeContext();
		expect(() => call(ctx, "clearFooterFocus")).not.toThrow();
		expect(ctx.footerSelectedTaskId).toBeUndefined();
	});

	test("setFooterSelectedTaskId propagates to footer component", () => {
		const ctx = makeContext();
		startRun("t");
		call(ctx, "setFooterSelectedTaskId", "agent-42");
		expect(ctx.footerSelectedTaskId).toBe("agent-42");
		expect(ctx.footer.selectedId).toBe("agent-42");
		expect(vi.mocked(ctx.ui.requestRender)).toHaveBeenCalled();
	});

	test("footerFocusPrev/Next are no-ops when no running tasks exist", () => {
		const ctx = makeContext();
		// No runs registered.
		call(ctx, "footerFocusPrev");
		expect(ctx.footerSelectedTaskId).toBeUndefined();
		call(ctx, "footerFocusNext");
		expect(ctx.footerSelectedTaskId).toBeUndefined();
	});
});

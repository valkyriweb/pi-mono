import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	attachAgentRecentRunController,
	cancelAgentRecentRun,
	clearAgentRecentRunsForTests,
	failAgentRecentRun,
	finishAgentRecentRun,
	formatAgentFooterStatus,
	formatAgentStatus,
	interruptAgentRecentRun,
	listAgentRecentRuns,
	resumeAgentRecentRun,
	startAgentRecentRun,
	subscribeAgentRecentRuns,
	updateAgentRecentRunProgress,
} from "../src/core/agents/status.js";
import type { AgentRunDetails } from "../src/core/agents/types.js";

function makeRunDetails(status: AgentRunDetails["status"] = "completed"): AgentRunDetails {
	return {
		agent: "scout",
		source: "builtin",
		task: "Map files",
		status,
		context: {
			mode: "default",
			includeTranscript: false,
			includeProjectContext: true,
			includeSkills: true,
			includeAppendSystemPrompt: true,
		},
		effectiveTools: ["read"],
		deniedTools: ["agent"],
		durationMs: 1,
		toolCallCount: 0,
		messageCount: 1,
		recentToolCalls: [],
		recentOutputSnippets: [],
		loadedSkills: [],
		invokedSkills: { count: 0, names: [] },
		sessionId: "child-session",
		sessionPath: "/tmp/child-session.jsonl",
		outputPath: status === "completed" ? "reports/scout.md" : undefined,
	};
}

describe("native agent status", () => {
	beforeEach(() => clearAgentRecentRunsForTests());

	test("tracks recent completed foreground runs", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }]);
		finishAgentRecentRun(run, {
			mode: "single",
			status: "completed",
			runs: [makeRunDetails()],
		});

		expect(listAgentRecentRuns()[0]).toMatchObject({
			mode: "single",
			execution: "foreground",
			status: "completed",
			agents: ["scout"],
			outputPaths: ["reports/scout.md"],
		});
		expect(formatAgentStatus()).toContain("agent-1 single foreground completed");
		expect(formatAgentStatus()).not.toContain("unsupported");
		expect(formatAgentStatus(undefined, "agent-1")).toContain("session:");
	});

	test("tracks startup failures", () => {
		const run = startAgentRecentRun("chain", [{ agent: "missing", task: "Do it" }]);
		failAgentRecentRun(run, new Error("boom"));

		expect(formatAgentStatus()).toContain("chain foreground failed");
		expect(formatAgentStatus()).toContain("boom");
	});

	test("shows running background runs in status and detail views", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});

		const status = formatAgentStatus();
		expect(status).toContain("agent-1 single background running");
		expect(status).toContain("Control: /agents interrupt <run-id>");

		const detail = formatAgentStatus(undefined, "agent-1");
		expect(detail).toContain("agent-1 single background running");
		expect(detail).toContain("session: /tmp/child-session.jsonl");
	});

	test("interrupt and cancel update background status", async () => {
		const interruptRun = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], {
			background: true,
		});
		updateAgentRecentRunProgress(interruptRun, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		const interrupt = vi.fn();
		attachAgentRecentRunController(interruptRun.id, { interrupt, resume: vi.fn() });

		const interrupted = await interruptAgentRecentRun(interruptRun.id);
		expect(interrupt).toHaveBeenCalledOnce();
		expect(interrupted.ok).toBe(true);
		expect(formatAgentStatus()).toContain("agent-1 single background interrupted resumable");

		const cancelRun = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(cancelRun, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		const cancel = vi.fn();
		attachAgentRecentRunController(cancelRun.id, { cancel });

		const cancelled = await cancelAgentRecentRun(cancelRun.id);
		expect(cancel).toHaveBeenCalledOnce();
		expect(cancelled.ok).toBe(true);
		expect(formatAgentStatus()).toContain("agent-2 single background cancelled");
	});

	test("formats footer summary for background runs", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});

		expect(formatAgentFooterStatus()).toContain("Agents: 1 running");
		expect(formatAgentFooterStatus()).toContain("agent-1 running scout");
		expect(formatAgentFooterStatus()).toContain("/agents runs");
	});

	test("notifies subscribers when recent runs change", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeAgentRecentRuns(listener);
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		unsubscribe();
		finishAgentRecentRun(run, {
			mode: "single",
			status: "completed",
			runs: [makeRunDetails("completed")],
		});

		expect(listener).toHaveBeenCalledTimes(2);
	});

	test("resume control delegates resumable background runs", async () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		const resume = vi.fn();
		attachAgentRecentRunController(run.id, { interrupt: vi.fn(), resume });
		await interruptAgentRecentRun(run.id);

		const result = await resumeAgentRecentRun(run.id, "continue");
		expect(resume).toHaveBeenCalledWith("continue");
		expect(result.ok).toBe(true);
	});
});

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	attachAgentRecentRunController,
	cancelAgentRecentRun,
	clearAgentRecentRunsForTests,
	failAgentRecentRun,
	finishAgentRecentRun,
	formatAgentDurationMs,
	formatAgentFooterStatus,
	formatAgentStatus,
	formatAgentTokenCount,
	interruptAgentRecentRun,
	listAgentRecentRuns,
	markAgentRecentRunNeedsAttention,
	restartAgentRecentRun,
	resumeAgentRecentRun,
	startAgentRecentRun,
	subscribeAgentRecentRuns,
	updateAgentRecentRunProgress,
} from "../src/core/agents/status.js";
import type { AgentRunDetails } from "../src/core/agents/types.js";

let tempDir = "";
let childSessionPath = "";

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
		sessionPath: childSessionPath,
		outputPath: status === "completed" ? "reports/scout.md" : undefined,
	};
}

describe("native agent status", () => {
	beforeEach(() => {
		clearAgentRecentRunsForTests();
		tempDir = mkdtempSync(join(tmpdir(), "agent-status-"));
		childSessionPath = join(tempDir, "child-session.jsonl");
		writeFileSync(
			childSessionPath,
			`${JSON.stringify({ type: "session", version: 1, id: "child-session", timestamp: new Date().toISOString(), cwd: tempDir })}\n`,
		);
	});

	afterEach(() => {
		if (tempDir) rmSync(tempDir, { recursive: true, force: true });
	});

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
		expect(detail).toContain(`session: ${childSessionPath}`);
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

	test("formats agent tokens and durations compactly", () => {
		expect(formatAgentTokenCount(32_559)).toBe("32k");
		expect(formatAgentDurationMs(59_000)).toBe("59s");
		expect(formatAgentDurationMs(61_000)).toBe("1m 1s");
	});

	test("marks stale background runs as needing attention", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		markAgentRecentRunNeedsAttention(run, "No child progress for 10m");

		expect(formatAgentFooterStatus()).toContain("needs attention");
		expect(formatAgentStatus()).toContain("needs-attention: No child progress for 10m");
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

	test("does not mark non-single interrupted runs resumable", async () => {
		const run = startAgentRecentRun(
			"parallel",
			[
				{ agent: "scout", task: "Map files" },
				{ agent: "reviewer", task: "Review files" },
			],
			{ background: true },
		);
		updateAgentRecentRunProgress(run, {
			mode: "parallel",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		attachAgentRecentRunController(run.id, { interrupt: vi.fn(), resume: vi.fn() });

		await interruptAgentRecentRun(run.id);

		expect(formatAgentStatus()).toContain("agent-1 parallel background interrupted");
		expect(formatAgentStatus()).not.toContain("resumable");
	});

	test("ignores stale generation completions after resume restart", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		restartAgentRecentRun(run);
		finishAgentRecentRun(
			run,
			{
				mode: "single",
				status: "completed",
				runs: [makeRunDetails("completed")],
			},
			0,
		);

		expect(formatAgentStatus()).toContain("agent-1 single background running");
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

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	attachAgentRecentRunController,
	clearAgentRecentRunsForTests,
	finishAgentRecentRun,
	startAgentRecentRun,
	updateAgentRecentRunProgress,
} from "../src/core/agents/status.ts";
import type { AgentRunDetails } from "../src/core/agents/types.ts";
import { getTaskSnapshot, LocalAgentTask, listTasks } from "../src/core/tasks/index.ts";

let tempDir = "";
let childSessionPath = "";

function makeRunDetails(status: AgentRunDetails["status"] = "running"): AgentRunDetails {
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
	};
}

describe("tasks registry — LocalAgentTask adapter", () => {
	beforeEach(() => {
		clearAgentRecentRunsForTests();
		tempDir = mkdtempSync(join(tmpdir(), "tasks-registry-"));
		childSessionPath = join(tempDir, "child-session.jsonl");
		writeFileSync(
			childSessionPath,
			`${JSON.stringify({ type: "session", version: 1, id: "child-session", timestamp: new Date().toISOString(), cwd: tempDir })}\n`,
		);
	});

	afterEach(() => {
		if (tempDir) rmSync(tempDir, { recursive: true, force: true });
	});

	test("snapshot maps AgentRecentRun fields onto TaskSnapshot", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});

		const snap = LocalAgentTask.snapshot(run.id);
		expect(snap).toMatchObject({
			id: run.id,
			type: "local_agent",
			status: "running",
			resumable: false,
		});
		expect(snap?.description).toContain("scout");
		expect(snap?.description).toContain("Map files");
		expect(snap?.startedAt).toBeGreaterThan(0);
	});

	test("listTasks enumerates registered agent runs", () => {
		const a = startAgentRecentRun("single", [{ agent: "scout", task: "A" }], { background: true });
		const b = startAgentRecentRun("single", [{ agent: "scout", task: "B" }], { background: true });

		const tasks = listTasks();
		expect(tasks.map((t) => t.id).sort()).toEqual([a.id, b.id].sort());
		expect(tasks.every((t) => t.type === "local_agent")).toBe(true);
	});

	test("getTaskSnapshot finds task by id across adapters", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map" }], { background: true });
		expect(getTaskSnapshot(run.id)?.id).toBe(run.id);
		expect(getTaskSnapshot("does-not-exist")).toBeUndefined();
	});

	test("kill dispatches to cancelAgentRecentRun", async () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		const cancel = vi.fn();
		attachAgentRecentRunController(run.id, { cancel });

		const result = await LocalAgentTask.kill?.(run.id);
		expect(cancel).toHaveBeenCalledOnce();
		expect(result?.ok).toBe(true);
		expect(result?.snapshot?.status).toBe("cancelled");
	});

	test("requestShutdown dispatches to interruptAgentRecentRun", async () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		const interrupt = vi.fn();
		attachAgentRecentRunController(run.id, { interrupt, resume: vi.fn() });

		const result = await LocalAgentTask.requestShutdown?.(run.id);
		expect(interrupt).toHaveBeenCalledOnce();
		expect(result?.ok).toBe(true);
		expect(result?.snapshot?.status).toBe("interrupted");
		expect(result?.snapshot?.resumable).toBe(true);
	});

	test("injectMessage interrupts a running task then resumes with the message", async () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		const interrupt = vi.fn();
		const resume = vi.fn();
		attachAgentRecentRunController(run.id, { interrupt, resume });

		const result = await LocalAgentTask.injectMessage?.(run.id, "look at config.ts");
		expect(interrupt).toHaveBeenCalledOnce();
		expect(resume).toHaveBeenCalledWith("look at config.ts");
		expect(result?.ok).toBe(true);
	});

	test("injectMessage on an interrupted task skips the interrupt and resumes directly", async () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "running",
			runs: [makeRunDetails("running")],
		});
		const interrupt = vi.fn();
		const resume = vi.fn();
		attachAgentRecentRunController(run.id, { interrupt, resume });

		// First soft-stop
		await LocalAgentTask.requestShutdown?.(run.id);
		expect(interrupt).toHaveBeenCalledOnce();

		// Now inject — should not interrupt again, just resume
		const result = await LocalAgentTask.injectMessage?.(run.id, "follow up");
		expect(interrupt).toHaveBeenCalledOnce(); // still one
		expect(resume).toHaveBeenCalledWith("follow up");
		expect(result?.ok).toBe(true);
	});

	test("injectMessage rejects empty input", async () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map" }], { background: true });
		const result = await LocalAgentTask.injectMessage?.(run.id, "   ");
		expect(result?.ok).toBe(false);
		expect(result?.message).toContain("empty");
	});

	test("injectMessage on unknown id returns ok=false", async () => {
		const result = await LocalAgentTask.injectMessage?.("nope", "hi");
		expect(result?.ok).toBe(false);
		expect(result?.message).toContain("nope");
	});

	test("snapshot reflects terminal status after run completes", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map" }], { background: true });
		finishAgentRecentRun(run, {
			mode: "single",
			status: "completed",
			runs: [makeRunDetails("completed")],
		});

		const snap = LocalAgentTask.snapshot(run.id);
		expect(snap?.status).toBe("completed");
		expect(snap?.endedAt).toBeGreaterThan(0);
	});
});

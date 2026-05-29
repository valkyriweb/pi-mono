import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	clearAgentRecentRunsForTests,
	startAgentRecentRun,
	updateAgentRecentRunProgress,
} from "../src/core/agents/status.ts";
import type { AgentRunDetails } from "../src/core/agents/types.ts";
import {
	createTaskListToolDefinition,
	createTaskOutputToolDefinition,
	createTaskStopToolDefinition,
} from "../src/core/tools/background-tasks.ts";
import { getBashBgJob, killAllBashBgJobs, spawnBashBackground } from "../src/core/tools/bash.ts";

const TaskOutput = createTaskOutputToolDefinition();
const TaskStop = createTaskStopToolDefinition();
const TaskList = createTaskListToolDefinition();

/** Invoke a tool's execute with the unused signal/onUpdate/ctx slots padded out. */
async function call(tool: { execute: unknown }, params: Record<string, unknown>): Promise<string> {
	const run = tool.execute as (...a: unknown[]) => Promise<{ content: Array<{ text?: string }> }>;
	const result = await run("c1", params, undefined, undefined, undefined);
	return result.content.map((part) => part.text ?? "").join("");
}

async function waitForJobToSettle(jobId: string, timeoutMs = 4000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (getBashBgJob(jobId)?.status !== "running") return;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
}

function completedRunDetail(finalOutput: string): AgentRunDetails {
	return {
		agent: "scout",
		source: "builtin",
		task: "Map files",
		status: "completed",
		context: {
			mode: "default",
			includeTranscript: false,
			includeProjectContext: true,
			includeSkills: true,
			includeAppendSystemPrompt: true,
		},
		effectiveTools: ["read"],
		deniedTools: [],
		durationMs: 1,
		toolCallCount: 0,
		messageCount: 1,
		recentToolCalls: [],
		recentOutputSnippets: [],
		loadedSkills: [],
		invokedSkills: { count: 0, names: [] },
		finalOutput,
	};
}

describe("background-tasks tools — unified task_id over bash + agents", () => {
	let bashTempDir = "";

	beforeEach(() => {
		killAllBashBgJobs();
		clearAgentRecentRunsForTests();
		bashTempDir = mkdtempSync(join(tmpdir(), "bg-tasks-"));
	});

	afterEach(() => {
		killAllBashBgJobs();
		clearAgentRecentRunsForTests();
		if (bashTempDir) rmSync(bashTempDir, { recursive: true, force: true });
	});

	test("TaskOutput renders a bash job's status header + log", async () => {
		const job = spawnBashBackground("echo hello-from-bash", bashTempDir);
		await waitForJobToSettle(job.id);
		const text = await call(TaskOutput, { task_id: job.id });
		expect(text).toContain(`bgId: ${job.id}`);
		expect(text).toContain("status:");
		expect(text).toContain("hello-from-bash");
	});

	test("TaskOutput returns an agent run's final result", async () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		updateAgentRecentRunProgress(run, {
			mode: "single",
			status: "completed",
			runs: [completedRunDetail("AGENT FINAL RESULT")],
		});
		const text = await call(TaskOutput, { task_id: run.id });
		expect(text).toContain(run.id);
		expect(text).toContain("AGENT FINAL RESULT");
	});

	test("TaskOutput on unknown id reports recent ids", async () => {
		const text = await call(TaskOutput, { task_id: "nope" });
		expect(text).toContain("No background task with task_id=nope");
	});

	test("TaskOutput block=true waits until the task finishes", async () => {
		const job = spawnBashBackground("sleep 0.3; echo done-blocking", bashTempDir);
		const text = await call(TaskOutput, { task_id: job.id, block: true, timeout: 4000 });
		expect(getBashBgJob(job.id)?.status).not.toBe("running");
		expect(text).toContain("done-blocking");
	});

	test("TaskStop kills a running bash job", async () => {
		const job = spawnBashBackground("sleep 30", bashTempDir);
		const text = await call(TaskStop, { task_id: job.id });
		expect(text).toContain("Killed");
		expect(getBashBgJob(job.id)?.status).toBe("killed");
	});

	test("TaskStop accepts the deprecated shell_id alias", async () => {
		const job = spawnBashBackground("sleep 30", bashTempDir);
		const text = await call(TaskStop, { shell_id: job.id });
		expect(text).toContain("Killed");
		expect(getBashBgJob(job.id)?.status).toBe("killed");
	});

	test("TaskStop with neither id errors clearly", async () => {
		const text = await call(TaskStop, {});
		expect(text).toContain("requires task_id");
	});

	test("TaskStop on unknown id reports no stoppable task", async () => {
		const text = await call(TaskStop, { task_id: "nope" });
		expect(text).toContain("No stoppable background task");
	});

	test("TaskList enumerates bash jobs AND agent runs together", async () => {
		const job = spawnBashBackground("sleep 5", bashTempDir);
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }], { background: true });
		const text = await call(TaskList, {});
		expect(text).toContain(job.id);
		expect(text).toContain("[bash]");
		expect(text).toContain(run.id);
		expect(text).toContain("[agent]");
	});

	test("TaskList with no tasks says so", async () => {
		const text = await call(TaskList, {});
		expect(text).toBe("No background tasks.");
	});
});

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { clearAgentRecentRunsForTests, finishAgentRecentRun, startAgentRecentRun } from "../src/core/agents/status.js";
import type { AgentRunDetails } from "../src/core/agents/types.js";
import { cycleRunningTask, getRunningTasksSorted } from "../src/core/tasks/index.js";

function makeRunDetails(status: AgentRunDetails["status"] = "completed"): AgentRunDetails {
	return {
		agent: "scout",
		source: "builtin",
		task: "noop",
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

describe("tasks/sort: getRunningTasksSorted", () => {
	beforeEach(() => {
		clearAgentRecentRunsForTests();
	});
	afterEach(() => {
		clearAgentRecentRunsForTests();
	});

	test("returns running tasks sorted ascending by startedAt", async () => {
		const first = startAgentRecentRun("single", [{ agent: "scout", task: "a" }], { background: true });
		// Force a strict timestamp gap so the assertion is not flaky on fast clocks.
		await new Promise((resolve) => setTimeout(resolve, 4));
		const second = startAgentRecentRun("single", [{ agent: "scout", task: "b" }], { background: true });

		const sorted = getRunningTasksSorted();
		expect(sorted.map((task) => task.id)).toEqual([first.id, second.id]);
	});

	test("filters out terminal tasks", () => {
		const running = startAgentRecentRun("single", [{ agent: "scout", task: "live" }], { background: true });
		const done = startAgentRecentRun("single", [{ agent: "scout", task: "done" }], { background: true });
		finishAgentRecentRun(done, { mode: "single", status: "completed", runs: [makeRunDetails("completed")] });

		const sorted = getRunningTasksSorted();
		expect(sorted.map((task) => task.id)).toEqual([running.id]);
	});
});

describe("tasks/sort: cycleRunningTask", () => {
	beforeEach(() => {
		clearAgentRecentRunsForTests();
	});
	afterEach(() => {
		clearAgentRecentRunsForTests();
	});

	test("returns undefined when nothing is running", () => {
		expect(cycleRunningTask(undefined, "next")).toBeUndefined();
	});

	test("falls back to first/last when current id is unknown", async () => {
		const a = startAgentRecentRun("single", [{ agent: "scout", task: "a" }], { background: true });
		await new Promise((resolve) => setTimeout(resolve, 4));
		const b = startAgentRecentRun("single", [{ agent: "scout", task: "b" }], { background: true });

		expect(cycleRunningTask(undefined, "next")?.id).toBe(a.id);
		expect(cycleRunningTask("nope", "next")?.id).toBe(a.id);
		expect(cycleRunningTask(undefined, "prev")?.id).toBe(b.id);
	});

	test("wraps at both ends", async () => {
		const a = startAgentRecentRun("single", [{ agent: "scout", task: "a" }], { background: true });
		await new Promise((resolve) => setTimeout(resolve, 4));
		const b = startAgentRecentRun("single", [{ agent: "scout", task: "b" }], { background: true });
		await new Promise((resolve) => setTimeout(resolve, 4));
		const c = startAgentRecentRun("single", [{ agent: "scout", task: "c" }], { background: true });

		expect(cycleRunningTask(a.id, "next")?.id).toBe(b.id);
		expect(cycleRunningTask(c.id, "next")?.id).toBe(a.id);
		expect(cycleRunningTask(a.id, "prev")?.id).toBe(c.id);
		expect(cycleRunningTask(b.id, "prev")?.id).toBe(a.id);
	});
});

import { beforeEach, describe, expect, test } from "vitest";
import {
	clearAgentRecentRunsForTests,
	failAgentRecentRun,
	finishAgentRecentRun,
	formatAgentStatus,
	listAgentRecentRuns,
	startAgentRecentRun,
} from "../src/core/agents/status.js";

describe("native agent status", () => {
	beforeEach(() => clearAgentRecentRunsForTests());

	test("tracks recent completed runs", () => {
		const run = startAgentRecentRun("single", [{ agent: "scout", task: "Map files" }]);
		finishAgentRecentRun(run, {
			mode: "single",
			status: "completed",
			runs: [
				{
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
					deniedTools: ["agent"],
					durationMs: 1,
					toolCallCount: 0,
					messageCount: 1,
					recentToolCalls: [],
					recentOutputSnippets: [],
					loadedSkills: [],
					invokedSkills: { count: 0, names: [] },
					outputPath: "reports/scout.md",
				},
			],
		});

		expect(listAgentRecentRuns()[0]).toMatchObject({
			mode: "single",
			status: "completed",
			agents: ["scout"],
			outputPaths: ["reports/scout.md"],
		});
		expect(formatAgentStatus()).toContain("agent-1 single completed");
		expect(formatAgentStatus()).toContain("Background control: unsupported");
		expect(formatAgentStatus(undefined, "agent-1")).toContain("session:");
	});

	test("tracks startup failures", () => {
		const run = startAgentRecentRun("chain", [{ agent: "missing", task: "Do it" }]);
		failAgentRecentRun(run, new Error("boom"));

		expect(formatAgentStatus()).toContain("chain failed");
		expect(formatAgentStatus()).toContain("boom");
	});
});

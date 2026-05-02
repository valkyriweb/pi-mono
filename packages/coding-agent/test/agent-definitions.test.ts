import { describe, expect, test } from "vitest";
import { getBuiltinAgentDefinitions } from "../src/core/agents/definitions.js";

const READ_ONLY_AGENTS = new Set(["explore", "plan", "scout", "reviewer"]);

describe("built-in agent definitions", () => {
	test("include the MVP base agents with non-empty prompts", () => {
		const agents = getBuiltinAgentDefinitions();
		expect(agents.map((agent) => agent.id).sort()).toEqual([
			"explore",
			"general-purpose",
			"plan",
			"reviewer",
			"scout",
			"worker",
		]);
		for (const agent of agents) {
			expect(agent.description.trim()).not.toBe("");
			expect(agent.prompt.trim()).not.toBe("");
		}
	});

	test("read-only agents do not allow mutating tools or recursive agent", () => {
		for (const agent of getBuiltinAgentDefinitions()) {
			if (!READ_ONLY_AGENTS.has(agent.id)) continue;
			expect(agent.denyTools).toEqual(expect.arrayContaining(["agent", "edit", "write", "bash"]));
			expect(agent.tools).toEqual(["read", "grep", "find", "ls"]);
		}
	});

	test("built-in prompts require structured output", () => {
		const agents = new Map(getBuiltinAgentDefinitions().map((agent) => [agent.id, agent.prompt]));
		expect(agents.get("plan")).toContain("### Critical Files for Implementation");
		expect(agents.get("explore")).toContain("### Findings");
		expect(agents.get("explore")).toContain("### Files");
		expect(agents.get("explore")).toContain("### Open Questions");
		expect(agents.get("reviewer")).toContain("VERDICT: PASS|FAIL|PARTIAL");
		expect(agents.get("scout")).toContain("### Key Files");
	});

	test("general-purpose and worker deny recursive agent", () => {
		const agents = getBuiltinAgentDefinitions().filter(
			(agent) => agent.id === "general-purpose" || agent.id === "worker",
		);
		expect(agents).toHaveLength(2);
		for (const agent of agents) {
			expect(agent.denyTools).toContain("agent");
		}
	});
});

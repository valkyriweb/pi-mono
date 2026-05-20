import { describe, expect, test } from "vitest";
import { getBuiltinAgentDefinitions } from "../src/core/agents/definitions.js";
import { findAgentDefinition } from "../src/core/agents/registry.js";
import { createAgentToolDefinition } from "../src/core/tools/agent.js";

const READ_ONLY_AGENTS = new Set(["decompose", "explore", "plan", "reviewer"]);

describe("built-in agent definitions", () => {
	test("include the MVP base agents with non-empty prompts", () => {
		const agents = getBuiltinAgentDefinitions();
		expect(agents.map((agent) => agent.id).sort()).toEqual([
			"decompose",
			"explore",
			"general",
			"plan",
			"reviewer",
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

	test("stable agents use no dynamic child context", () => {
		const agents = new Map(getBuiltinAgentDefinitions().map((agent) => [agent.id, agent]));
		expect(agents.get("decompose")).toMatchObject({ cacheProfile: "stable", defaultContext: "none", model: "fast" });
		expect(agents.get("explore")).toMatchObject({
			cacheProfile: "stable",
			defaultContext: "none",
			model: "fast",
			thinking: "off",
		});
	});

	test("built-in prompts require structured output", () => {
		const agents = new Map(getBuiltinAgentDefinitions().map((agent) => [agent.id, agent.prompt]));
		expect(agents.get("decompose")).toContain("### Decomposition");
		expect(agents.get("decompose")).toContain("### Execution Shape");
		expect(agents.get("plan")).toContain("### Critical Files for Implementation");
		expect(agents.get("explore")).toContain("### Findings");
		expect(agents.get("explore")).toContain("### Open Questions");
		expect(agents.get("reviewer")).toContain("VERDICT: PASS|FAIL|PARTIAL");
	});

	test("agent tool system guidance keeps explore lightweight", () => {
		const agentTool = createAgentToolDefinition("/tmp");
		const exploreGuideline = agentTool.promptGuidelines?.find((line) => line.includes("prefer `explore`"));
		expect(exploreGuideline).toContain("no transcript/project context/skills");
		expect(exploreGuideline).toContain("extraContext");
		expect(exploreGuideline).toContain('context:"slim"');
	});

	test("built-in agent casing aliases resolve when unique", () => {
		const registry = { agents: getBuiltinAgentDefinitions(), diagnostics: [] };
		expect(findAgentDefinition(registry, "Explore")?.id).toBe("explore");
		expect(findAgentDefinition(registry, "Plan")?.id).toBe("plan");
	});

	test("exact agent id wins before case-insensitive fallback", () => {
		const agents = [
			...getBuiltinAgentDefinitions(),
			{ ...getBuiltinAgentDefinitions()[0], id: "Explore", source: "project" as const },
		];
		const registry = { agents, diagnostics: [] };
		expect(findAgentDefinition(registry, "Explore")?.id).toBe("Explore");
	});

	test("general and worker deny recursive agent", () => {
		const agents = getBuiltinAgentDefinitions().filter((agent) => agent.id === "general" || agent.id === "worker");
		expect(agents).toHaveLength(2);
		for (const agent of agents) {
			expect(agent.denyTools).toContain("agent");
		}
	});
});

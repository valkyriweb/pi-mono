import { describe, expect, test } from "vitest";
import { getBuiltinAgentDefinitions } from "../src/core/agents/definitions.js";
import { resolveEffectiveTools } from "../src/core/agents/executor.js";

const generalPurpose = getBuiltinAgentDefinitions().find((agent) => agent.id === "general");
// Use `explore` for read-only agent assertions; the fork removed `scout` because it overlapped `explore`.
const explore = getBuiltinAgentDefinitions().find((agent) => agent.id === "explore");

describe("agent tool permissions", () => {
	test("child cannot gain inactive parent tools", () => {
		expect(() =>
			resolveEffectiveTools({
				parentActiveTools: ["agent", "read"],
				agent: generalPurpose ?? getBuiltinAgentDefinitions()[0],
				requestedTools: ["read", "bash"],
			}),
		).toThrow("Requested inactive tool(s): bash");
	});

	test("recursive agent is hard-denied", () => {
		const result = resolveEffectiveTools({
			parentActiveTools: ["agent", "read"],
			agent: generalPurpose ?? getBuiltinAgentDefinitions()[0],
			requestedTools: ["agent", "read"],
		});
		expect(result.effectiveTools).toEqual(["read"]);
		expect(result.deniedTools).toEqual(["agent"]);
	});

	test("read-only agents do not receive bash even if parent has it", () => {
		const result = resolveEffectiveTools({
			parentActiveTools: ["agent", "read", "bash", "grep", "find", "ls"],
			agent: explore ?? getBuiltinAgentDefinitions()[0],
		});
		expect(result.effectiveTools).toEqual(["read", "grep", "find", "ls"]);
		expect(result.effectiveTools).not.toContain("bash");
	});
});

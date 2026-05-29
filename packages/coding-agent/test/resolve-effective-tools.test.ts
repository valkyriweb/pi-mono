import { describe, expect, it } from "vitest";
import { resolveEffectiveTools } from "../src/core/agents/executor.ts";
import type { AgentDefinition } from "../src/core/agents/types.ts";

function agent(partial: Partial<AgentDefinition>): AgentDefinition {
	return {
		id: "test",
		description: "",
		prompt: "",
		source: "builtin",
		...partial,
	} as AgentDefinition;
}

// Built-in agent definitions declare lowercase core tool names (read/grep/bash).
// A profile may register the same capabilities under aliased names — e.g. Luke's
// native-tool-overrides exposes Read/Grep/Bash and deferred Find/Ls. Resolution
// must match by capability, not exact string, or every built-in agent runs with
// ZERO tools and the model emits tool calls as literal text (0 tool uses).
describe("resolveEffectiveTools capability matching", () => {
	const capitalizedParent = [
		"Read",
		"Bash",
		"Edit",
		"Write",
		"Agent",
		"Grep",
		"Find",
		"Ls",
		"BashOutput",
		"KillShell",
	];

	it("resolves a lowercase allow-list against capitalized active aliases", () => {
		const { effectiveTools } = resolveEffectiveTools({
			parentActiveTools: capitalizedParent,
			agent: agent({ tools: ["read", "grep", "find", "ls", "bash"], denyTools: ["agent", "edit", "write"] }),
		});
		expect(effectiveTools).toEqual(expect.arrayContaining(["Read", "Grep", "Find", "Ls", "Bash"]));
		expect(effectiveTools).not.toContain("Edit");
		expect(effectiveTools).not.toContain("Write");
		expect(effectiveTools).not.toContain("Agent");
	});

	it("bundles bash job-control companions under their aliased names", () => {
		const { effectiveTools } = resolveEffectiveTools({
			parentActiveTools: capitalizedParent,
			agent: agent({ tools: ["read", "bash"] }),
		});
		expect(effectiveTools).toContain("Bash");
		expect(effectiveTools).toContain("BashOutput");
		expect(effectiveTools).toContain("KillShell");
	});

	it("excludes bash for a read-only agent", () => {
		const { effectiveTools } = resolveEffectiveTools({
			parentActiveTools: capitalizedParent,
			agent: agent({ tools: ["read", "grep", "find", "ls"], denyTools: ["edit", "write", "bash", "agent"] }),
		});
		expect(effectiveTools).toEqual(expect.arrayContaining(["Read", "Grep", "Find", "Ls"]));
		expect(effectiveTools).not.toContain("Bash");
	});

	it("matches case-insensitively against capitalized registry names", () => {
		const { effectiveTools } = resolveEffectiveTools({
			parentActiveTools: ["Read", "Grep", "Find"],
			agent: agent({ tools: ["read", "grep", "find"] }),
		});
		expect(effectiveTools).toEqual(expect.arrayContaining(["Read", "Grep", "Find"]));
	});

	it("denies the agent tool globally even with a wildcard allow-list", () => {
		const { effectiveTools } = resolveEffectiveTools({
			parentActiveTools: capitalizedParent,
			agent: agent({ tools: "*" }),
		});
		expect(effectiveTools).not.toContain("Agent");
		expect(effectiveTools).toContain("Read");
	});
});

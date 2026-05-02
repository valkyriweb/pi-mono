import stripAnsi from "strip-ansi";
import { beforeAll, describe, expect, test, vi } from "vitest";
import type { AgentDefinition } from "../src/core/agents/types.js";
import { AgentsSelectorComponent } from "../src/modes/interactive/components/agents-selector.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

const agents: AgentDefinition[] = [
	{
		id: "scout",
		description: "Fast recon",
		prompt: "Scout prompt",
		source: "builtin",
		tools: ["read", "grep"],
		defaultContext: "slim",
	},
	{
		id: "worker",
		description: "Implementation",
		prompt: "Worker prompt",
		source: "user",
		tools: "*",
		defaultContext: "fork",
	},
];

describe("/agents selector", () => {
	beforeAll(() => {
		initTheme("dark");
	});

	test("renders list and detail", () => {
		const selector = new AgentsSelectorComponent(
			agents,
			() => {},
			() => {},
		);
		const rendered = stripAnsi(selector.render(100).join("\n"));
		expect(rendered).toContain("Agents");
		expect(rendered).toContain("scout [builtin]");
		expect(rendered).toContain("Fast recon");
		expect(rendered).toContain("context: slim");
	});

	test("selecting inserts the highlighted agent scaffold through callback", () => {
		const onSelect = vi.fn();
		const selector = new AgentsSelectorComponent(agents, onSelect, () => {});
		selector.handleInput("\n");
		expect(onSelect).toHaveBeenCalledWith(agents[0]);
	});
});

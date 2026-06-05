import { beforeEach, describe, expect, test, vi } from "vitest";
import { clearAgentRecentRunsForTests, startAgentRecentRun } from "../src/core/agents/status.ts";
import { hookAgents } from "../src/core/extensions/agents.ts";
import type { ExtensionFooterSpec, ExtensionMainPaneFactory } from "../src/core/extensions/types.ts";

function createFakePi() {
	const tools: string[] = [];
	const footers = new Map<string, ExtensionFooterSpec>();
	const panes = new Map<string, ExtensionMainPaneFactory>();
	const showMainPane = vi.fn();
	return {
		pi: {
			harness: { use: () => undefined },
			registerTool(tool: { name: string }) {
				tools.push(tool.name);
			},
			registerMainPane(id: string, factory: ExtensionMainPaneFactory) {
				panes.set(id, factory);
			},
			showMainPane,
			registerFooter(id: string, spec: ExtensionFooterSpec) {
				footers.set(id, spec);
			},
		},
		tools,
		footers,
		panes,
		showMainPane,
	};
}

describe("agents UI", () => {
	beforeEach(() => clearAgentRecentRunsForTests());

	test("registers an activatable background agent status footer", () => {
		const fake = createFakePi();
		hookAgents(fake.pi as never);

		expect(fake.tools).toEqual(["agent", "Agent", "Task"]);
		expect(fake.panes.has("agents-status")).toBe(true);

		const footer = fake.footers.get("agents-status");
		expect(footer).toBeDefined();
		expect(footer?.visible?.()).toBe(false);

		startAgentRecentRun("single", [{ agent: "explore", task: "Map files" }], { background: true });

		expect(footer?.visible?.()).toBe(true);
		expect(
			footer?.render({
				width: 120,
				theme: { fg: (_color: string, value: string) => value } as never,
				selected: true,
			}),
		).toContain("Agents: 1 running");

		footer?.onActivate({ close: vi.fn() });
		expect(fake.showMainPane).toHaveBeenCalledWith("agents-status");
	});
});

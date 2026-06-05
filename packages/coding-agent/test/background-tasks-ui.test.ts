import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { clearAgentRecentRunsForTests, startAgentRecentRun } from "../src/core/agents/status.ts";
import { hookBackgroundTasksUi } from "../src/core/extensions/background-tasks-ui.ts";
import type { ExtensionFooterSpec } from "../src/core/extensions/types.ts";
import { killAllBashBgJobs, spawnBashBackground } from "../src/core/tools/bash.ts";

function stripAnsi(text: string): string {
	return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function createFakePi() {
	const tools: string[] = [];
	const footers = new Map<string, ExtensionFooterSpec>();
	const panes = new Set<string>();
	const showMainPane = vi.fn();
	const commands = new Map<string, unknown>();
	const theme = {
		fg: (_color: string, value: string) => value,
		bold: (value: string) => value,
	};
	return {
		pi: {
			registerTool(tool: { name: string }) {
				tools.push(tool.name);
			},
			registerMainPane(id: string) {
				panes.add(id);
			},
			showMainPane,
			registerFooter(id: string, spec: ExtensionFooterSpec) {
				footers.set(id, spec);
			},
			registerCommand(name: string, command: unknown) {
				commands.set(name, command);
			},
		},
		tools,
		footers,
		panes,
		commands,
		showMainPane,
		theme,
	};
}

describe("background tasks UI", () => {
	let bashTempDir = "";

	beforeEach(() => {
		killAllBashBgJobs();
		clearAgentRecentRunsForTests();
		bashTempDir = mkdtempSync(join(tmpdir(), "bg-tasks-ui-"));
	});

	afterEach(() => {
		killAllBashBgJobs();
		clearAgentRecentRunsForTests();
		if (bashTempDir) rmSync(bashTempDir, { recursive: true, force: true });
	});

	test("registers runtime background list, /tasks, and an activatable dynamic footer", () => {
		const fake = createFakePi();
		hookBackgroundTasksUi(fake.pi as never);

		expect(fake.tools).toEqual(["TaskBackgroundList"]);
		expect(fake.panes.has("background-tasks")).toBe(true);
		expect(fake.commands.has("tasks")).toBe(true);

		const footer = fake.footers.get("background-tasks");
		expect(footer).toBeDefined();
		expect(footer?.visible?.()).toBe(false);

		spawnBashBackground("sleep 30", bashTempDir);
		startAgentRecentRun("single", [{ agent: "explore", task: "Map task state" }], { background: true });

		expect(footer?.visible?.()).toBe(true);
		const rendered = stripAnsi(footer!.render({ width: 80, theme: fake.theme as never, selected: true }));
		expect(rendered).toContain("1 agent");
		expect(rendered).toContain("1 sh");
		expect(rendered).toContain("enter tasks");

		footer?.onActivate?.({ close: vi.fn() });
		expect(fake.showMainPane).toHaveBeenCalledWith("background-tasks");
	});
});

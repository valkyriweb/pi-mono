import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ExtensionFactory } from "../../../src/index.ts";
import { createHarness } from "../harness.ts";

function toolNames(tools: Array<{ name: string }>): string[] {
	return tools.map((tool) => tool.name).sort();
}

describe("regression #5109: exclude tools", () => {
	const extensionFactories: ExtensionFactory[] = [
		(pi) => {
			pi.on("session_start", () => {
				pi.registerTool({
					name: "ask_question",
					label: "Ask Question",
					description: "Ask a question",
					promptSnippet: "Ask a question",
					parameters: Type.Object({}),
					execute: async () => ({
						content: [{ type: "text", text: "ok" }],
						details: {},
					}),
				});
				pi.registerTool({
					name: "dynamic_tool",
					label: "Dynamic Tool",
					description: "Dynamic test tool",
					promptSnippet: "Run dynamic test behavior",
					parameters: Type.Object({}),
					execute: async () => ({
						content: [{ type: "text", text: "ok" }],
						details: {},
					}),
				});
			});
		},
	];

	it("filters built-in and extension tools from available and active tools", async () => {
		const harness = await createHarness({
			// Set the active tools explicitly: this fork diverges from upstream's
			// default-active set (it defaults to a minimal `Bash`-only built-in set),
			// so pinning the active names keeps the #5109 exclude assertions
			// deterministic across the divergence while still proving exclusion
			// applies to active tools.
			initialActiveToolNames: ["read", "bash", "edit", "write", "ask_question", "dynamic_tool"],
			excludedToolNames: ["read", "ask_question"],
			extensionFactories,
		});
		try {
			await harness.session.bindExtensions({});

			const allToolNames = toolNames(harness.session.getAllTools());
			expect(allToolNames).not.toContain("read");
			expect(allToolNames).not.toContain("ask_question");
			expect(allToolNames).toContain("bash");
			expect(allToolNames).toContain("dynamic_tool");
			expect(harness.session.getActiveToolNames().sort()).toEqual(["bash", "dynamic_tool", "edit", "write"]);
			expect(harness.session.systemPrompt).not.toContain("- read:");
			expect(harness.session.systemPrompt).not.toContain("ask_question");
			expect(harness.session.systemPrompt).toContain("- dynamic_tool: Run dynamic test behavior");
		} finally {
			harness.cleanup();
		}
	});

	it("lets excluded tools override the allowlist", async () => {
		const harness = await createHarness({
			allowedToolNames: ["read", "bash", "ask_question"],
			excludedToolNames: ["read", "ask_question"],
			initialActiveToolNames: ["read", "bash", "ask_question"],
			extensionFactories,
		});
		try {
			await harness.session.bindExtensions({});

			expect(toolNames(harness.session.getAllTools())).toEqual(["bash"]);
			expect(harness.session.getActiveToolNames()).toEqual(["bash"]);
			expect(harness.session.systemPrompt).toContain("- bash:");
			expect(harness.session.systemPrompt).not.toContain("- read:");
			expect(harness.session.systemPrompt).not.toContain("ask_question");
		} finally {
			harness.cleanup();
		}
	});
});

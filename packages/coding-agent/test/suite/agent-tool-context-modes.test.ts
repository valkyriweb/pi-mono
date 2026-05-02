import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Context, fauxAssistantMessage } from "@mariozechner/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { executeAgentTool } from "../../src/core/agents/executor.js";
import { createHarness, type Harness } from "./harness.js";

function executorOptions(harness: Harness) {
	return {
		parentServices: {
			cwd: harness.tempDir,
			agentDir: harness.tempDir,
			authStorage: harness.authStorage,
			settingsManager: harness.settingsManager,
			modelRegistry: harness.session.modelRegistry,
		},
		parentActiveTools: ["read", "bash", "edit", "write", "agent"],
		parentSessionManager: harness.sessionManager,
		parentModel: harness.getModel(),
		parentThinkingLevel: "off" as const,
	};
}

describe("agent tool suite: context modes", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) harnesses.pop()?.cleanup();
	});

	it("renders different child system prompts for slim and none", async () => {
		const childPrompts: Array<string | undefined> = [];
		const harness = await createHarness();
		harnesses.push(harness);
		mkdirSync(join(harness.tempDir, ".pi"), { recursive: true });
		writeFileSync(join(harness.tempDir, ".pi", "APPEND_SYSTEM.md"), "PROJECT APPEND");
		harness.setResponses([
			(context: Context) => {
				childPrompts.push(context.systemPrompt);
				return fauxAssistantMessage("slim done");
			},
			(context: Context) => {
				childPrompts.push(context.systemPrompt);
				return fauxAssistantMessage("none done");
			},
		]);

		await executeAgentTool(
			{
				mode: "parallel",
				tasks: [
					{ agent: "scout", task: "slim child", context: "slim" },
					{ agent: "scout", task: "none child", context: "none" },
				],
				concurrency: 1,
			},
			executorOptions(harness),
		);

		expect(childPrompts).toHaveLength(2);
		expect(childPrompts[0]).toContain("PROJECT APPEND");
		expect(childPrompts[1]).not.toContain("PROJECT APPEND");
		expect(childPrompts[0]).not.toBe(childPrompts[1]);
	});
});

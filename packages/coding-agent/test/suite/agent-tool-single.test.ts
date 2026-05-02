import { type Context, fauxAssistantMessage } from "@mariozechner/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { executeAgentTool } from "../../src/core/agents/executor.js";
import { createHarness, type Harness } from "./harness.js";

describe("agent tool suite: single", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) harnesses.pop()?.cleanup();
	});

	it("runs a child session with parent-bounded tools and recursive agent denial", async () => {
		const seenChildContexts: Context[] = [];
		const harness = await createHarness();
		harnesses.push(harness);
		harness.setResponses([
			(context) => {
				seenChildContexts.push(context);
				return fauxAssistantMessage("child complete");
			},
		]);

		const details = await executeAgentTool(
			{ mode: "single", tasks: [{ agent: "general-purpose", task: "Report child tools" }] },
			{
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
				parentThinkingLevel: "off",
			},
		);

		expect(seenChildContexts).toHaveLength(1);
		expect(details.runs[0]?.effectiveTools.sort()).toEqual(["bash", "edit", "read", "write"]);
		expect(details.runs[0]?.deniedTools).toContain("agent");
		expect(seenChildContexts[0]?.tools?.map((tool) => tool.name)).not.toContain("agent");
	});
});

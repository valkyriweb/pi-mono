import { describe, expect, it } from "vitest";
import type { Context, Model, Tool } from "../types.ts";
import { _buildRequestBodyForTests as buildRequestBody } from "./openai-codex-responses.ts";

// Minimal model fixture — buildRequestBody walks through convertResponsesMessages
// which calls downgradeUnsupportedImages, which reads `model.input`. Everything
// else is sane defaults.
const model = {
	id: "gpt-5.4-codex",
	provider: "openai-codex-responses",
	input: ["text", "image"],
	output: ["text"],
	thinkingLevelMap: {},
} as unknown as Model<"openai-codex-responses">;

function buildBodyWith(tools: Tool[]) {
	const context: Context = {
		systemPrompt: "",
		messages: [],
		tools,
	};
	return buildRequestBody(model, context);
}

describe("buildRequestBody — tool_search injection for deferred tools", () => {
	it("does not inject tool_search when no tool has deferLoading", () => {
		const body = buildBodyWith([
			{
				name: "echo",
				description: "Echo input back",
				parameters: { type: "object", properties: {} },
			} as Tool,
		]);
		const tools = (body.tools ?? []) as unknown as Array<Record<string, unknown>>;
		expect(tools.find((t) => t.type === "tool_search")).toBeUndefined();
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe("echo");
	});

	it("prepends a tool_search entry when any tool has deferLoading", () => {
		// OpenAI Responses API requires `{ type: "tool_search" }` in the tools
		// array whenever any function tool has `defer_loading: true`. Without it
		// the API returns 400 `Invalid Value: 'tools.defer_loading'. Deferred
		// tools require tools.tool_search.` Observed 2026-05-21 on BER-72
		// corrective wake (Kael OpenClaw via openclaw_gateway adapter,
		// Codex 0.130.0).
		const body = buildBodyWith([
			{
				name: "heartbeat_respond",
				description: "Record a heartbeat outcome.",
				parameters: { type: "object", properties: {} },
				deferLoading: true,
			} as Tool,
			{
				name: "echo",
				description: "Echo input back",
				parameters: { type: "object", properties: {} },
			} as Tool,
		]);
		const tools = (body.tools ?? []) as unknown as Array<Record<string, unknown>>;
		expect(tools[0].type).toBe("tool_search");
		const deferredTool = tools.find((t) => t.name === "heartbeat_respond") as { defer_loading?: boolean } | undefined;
		expect(deferredTool?.defer_loading).toBe(true);
	});
});

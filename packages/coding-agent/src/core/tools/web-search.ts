import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Container, Text } from "@earendil-works/pi-tui";
import { type Static, Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const webSearchSchema = Type.Object({
	query: Type.String({ description: "Search query" }),
	allowed_domains: Type.Optional(Type.Array(Type.String({ description: "Only return results from these domains" }))),
	blocked_domains: Type.Optional(Type.Array(Type.String({ description: "Never return results from these domains" }))),
});

export type WebSearchToolInput = Static<typeof webSearchSchema>;

export const WEB_SEARCH_UNSUPPORTED_MESSAGE = "WebSearch is only available with the claude-bridge provider";
const WEB_SEARCH_LOCAL_EXECUTION_MESSAGE =
	"WebSearch is a native Anthropic/Claude provider tool and should not execute locally";

export interface WebSearchToolOptions {
	toolName?: "WebSearch" | "web_search";
	label?: string;
}

function createEmptyResultComponent(): Container {
	return new Container();
}

function normalizeSearchInput(args: unknown): WebSearchToolInput {
	const input =
		args && typeof args === "object" ? (args as WebSearchToolInput) : ({ query: "" } as WebSearchToolInput);
	if (input.allowed_domains?.length && input.blocked_domains?.length) {
		throw new Error("WebSearch accepts either allowed_domains or blocked_domains, not both");
	}
	return input;
}

export function createWebSearchToolDefinition(
	_cwd: string,
	options?: WebSearchToolOptions,
): ToolDefinition<typeof webSearchSchema> {
	const toolName = options?.toolName ?? "WebSearch";
	const label = options?.label ?? toolName;
	return {
		name: toolName,
		label,
		description:
			"Search the web using Anthropic/Claude's native web_search server tool. Only available for claude-bridge models.",
		promptSnippet: "Search the web using Anthropic/Claude's native web_search server tool.",
		parameters: webSearchSchema,
		prepareArguments: normalizeSearchInput,
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			if (ctx.model?.provider !== "claude-bridge") {
				throw new Error(WEB_SEARCH_UNSUPPORTED_MESSAGE);
			}
			throw new Error(WEB_SEARCH_LOCAL_EXECUTION_MESSAGE);
		},
		renderCall(args, theme) {
			const optionsText: string[] = [];
			if (args?.allowed_domains?.length) optionsText.push(`allow ${args.allowed_domains.join(", ")}`);
			if (args?.blocked_domains?.length) optionsText.push(`block ${args.blocked_domains.join(", ")}`);
			const suffix = optionsText.length > 0 ? ` ${theme.fg("toolOutput", `(${optionsText.join("; ")})`)}` : "";
			const query = args?.query ? ` ${theme.fg("toolOutput", args.query)}` : "";
			return new Text(`${theme.fg("toolTitle", theme.bold(label))}${query}${suffix}`, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return createEmptyResultComponent();
			const textBlock = result.content.find((item) => item.type === "text");
			const text = textBlock?.type === "text" ? textBlock.text : "(no output)";
			return new Text(theme.fg("dim", text), 0, 0);
		},
	};
}

export function createWebSearchTool(cwd: string, options?: WebSearchToolOptions): AgentTool<typeof webSearchSchema> {
	return wrapToolDefinition(createWebSearchToolDefinition(cwd, options));
}

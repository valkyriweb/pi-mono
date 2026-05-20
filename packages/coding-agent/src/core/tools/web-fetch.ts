import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Container, Text } from "@earendil-works/pi-tui";
import { type Static, Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const webFetchSchema = Type.Object({
	allowed_domains: Type.Optional(Type.Array(Type.String({ description: "Only allow fetching from these domains" }))),
	blocked_domains: Type.Optional(Type.Array(Type.String({ description: "Never fetch from these domains" }))),
	max_content_tokens: Type.Optional(
		Type.Number({ description: "Approximate maximum tokens used for fetched web page text content" }),
	),
	use_cache: Type.Optional(
		Type.Boolean({
			description:
				"Whether to use cached content. Set false only when the user explicitly requests fresh content or rapidly-changing sources.",
		}),
	),
});

export type WebFetchToolInput = Static<typeof webFetchSchema>;

export const WEB_FETCH_UNSUPPORTED_MESSAGE = "WebFetch is only available with the claude-bridge provider";
const WEB_FETCH_LOCAL_EXECUTION_MESSAGE =
	"WebFetch is a native Anthropic/Claude provider tool and should not execute locally";

export interface WebFetchToolOptions {
	toolName?: "WebFetch" | "web_fetch";
	label?: string;
}

function createEmptyResultComponent(): Container {
	return new Container();
}

export function createWebFetchToolDefinition(
	_cwd: string,
	options?: WebFetchToolOptions,
): ToolDefinition<typeof webFetchSchema> {
	const toolName = options?.toolName ?? "WebFetch";
	const label = options?.label ?? toolName;
	return {
		name: toolName,
		label,
		description:
			"Fetch web page content using Anthropic/Claude's native web_fetch server tool. Only available for claude-bridge models.",
		promptSnippet: "Fetch web page content using Anthropic/Claude's native web_fetch server tool.",
		parameters: webFetchSchema,
		prepareArguments: (args) => (args && typeof args === "object" ? (args as WebFetchToolInput) : {}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			if (ctx.model?.provider !== "claude-bridge") {
				throw new Error(WEB_FETCH_UNSUPPORTED_MESSAGE);
			}
			throw new Error(WEB_FETCH_LOCAL_EXECUTION_MESSAGE);
		},
		renderCall(args, theme) {
			const optionsText: string[] = [];
			if (args?.allowed_domains?.length) optionsText.push(`allow ${args.allowed_domains.join(", ")}`);
			if (args?.blocked_domains?.length) optionsText.push(`block ${args.blocked_domains.join(", ")}`);
			if (args?.use_cache === false) optionsText.push("fresh");
			const suffix = optionsText.length > 0 ? ` ${theme.fg("toolOutput", `(${optionsText.join("; ")})`)}` : "";
			return new Text(`${theme.fg("toolTitle", theme.bold(label))}${suffix}`, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return createEmptyResultComponent();
			const textBlock = result.content.find((item) => item.type === "text");
			const text = textBlock?.type === "text" ? textBlock.text : "(no output)";
			return new Text(theme.fg("dim", text), 0, 0);
		},
	};
}

export function createWebFetchTool(cwd: string, options?: WebFetchToolOptions): AgentTool<typeof webFetchSchema> {
	return wrapToolDefinition(createWebFetchToolDefinition(cwd, options));
}

import type { Api, Model } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import {
	type DeferredToolSearchRuntimeActions,
	executeDeferredToolSearchForModel,
	searchDeferredTools,
} from "./deferred-tools.js";
import type { ToolDefinition } from "./extensions/types.js";

const toolSearchSchema = Type.Object({
	query: Type.Optional(Type.String()),
	toolNames: Type.Optional(Type.Array(Type.String())),
});

export interface DeferredToolSearchToolOptions {
	getToolDefinitions(): ToolDefinition[];
	getModel(): Model<Api> | undefined;
	getDiscoveredToolNames(): string[];
	setDiscoveredToolNames(toolNames: string[]): void;
	actions: DeferredToolSearchRuntimeActions;
}

function preferClaudeCompatibleToolNames(toolNames: string[]): string[] {
	if (!toolNames.some((name) => name.toLowerCase().includes("agent"))) {
		return toolNames;
	}

	const preferred = new Set(toolNames);
	if (preferred.has("Agent") && preferred.has("Task")) {
		preferred.delete("agent");
	}
	return Array.from(preferred);
}

export function createDeferredToolSearchTool(
	options: DeferredToolSearchToolOptions,
): ToolDefinition<typeof toolSearchSchema> {
	return {
		name: "tool_search",
		label: "Tool Search",
		description: "Discover and load deferred tools by query or exact tool name.",
		promptSnippet: "Discover and progressively load deferred tools when needed",
		parameters: toolSearchSchema,
		async execute(_toolCallId, params) {
			const definitions = options.getToolDefinitions();
			const exactNames = params.toolNames ?? [];
			const queryMatches = params.query
				? searchDeferredTools(definitions, params.query).map((tool) => tool.name)
				: [];
			const requestedNames = Array.from(new Set([...exactNames, ...preferClaudeCompatibleToolNames(queryMatches)]));
			const plan = executeDeferredToolSearchForModel(
				definitions,
				requestedNames,
				options.getModel(),
				options.actions,
				options.getDiscoveredToolNames(),
			);
			options.setDiscoveredToolNames(plan.discoveredToolNames);

			return {
				content:
					plan.referenceBlocks.length > 0 ? plan.referenceBlocks : [{ type: "text" as const, text: plan.message }],
				details: plan,
			};
		},
	};
}

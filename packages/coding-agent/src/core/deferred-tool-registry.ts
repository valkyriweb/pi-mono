import { createDeferredToolSearchTool, type DeferredToolSearchToolOptions } from "./deferred-tool-search-tool.js";
import { isDeferredTool } from "./deferred-tools.js";
import type { ToolDefinition } from "./extensions/types.js";
import { createSyntheticSourceInfo } from "./source-info.js";

export interface ToolDefinitionEntryLike {
	definition: ToolDefinition;
	sourceInfo: unknown;
}

export function ensureDeferredToolSearchDefinition<TEntry extends ToolDefinitionEntryLike>(
	definitionRegistry: Map<string, TEntry>,
	options: DeferredToolSearchToolOptions,
): boolean {
	const hasDeferredTools = Array.from(definitionRegistry.values()).some(({ definition }) =>
		isDeferredTool(definition),
	);
	if (!hasDeferredTools || definitionRegistry.has("tool_search")) return false;

	definitionRegistry.set("tool_search", {
		definition: createDeferredToolSearchTool(options),
		sourceInfo: createSyntheticSourceInfo("<builtin:tool_search>", { source: "builtin" }),
	} as unknown as TEntry);
	return true;
}

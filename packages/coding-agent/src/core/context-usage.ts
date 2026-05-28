import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { AssistantMessage, Usage } from "@earendil-works/pi-ai";
import type { ContextUsage, ToolDefinition } from "./extensions/types.ts";
import type { SessionEntry } from "./session-manager.ts";

export const CONTEXT_USAGE_SERVICE_ID = "contextUsage.snapshot";

export interface ContextUsageSnapshotService {
	get(): ContextUsage | undefined;
}

interface ToolSchemaForCounting {
	name: string;
	description: string;
	parameters: unknown;
}

export interface ContextUsageSnapshotOptions {
	branch: readonly SessionEntry[];
	systemPrompt: string;
	toolDefinitions: readonly ToolDefinition[];
	activeToolNames: readonly string[];
	contextWindow: number;
	nativeDeferredTools?: boolean;
}

function estimateTextTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

function estimateJsonTokens(value: unknown): number {
	return estimateTextTokens(JSON.stringify(value));
}

function toToolSchemaForCounting(tool: ToolDefinition): ToolSchemaForCounting {
	return {
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters,
	};
}

export function selectActiveToolDefinitions(
	toolDefinitions: readonly ToolDefinition[],
	activeToolNames: readonly string[],
	nativeDeferredTools = false,
): ToolDefinition[] {
	const activeToolNameSet = new Set(activeToolNames);
	return toolDefinitions.filter(
		(tool) => activeToolNameSet.has(tool.name) && isLoadedToolSchema(tool, nativeDeferredTools),
	);
}

export function estimateToolSchemaTokens(toolDefinitions: readonly ToolDefinition[]): number {
	if (toolDefinitions.length === 0) return 0;
	return estimateJsonTokens(toolDefinitions.map(toToolSchemaForCounting));
}

function isLoadedToolSchema(tool: ToolDefinition, nativeDeferredTools: boolean): boolean {
	if (!nativeDeferredTools) return true;
	return !(tool.deferLoading === true && tool.alwaysLoad !== true);
}

function estimateContentTokens(content: unknown): number {
	if (typeof content === "string") return estimateTextTokens(content);
	if (!Array.isArray(content)) return 0;

	let tokens = 0;
	for (const part of content) {
		if (!part || typeof part !== "object") continue;
		const { type } = part as { type?: unknown };

		if (type === "text") {
			const { text } = part as { text?: unknown };
			if (typeof text === "string") tokens += estimateTextTokens(text);
		} else if (type === "thinking") {
			const { text } = part as { text?: unknown };
			if (typeof text === "string") tokens += estimateTextTokens(text);
		} else if (type === "toolCall") {
			const { name, args } = part as { name?: unknown; args?: unknown };
			if (typeof name === "string") tokens += estimateTextTokens(name);
			tokens += estimateJsonTokens(args);
		} else if (type === "toolResult") {
			const { result } = part as { result?: unknown };
			tokens += estimateJsonTokens(result);
		} else if (type === "image") {
			tokens += 1200;
		}
	}

	return tokens;
}

function estimateMessageTokens(message: AgentMessage): number {
	switch (message.role) {
		case "user":
		case "assistant":
		case "toolResult":
		case "custom":
			return estimateContentTokens(message.content);
		case "bashExecution":
			return estimateTextTokens(message.command) + estimateTextTokens(message.output);
	}
	return 0;
}

function estimateEntryTokens(entry: SessionEntry): number {
	if (entry.type === "message") return estimateMessageTokens(entry.message);
	if (entry.type === "custom_message") return estimateContentTokens(entry.content);
	if (entry.type === "branch_summary" || entry.type === "compaction") return estimateTextTokens(entry.summary);
	return 0;
}

function calculateUsageTokens(usage: Usage): number {
	return usage.totalTokens || usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
}

function findLastAssistantUsage(branch: readonly SessionEntry[]): { index: number; tokens: number } | undefined {
	for (let i = branch.length - 1; i >= 0; i--) {
		const entry = branch[i];
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;

		const assistant = entry.message as AssistantMessage;
		if (assistant.stopReason === "aborted" || assistant.stopReason === "error") continue;

		const tokens = calculateUsageTokens(assistant.usage);
		if (tokens > 0) return { index: i, tokens };
	}

	return undefined;
}

export function estimateContextUsageSnapshot(options: ContextUsageSnapshotOptions): ContextUsage | undefined {
	if (options.contextWindow <= 0) return undefined;

	const activeToolDefinitions = selectActiveToolDefinitions(
		options.toolDefinitions,
		options.activeToolNames,
		options.nativeDeferredTools,
	);
	const lastAssistantUsage = findLastAssistantUsage(options.branch);
	let tokens = 0;

	if (lastAssistantUsage) {
		tokens = lastAssistantUsage.tokens;
		for (let i = lastAssistantUsage.index + 1; i < options.branch.length; i++) {
			tokens += estimateEntryTokens(options.branch[i]);
		}
	} else {
		tokens =
			estimateTextTokens(options.systemPrompt) +
			estimateToolSchemaTokens(activeToolDefinitions) +
			options.branch.reduce((total, entry) => total + estimateEntryTokens(entry), 0);
	}

	return {
		tokens,
		contextWindow: options.contextWindow,
		percent: (tokens / options.contextWindow) * 100,
	};
}

import type { AgentMessage, ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
import type { DefaultResourceLoaderOptions } from "../resource-loader.js";
import { buildSessionContext, type ReadonlySessionManager } from "../session-manager.js";
import type { AgentDefinition, AgentTaskConfig, ContextMode, ResolvedContextPolicy } from "./types.js";

export function resolveContextPolicy(mode: ContextMode): ResolvedContextPolicy {
	switch (mode) {
		case "fork":
			return {
				mode,
				includeTranscript: true,
				includeProjectContext: true,
				includeSkills: true,
				includeAppendSystemPrompt: true,
			};
		case "slim":
			return {
				mode,
				includeTranscript: false,
				includeProjectContext: false,
				includeSkills: false,
				includeAppendSystemPrompt: true,
			};
		case "none":
			return {
				mode,
				includeTranscript: false,
				includeProjectContext: false,
				includeSkills: false,
				includeAppendSystemPrompt: false,
			};
		case "default":
			return {
				mode,
				includeTranscript: false,
				includeProjectContext: true,
				includeSkills: true,
				includeAppendSystemPrompt: true,
			};
	}
}

export function buildAgentSystemAppend(agent: AgentDefinition): string {
	return [
		"<pi-child-agent>",
		`Agent: ${agent.id}`,
		"You are running as a Pi child agent for a delegated task.",
		"Do not call the agent tool or delegate recursively.",
		"Return only the final report needed by the parent agent.",
		"</pi-child-agent>",
		"",
		agent.prompt,
	].join("\n");
}

export function getChildResourceLoaderOptions(
	policy: ResolvedContextPolicy,
	agent: AgentDefinition,
): Omit<DefaultResourceLoaderOptions, "cwd" | "agentDir" | "settingsManager"> {
	const agentAppend = buildAgentSystemAppend(agent);
	return {
		noContextFiles: !policy.includeProjectContext,
		noSkills: !policy.includeSkills,
		appendSystemPromptOverride: (base) => (policy.includeAppendSystemPrompt ? [...base, agentAppend] : [agentAppend]),
	};
}

function filterDeniedToolArtifacts(messages: AgentMessage[], deniedToolNames: Set<string>): AgentMessage[] {
	return messages
		.map((message): AgentMessage | undefined => {
			if (message.role === "toolResult") {
				return deniedToolNames.has(message.toolName) ? undefined : message;
			}
			if (message.role !== "assistant") return message;
			const filteredContent = message.content.filter((part) => {
				return part.type !== "toolCall" || !deniedToolNames.has(part.name);
			});
			if (filteredContent.length === message.content.length) return message;
			if (filteredContent.length === 0) return undefined;
			return { ...message, content: filteredContent };
		})
		.filter((message): message is AgentMessage => Boolean(message));
}

function collectToolCallIds(messages: AgentMessage[]): Set<string> {
	const ids = new Set<string>();
	for (const message of messages) {
		if (message.role !== "assistant") continue;
		for (const part of message.content) {
			if (part.type === "toolCall") ids.add(part.id);
		}
	}
	return ids;
}

function collectToolResultIds(messages: AgentMessage[]): Set<string> {
	const ids = new Set<string>();
	for (const message of messages) {
		if (message.role === "toolResult") ids.add(message.toolCallId);
	}
	return ids;
}

export function filterIncompleteToolCalls(messages: AgentMessage[]): AgentMessage[] {
	const toolCallIds = collectToolCallIds(messages);
	const toolResultIds = collectToolResultIds(messages);
	return messages
		.map((message): AgentMessage | undefined => {
			if (message.role === "toolResult") {
				return toolCallIds.has(message.toolCallId) ? message : undefined;
			}
			if (message.role !== "assistant") return message;
			const filteredContent = message.content.filter((part) => {
				return part.type !== "toolCall" || toolResultIds.has(part.id);
			});
			if (filteredContent.length === message.content.length) return message;
			if (filteredContent.length === 0) return undefined;
			return { ...message, content: filteredContent };
		})
		.filter((message): message is AgentMessage => Boolean(message));
}

export function getFilteredForkMessages(sessionManager: ReadonlySessionManager): AgentMessage[] {
	const deniedToolNames = new Set(["agent", "subagent"]);
	const messages = buildSessionContext(sessionManager.getEntries(), sessionManager.getLeafId()).messages;
	return filterIncompleteToolCalls(filterDeniedToolArtifacts(messages, deniedToolNames));
}

export function buildChildTaskPrompt(task: AgentTaskConfig): string {
	const parts = ["Complete this delegated task:", "", task.task.trim()];
	if (task.extraContext?.trim()) {
		parts.push("", "Additional context:", task.extraContext.trim());
	}
	return parts.join("\n");
}

export function formatModelForDetails(
	model: Model<Api> | undefined,
): { provider: string; id: string; name?: string } | undefined {
	if (!model) return undefined;
	return { provider: model.provider, id: model.id, name: model.name };
}

export function clampThinkingForModel(model: Model<Api> | undefined, thinkingLevel: ThinkingLevel): ThinkingLevel {
	return model?.reasoning ? thinkingLevel : "off";
}

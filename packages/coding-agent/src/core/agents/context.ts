import type { AgentMessage, ThinkingLevel } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";
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

// Static reminder prepended to every child task message. Lives in the user
// message (not the system prompt / tool schemas) so it stays inside the
// cache-eligible prefix without changing the parent's cached bytes — fork-mode
// children still share the parent's system + tools cache. Mirrors Claude Code's
// `<system-reminder>` pattern for subagent guidance.
const CHILD_AGENT_REMINDER =
	"<system-reminder>\n" +
	"You are a Pi child agent (subagent). The `agent` tool is not available to you — " +
	"child agents cannot spawn further child agents, even if the tool schema appears in " +
	"your tool list (fork-mode children inherit the parent's tool schemas for cache reasons). " +
	"If the task genuinely requires delegation, return your findings to the parent and let " +
	"them dispatch the follow-up work.\n" +
	"</system-reminder>";

export function buildChildTaskPrompt(task: AgentTaskConfig): string {
	const parts = [CHILD_AGENT_REMINDER, "", "Complete this delegated task:", "", task.task.trim()];
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

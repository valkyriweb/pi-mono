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
				includeAppendSystemPrompt: false,
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

function contentHasToolName(content: unknown, deniedToolNames: Set<string>): boolean {
	if (!Array.isArray(content)) return false;
	return content.some((part) => {
		if (!part || typeof part !== "object") return false;
		const record = part as Record<string, unknown>;
		const name = record.name;
		return typeof name === "string" && deniedToolNames.has(name);
	});
}

export function getFilteredForkMessages(sessionManager: ReadonlySessionManager): AgentMessage[] {
	const deniedToolNames = new Set(["agent", "subagent"]);
	return buildSessionContext(sessionManager.getEntries(), sessionManager.getLeafId()).messages.filter((message) => {
		if (message.role === "assistant" && contentHasToolName(message.content, deniedToolNames)) return false;
		if (message.role === "toolResult") {
			const toolName = "toolName" in message ? message.toolName : undefined;
			if (typeof toolName === "string" && deniedToolNames.has(toolName)) return false;
			if (contentHasToolName(message.content, deniedToolNames)) return false;
		}
		return true;
	});
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

import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";

export type AgentSource = "builtin" | "user" | "project";
export type ContextMode = "default" | "fork" | "slim" | "none";
export type AgentRunStatus = "running" | "completed" | "failed" | "cancelled";
export type AgentToolMode = "single" | "parallel" | "chain";
export type AgentToolStatus = "running" | "completed" | "failed" | "cancelled";
export type AgentOutputMode = "inline" | "file" | "both";
export type AgentScope = "user" | "project" | "both";
export type AgentToolList = string[] | "*";
export type AgentThinkingLevel = ThinkingLevel | "inherit";
export type AgentModelPreference = string | "inherit";

export interface AgentDefinition {
	id: string;
	description: string;
	prompt: string;
	source: AgentSource;
	path?: string;
	tools?: AgentToolList;
	denyTools?: string[];
	model?: AgentModelPreference;
	thinking?: AgentThinkingLevel;
	defaultContext?: ContextMode;
	inheritProjectContext?: boolean;
	inheritSkills?: boolean;
}

export interface AgentLoadDiagnostic {
	level: "warning" | "error";
	message: string;
	path?: string;
}

export interface AgentRegistry {
	agents: AgentDefinition[];
	diagnostics: AgentLoadDiagnostic[];
	projectAgentsDir?: string;
}

export interface AgentTaskConfig {
	agent: string;
	task: string;
	description?: string;
	context?: ContextMode;
	extraContext?: string;
	model?: string;
	tools?: string[];
	thinking?: ThinkingLevel;
	output?: string;
	outputMode?: AgentOutputMode;
}

export interface NormalizedAgentTaskConfig extends AgentTaskConfig {
	context: ContextMode;
	outputMode: AgentOutputMode;
}

export interface ResolvedContextPolicy {
	mode: ContextMode;
	includeTranscript: boolean;
	includeProjectContext: boolean;
	includeSkills: boolean;
	includeAppendSystemPrompt: boolean;
}

export interface AgentRunDetails {
	agent: string;
	source: AgentSource;
	task: string;
	description?: string;
	status: AgentRunStatus;
	context: ResolvedContextPolicy;
	model?: { provider: string; id: string; name?: string };
	thinking?: ThinkingLevel;
	effectiveTools: string[];
	deniedTools: string[];
	durationMs: number;
	toolCallCount: number;
	messageCount: number;
	outputPath?: string;
	usage?: unknown;
	error?: string;
	finalOutput?: string;
	rawOutput?: string;
}

export interface AgentToolDetails {
	mode: AgentToolMode;
	status: AgentToolStatus;
	runs: AgentRunDetails[];
	concurrency?: number;
	chainDir?: string;
}

export interface AgentExecutionProgress {
	mode: AgentToolMode;
	status: AgentToolStatus;
	runs: AgentRunDetails[];
	concurrency?: number;
	chainDir?: string;
}

export interface AgentModelSelection {
	model: Model<Api> | undefined;
	thinkingLevel: ThinkingLevel;
}

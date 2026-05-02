import type { AgentTool, ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
import { Container, Spacer, Text } from "@mariozechner/pi-tui";
import { type Static, Type } from "typebox";
import { type AgentToolParentServices, executeAgentTool } from "../agents/executor.js";
import type { AgentExecutionProgress, AgentRunDetails, AgentToolDetails, AgentToolMode } from "../agents/types.js";
import type { ToolDefinition } from "../extensions/types.js";
import type { ReadonlySessionManager } from "../session-manager.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const contextModeSchema = Type.Union([
	Type.Literal("default"),
	Type.Literal("fork"),
	Type.Literal("slim"),
	Type.Literal("none"),
]);

const thinkingSchema = Type.Union([
	Type.Literal("off"),
	Type.Literal("minimal"),
	Type.Literal("low"),
	Type.Literal("medium"),
	Type.Literal("high"),
	Type.Literal("xhigh"),
]);

const outputModeSchema = Type.Union([Type.Literal("inline"), Type.Literal("file"), Type.Literal("both")]);

const taskSchema = Type.Object({
	agent: Type.String({ description: "Agent id/name to run" }),
	task: Type.String({ description: "Task for the child agent" }),
	description: Type.Optional(Type.String({ description: "Short UI label" })),
	context: Type.Optional(contextModeSchema),
	extraContext: Type.Optional(Type.String({ description: "Additional task-specific context" })),
	model: Type.Optional(Type.String()),
	tools: Type.Optional(Type.Array(Type.String())),
	thinking: Type.Optional(thinkingSchema),
	output: Type.Optional(Type.String({ description: "Path for parent to save final child report" })),
	outputMode: Type.Optional(outputModeSchema),
});

export const agentToolSchema = Type.Object({
	agent: Type.Optional(Type.String()),
	task: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	tasks: Type.Optional(Type.Array(taskSchema, { maxItems: 8 })),
	chain: Type.Optional(Type.Array(taskSchema, { minItems: 1 })),
	concurrency: Type.Optional(Type.Number({ minimum: 1, maximum: 8, default: 4 })),
	context: Type.Optional(contextModeSchema),
	extraContext: Type.Optional(Type.String()),
	model: Type.Optional(Type.String()),
	tools: Type.Optional(Type.Array(Type.String())),
	thinking: Type.Optional(thinkingSchema),
	output: Type.Optional(Type.String()),
	outputMode: Type.Optional(outputModeSchema),
	chainDir: Type.Optional(Type.String({ description: "Base directory for relative chain outputs" })),
	agentScope: Type.Optional(Type.Union([Type.Literal("user"), Type.Literal("project"), Type.Literal("both")])),
	confirmProjectAgents: Type.Optional(Type.Boolean({ default: true })),
});

export type AgentToolInput = Static<typeof agentToolSchema>;

export interface AgentToolOptions {
	parentServices?: AgentToolParentServices;
	getParentActiveTools?: () => string[];
	getParentSessionManager?: () => ReadonlySessionManager;
	getParentModel?: () => Model<Api> | undefined;
	getParentThinkingLevel?: () => ThinkingLevel;
}

export function normalizeAgentToolMode(params: AgentToolInput): {
	mode: AgentToolMode;
	tasks: NonNullable<AgentToolInput["tasks"]>;
} {
	const hasSingle = Boolean(params.agent && params.task);
	const hasParallel = Boolean(params.tasks && params.tasks.length > 0);
	const hasChain = Boolean(params.chain && params.chain.length > 0);
	const count = [hasSingle, hasParallel, hasChain].filter(Boolean).length;
	if (count !== 1) {
		throw new Error("agent tool requires exactly one mode: {agent, task}, {tasks}, or {chain}");
	}
	if (hasSingle) {
		return {
			mode: "single",
			tasks: [
				{
					agent: params.agent ?? "",
					task: params.task ?? "",
					description: params.description,
					context: params.context,
					extraContext: params.extraContext,
					model: params.model,
					tools: params.tools,
					thinking: params.thinking,
					output: params.output,
					outputMode: params.outputMode,
				},
			],
		};
	}
	if (hasParallel) return { mode: "parallel", tasks: params.tasks ?? [] };
	return { mode: "chain", tasks: params.chain ?? [] };
}

function summarizeRuns(runs: AgentRunDetails[]): string {
	return runs
		.map((run, index) => {
			const label = run.description ? `${run.agent} (${run.description})` : run.agent;
			const status = run.status === "completed" ? "completed" : run.status;
			const suffix = run.outputPath ? ` -> ${run.outputPath}` : "";
			const error = run.error ? ` (${run.error})` : "";
			return `${index + 1}. ${label}: ${status}${suffix}${error}`;
		})
		.join("\n");
}

function formatProgress(progress: AgentExecutionProgress): string {
	const completed = progress.runs.filter((run) => run.status === "completed").length;
	const running = progress.runs.filter((run) => run.status === "running").length;
	const failed = progress.runs.filter((run) => run.status === "failed").length;
	const lines = [
		`${progress.mode}: ${completed}/${progress.runs.length} done${running ? `, ${running} running` : ""}${failed ? `, ${failed} failed` : ""}`,
	];
	const summary = summarizeRuns(progress.runs);
	if (summary) lines.push(summary);
	return lines.join("\n");
}

function formatFinalResult(details: AgentToolDetails): string {
	const lines = [`agent ${details.mode}: ${details.status}`];
	const summary = summarizeRuns(details.runs);
	if (summary) lines.push(summary);
	const outputs = details.runs
		.filter(
			(run) =>
				run.finalOutput && (!run.outputPath || run.finalOutput !== `Saved child agent output to ${run.outputPath}`),
		)
		.map((run) => `\n### ${run.agent}\n\n${run.finalOutput}`);
	if (outputs.length > 0) lines.push(outputs.join("\n"));
	return lines.join("\n");
}

async function confirmProjectAgentsIfNeeded(
	params: AgentToolInput,
	ctx: Parameters<ToolDefinition<typeof agentToolSchema>["execute"]>[4],
): Promise<void> {
	const scope = params.agentScope;
	if (scope !== "project" && scope !== "both") return;
	if (params.confirmProjectAgents === false) return;
	if (!ctx.hasUI) {
		throw new Error(
			"Project agents require interactive confirmation. Set confirmProjectAgents:false only for trusted repositories.",
		);
	}
	const confirmed = await ctx.ui.confirm(
		"Run project agents?",
		"Project-local .pi/agents prompts are controlled by this repository and may instruct child agents to use active tools.",
	);
	if (!confirmed) {
		throw new Error("Project agent execution cancelled");
	}
}

export function createAgentToolDefinition(
	_cwd: string,
	options?: AgentToolOptions,
): ToolDefinition<typeof agentToolSchema, AgentToolDetails> {
	return {
		name: "agent",
		label: "agent",
		description:
			"Launch a built-in or configured Pi child agent. Supports single {agent, task}, parallel {tasks}, and sequential chain {chain} modes.",
		promptSnippet: "Delegate a task to a child agent with bounded tools",
		promptGuidelines: [
			"Use agent for delegated work that benefits from an isolated child context.",
			"Do not use agent recursively; child agents cannot call agent.",
		],
		parameters: agentToolSchema,
		executionMode: "parallel",
		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			if (!options?.parentServices || !options.getParentActiveTools || !options.getParentSessionManager) {
				throw new Error("agent tool is unavailable in this runtime");
			}
			await confirmProjectAgentsIfNeeded(params, ctx);
			const mode = normalizeAgentToolMode(params);
			const details = await executeAgentTool(
				{
					mode: mode.mode,
					tasks: mode.tasks,
					concurrency: params.concurrency,
					context: params.context,
					extraContext: params.extraContext,
					model: params.model,
					tools: params.tools,
					thinking: params.thinking,
					output: params.output,
					outputMode: params.outputMode,
					chainDir: params.chainDir,
					agentScope: params.agentScope,
				},
				{
					parentServices: options.parentServices,
					parentActiveTools: options.getParentActiveTools(),
					parentSessionManager: options.getParentSessionManager(),
					parentModel: options.getParentModel?.(),
					parentThinkingLevel: options.getParentThinkingLevel?.() ?? "off",
					signal,
					onProgress: (progress) => {
						onUpdate?.({ content: [{ type: "text", text: formatProgress(progress) }], details: progress });
					},
				},
			);
			return { content: [{ type: "text", text: formatFinalResult(details) }], details };
		},
		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			let label = "agent";
			try {
				const mode = normalizeAgentToolMode(args);
				const names = mode.tasks.map((task) => task.agent).join(", ");
				label = `${mode.mode}: ${names}`;
			} catch {
				label = "agent: invalid mode";
			}
			text.setText(`${theme.fg("toolTitle", theme.bold("agent"))} ${theme.fg("accent", label)}`);
			return text;
		},
		renderResult(result, options, _theme, context) {
			const component = (context.lastComponent as Container | undefined) ?? new Container();
			component.clear();
			const text = result.content
				.filter((part): part is { type: "text"; text: string } => part.type === "text")
				.map((part) => part.text)
				.join("\n");
			component.addChild(new Spacer(1));
			if (options.expanded) {
				component.addChild(new Text(text, 0, 0));
			} else {
				component.addChild(new Text(text.split("\n").slice(0, 8).join("\n"), 0, 0));
			}
			return component;
		},
	};
}

export function createAgentTool(cwd: string, options?: AgentToolOptions): AgentTool<typeof agentToolSchema> {
	return wrapToolDefinition(createAgentToolDefinition(cwd, options));
}

export type { AgentToolDetails };

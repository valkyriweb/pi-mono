import { existsSync } from "node:fs";
import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { Api, AssistantMessage, Model, TextContent, Usage } from "@mariozechner/pi-ai";
import type { AgentSession } from "../agent-session.js";
import { createAgentSessionFromServices, createAgentSessionServices } from "../agent-session-services.js";
import type { AuthStorage } from "../auth-storage.js";
import { DEFAULT_THINKING_LEVEL } from "../defaults.js";
import type { ModelRegistry } from "../model-registry.js";
import { parseModelPattern } from "../model-resolver.js";
import { type ReadonlySessionManager, SessionManager } from "../session-manager.js";
import type { SettingsManager } from "../settings-manager.js";
import {
	buildChildTaskPrompt,
	clampThinkingForModel,
	formatModelForDetails,
	getChildResourceLoaderOptions,
	getFilteredForkMessages,
	resolveContextPolicy,
} from "./context.js";
import { writeAgentOutput } from "./output.js";
import { findAgentDefinition, formatAvailableAgents, loadAgentRegistry } from "./registry.js";
import type { AgentRecentRun } from "./status.js";
import {
	attachAgentRecentRunController,
	failAgentRecentRun,
	finishAgentRecentRun,
	formatAgentDurationMs,
	getAgentRecentRunGeneration,
	markAgentRecentRunNeedsAttention,
	restartAgentRecentRun,
	startAgentRecentRun,
	updateAgentRecentRunProgress,
} from "./status.js";
import type {
	AgentDefinition,
	AgentExecutionProgress,
	AgentOutputMode,
	AgentRegistry,
	AgentRunDetails,
	AgentScope,
	AgentTaskConfig,
	AgentToolDetails,
	AgentToolMode,
	AgentToolStatus,
	ContextMode,
	NormalizedAgentTaskConfig,
} from "./types.js";

const GLOBAL_DENY_TOOLS = new Set(["agent"]);
const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 8;
const MAX_PARALLEL_TASKS = 8;
const BACKGROUND_MONITOR_INTERVAL_MS = 30_000;
const BACKGROUND_STALE_PROGRESS_MS = 10 * 60_000;

export interface AgentToolParentServices {
	cwd: string;
	agentDir: string;
	authStorage: AuthStorage;
	settingsManager: SettingsManager;
	modelRegistry: ModelRegistry;
}

export interface AgentExecutorOptions {
	parentServices: AgentToolParentServices;
	parentActiveTools: string[];
	parentSessionManager: ReadonlySessionManager;
	parentModel: Model<Api> | undefined;
	parentThinkingLevel: ThinkingLevel;
	onProgress?: (progress: AgentExecutionProgress) => void;
	signal?: AbortSignal;
	abortStatus?: () => AgentToolStatus | undefined;
	onChildSessionStart?: (session: AgentSession, details: AgentRunDetails) => void;
	onChildSessionEnd?: (session: AgentSession, details: AgentRunDetails) => void;
}

export interface AgentToolExecutionInput {
	mode: AgentToolMode;
	tasks: AgentTaskConfig[];
	concurrency?: number;
	context?: ContextMode;
	extraContext?: string;
	model?: string;
	tools?: string[];
	thinking?: ThinkingLevel;
	output?: string;
	outputMode?: AgentOutputMode;
	chainDir?: string;
	agentScope?: AgentScope;
	background?: boolean;
}

interface RunChildOptions extends AgentExecutorOptions {
	registry: AgentRegistry;
	task: NormalizedAgentTaskConfig;
	toolModel?: string;
	toolThinking?: ThinkingLevel;
	chainDir?: string;
	progressInput: AgentToolExecutionInput;
	progressRuns: AgentRunDetails[];
}

function normalizeOutputMode(mode: AgentOutputMode | undefined): AgentOutputMode {
	return mode ?? "inline";
}

function normalizeTask(
	task: AgentTaskConfig,
	input: AgentToolExecutionInput,
	definition?: AgentDefinition,
): NormalizedAgentTaskConfig {
	const context = task.context ?? input.context ?? definition?.defaultContext ?? "default";
	return {
		...task,
		extraContext: task.extraContext ?? input.extraContext,
		model: task.model ?? input.model,
		tools: task.tools ?? input.tools,
		thinking: task.thinking ?? input.thinking,
		output: task.output ?? input.output,
		outputMode: normalizeOutputMode(task.outputMode ?? input.outputMode),
		context,
	};
}

export function resolveEffectiveTools(options: {
	parentActiveTools: string[];
	agent: AgentDefinition;
	requestedTools?: string[];
}): { effectiveTools: string[]; deniedTools: string[] } {
	const parent = new Set(options.parentActiveTools);
	const requested = options.requestedTools;
	if (requested) {
		const inactive = requested.filter((tool) => !parent.has(tool));
		if (inactive.length > 0) {
			throw new Error(`Requested inactive tool(s): ${inactive.join(", ")}`);
		}
	}

	let candidates = requested ?? Array.from(parent);
	const agentTools = options.agent.tools ?? "*";
	if (agentTools !== "*") {
		const allowed = new Set(agentTools);
		candidates = candidates.filter((tool) => allowed.has(tool));
	}

	const deny = new Set([...(options.agent.denyTools ?? []), ...GLOBAL_DENY_TOOLS]);
	const effectiveTools = candidates.filter((tool) => parent.has(tool) && !deny.has(tool));
	const deniedTools = candidates.filter((tool) => deny.has(tool));
	return { effectiveTools: [...new Set(effectiveTools)], deniedTools: [...new Set(deniedTools)] };
}

export function resolveAgentModel(options: {
	modelReference?: string;
	agent: AgentDefinition;
	parentModel: Model<Api> | undefined;
	modelRegistry: ModelRegistry;
}): Model<Api> | undefined {
	const reference =
		options.modelReference ??
		(options.agent.model && options.agent.model !== "inherit" ? options.agent.model : undefined);
	if (!reference) return options.parentModel;
	const result = parseModelPattern(reference, options.modelRegistry.getAvailable());
	if (!result.model) {
		throw new Error(`Unknown or unavailable model: ${reference}`);
	}
	return result.model;
}

export function resolveAgentThinking(options: {
	taskThinking?: ThinkingLevel;
	toolThinking?: ThinkingLevel;
	agent: AgentDefinition;
	parentThinkingLevel: ThinkingLevel;
	model: Model<Api> | undefined;
}): ThinkingLevel {
	const agentThinking =
		options.agent.thinking && options.agent.thinking !== "inherit" ? options.agent.thinking : undefined;
	const selected =
		options.taskThinking ??
		options.toolThinking ??
		agentThinking ??
		options.parentThinkingLevel ??
		DEFAULT_THINKING_LEVEL;
	return clampThinkingForModel(options.model, selected);
}

function extractFinalAssistantText(messages: readonly { role: string; content?: unknown }[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
		const textParts = message.content
			.filter((part): part is { type: "text"; text: string } => {
				return Boolean(
					part &&
						typeof part === "object" &&
						(part as { type?: unknown }).type === "text" &&
						typeof (part as { text?: unknown }).text === "string",
				);
			})
			.map((part) => part.text);
		if (textParts.length > 0) return textParts.join("\n");
	}
	return "";
}

function createInitialRunDetails(options: {
	agent: AgentDefinition;
	task: NormalizedAgentTaskConfig;
	effectiveTools: string[];
	deniedTools: string[];
	model: Model<Api> | undefined;
	thinking: ThinkingLevel;
	startedAt: number;
}): AgentRunDetails {
	return {
		agent: options.agent.id,
		source: options.agent.source,
		task: options.task.task,
		description: options.task.description,
		status: "running",
		context: resolveContextPolicy(options.task.context),
		model: formatModelForDetails(options.model),
		thinking: options.thinking,
		effectiveTools: options.effectiveTools,
		deniedTools: options.deniedTools,
		durationMs: Date.now() - options.startedAt,
		toolCallCount: 0,
		messageCount: 0,
		recentToolCalls: [],
		recentOutputSnippets: [],
		loadedSkills: [],
		invokedSkills: { count: 0, names: [] },
	};
}

function previewValue(value: unknown, maxLength = 240): string | undefined {
	if (value === undefined) return undefined;
	let text: string;
	try {
		text = typeof value === "string" ? value : JSON.stringify(value);
	} catch {
		text = String(value);
	}
	const compact = text.replace(/\s+/g, " ").trim();
	return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}

function extractTextPreview(content: unknown, maxLength = 240): string | undefined {
	if (typeof content === "string") return previewValue(content, maxLength);
	if (!Array.isArray(content)) return previewValue(content, maxLength);
	const text = content
		.filter((part): part is TextContent => {
			return Boolean(
				part &&
					typeof part === "object" &&
					(part as { type?: unknown }).type === "text" &&
					typeof (part as { text?: unknown }).text === "string",
			);
		})
		.map((part) => part.text)
		.join("\n");
	return previewValue(text, maxLength);
}

function getLastAssistantUsage(
	messages: readonly { role: string; usage?: Usage; stopReason?: string }[],
): Usage | undefined {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (
			message.role === "assistant" &&
			message.usage &&
			message.stopReason !== "aborted" &&
			message.stopReason !== "error"
		) {
			return message.usage;
		}
	}
	return undefined;
}

function recordSkillInvocation(details: AgentRunDetails, toolName: string, args: unknown): void {
	if (toolName !== "skill" && toolName !== "skill_search") return;
	details.invokedSkills.count += 1;
	const argRecord = args && typeof args === "object" ? (args as Record<string, unknown>) : undefined;
	const candidates = [argRecord?.name, argRecord?.parent, argRecord?.child].filter(
		(value): value is string => typeof value === "string" && value.length > 0,
	);
	for (const candidate of candidates) {
		if (!details.invokedSkills.names.includes(candidate)) details.invokedSkills.names.push(candidate);
	}
}

function refreshRunDetailsFromSession(
	details: AgentRunDetails,
	session: { messages: readonly unknown[] },
	startedAt: number,
): void {
	details.durationMs = Date.now() - startedAt;
	details.messageCount = session.messages.length;
	details.usage = getLastAssistantUsage(session.messages as AssistantMessage[]);
}

interface DriveChildSessionOptions extends AgentExecutorOptions {
	task: NormalizedAgentTaskConfig;
	chainDir?: string;
	progressInput: AgentToolExecutionInput;
	progressRuns: AgentRunDetails[];
	details: AgentRunDetails;
	startedAt: number;
	prompt: string;
}

function getAbortedRunStatus(options: AgentExecutorOptions): "cancelled" | "interrupted" {
	return options.abortStatus?.() === "interrupted" ? "interrupted" : "cancelled";
}

async function driveChildSession(session: AgentSession, options: DriveChildSessionOptions): Promise<AgentRunDetails> {
	const { details, startedAt } = options;
	options.onChildSessionStart?.(session, details);
	const abortChild = () => {
		session.abortBash();
		void session.abort().catch(() => {});
	};
	if (options.signal && !options.signal.aborted) {
		options.signal.addEventListener("abort", abortChild, { once: true });
	}

	const unsubscribe = session.subscribe((event) => {
		if (!options.progressRuns.includes(details)) options.progressRuns.push(details);
		refreshRunDetailsFromSession(details, session, startedAt);
		if (event.type === "message_update" && event.message.role === "assistant") {
			const snippet = extractTextPreview(event.message.content, 200);
			if (snippet && snippet !== details.recentOutputSnippets[details.recentOutputSnippets.length - 1]) {
				details.recentOutputSnippets.push(snippet);
				details.recentOutputSnippets = details.recentOutputSnippets.slice(-5);
			}
		}
		if (event.type === "message_end" && event.message.role === "assistant") {
			details.usage = event.message.usage;
		}
		if (event.type === "tool_execution_start") {
			details.toolCallCount += 1;
			details.currentToolName = event.toolName;
			details.currentToolArgsPreview = previewValue(event.args);
			details.recentToolCalls.push({
				name: event.toolName,
				argsPreview: details.currentToolArgsPreview,
				startedAt: Date.now(),
			});
			details.recentToolCalls = details.recentToolCalls.slice(-8);
			recordSkillInvocation(details, event.toolName, event.args);
		}
		if (event.type === "tool_execution_end") {
			const active = details.recentToolCalls.find((tool) => !tool.endedAt && tool.name === event.toolName);
			if (active) {
				active.endedAt = Date.now();
				active.isError = event.isError;
				active.resultPreview = extractTextPreview(event.result.content, 200);
			}
			details.currentToolName = undefined;
			details.currentToolArgsPreview = undefined;
		}
		emitProgress(options.progressInput, options.progressRuns, options.onProgress);
	});

	try {
		if (options.signal?.aborted) throw new Error(`Agent run ${getAbortedRunStatus(options)}`);
		await session.prompt(options.prompt, { expandPromptTemplates: false, source: "extension" });
		if (options.signal?.aborted) throw new Error(`Agent run ${getAbortedRunStatus(options)}`);
		const finalOutput = extractFinalAssistantText(session.messages);
		const output = await writeAgentOutput({
			cwd: options.parentServices.cwd,
			output: options.task.output,
			outputMode: options.task.outputMode,
			content: finalOutput,
			chainDir: options.chainDir,
		});
		details.status = "completed";
		refreshRunDetailsFromSession(details, session, startedAt);
		details.outputPath = output.outputPath;
		details.finalOutput = output.displayText;
		details.rawOutput = output.rawContent;
		return details;
	} catch (error) {
		details.status = options.signal?.aborted ? getAbortedRunStatus(options) : "failed";
		refreshRunDetailsFromSession(details, session, startedAt);
		details.error = error instanceof Error ? error.message : String(error);
		throw Object.assign(new Error(details.error), { details });
	} finally {
		if (options.signal) options.signal.removeEventListener("abort", abortChild);
		unsubscribe();
		options.onChildSessionEnd?.(session, details);
		session.dispose();
	}
}

async function runChild(options: RunChildOptions): Promise<AgentRunDetails> {
	if (options.signal?.aborted) throw new Error("Agent tool aborted");
	const agent = findAgentDefinition(options.registry, options.task.agent);
	if (!agent) {
		throw new Error(
			`Unknown agent "${options.task.agent}". Available agents: ${formatAvailableAgents(options.registry)}`,
		);
	}

	const model = resolveAgentModel({
		modelReference: options.task.model,
		agent,
		parentModel: options.parentModel,
		modelRegistry: options.parentServices.modelRegistry,
	});
	const thinking = resolveAgentThinking({
		taskThinking: options.task.thinking,
		toolThinking: options.toolThinking,
		agent,
		parentThinkingLevel: options.parentThinkingLevel,
		model,
	});
	const { effectiveTools, deniedTools } = resolveEffectiveTools({
		parentActiveTools: options.parentActiveTools,
		agent,
		requestedTools: options.task.tools,
	});
	const startedAt = Date.now();
	const details = createInitialRunDetails({
		agent,
		task: options.task,
		effectiveTools,
		deniedTools,
		model,
		thinking,
		startedAt,
	});
	const policy = details.context;
	const childServices = await createAgentSessionServices({
		cwd: options.parentServices.cwd,
		agentDir: options.parentServices.agentDir,
		authStorage: options.parentServices.authStorage,
		settingsManager: options.parentServices.settingsManager,
		modelRegistry: options.parentServices.modelRegistry,
		resourceLoaderOptions: getChildResourceLoaderOptions(policy, agent),
	});
	const childSessionManager = SessionManager.create(options.parentServices.cwd);
	childSessionManager.newSession({ parentSession: options.parentSessionManager.getSessionFile() });
	details.sessionId = childSessionManager.getSessionId();
	details.sessionPath = childSessionManager.getSessionFile();
	const { session } = await createAgentSessionFromServices({
		services: childServices,
		sessionManager: childSessionManager,
		model,
		thinkingLevel: thinking,
		tools: effectiveTools,
		sessionStartEvent: { type: "session_start", reason: "startup" },
	});

	if (policy.includeTranscript) {
		session.state.messages = getFilteredForkMessages(options.parentSessionManager);
	}

	details.loadedSkills = childServices.resourceLoader.getSkills().skills.map((skill) => skill.name);

	return driveChildSession(session, {
		...options,
		details,
		startedAt,
		prompt: buildChildTaskPrompt(options.task),
	});
}

function emitProgress(
	input: AgentToolExecutionInput,
	runs: AgentRunDetails[],
	onProgress?: (progress: AgentExecutionProgress) => void,
): void {
	onProgress?.({
		mode: input.mode,
		status: runs.some((run) => run.status === "failed")
			? "failed"
			: runs.some((run) => run.status === "cancelled")
				? "cancelled"
				: runs.some((run) => run.status === "interrupted")
					? "interrupted"
					: runs.every((run) => run.status === "completed")
						? "completed"
						: "running",
		runs: [...runs],
		concurrency: input.concurrency,
		chainDir: input.chainDir,
	});
}

async function mapWithConcurrency<T>(
	items: T[],
	concurrency: number,
	run: (item: T, index: number) => Promise<AgentRunDetails>,
): Promise<{ results: AgentRunDetails[]; errors: unknown[] }> {
	const results: Array<AgentRunDetails | undefined> = new Array(items.length);
	const errors: unknown[] = [];
	let nextIndex = 0;
	const workerCount = Math.min(concurrency, items.length);
	const workers = Array.from({ length: workerCount }, async () => {
		while (nextIndex < items.length) {
			const index = nextIndex;
			nextIndex += 1;
			try {
				results[index] = await run(items[index], index);
			} catch (error) {
				errors.push(error);
				const details = getErrorDetails(error);
				if (details) results[index] = details;
			}
		}
	});
	await Promise.all(workers);
	return { results: results.filter((result): result is AgentRunDetails => Boolean(result)), errors };
}

function getErrorDetails(error: unknown): AgentRunDetails | undefined {
	if (error && typeof error === "object" && "details" in error) {
		return (error as { details?: AgentRunDetails }).details;
	}
	return undefined;
}

async function resumeSingleBackgroundRun(
	input: AgentToolExecutionInput,
	options: AgentExecutorOptions,
	recentRun: AgentRecentRun,
	expectedGeneration: number,
	prompt?: string,
): Promise<AgentToolDetails> {
	if (input.mode !== "single") throw new Error("Only single background agent runs can be resumed");
	const previousRun = recentRun.runs[0];
	if (!previousRun?.sessionPath) throw new Error(`${recentRun.id} has no child session path to resume`);
	if (!existsSync(previousRun.sessionPath)) {
		throw new Error(`${recentRun.id} child session path no longer exists: ${previousRun.sessionPath}`);
	}

	const registry = await loadAgentRegistry({ cwd: options.parentServices.cwd, agentScope: input.agentScope });
	const originalTask = input.tasks[0];
	const definition = findAgentDefinition(registry, originalTask.agent);
	const task = normalizeTask(originalTask, input, definition);
	const agent = findAgentDefinition(registry, task.agent);
	if (!agent) {
		throw new Error(`Unknown agent "${task.agent}". Available agents: ${formatAvailableAgents(registry)}`);
	}

	const model = resolveAgentModel({
		modelReference: task.model,
		agent,
		parentModel: options.parentModel,
		modelRegistry: options.parentServices.modelRegistry,
	});
	const thinking = resolveAgentThinking({
		taskThinking: task.thinking,
		toolThinking: input.thinking,
		agent,
		parentThinkingLevel: options.parentThinkingLevel,
		model,
	});
	const { effectiveTools, deniedTools } = resolveEffectiveTools({
		parentActiveTools: options.parentActiveTools,
		agent,
		requestedTools: task.tools,
	});
	const startedAt = Date.now();
	const details = createInitialRunDetails({
		agent,
		task,
		effectiveTools,
		deniedTools,
		model,
		thinking,
		startedAt,
	});
	const policy = details.context;
	const childServices = await createAgentSessionServices({
		cwd: options.parentServices.cwd,
		agentDir: options.parentServices.agentDir,
		authStorage: options.parentServices.authStorage,
		settingsManager: options.parentServices.settingsManager,
		modelRegistry: options.parentServices.modelRegistry,
		resourceLoaderOptions: getChildResourceLoaderOptions(policy, agent),
	});
	const childSessionManager = SessionManager.open(previousRun.sessionPath);
	details.sessionId = childSessionManager.getSessionId();
	details.sessionPath = childSessionManager.getSessionFile();
	const { session } = await createAgentSessionFromServices({
		services: childServices,
		sessionManager: childSessionManager,
		model,
		thinkingLevel: thinking,
		tools: effectiveTools,
		sessionStartEvent: {
			type: "session_start",
			reason: "resume",
			previousSessionFile: options.parentSessionManager.getSessionFile(),
		},
	});
	details.loadedSkills = childServices.resourceLoader.getSkills().skills.map((skill) => skill.name);

	const runs: AgentRunDetails[] = [details];
	const resumePrompt =
		prompt?.trim() ||
		"Continue the interrupted delegated task from where you left off. Return the final report when done.";

	try {
		await driveChildSession(session, {
			...options,
			task,
			chainDir: input.chainDir,
			progressInput: input,
			progressRuns: runs,
			details,
			startedAt,
			prompt: resumePrompt,
		});
	} catch (error) {
		const failed = getErrorDetails(error);
		if (!failed) {
			failAgentRecentRun(recentRun, error, expectedGeneration);
			throw error;
		}
		const failedDetails: AgentToolDetails = {
			mode: input.mode,
			status: failed.status === "cancelled" || failed.status === "interrupted" ? failed.status : "failed",
			runs,
			runId: recentRun.id,
			background: true,
			chainDir: input.chainDir,
		};
		finishAgentRecentRun(recentRun, failedDetails, expectedGeneration);
		return failedDetails;
	}

	const completedDetails: AgentToolDetails = {
		mode: input.mode,
		status: "completed",
		runs,
		runId: recentRun.id,
		background: true,
		chainDir: input.chainDir,
	};
	finishAgentRecentRun(recentRun, completedDetails, expectedGeneration);
	return completedDetails;
}

async function executeAgentToolToCompletion(
	input: AgentToolExecutionInput,
	options: AgentExecutorOptions,
	recentRun: AgentRecentRun,
	expectedGeneration = getAgentRecentRunGeneration(recentRun),
): Promise<AgentToolDetails> {
	const registry = await loadAgentRegistry({ cwd: options.parentServices.cwd, agentScope: input.agentScope });
	const runs: AgentRunDetails[] = [];
	const concurrency = Math.max(1, Math.min(input.concurrency ?? DEFAULT_CONCURRENCY, MAX_CONCURRENCY));
	if (input.mode === "parallel" && input.tasks.length > MAX_PARALLEL_TASKS) {
		throw new Error(`Parallel agent mode supports at most ${MAX_PARALLEL_TASKS} tasks`);
	}

	const makeTask = (task: AgentTaskConfig): NormalizedAgentTaskConfig => {
		const definition = findAgentDefinition(registry, task.agent);
		return normalizeTask(task, input, definition);
	};

	try {
		if (input.mode === "chain") {
			let previous = "";
			for (const task of input.tasks) {
				const normalized = makeTask({ ...task, task: task.task.replaceAll("{previous}", previous) });
				const result = await runChild({
					...options,
					registry,
					task: normalized,
					toolThinking: input.thinking,
					chainDir: input.chainDir,
					progressInput: input,
					progressRuns: runs,
				});
				if (!runs.includes(result)) runs.push(result);
				previous = result.rawOutput ?? result.finalOutput ?? "";
				emitProgress(input, runs, options.onProgress);
			}
		} else if (input.mode === "parallel") {
			const normalizedTasks = input.tasks.map(makeTask);
			const { results, errors } = await mapWithConcurrency(normalizedTasks, concurrency, async (task) => {
				const result = await runChild({
					...options,
					registry,
					task,
					toolThinking: input.thinking,
					chainDir: input.chainDir,
					progressInput: input,
					progressRuns: runs,
				});
				if (!runs.includes(result)) runs.push(result);
				emitProgress(input, runs, options.onProgress);
				return result;
			});
			runs.splice(0, runs.length, ...results);
			if (errors.length > 0) throw errors[0];
		} else {
			const result = await runChild({
				...options,
				registry,
				task: makeTask(input.tasks[0]),
				toolThinking: input.thinking,
				chainDir: input.chainDir,
				progressInput: input,
				progressRuns: runs,
			});
			if (!runs.includes(result)) runs.push(result);
			emitProgress(input, runs, options.onProgress);
		}
	} catch (error) {
		const details = getErrorDetails(error);
		if (!details) {
			if (options.signal?.aborted) {
				const abortedDetails: AgentToolDetails = {
					mode: input.mode,
					status: getAbortedRunStatus(options),
					runs,
					runId: recentRun.id,
					background: input.background === true,
					concurrency,
					chainDir: input.chainDir,
				};
				finishAgentRecentRun(recentRun, abortedDetails, expectedGeneration);
				return abortedDetails;
			}
			failAgentRecentRun(recentRun, error, expectedGeneration);
			throw error;
		}
		if (!runs.includes(details)) runs.push(details);
		const failedDetails: AgentToolDetails = {
			mode: input.mode,
			status: details.status === "cancelled" || details.status === "interrupted" ? details.status : "failed",
			runs,
			runId: recentRun.id,
			background: input.background === true,
			concurrency,
			chainDir: input.chainDir,
		};
		finishAgentRecentRun(recentRun, failedDetails, expectedGeneration);
		return failedDetails;
	}

	const completedDetails: AgentToolDetails = {
		mode: input.mode,
		status: "completed",
		runs,
		runId: recentRun.id,
		background: input.background === true,
		concurrency: input.mode === "parallel" ? concurrency : undefined,
		chainDir: input.chainDir,
	};
	finishAgentRecentRun(recentRun, completedDetails, expectedGeneration);
	return completedDetails;
}

export async function executeAgentTool(
	input: AgentToolExecutionInput,
	options: AgentExecutorOptions,
): Promise<AgentToolDetails> {
	const recentRun = startAgentRecentRun(input.mode, input.tasks, { background: input.background });
	if (!input.background) return executeAgentToolToCompletion(input, options, recentRun);

	let abortController = new AbortController();
	let abortStatus: AgentToolStatus | undefined;
	let activeRunPromise: Promise<void> = Promise.resolve();
	let lastActivityAt = Date.now();
	let monitor: NodeJS.Timeout | undefined;
	const activeSessions = new Set<AgentSession>();
	const touchActivity = () => {
		lastActivityAt = Date.now();
	};
	const stopMonitor = () => {
		if (monitor) clearInterval(monitor);
		monitor = undefined;
	};
	const startMonitor = (generation: number) => {
		stopMonitor();
		touchActivity();
		monitor = setInterval(() => {
			if (getAgentRecentRunGeneration(recentRun) !== generation || recentRun.status !== "running") {
				stopMonitor();
				return;
			}
			const staleMs = Date.now() - lastActivityAt;
			if (staleMs >= BACKGROUND_STALE_PROGRESS_MS) {
				markAgentRecentRunNeedsAttention(
					recentRun,
					`No child progress for ${formatAgentDurationMs(staleMs)}; inspect or stop it with /agents runs`,
				);
			}
		}, BACKGROUND_MONITOR_INTERVAL_MS);
	};
	const makeBackgroundOptions = (generation: number): AgentExecutorOptions => ({
		...options,
		signal: abortController.signal,
		abortStatus: () => abortStatus,
		onProgress: (progress) => {
			touchActivity();
			updateAgentRecentRunProgress(recentRun, progress, generation);
		},
		onChildSessionStart: (session, details) => {
			touchActivity();
			activeSessions.add(session);
			options.onChildSessionStart?.(session, details);
		},
		onChildSessionEnd: (session, details) => {
			touchActivity();
			activeSessions.delete(session);
			options.onChildSessionEnd?.(session, details);
		},
	});
	const abortActiveSessions = () => {
		for (const session of activeSessions) {
			session.abortBash();
			void session.abort().catch(() => {});
		}
	};
	const launch = (run: (generation: number) => Promise<AgentToolDetails>) => {
		const generation = getAgentRecentRunGeneration(recentRun);
		startMonitor(generation);
		activeRunPromise = run(generation)
			.then(
				() => {},
				(error) => {
					failAgentRecentRun(recentRun, error, generation);
				},
			)
			.finally(() => {
				if (getAgentRecentRunGeneration(recentRun) === generation) stopMonitor();
			});
	};

	attachAgentRecentRunController(recentRun.id, {
		interrupt: async () => {
			abortStatus = "interrupted";
			abortActiveSessions();
			abortController.abort();
			await activeRunPromise;
		},
		cancel: async () => {
			abortStatus = "cancelled";
			abortActiveSessions();
			abortController.abort();
			await activeRunPromise;
		},
		resume: async (prompt) => {
			await activeRunPromise;
			abortController = new AbortController();
			abortStatus = undefined;
			restartAgentRecentRun(recentRun);
			launch((generation) =>
				resumeSingleBackgroundRun(input, makeBackgroundOptions(generation), recentRun, generation, prompt),
			);
		},
	});

	launch((generation) =>
		executeAgentToolToCompletion(input, makeBackgroundOptions(generation), recentRun, generation),
	);
	return {
		mode: input.mode,
		status: "running",
		runs: [],
		runId: recentRun.id,
		background: true,
		message: `Background agent run ${recentRun.id} started. Use /agents-status ${recentRun.id} for details.`,
		concurrency:
			input.mode === "parallel"
				? Math.max(1, Math.min(input.concurrency ?? DEFAULT_CONCURRENCY, MAX_CONCURRENCY))
				: undefined,
		chainDir: input.chainDir,
	};
}

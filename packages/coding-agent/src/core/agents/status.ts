import type {
	AgentExecutionProgress,
	AgentRunDetails,
	AgentToolDetails,
	AgentToolMode,
	AgentToolStatus,
} from "./types.js";

export type AgentRunExecution = "foreground" | "background";

export interface AgentRecentRun {
	id: string;
	mode: AgentToolMode;
	execution: AgentRunExecution;
	status: AgentToolStatus;
	agents: string[];
	tasks: string[];
	startedAt: string;
	updatedAt: string;
	endedAt?: string;
	durationMs?: number;
	outputPaths: string[];
	sessionRefs: Array<{ agent: string; sessionId?: string; sessionPath?: string }>;
	runs: AgentRunDetails[];
	resumable: boolean;
	error?: string;
}

export interface AgentRecentRunController {
	interrupt?: () => void | Promise<void>;
	cancel?: () => void | Promise<void>;
	resume?: (prompt?: string) => void | Promise<void>;
}

export interface AgentRunControlResult {
	ok: boolean;
	message: string;
	run?: AgentRecentRun;
}

export type AgentRecentRunsListener = () => void;

const MAX_RECENT_RUNS = 25;
const recentRuns: AgentRecentRun[] = [];
const liveRunControllers = new Map<string, AgentRecentRunController>();
const recentRunListeners = new Set<AgentRecentRunsListener>();
let nextRunId = 1;

function nowIso(): string {
	return new Date().toISOString();
}

function notifyAgentRecentRunsChanged(): void {
	for (const listener of recentRunListeners) {
		try {
			listener();
		} catch {
			// Status listeners are UI refresh hooks; never let one break lifecycle updates.
		}
	}
}

export function subscribeAgentRecentRuns(listener: AgentRecentRunsListener): () => void {
	recentRunListeners.add(listener);
	return () => recentRunListeners.delete(listener);
}

function cloneRunDetails(run: AgentRunDetails): AgentRunDetails {
	return {
		...run,
		effectiveTools: [...run.effectiveTools],
		deniedTools: [...run.deniedTools],
		recentToolCalls: run.recentToolCalls.map((tool) => ({ ...tool })),
		recentOutputSnippets: [...run.recentOutputSnippets],
		loadedSkills: [...run.loadedSkills],
		invokedSkills: { count: run.invokedSkills.count, names: [...run.invokedSkills.names] },
	};
}

function cloneRecentRun(run: AgentRecentRun): AgentRecentRun {
	return {
		...run,
		agents: [...run.agents],
		tasks: [...run.tasks],
		outputPaths: [...run.outputPaths],
		sessionRefs: run.sessionRefs.map((session) => ({ ...session })),
		runs: run.runs.map(cloneRunDetails),
	};
}

function summarizeErrors(runs: AgentRunDetails[]): string | undefined {
	const errors = runs.map((run) => run.error).filter((error): error is string => Boolean(error));
	return errors.length > 0 ? errors.join("; ") : undefined;
}

function summarizeOutputs(runs: AgentRunDetails[]): string[] {
	return runs.map((run) => run.outputPath).filter((path): path is string => Boolean(path));
}

function summarizeSessions(runs: AgentRunDetails[]): AgentRecentRun["sessionRefs"] {
	return runs.map((run) => ({ agent: run.agent, sessionId: run.sessionId, sessionPath: run.sessionPath }));
}

function isTerminalStatus(status: AgentToolStatus): boolean {
	return status !== "running";
}

function canResumeRun(run: AgentRecentRun): boolean {
	return run.execution === "background" && run.status === "interrupted" && run.sessionRefs.length === 1;
}

function refreshRunSummary(run: AgentRecentRun, runs: AgentRunDetails[]): void {
	run.outputPaths = summarizeOutputs(runs);
	run.sessionRefs = summarizeSessions(runs);
	run.runs = runs.map(cloneRunDetails);
	run.error = summarizeErrors(runs);
	run.resumable = canResumeRun(run);
}

function updateRunTimestamps(run: AgentRecentRun, terminal: boolean): void {
	run.updatedAt = nowIso();
	if (!terminal) return;
	run.endedAt = run.updatedAt;
	run.durationMs = Math.max(0, Date.parse(run.endedAt) - Date.parse(run.startedAt));
}

function applyRunDetails(
	run: AgentRecentRun,
	details: AgentToolDetails | AgentExecutionProgress,
	terminal = isTerminalStatus(details.status),
): void {
	run.status = details.status;
	updateRunTimestamps(run, terminal);
	refreshRunSummary(run, details.runs);
	if (run.status !== "interrupted") run.resumable = false;
	if (run.status === "completed" || run.status === "cancelled" || run.status === "failed") {
		liveRunControllers.delete(run.id);
	}
	notifyAgentRecentRunsChanged();
}

function markRunStopped(run: AgentRecentRun, status: "interrupted" | "cancelled", message?: string): void {
	run.status = status;
	updateRunTimestamps(run, true);
	run.runs = run.runs.map((child) => (child.status === "running" ? { ...child, status } : child));
	refreshRunSummary(run, run.runs);
	if (message) run.error = message;
	run.resumable = canResumeRun(run);
	if (status === "cancelled") {
		run.resumable = false;
		liveRunControllers.delete(run.id);
	}
	notifyAgentRecentRunsChanged();
}

function findMutableRun(runId: string): AgentRecentRun | undefined {
	return recentRuns.find((run) => run.id === runId);
}

export function startAgentRecentRun(
	mode: AgentToolMode,
	tasks: Array<{ agent: string; task: string }>,
	options?: { background?: boolean },
): AgentRecentRun {
	const timestamp = nowIso();
	const run: AgentRecentRun = {
		id: `agent-${nextRunId++}`,
		mode,
		execution: options?.background ? "background" : "foreground",
		status: "running",
		agents: tasks.map((task) => task.agent),
		tasks: tasks.map((task) => task.task),
		startedAt: timestamp,
		updatedAt: timestamp,
		outputPaths: [],
		sessionRefs: [],
		runs: [],
		resumable: false,
	};
	recentRuns.unshift(run);
	if (recentRuns.length > MAX_RECENT_RUNS) recentRuns.length = MAX_RECENT_RUNS;
	notifyAgentRecentRunsChanged();
	return run;
}

export function updateAgentRecentRunProgress(run: AgentRecentRun, details: AgentExecutionProgress): void {
	applyRunDetails(run, details, details.status !== "running");
}

export function finishAgentRecentRun(run: AgentRecentRun, details: AgentToolDetails): void {
	applyRunDetails(run, details, true);
}

export function failAgentRecentRun(run: AgentRecentRun, error: unknown): void {
	run.status = "failed";
	updateRunTimestamps(run, true);
	run.error = error instanceof Error ? error.message : String(error);
	run.resumable = false;
	liveRunControllers.delete(run.id);
	notifyAgentRecentRunsChanged();
}

export function attachAgentRecentRunController(runId: string, controller: AgentRecentRunController): void {
	liveRunControllers.set(runId, controller);
}

export function detachAgentRecentRunController(runId: string): void {
	liveRunControllers.delete(runId);
}

export function restartAgentRecentRun(run: AgentRecentRun): void {
	run.status = "running";
	run.updatedAt = nowIso();
	run.endedAt = undefined;
	run.durationMs = undefined;
	run.error = undefined;
	run.resumable = false;
	run.runs = run.runs.map((child) => (child.status === "interrupted" ? { ...child, status: "running" } : child));
	notifyAgentRecentRunsChanged();
}

export async function interruptAgentRecentRun(runId: string): Promise<AgentRunControlResult> {
	const run = findMutableRun(runId);
	if (!run) return { ok: false, message: `Run not found: ${runId}` };
	if (run.status === "interrupted")
		return { ok: true, message: `${runId} is already interrupted`, run: cloneRecentRun(run) };
	if (run.status !== "running")
		return { ok: false, message: `${runId} is not running (status: ${run.status})`, run: cloneRecentRun(run) };
	const controller = liveRunControllers.get(runId);
	if (!controller?.interrupt) return { ok: false, message: `${runId} is not interruptible`, run: cloneRecentRun(run) };
	await controller.interrupt();
	if (run.status === "running") markRunStopped(run, "interrupted", "Interrupted by operator");
	return { ok: true, message: `Interrupted ${runId}`, run: cloneRecentRun(run) };
}

export async function cancelAgentRecentRun(runId: string): Promise<AgentRunControlResult> {
	const run = findMutableRun(runId);
	if (!run) return { ok: false, message: `Run not found: ${runId}` };
	if (run.status !== "running" && run.status !== "interrupted") {
		return { ok: false, message: `${runId} is not cancellable (status: ${run.status})`, run: cloneRecentRun(run) };
	}
	const controller = liveRunControllers.get(runId);
	if (!controller?.cancel) return { ok: false, message: `${runId} is not cancellable`, run: cloneRecentRun(run) };
	await controller.cancel();
	markRunStopped(run, "cancelled", "Cancelled by operator");
	return { ok: true, message: `Cancelled ${runId}`, run: cloneRecentRun(run) };
}

export async function resumeAgentRecentRun(runId: string, prompt?: string): Promise<AgentRunControlResult> {
	const run = findMutableRun(runId);
	if (!run) return { ok: false, message: `Run not found: ${runId}` };
	if (run.status === "running") return { ok: false, message: `${runId} is already running`, run: cloneRecentRun(run) };
	if (!run.resumable) return { ok: false, message: `${runId} is not resumable`, run: cloneRecentRun(run) };
	const controller = liveRunControllers.get(runId);
	if (!controller?.resume)
		return { ok: false, message: `${runId} cannot resume in this process`, run: cloneRecentRun(run) };
	await controller.resume(prompt);
	return { ok: true, message: `Resumed ${runId}`, run: cloneRecentRun(run) };
}

export function listAgentRecentRuns(): AgentRecentRun[] {
	return recentRuns.map(cloneRecentRun);
}

export function clearAgentRecentRunsForTests(): void {
	recentRuns.length = 0;
	liveRunControllers.clear();
	recentRunListeners.clear();
	nextRunId = 1;
}

function formatUsage(run: AgentRunDetails): string | undefined {
	if (!run.usage) return undefined;
	const cache =
		run.usage.cacheRead || run.usage.cacheWrite ? ` cache r/w ${run.usage.cacheRead}/${run.usage.cacheWrite}` : "";
	const cost = run.usage.cost.total > 0 ? ` $${run.usage.cost.total.toFixed(4)}` : "";
	return `${run.usage.totalTokens} tok${cache}${cost}`;
}

function formatRunDetail(run: AgentRunDetails, index: number): string[] {
	const lines = [`${index + 1}. ${run.agent} ${run.status} ${formatChildDuration(run)}`];
	lines.push(`   session: ${run.sessionPath ?? run.sessionId ?? "n/a"}`);
	lines.push(`   tools: ${run.toolCallCount}${run.currentToolName ? ` current ${run.currentToolName}` : ""}`);
	if (run.recentToolCalls.length > 0) {
		lines.push("   recent tools:");
		for (const tool of run.recentToolCalls.slice(-8)) {
			lines.push(
				`   - ${tool.name}${tool.argsPreview ? ` ${tool.argsPreview}` : ""}${tool.isError ? " (error)" : ""}`,
			);
		}
	}
	if (run.invokedSkills.count > 0)
		lines.push(`   invoked skills: ${run.invokedSkills.names.join(", ")} (${run.invokedSkills.count})`);
	if (run.loadedSkills.length > 0) lines.push(`   loaded skills: ${run.loadedSkills.join(", ")}`);
	const usage = formatUsage(run);
	if (usage) lines.push(`   usage: ${usage}`);
	if (run.outputPath) lines.push(`   output: ${run.outputPath}`);
	if (run.error) lines.push(`   error: ${run.error}`);
	return lines;
}

function formatDuration(run: AgentRecentRun): string {
	return run.durationMs !== undefined ? `${run.durationMs}ms` : "running";
}

function formatChildDuration(run: AgentRunDetails): string {
	return run.durationMs !== undefined ? `${run.durationMs}ms` : "running";
}

function countRunsByStatus(runs: AgentRecentRun[], status: AgentToolStatus): number {
	return runs.filter((run) => run.status === status).length;
}

function formatCount(count: number, label: string): string | undefined {
	if (count === 0) return undefined;
	return `${count} ${label}`;
}

export function formatAgentFooterStatus(runs = listAgentRecentRuns()): string | undefined {
	const backgroundRuns = runs.filter((run) => run.execution === "background");
	if (backgroundRuns.length === 0) return undefined;
	const statusParts = [
		formatCount(countRunsByStatus(backgroundRuns, "running"), "running"),
		formatCount(countRunsByStatus(backgroundRuns, "interrupted"), "interrupted"),
		formatCount(backgroundRuns.filter((run) => run.resumable).length, "resumable"),
		formatCount(countRunsByStatus(backgroundRuns, "failed"), "failed"),
		formatCount(countRunsByStatus(backgroundRuns, "cancelled"), "cancelled"),
		formatCount(countRunsByStatus(backgroundRuns, "completed"), "completed"),
	].filter((part): part is string => Boolean(part));
	const latest = backgroundRuns[0];
	const latestAgents = latest.agents.length > 0 ? ` ${latest.agents.join(",")}` : "";
	const latestLabel = `${latest.id} ${latest.status}${latest.resumable ? " resumable" : ""}${latestAgents}`;
	return `Agents: ${statusParts.join(", ")} · ${latestLabel} · /agents runs`;
}

export function formatAgentStatus(runs = listAgentRecentRuns(), detailId?: string): string {
	const lines = [
		"Native agent status",
		"",
		"Background control: native background runs support status, interrupt, cancel, and single-run resume.",
	];
	if (runs.length === 0) return [...lines, "", "No recent native agent runs."].join("\n");
	const detailRun = detailId ? runs.find((run) => run.id === detailId) : undefined;
	if (detailId && !detailRun) return [...lines, "", `Run not found: ${detailId}`].join("\n");
	if (detailRun) {
		lines.push(
			"",
			`${detailRun.id} ${detailRun.mode} ${detailRun.execution} ${detailRun.status} ${formatDuration(detailRun)}`,
			`started: ${detailRun.startedAt}`,
			`updated: ${detailRun.updatedAt}`,
		);
		if (detailRun.resumable) lines.push(`resumable: yes (/agents resume ${detailRun.id} [-- prompt])`);
		if (detailRun.error) lines.push(`error: ${detailRun.error}`);
		if (detailRun.runs.length === 0) lines.push("No child run details recorded yet.");
		for (const [index, run] of detailRun.runs.entries()) lines.push(...formatRunDetail(run, index));
		return lines.join("\n");
	}
	lines.push("");
	for (const run of runs) {
		const outputs = run.outputPaths.length > 0 ? ` outputs: ${run.outputPaths.join(", ")}` : "";
		const sessions =
			run.sessionRefs.length > 0
				? ` sessions: ${run.sessionRefs
						.map((s) => s.sessionId ?? s.sessionPath)
						.filter(Boolean)
						.join(", ")}`
				: "";
		const error = run.error ? ` error: ${run.error}` : "";
		const resumable = run.resumable ? " resumable" : "";
		lines.push(
			`${run.id} ${run.mode} ${run.execution} ${run.status}${resumable} ${formatDuration(run)} agents: ${run.agents.join(", ")}${sessions}${outputs}${error}`,
		);
	}
	lines.push(
		"",
		"Detail: /agents-status <run-id> or /agents status <run-id>",
		"Control: /agents interrupt <run-id>, /agents cancel <run-id>, /agents resume <run-id> [-- prompt]",
	);
	return lines.join("\n");
}

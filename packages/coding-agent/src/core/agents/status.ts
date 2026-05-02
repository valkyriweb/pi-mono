import type { AgentRunDetails, AgentToolDetails, AgentToolMode, AgentToolStatus } from "./types.js";

export interface AgentRecentRun {
	id: string;
	mode: AgentToolMode;
	status: AgentToolStatus;
	agents: string[];
	tasks: string[];
	startedAt: string;
	endedAt?: string;
	durationMs?: number;
	outputPaths: string[];
	sessionRefs: Array<{ agent: string; sessionId?: string; sessionPath?: string }>;
	runs: AgentRunDetails[];
	error?: string;
}

const MAX_RECENT_RUNS = 25;
const recentRuns: AgentRecentRun[] = [];
let nextRunId = 1;

function nowIso(): string {
	return new Date().toISOString();
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

export function startAgentRecentRun(
	mode: AgentToolMode,
	tasks: Array<{ agent: string; task: string }>,
): AgentRecentRun {
	const run: AgentRecentRun = {
		id: `agent-${nextRunId++}`,
		mode,
		status: "running",
		agents: tasks.map((task) => task.agent),
		tasks: tasks.map((task) => task.task),
		startedAt: nowIso(),
		outputPaths: [],
		sessionRefs: [],
		runs: [],
	};
	recentRuns.unshift(run);
	if (recentRuns.length > MAX_RECENT_RUNS) recentRuns.length = MAX_RECENT_RUNS;
	return run;
}

export function finishAgentRecentRun(run: AgentRecentRun, details: AgentToolDetails): void {
	run.status = details.status;
	run.endedAt = nowIso();
	run.durationMs = Math.max(0, Date.parse(run.endedAt) - Date.parse(run.startedAt));
	run.outputPaths = summarizeOutputs(details.runs);
	run.sessionRefs = summarizeSessions(details.runs);
	run.runs = details.runs.map(cloneRunDetails);
	run.error = summarizeErrors(details.runs);
}

export function failAgentRecentRun(run: AgentRecentRun, error: unknown): void {
	run.status = "failed";
	run.endedAt = nowIso();
	run.durationMs = Math.max(0, Date.parse(run.endedAt) - Date.parse(run.startedAt));
	run.error = error instanceof Error ? error.message : String(error);
}

export function listAgentRecentRuns(): AgentRecentRun[] {
	return recentRuns.map((run) => ({
		...run,
		agents: [...run.agents],
		tasks: [...run.tasks],
		outputPaths: [...run.outputPaths],
		sessionRefs: run.sessionRefs.map((session) => ({ ...session })),
		runs: run.runs.map(cloneRunDetails),
	}));
}

export function clearAgentRecentRunsForTests(): void {
	recentRuns.length = 0;
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
	const lines = [`${index + 1}. ${run.agent} ${run.status} ${run.durationMs}ms`];
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

export function formatAgentStatus(runs = listAgentRecentRuns(), detailId?: string): string {
	const lines = [
		"Native agent status",
		"",
		"Background control: unsupported in native Pi; recent foreground runs are listed below.",
	];
	if (runs.length === 0) return [...lines, "", "No recent native agent runs."].join("\n");
	const detailRun = detailId ? runs.find((run) => run.id === detailId) : undefined;
	if (detailId && !detailRun) return [...lines, "", `Run not found: ${detailId}`].join("\n");
	if (detailRun) {
		lines.push("", `${detailRun.id} ${detailRun.mode} ${detailRun.status} ${detailRun.durationMs ?? "running"}ms`);
		for (const [index, run] of detailRun.runs.entries()) lines.push(...formatRunDetail(run, index));
		return lines.join("\n");
	}
	lines.push("");
	for (const run of runs) {
		const duration = run.durationMs !== undefined ? `${run.durationMs}ms` : "running";
		const outputs = run.outputPaths.length > 0 ? ` outputs: ${run.outputPaths.join(", ")}` : "";
		const sessions =
			run.sessionRefs.length > 0
				? ` sessions: ${run.sessionRefs
						.map((s) => s.sessionId ?? s.sessionPath)
						.filter(Boolean)
						.join(", ")}`
				: "";
		const error = run.error ? ` error: ${run.error}` : "";
		lines.push(
			`${run.id} ${run.mode} ${run.status} ${duration} agents: ${run.agents.join(", ")}${sessions}${outputs}${error}`,
		);
	}
	lines.push("", "Detail: /agents-status <run-id> or /agents status <run-id>");
	return lines.join("\n");
}

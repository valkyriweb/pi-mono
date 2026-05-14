import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Container, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { spawn } from "child_process";
import { type Static, Type } from "typebox";
import { keyHint } from "../../modes/interactive/components/keybinding-hints.js";
import { truncateToVisualLines } from "../../modes/interactive/components/visual-truncate.js";
import { theme } from "../../modes/interactive/theme/theme.js";
import { waitForChildProcess } from "../../utils/child-process.js";
import {
	getShellConfig,
	getShellEnv,
	killProcessTree,
	trackDetachedChildPid,
	untrackDetachedChildPid,
} from "../../utils/shell.js";
import type { ToolDefinition, ToolRenderResultOptions } from "../extensions/types.js";
import { OutputAccumulator } from "./output-accumulator.js";
import { getTextOutput, invalidArgText, str } from "./render-utils.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, type TruncationResult } from "./truncate.js";

const bashSchema = Type.Object({
	command: Type.String({ description: "Bash command to execute" }),
	timeout: Type.Optional(
		Type.Union([
			Type.Number({ description: "Timeout in seconds. Defaults to 300 seconds." }),
			Type.Literal(false, { description: "Disable timeout for this command." }),
		]),
	),
	run_in_background: Type.Optional(
		Type.Boolean({
			description:
				"Set to true to spawn the command in the background. Returns immediately with a bgId. Read accumulated output with bash_output(bgId) and stop it with bash_kill(bgId). Use this for any command likely to exceed ~30s when you do not need its stdout immediately. For continuous log streams that should wake the agent on each batch, prefer the Monitor tool (monitor_start) instead.",
		}),
	),
});

// ---------- Background bash registry ----------
//
// Background bash jobs are tracked in-process so siblings bash_output / bash_kill
// can read or stop them by id. Output is appended to a log file under
// ~/.pi/agent/bash-bg/<bgId>.log so it survives process exit and can be tailed.

interface BashBgJob {
	id: string;
	command: string;
	cwd: string;
	pid: number | undefined;
	startedAt: number;
	status: "running" | "exited" | "killed" | "failed";
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	logPath: string;
	endedAt: number | undefined;
	error: string | undefined;
}

const bashBgJobs = new Map<string, BashBgJob>();

function bashBgLogDir(): string {
	const dir = join(homedir(), ".pi", "agent", "bash-bg");
	mkdirSync(dir, { recursive: true });
	return dir;
}

function nextBashBgId(): string {
	return `bg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getBashBgJob(id: string): BashBgJob | undefined {
	return bashBgJobs.get(id);
}

export function listBashBgJobs(): BashBgJob[] {
	return [...bashBgJobs.values()];
}

/**
 * Terminate every running background bash job and clear the registry.
 * Called from AgentSession.dispose() so bg processes don't leak across
 * /clear, fork, switchSession, reload, or process exit.
 */
export function killAllBashBgJobs(): void {
	for (const job of bashBgJobs.values()) {
		if (job.status === "running" && job.pid) {
			try {
				killProcessTree(job.pid);
			} catch {
				// best-effort; process may already be gone
			}
			job.status = "killed";
			job.endedAt = Date.now();
		}
	}
	bashBgJobs.clear();
}

function spawnBashBackground(command: string, cwd: string, shellPath?: string, commandPrefix?: string): BashBgJob {
	const id = nextBashBgId();
	const resolvedCommand = commandPrefix ? `${commandPrefix}\n${command}` : command;
	const logPath = join(bashBgLogDir(), `${id}.log`);
	const fd = openSync(logPath, "a");
	const { shell, args } = getShellConfig(shellPath);
	if (!existsSync(cwd)) {
		closeSync(fd);
		throw new Error(`Working directory does not exist: ${cwd}`);
	}
	const child = spawn(shell, [...args, resolvedCommand], {
		cwd,
		detached: process.platform !== "win32",
		env: getShellEnv(),
		stdio: ["ignore", fd, fd],
	});
	closeSync(fd);
	if (child.pid) trackDetachedChildPid(child.pid);
	const job: BashBgJob = {
		id,
		command: resolvedCommand,
		cwd,
		pid: child.pid,
		startedAt: Date.now(),
		status: "running",
		exitCode: null,
		signal: null,
		logPath,
		endedAt: undefined,
		error: undefined,
	};
	bashBgJobs.set(id, job);
	child.on("error", (err) => {
		job.status = "failed";
		job.error = err.message;
		job.endedAt = Date.now();
		if (child.pid) untrackDetachedChildPid(child.pid);
	});
	child.on("exit", (code, signal) => {
		job.exitCode = code;
		job.signal = signal;
		job.endedAt = Date.now();
		if (job.status === "running") {
			job.status = signal ? "killed" : "exited";
		}
		if (child.pid) untrackDetachedChildPid(child.pid);
	});
	// Don't keep the event loop alive on our behalf — caller decides.
	child.unref();
	return job;
}

function readBashBgLog(
	job: BashBgJob,
	opts: { mode: "tail" | "head" | "all"; maxLines: number },
): { lines: string[]; totalLines: number; truncated: boolean } {
	let content = "";
	try {
		content = readFileSync(job.logPath, "utf8");
	} catch {
		return { lines: [], totalLines: 0, truncated: false };
	}
	const all = content.split("\n");
	// Trailing newline produces an empty last element; drop it.
	if (all.length > 0 && all[all.length - 1] === "") all.pop();
	const total = all.length;
	const max = Math.max(1, Math.min(opts.maxLines, 1000));
	if (opts.mode === "head") {
		const slice = all.slice(0, max);
		return { lines: slice, totalLines: total, truncated: total > slice.length };
	}
	if (opts.mode === "all") {
		const slice = all.slice(0, max);
		return { lines: slice, totalLines: total, truncated: total > slice.length };
	}
	const slice = all.slice(Math.max(0, total - max));
	return { lines: slice, totalLines: total, truncated: total > slice.length };
}

export type BashToolInput = Static<typeof bashSchema>;

export interface BashBgDetails {
	bgId: string;
	pid: number | undefined;
	logPath: string;
	command: string;
	startedAt: number;
}

export interface BashToolDetails {
	truncation?: TruncationResult;
	fullOutputPath?: string;
}

/**
 * Pluggable operations for the bash tool.
 * Override these to delegate command execution to remote systems (for example SSH).
 */
export interface BashOperations {
	/**
	 * Execute a command and stream output.
	 * @param command The command to execute
	 * @param cwd Working directory
	 * @param options Execution options
	 * @returns Promise resolving to exit code (null if killed)
	 */
	exec: (
		command: string,
		cwd: string,
		options: {
			onData: (data: Buffer) => void;
			signal?: AbortSignal;
			timeout?: number;
			env?: NodeJS.ProcessEnv;
		},
	) => Promise<{ exitCode: number | null }>;
}

/**
 * Create bash operations using pi's built-in local shell execution backend.
 *
 * This is useful for extensions that intercept user_bash and still want pi's
 * standard local shell behavior while wrapping or rewriting commands.
 */
export function createLocalBashOperations(options?: { shellPath?: string }): BashOperations {
	return {
		exec: (command, cwd, { onData, signal, timeout, env }) => {
			return new Promise((resolve, reject) => {
				const { shell, args } = getShellConfig(options?.shellPath);
				if (!existsSync(cwd)) {
					reject(new Error(`Working directory does not exist: ${cwd}\nCannot execute bash commands.`));
					return;
				}
				const child = spawn(shell, [...args, command], {
					cwd,
					detached: process.platform !== "win32",
					env: env ?? getShellEnv(),
					stdio: ["ignore", "pipe", "pipe"],
				});
				if (child.pid) trackDetachedChildPid(child.pid);
				let timedOut = false;
				let timeoutHandle: NodeJS.Timeout | undefined;
				// Set timeout if provided.
				if (timeout !== undefined && timeout > 0) {
					timeoutHandle = setTimeout(() => {
						timedOut = true;
						if (child.pid) killProcessTree(child.pid);
					}, timeout * 1000);
				}
				// Stream stdout and stderr.
				child.stdout?.on("data", onData);
				child.stderr?.on("data", onData);
				// Handle abort signal by killing the entire process tree.
				const onAbort = () => {
					if (child.pid) killProcessTree(child.pid);
				};
				if (signal) {
					if (signal.aborted) onAbort();
					else signal.addEventListener("abort", onAbort, { once: true });
				}
				// Handle shell spawn errors and wait for the process to terminate without hanging
				// on inherited stdio handles held by detached descendants.
				waitForChildProcess(child)
					.then((code) => {
						if (child.pid) untrackDetachedChildPid(child.pid);
						if (timeoutHandle) clearTimeout(timeoutHandle);
						if (signal) signal.removeEventListener("abort", onAbort);
						if (signal?.aborted) {
							reject(new Error("aborted"));
							return;
						}
						if (timedOut) {
							reject(new Error(`timeout:${timeout}`));
							return;
						}
						resolve({ exitCode: code });
					})
					.catch((err) => {
						if (child.pid) untrackDetachedChildPid(child.pid);
						if (timeoutHandle) clearTimeout(timeoutHandle);
						if (signal) signal.removeEventListener("abort", onAbort);
						reject(err);
					});
			});
		},
	};
}

export interface BashSpawnContext {
	command: string;
	cwd: string;
	env: NodeJS.ProcessEnv;
}

export type BashSpawnHook = (context: BashSpawnContext) => BashSpawnContext;

function resolveSpawnContext(command: string, cwd: string, spawnHook?: BashSpawnHook): BashSpawnContext {
	const baseContext: BashSpawnContext = { command, cwd, env: { ...getShellEnv() } };
	return spawnHook ? spawnHook(baseContext) : baseContext;
}

export interface BashToolOptions {
	/** Custom operations for command execution. Default: local shell */
	operations?: BashOperations;
	/** Command prefix prepended to every command (for example shell setup commands) */
	commandPrefix?: string;
	/** Optional explicit shell path from settings */
	shellPath?: string;
	/** Hook to adjust command, cwd, or env before execution */
	spawnHook?: BashSpawnHook;
}

const BASH_PREVIEW_LINES = 5;
const BASH_UPDATE_THROTTLE_MS = 100;
const DEFAULT_BASH_TIMEOUT_SECONDS = 300;

type BashRenderState = {
	startedAt: number | undefined;
	endedAt: number | undefined;
	interval: NodeJS.Timeout | undefined;
};

type BashResultRenderState = {
	cachedWidth: number | undefined;
	cachedLines: string[] | undefined;
	cachedSkipped: number | undefined;
};

class BashResultRenderComponent extends Container {
	state: BashResultRenderState = {
		cachedWidth: undefined,
		cachedLines: undefined,
		cachedSkipped: undefined,
	};
}

function formatDuration(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}

function resolveBashTimeout(timeout: number | false | undefined): number | undefined {
	if (timeout === false) return undefined;
	return timeout ?? DEFAULT_BASH_TIMEOUT_SECONDS;
}

function formatBashCall(args: { command?: string; timeout?: number | false } | undefined): string {
	const command = str(args?.command);
	const timeout = resolveBashTimeout(args?.timeout as number | false | undefined);
	const timeoutSuffix = timeout ? theme.fg("muted", ` (timeout ${timeout}s)`) : theme.fg("muted", " (no timeout)");
	const commandDisplay = command === null ? invalidArgText(theme) : command ? command : theme.fg("toolOutput", "...");
	return theme.fg("toolTitle", theme.bold(`$ ${commandDisplay}`)) + timeoutSuffix;
}

function rebuildBashResultRenderComponent(
	component: BashResultRenderComponent,
	result: {
		content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
		details?: BashToolDetails;
	},
	options: ToolRenderResultOptions,
	showImages: boolean,
	startedAt: number | undefined,
	endedAt: number | undefined,
): void {
	const state = component.state;
	component.clear();

	const output = getTextOutput(result as any, showImages).trim();

	if (output) {
		const styledOutput = output
			.split("\n")
			.map((line) => theme.fg("toolOutput", line))
			.join("\n");

		if (options.expanded) {
			component.addChild(new Text(`\n${styledOutput}`, 0, 0));
		} else {
			component.addChild({
				render: (width: number) => {
					if (state.cachedLines === undefined || state.cachedWidth !== width) {
						const preview = truncateToVisualLines(styledOutput, BASH_PREVIEW_LINES, width);
						state.cachedLines = preview.visualLines;
						state.cachedSkipped = preview.skippedCount;
						state.cachedWidth = width;
					}
					if (state.cachedSkipped && state.cachedSkipped > 0) {
						const hint =
							theme.fg("muted", `... (${state.cachedSkipped} earlier lines,`) +
							` ${keyHint("app.tools.expand", "to expand")})`;
						return ["", truncateToWidth(hint, width, "..."), ...(state.cachedLines ?? [])];
					}
					return ["", ...(state.cachedLines ?? [])];
				},
				invalidate: () => {
					state.cachedWidth = undefined;
					state.cachedLines = undefined;
					state.cachedSkipped = undefined;
				},
			});
		}
	}

	const truncation = result.details?.truncation;
	const fullOutputPath = result.details?.fullOutputPath;
	if (truncation?.truncated || fullOutputPath) {
		const warnings: string[] = [];
		if (fullOutputPath) {
			warnings.push(`Full output: ${fullOutputPath}`);
		}
		if (truncation?.truncated) {
			if (truncation.truncatedBy === "lines") {
				warnings.push(`Truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`);
			} else {
				warnings.push(
					`Truncated: ${truncation.outputLines} lines shown (${formatSize(truncation.maxBytes ?? DEFAULT_MAX_BYTES)} limit)`,
				);
			}
		}
		component.addChild(new Text(`\n${theme.fg("warning", `[${warnings.join(". ")}]`)}`, 0, 0));
	}

	if (startedAt !== undefined) {
		const label = options.isPartial ? "Elapsed" : "Took";
		const endTime = endedAt ?? Date.now();
		component.addChild(new Text(`\n${theme.fg("muted", `${label} ${formatDuration(endTime - startedAt)}`)}`, 0, 0));
	}
}

export function createBashToolDefinition(
	cwd: string,
	options?: BashToolOptions,
): ToolDefinition<typeof bashSchema, BashToolDetails | undefined, BashRenderState> {
	const ops = options?.operations ?? createLocalBashOperations({ shellPath: options?.shellPath });
	const commandPrefix = options?.commandPrefix;
	const spawnHook = options?.spawnHook;
	return {
		name: "bash",
		label: "bash",
		description: `Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Optionally provide a timeout in seconds.\n\nBackground mode: pass run_in_background:true to spawn the command detached and return immediately with a bgId. Use this whenever you don't need the result right away (long builds, installers, pushes, test suites, watchers you'll come back to). Read accumulated output with bash_output(bgId) and stop it with bash_kill(bgId). For continuous streams you want to react to live (dev servers, log tails, queue consumers), use monitor_start instead \u2014 it wakes the agent on output batches.`,
		promptSnippet:
			"Execute bash commands; set run_in_background:true for long-running work and read later with bash_output",
		promptGuidelines: [
			"Use run_in_background:true for any command likely to exceed ~30s when you don't need the output immediately (builds, installers, kubectl rollouts, long test suites, dev servers).",
			"Do NOT poll a background bash job with sleep loops. Call bash_output(bgId) when you need its current state, or use monitor_start instead if you want to be woken on every output batch.",
			"Always stop background jobs you started but no longer need with bash_kill(bgId).",
		],
		parameters: bashSchema,
		async execute(
			_toolCallId,
			{
				command,
				timeout,
				run_in_background,
			}: { command: string; timeout?: number | false; run_in_background?: boolean },
			signal?: AbortSignal,
			onUpdate?,
			_ctx?,
		) {
			// Background fast-path: spawn detached, return immediately. No timeout, no output streaming.
			if (run_in_background) {
				const job = spawnBashBackground(command, cwd, options?.shellPath, commandPrefix);
				const text =
					`Backgrounded bash job ${job.id} (pid=${job.pid ?? "unknown"}).\n` +
					`Command: ${command}\n` +
					`Log: ${job.logPath}\n\n` +
					`Read output with bash_output(bgId="${job.id}"). Stop with bash_kill(bgId="${job.id}").`;
				return {
					content: [{ type: "text", text }],
					details: {
						bgId: job.id,
						pid: job.pid,
						logPath: job.logPath,
						command,
						startedAt: job.startedAt,
					} as BashBgDetails as any,
				};
			}
			const timeoutSeconds = resolveBashTimeout(timeout);
			const resolvedCommand = commandPrefix ? `${commandPrefix}\n${command}` : command;
			const spawnContext = resolveSpawnContext(resolvedCommand, cwd, spawnHook);
			const output = new OutputAccumulator({ tempFilePrefix: "pi-bash" });
			let updateTimer: NodeJS.Timeout | undefined;
			let updateDirty = false;
			let lastUpdateAt = 0;

			const emitOutputUpdate = () => {
				if (!onUpdate || !updateDirty) return;
				updateDirty = false;
				lastUpdateAt = Date.now();
				const snapshot = output.snapshot({ persistIfTruncated: true });
				onUpdate({
					content: [{ type: "text", text: snapshot.content || "" }],
					details: {
						truncation: snapshot.truncation.truncated ? snapshot.truncation : undefined,
						fullOutputPath: snapshot.fullOutputPath,
					},
				});
			};

			const clearUpdateTimer = () => {
				if (updateTimer) {
					clearTimeout(updateTimer);
					updateTimer = undefined;
				}
			};

			const scheduleOutputUpdate = () => {
				if (!onUpdate) return;
				updateDirty = true;
				const delay = BASH_UPDATE_THROTTLE_MS - (Date.now() - lastUpdateAt);
				if (delay <= 0) {
					clearUpdateTimer();
					emitOutputUpdate();
					return;
				}
				updateTimer ??= setTimeout(() => {
					updateTimer = undefined;
					emitOutputUpdate();
				}, delay);
			};

			if (onUpdate) {
				onUpdate({ content: [], details: undefined });
			}

			const handleData = (data: Buffer) => {
				output.append(data);
				scheduleOutputUpdate();
			};

			const finishOutput = async () => {
				output.finish();
				clearUpdateTimer();
				emitOutputUpdate();
				const snapshot = output.snapshot({ persistIfTruncated: true });
				await output.closeTempFile();
				return snapshot;
			};

			const formatOutput = (snapshot: Awaited<ReturnType<typeof finishOutput>>, emptyText = "(no output)") => {
				const truncation = snapshot.truncation;
				let text = snapshot.content || emptyText;
				let details: BashToolDetails | undefined;
				if (truncation.truncated) {
					details = { truncation, fullOutputPath: snapshot.fullOutputPath };
					const startLine = truncation.totalLines - truncation.outputLines + 1;
					const endLine = truncation.totalLines;
					if (truncation.lastLinePartial) {
						const lastLineSize = formatSize(output.getLastLineBytes());
						text += `\n\n[Showing last ${formatSize(truncation.outputBytes)} of line ${endLine} (line is ${lastLineSize}). Full output: ${snapshot.fullOutputPath}]`;
					} else if (truncation.truncatedBy === "lines") {
						text += `\n\n[Showing lines ${startLine}-${endLine} of ${truncation.totalLines}. Full output: ${snapshot.fullOutputPath}]`;
					} else {
						text += `\n\n[Showing lines ${startLine}-${endLine} of ${truncation.totalLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Full output: ${snapshot.fullOutputPath}]`;
					}
				}
				return { text, details };
			};

			const appendStatus = (text: string, status: string) => `${text ? `${text}\n\n` : ""}${status}`;

			try {
				let exitCode: number | null;
				try {
					const result = await ops.exec(spawnContext.command, spawnContext.cwd, {
						onData: handleData,
						signal,
						timeout: timeoutSeconds,
						env: spawnContext.env,
					});
					exitCode = result.exitCode;
				} catch (err) {
					const snapshot = await finishOutput();
					const { text } = formatOutput(snapshot, "");
					if (err instanceof Error && err.message === "aborted") {
						throw new Error(appendStatus(text, "Command aborted"));
					}
					if (err instanceof Error && err.message.startsWith("timeout:")) {
						const timeoutSecs = err.message.split(":")[1];
						throw new Error(appendStatus(text, `Command timed out after ${timeoutSecs} seconds`));
					}
					throw err;
				}

				const snapshot = await finishOutput();
				const { text: outputText, details } = formatOutput(snapshot);
				if (exitCode !== 0 && exitCode !== null) {
					throw new Error(appendStatus(outputText, `Command exited with code ${exitCode}`));
				}
				return { content: [{ type: "text", text: outputText }], details };
			} finally {
				clearUpdateTimer();
			}
		},
		renderCall(args, _theme, context) {
			const state = context.state;
			if (context.executionStarted && state.startedAt === undefined) {
				state.startedAt = Date.now();
				state.endedAt = undefined;
			}
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatBashCall(args));
			return text;
		},
		renderResult(result, options, _theme, context) {
			const state = context.state;
			if (state.startedAt !== undefined && options.isPartial && !state.interval) {
				state.interval = setInterval(() => context.invalidate(), 1000);
			}
			if (!options.isPartial || context.isError) {
				state.endedAt ??= Date.now();
				if (state.interval) {
					clearInterval(state.interval);
					state.interval = undefined;
				}
			}
			const component =
				(context.lastComponent as BashResultRenderComponent | undefined) ?? new BashResultRenderComponent();
			rebuildBashResultRenderComponent(
				component,
				result as any,
				options,
				context.showImages,
				state.startedAt,
				state.endedAt,
			);
			component.invalidate();
			return component;
		},
	};
}

export function createBashTool(cwd: string, options?: BashToolOptions): AgentTool<typeof bashSchema> {
	return wrapToolDefinition(createBashToolDefinition(cwd, options));
}

// ===========================================================================
// bash_output — read accumulated output from a backgrounded bash job
// ===========================================================================

const bashOutputSchema = Type.Object({
	bgId: Type.String({ description: "Background job id returned by bash(run_in_background:true)." }),
	mode: Type.Optional(
		Type.Union([Type.Literal("tail"), Type.Literal("head"), Type.Literal("all")], {
			description: "Which slice of the log to return. Default: tail.",
		}),
	),
	maxLines: Type.Optional(Type.Number({ description: "Maximum lines to return (default 200, hard cap 1000)." })),
});

export type BashOutputToolInput = Static<typeof bashOutputSchema>;

export function createBashOutputToolDefinition(): ToolDefinition<typeof bashOutputSchema, BashBgJob | undefined> {
	return {
		name: "bash_output",
		label: "bash_output",
		description:
			"Read accumulated stdout/stderr from a backgrounded bash job (started via bash with run_in_background:true). Returns a bounded slice of the log plus job status. Does not block or wait \u2014 just shows current state. Use this when you need to peek at progress or grab results after the job has completed. For live streaming with wake-on-output behavior, use monitor_start instead.",
		promptSnippet: "Read the log of a backgrounded bash job by bgId",
		parameters: bashOutputSchema,
		async execute(_id, { bgId, mode, maxLines }) {
			const job = getBashBgJob(bgId);
			if (!job) {
				const known = [...bashBgJobs.keys()].slice(-5).join(", ") || "(none)";
				return {
					content: [{ type: "text", text: `No background bash job with bgId=${bgId}. Recent ids: ${known}` }],
					details: undefined,
				};
			}
			const { lines, totalLines, truncated } = readBashBgLog(job, {
				mode: mode ?? "tail",
				maxLines: maxLines ?? 200,
			});
			let logSize = 0;
			try {
				logSize = statSync(job.logPath).size;
			} catch {}
			const elapsed = ((job.endedAt ?? Date.now()) - job.startedAt) / 1000;
			const header =
				`bgId: ${job.id}\n` +
				`status: ${job.status}` +
				(job.status === "exited" ? ` (exit ${job.exitCode})` : "") +
				(job.status === "killed" && job.signal ? ` (${job.signal})` : "") +
				(job.status === "failed" && job.error ? ` (${job.error})` : "") +
				`\nelapsed: ${elapsed.toFixed(1)}s\n` +
				`log: ${job.logPath} (${(logSize / 1024).toFixed(1)} KB, ${totalLines} lines)` +
				(truncated ? ` \u2014 showing ${lines.length} of ${totalLines}` : "");
			const body = lines.length ? lines.join("\n") : "(no output yet)";
			return {
				content: [{ type: "text", text: `${header}\n\n${body}` }],
				details: job,
			};
		},
	};
}

export function createBashOutputTool(): AgentTool<typeof bashOutputSchema> {
	return wrapToolDefinition(createBashOutputToolDefinition());
}

// ===========================================================================
// bash_kill — stop a backgrounded bash job
// ===========================================================================

const bashKillSchema = Type.Object({
	bgId: Type.String({ description: "Background job id returned by bash(run_in_background:true)." }),
});

export type BashKillToolInput = Static<typeof bashKillSchema>;

export function createBashKillToolDefinition(): ToolDefinition<typeof bashKillSchema, BashBgJob | undefined> {
	return {
		name: "bash_kill",
		label: "bash_kill",
		description:
			"Stop a backgrounded bash job (started via bash with run_in_background:true). Sends SIGTERM to the whole process tree; the job moves to status=killed. Idempotent \u2014 calling on an already-finished job is safe and just reports state.",
		promptSnippet: "Stop a backgrounded bash job by bgId",
		parameters: bashKillSchema,
		async execute(_id, { bgId }) {
			const job = getBashBgJob(bgId);
			if (!job) {
				return {
					content: [{ type: "text", text: `No background bash job with bgId=${bgId}` }],
					details: undefined,
				};
			}
			if (job.status !== "running") {
				return {
					content: [
						{
							type: "text",
							text: `bgId=${bgId} already ${job.status} (exit ${job.exitCode}, signal ${job.signal ?? "none"}).`,
						},
					],
					details: job,
				};
			}
			if (job.pid) {
				try {
					killProcessTree(job.pid);
				} catch (err) {
					return {
						content: [
							{
								type: "text",
								text: `Failed to kill bgId=${bgId} (pid=${job.pid}): ${err instanceof Error ? err.message : String(err)}`,
							},
						],
						details: job,
					};
				}
			}
			job.status = "killed";
			job.endedAt = Date.now();
			return {
				content: [{ type: "text", text: `Killed bgId=${bgId} (pid=${job.pid ?? "unknown"}).` }],
				details: job,
			};
		},
	};
}

export function createBashKillTool(): AgentTool<typeof bashKillSchema> {
	return wrapToolDefinition(createBashKillToolDefinition());
}

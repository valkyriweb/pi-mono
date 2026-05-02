import { createInterface } from "node:readline";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Text } from "@mariozechner/pi-tui";
import { spawn } from "child_process";
import { readFileSync, statSync } from "fs";
import path from "path";
import { type Static, Type } from "typebox";
import { keyHint } from "../../modes/interactive/components/keybinding-hints.js";
import { ensureTool, getOptionalSearchToolPath, toolDisplayName } from "../../utils/tools-manager.js";
import type { ToolDefinition, ToolRenderResultOptions } from "../extensions/types.js";
import { resolveToCwd } from "./path-utils.js";
import { getTextOutput, invalidArgText, shortenPath, str } from "./render-utils.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";
import {
	DEFAULT_MAX_BYTES,
	formatSize,
	GREP_MAX_LINE_LENGTH,
	type TruncationResult,
	truncateHead,
	truncateLine,
} from "./truncate.js";

const grepSchema = Type.Object({
	pattern: Type.String({ description: "Search pattern (regex or literal string)" }),
	path: Type.Optional(Type.String({ description: "Directory or file to search (default: current directory)" })),
	glob: Type.Optional(Type.String({ description: "Filter files by glob pattern, e.g. '*.ts' or '**/*.spec.ts'" })),
	ignoreCase: Type.Optional(Type.Boolean({ description: "Case-insensitive search (default: false)" })),
	literal: Type.Optional(
		Type.Boolean({ description: "Treat pattern as literal string instead of regex (default: false)" }),
	),
	context: Type.Optional(
		Type.Number({ description: "Number of lines to show before and after each match (default: 0)" }),
	),
	limit: Type.Optional(Type.Number({ description: "Maximum number of matches to return (default: 100)" })),
	timeout: Type.Optional(
		Type.Number({ description: "Timeout in seconds (default: 30, max 300)", exclusiveMinimum: 0, maximum: 300 }),
	),
});

export type GrepToolInput = Static<typeof grepSchema>;
const DEFAULT_LIMIT = 100;
const DEFAULT_TIMEOUT_SECONDS = 30;
const MAX_TIMEOUT_SECONDS = 300;
const VCS_DIRS = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"];

type GrepBackend = "ugrep" | "rg";

interface GrepBackendCommand {
	backend: GrepBackend;
	command: string;
	args: string[];
}

export function buildUgrepArgs(input: {
	pattern: string;
	searchPath: string;
	glob?: string;
	ignoreCase?: boolean;
	literal?: boolean;
}): string[] {
	const args = ["--no-config", "-r", "-n", "--with-filename", "--ignore-files", "-.", "--color=never"];
	for (const vcsDir of VCS_DIRS) args.push("--exclude-dir", vcsDir);
	if (input.ignoreCase) args.push("--ignore-case");
	if (input.literal) args.push("--fixed-strings");
	if (input.glob) args.push("-g", input.glob);
	args.push("--", input.pattern, input.searchPath);
	return args;
}

export function buildRgArgs(input: {
	pattern: string;
	searchPath: string;
	glob?: string;
	ignoreCase?: boolean;
	literal?: boolean;
}): string[] {
	const args = ["--json", "--line-number", "--color=never", "--hidden"];
	if (input.ignoreCase) args.push("--ignore-case");
	if (input.literal) args.push("--fixed-strings");
	if (input.glob) args.push("--glob", input.glob);
	args.push("--", input.pattern, input.searchPath);
	return args;
}

async function resolveGrepBackend(input: {
	pattern: string;
	searchPath: string;
	glob?: string;
	ignoreCase?: boolean;
	literal?: boolean;
}): Promise<GrepBackendCommand | undefined> {
	const ugrepPath = getOptionalSearchToolPath("ugrep");
	if (ugrepPath) return { backend: "ugrep", command: ugrepPath, args: buildUgrepArgs(input) };

	const rgPath = await ensureTool("rg", true);
	if (rgPath) return { backend: "rg", command: rgPath, args: buildRgArgs(input) };
	return undefined;
}

function parseUgrepMatchLine(line: string): { filePath: string; lineNumber: number; lineText: string } | undefined {
	let firstColon = line.indexOf(":");
	while (firstColon > 0) {
		const secondColon = line.indexOf(":", firstColon + 1);
		if (secondColon <= firstColon + 1) return undefined;
		const lineNumberText = line.slice(firstColon + 1, secondColon);
		if (/^\d+$/.test(lineNumberText)) {
			const lineNumber = Number(lineNumberText);
			if (!Number.isInteger(lineNumber) || lineNumber < 1) return undefined;
			return {
				filePath: line.slice(0, firstColon),
				lineNumber,
				lineText: line.slice(secondColon + 1),
			};
		}
		firstColon = line.indexOf(":", firstColon + 1);
	}
	return undefined;
}

export interface GrepToolDetails {
	truncation?: TruncationResult;
	matchLimitReached?: number;
	linesTruncated?: boolean;
	timedOut?: boolean;
	timeoutMs?: number;
	path?: string;
	glob?: string;
	pattern?: string;
	matchesReturned?: number;
}

function timeoutMsFromSeconds(timeout: number | undefined): number {
	const seconds = typeof timeout === "number" && Number.isFinite(timeout) ? timeout : DEFAULT_TIMEOUT_SECONDS;
	return Math.min(Math.max(seconds, Number.MIN_VALUE), MAX_TIMEOUT_SECONDS) * 1000;
}

function formatTimeoutSeconds(timeoutMs: number): string {
	const seconds = timeoutMs / 1000;
	return seconds >= 1 ? `${Math.round(seconds)}s` : `${timeoutMs}ms`;
}

function formatGrepTimeoutResult(args: {
	pattern: string;
	path: string;
	glob?: string;
	timeoutMs: number;
	matchesReturned: number;
	partialOutput?: string;
}) {
	const timeout = formatTimeoutSeconds(args.timeoutMs);
	const partial = args.partialOutput?.trim();
	const text = [
		`grep timed out after ${timeout} while searching ${args.path}.`,
		`Retry with a narrower path/glob/pattern, or explicitly raise timeout up to ${MAX_TIMEOUT_SECONDS}s.`,
		partial ? `\nPartial matches returned before timeout:\n${partial}` : undefined,
	]
		.filter(Boolean)
		.join("\n");
	return {
		content: [{ type: "text" as const, text }],
		isError: true,
		details: {
			timedOut: true,
			timeoutMs: args.timeoutMs,
			path: args.path,
			glob: args.glob,
			pattern: args.pattern,
			matchesReturned: args.matchesReturned,
		},
	};
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && /abort/i.test(error.name || error.message);
}

/**
 * Pluggable operations for the grep tool.
 * Override these to delegate search to remote systems (for example SSH).
 */
export interface GrepOperations {
	/** Check if path is a directory. Throws if path does not exist. */
	isDirectory: (absolutePath: string) => Promise<boolean> | boolean;
	/** Read file contents for context lines */
	readFile: (absolutePath: string) => Promise<string> | string;
}

const defaultGrepOperations: GrepOperations = {
	isDirectory: (p) => statSync(p).isDirectory(),
	readFile: (p) => readFileSync(p, "utf-8"),
};

export interface GrepToolOptions {
	/** Custom operations for grep. Default: local filesystem plus ripgrep */
	operations?: GrepOperations;
}

function formatGrepCall(
	args: { pattern: string; path?: string; glob?: string; limit?: number } | undefined,
	theme: typeof import("../../modes/interactive/theme/theme.js").theme,
): string {
	const pattern = str(args?.pattern);
	const rawPath = str(args?.path);
	const path = rawPath !== null ? shortenPath(rawPath || ".") : null;
	const glob = str(args?.glob);
	const limit = args?.limit;
	const invalidArg = invalidArgText(theme);
	let text =
		theme.fg("toolTitle", theme.bold("grep")) +
		" " +
		(pattern === null ? invalidArg : theme.fg("accent", `/${pattern || ""}/`)) +
		theme.fg("toolOutput", ` in ${path === null ? invalidArg : path}`);
	if (glob) text += theme.fg("toolOutput", ` (${glob})`);
	if (limit !== undefined) text += theme.fg("toolOutput", ` limit ${limit}`);
	return text;
}

function formatGrepResult(
	result: {
		content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
		details?: GrepToolDetails;
	},
	options: ToolRenderResultOptions,
	theme: typeof import("../../modes/interactive/theme/theme.js").theme,
	showImages: boolean,
): string {
	const output = getTextOutput(result, showImages).trim();
	let text = "";
	if (output) {
		const lines = output.split("\n");
		const maxLines = options.expanded ? lines.length : 15;
		const displayLines = lines.slice(0, maxLines);
		const remaining = lines.length - maxLines;
		text += `\n${displayLines.map((line) => theme.fg("toolOutput", line)).join("\n")}`;
		if (remaining > 0) {
			text += `${theme.fg("muted", `\n... (${remaining} more lines,`)} ${keyHint("app.tools.expand", "to expand")})`;
		}
	}

	const matchLimit = result.details?.matchLimitReached;
	const truncation = result.details?.truncation;
	const linesTruncated = result.details?.linesTruncated;
	if (matchLimit || truncation?.truncated || linesTruncated) {
		const warnings: string[] = [];
		if (matchLimit) warnings.push(`${matchLimit} matches limit`);
		if (truncation?.truncated) warnings.push(`${formatSize(truncation.maxBytes ?? DEFAULT_MAX_BYTES)} limit`);
		if (linesTruncated) warnings.push("some lines truncated");
		text += `\n${theme.fg("warning", `[Truncated: ${warnings.join(", ")}]`)}`;
	}
	return text;
}

export function createGrepToolDefinition(
	cwd: string,
	options?: GrepToolOptions,
): ToolDefinition<typeof grepSchema, GrepToolDetails | undefined> {
	const customOps = options?.operations;
	return {
		name: "grep",
		label: "grep",
		description: `Search file contents for a pattern. Returns matching lines with file paths and line numbers. Respects .gitignore. Times out after ${DEFAULT_TIMEOUT_SECONDS}s by default; pass timeout up to ${MAX_TIMEOUT_SECONDS}s for intentional broad searches. Output is truncated to ${DEFAULT_LIMIT} matches or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). Long lines are truncated to ${GREP_MAX_LINE_LENGTH} chars.`,
		promptSnippet: "Search file contents for patterns (respects .gitignore)",
		parameters: grepSchema,
		async execute(
			_toolCallId,
			{
				pattern,
				path: searchDir,
				glob,
				ignoreCase,
				literal,
				context,
				limit,
				timeout,
			}: {
				pattern: string;
				path?: string;
				glob?: string;
				ignoreCase?: boolean;
				literal?: boolean;
				context?: number;
				limit?: number;
				timeout?: number;
			},
			signal?: AbortSignal,
			_onUpdate?,
			_ctx?,
		) {
			return new Promise((resolve, reject) => {
				if (signal?.aborted) {
					reject(new Error("Operation aborted"));
					return;
				}
				let settled = false;
				let timeoutId: NodeJS.Timeout | undefined;
				let killTimeoutId: NodeJS.Timeout | undefined;
				const timeoutMs = timeoutMsFromSeconds(timeout);
				const settle = (fn: () => void) => {
					if (!settled) {
						settled = true;
						if (timeoutId) clearTimeout(timeoutId);
						if (killTimeoutId) clearTimeout(killTimeoutId);
						fn();
					}
				};

				(async () => {
					try {
						const searchPath = resolveToCwd(searchDir || ".", cwd);
						const ops = customOps ?? defaultGrepOperations;
						let isDirectory: boolean;
						try {
							isDirectory = await ops.isDirectory(searchPath);
						} catch {
							settle(() => reject(new Error(`Path not found: ${searchPath}`)));
							return;
						}

						const contextValue = context && context > 0 ? context : 0;
						const effectiveLimit = Math.max(1, limit ?? DEFAULT_LIMIT);
						const formatPath = (filePath: string): string => {
							if (isDirectory) {
								const relative = path.relative(searchPath, filePath);
								if (relative && !relative.startsWith("..")) {
									return relative.replace(/\\/g, "/");
								}
							}
							return path.basename(filePath);
						};

						const fileCache = new Map<string, string[]>();
						const getFileLines = async (filePath: string): Promise<string[]> => {
							let lines = fileCache.get(filePath);
							if (!lines) {
								try {
									const content = await ops.readFile(filePath);
									lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
								} catch {
									lines = [];
								}
								fileCache.set(filePath, lines);
							}
							return lines;
						};

						const backendCommand = await resolveGrepBackend({ pattern, searchPath, glob, ignoreCase, literal });
						if (!backendCommand) {
							settle(() =>
								reject(new Error("Neither ugrep nor ripgrep (rg) is available and rg could not be downloaded")),
							);
							return;
						}

						const child = spawn(backendCommand.command, backendCommand.args, {
							stdio: ["ignore", "pipe", "pipe"],
						});
						const rl = createInterface({ input: child.stdout });
						let stderr = "";
						let matchCount = 0;
						let matchLimitReached = false;
						let linesTruncated = false;
						let aborted = false;
						let timedOut = false;
						let killedDueToLimit = false;
						const outputLines: string[] = [];

						const cleanup = () => {
							rl.close();
							signal?.removeEventListener("abort", onAbort);
						};
						const stopChild = (dueToLimit = false) => {
							if (!child.killed) {
								killedDueToLimit = dueToLimit;
								child.kill("SIGTERM");
								killTimeoutId = setTimeout(() => {
									if (!child.killed) child.kill("SIGKILL");
								}, 5000);
							}
						};
						const onAbort = () => {
							aborted = true;
							stopChild();
						};
						signal?.addEventListener("abort", onAbort, { once: true });
						if (timeoutMs > 0) {
							timeoutId = setTimeout(() => {
								timedOut = true;
								stopChild();
							}, timeoutMs);
						}
						child.stderr?.on("data", (chunk) => {
							stderr += chunk.toString();
						});

						const formatBlock = async (filePath: string, lineNumber: number): Promise<string[]> => {
							const relativePath = formatPath(filePath);
							const lines = await getFileLines(filePath);
							if (!lines.length) return [`${relativePath}:${lineNumber}: (unable to read file)`];
							const block: string[] = [];
							const start = contextValue > 0 ? Math.max(1, lineNumber - contextValue) : lineNumber;
							const end = contextValue > 0 ? Math.min(lines.length, lineNumber + contextValue) : lineNumber;
							for (let current = start; current <= end; current++) {
								const lineText = lines[current - 1] ?? "";
								const sanitized = lineText.replace(/\r/g, "");
								const isMatchLine = current === lineNumber;
								// Truncate long lines so grep output stays compact.
								const { text: truncatedText, wasTruncated } = truncateLine(sanitized);
								if (wasTruncated) linesTruncated = true;
								if (isMatchLine) block.push(`${relativePath}:${current}: ${truncatedText}`);
								else block.push(`${relativePath}-${current}- ${truncatedText}`);
							}
							return block;
						};

						// Collect matches during streaming, then format them after rg exits.
						const matches: Array<{ filePath: string; lineNumber: number; lineText?: string }> = [];
						rl.on("line", (line) => {
							if (!line.trim() || matchCount >= effectiveLimit) return;
							if (backendCommand.backend === "ugrep") {
								const match = parseUgrepMatchLine(line);
								if (!match) return;
								matchCount++;
								matches.push(match);
							} else {
								let event: any;
								try {
									event = JSON.parse(line);
								} catch {
									return;
								}
								if (event.type !== "match") return;
								matchCount++;
								const filePath = event.data?.path?.text;
								const lineNumber = event.data?.line_number;
								const lineText = event.data?.lines?.text;
								if (filePath && typeof lineNumber === "number")
									matches.push({ filePath, lineNumber, lineText });
							}
							if (matchCount >= effectiveLimit) {
								matchLimitReached = true;
								stopChild(true);
							}
						});

						child.on("error", (error) => {
							cleanup();
							settle(() =>
								reject(new Error(`Failed to run ${toolDisplayName(backendCommand.command)}: ${error.message}`)),
							);
						});
						child.on("close", async (code) => {
							cleanup();
							if (aborted) {
								settle(() => reject(new Error("Operation aborted")));
								return;
							}
							if (timedOut) {
								for (const match of matches) {
									if (contextValue === 0 && match.lineText !== undefined) {
										const relativePath = formatPath(match.filePath);
										const sanitized = match.lineText
											.replace(/\r\n/g, "\n")
											.replace(/\r/g, "")
											.replace(/\n$/, "");
										const { text: truncatedText } = truncateLine(sanitized);
										outputLines.push(`${relativePath}:${match.lineNumber}: ${truncatedText}`);
									} else {
										const block = await formatBlock(match.filePath, match.lineNumber);
										outputLines.push(...block);
									}
								}
								const partialOutput = truncateHead(outputLines.join("\n"), {
									maxLines: Number.MAX_SAFE_INTEGER,
								}).content;
								settle(() =>
									resolve(
										formatGrepTimeoutResult({
											pattern,
											path: searchPath,
											glob,
											timeoutMs,
											matchesReturned: matches.length,
											partialOutput,
										}) as any,
									),
								);
								return;
							}
							if (!killedDueToLimit && code !== 0 && code !== 1) {
								const backendName = toolDisplayName(backendCommand.command);
								const errorMsg = stderr.trim() || `${backendName} exited with code ${code}`;
								settle(() => reject(new Error(errorMsg)));
								return;
							}
							if (matchCount === 0) {
								settle(() =>
									resolve({ content: [{ type: "text", text: "No matches found" }], details: undefined }),
								);
								return;
							}

							// Format matches after streaming finishes so custom readFile() backends can be async.
							for (const match of matches) {
								if (contextValue === 0 && match.lineText !== undefined) {
									const relativePath = formatPath(match.filePath);
									const sanitized = match.lineText
										.replace(/\r\n/g, "\n")
										.replace(/\r/g, "")
										.replace(/\n$/, "");
									const { text: truncatedText, wasTruncated } = truncateLine(sanitized);
									if (wasTruncated) linesTruncated = true;
									outputLines.push(`${relativePath}:${match.lineNumber}: ${truncatedText}`);
								} else {
									const block = await formatBlock(match.filePath, match.lineNumber);
									outputLines.push(...block);
								}
							}

							const rawOutput = outputLines.join("\n");
							// Apply byte truncation. There is no line limit here because the match limit already capped rows.
							const truncation = truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
							let output = truncation.content;
							const details: GrepToolDetails = {};
							// Build actionable notices for truncation and match limits.
							const notices: string[] = [];
							if (matchLimitReached) {
								notices.push(
									`${effectiveLimit} matches limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`,
								);
								details.matchLimitReached = effectiveLimit;
							}
							if (truncation.truncated) {
								notices.push(`${formatSize(DEFAULT_MAX_BYTES)} limit reached`);
								details.truncation = truncation;
							}
							if (linesTruncated) {
								notices.push(
									`Some lines truncated to ${GREP_MAX_LINE_LENGTH} chars. Use read tool to see full lines`,
								);
								details.linesTruncated = true;
							}
							if (notices.length > 0) output += `\n\n[${notices.join(". ")}]`;
							settle(() =>
								resolve({
									content: [{ type: "text", text: output }],
									details: Object.keys(details).length > 0 ? details : undefined,
								}),
							);
						});
					} catch (err) {
						if (signal?.aborted || isAbortError(err)) {
							settle(() => reject(new Error("Operation aborted")));
							return;
						}
						settle(() => reject(err as Error));
					}
				})();
			});
		},
		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatGrepCall(args, theme));
			return text;
		},
		renderResult(result, options, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatGrepResult(result as any, options, theme, context.showImages));
			return text;
		},
	};
}

export function createGrepTool(cwd: string, options?: GrepToolOptions): AgentTool<typeof grepSchema> {
	return wrapToolDefinition(createGrepToolDefinition(cwd, options));
}

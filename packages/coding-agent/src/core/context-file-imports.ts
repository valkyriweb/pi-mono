import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, type Stats, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { Lexer } from "marked";
import type { ResourceDiagnostic } from "./diagnostics.js";

export const MAX_CONTEXT_IMPORT_DEPTH = 5;

const INCLUDE_PATH_PATTERN = /(^|\s)@((?:[^\s\\]|\\ )+)/g;

const TEXT_FILE_EXTENSIONS = new Set([
	".md",
	".txt",
	".text",
	".json",
	".jsonl",
	".jsonc",
	".ndjson",
	".yaml",
	".yml",
	".toml",
	".xml",
	".csv",
	".html",
	".htm",
	".css",
	".scss",
	".sass",
	".less",
	".js",
	".ts",
	".tsx",
	".jsx",
	".mjs",
	".cjs",
	".mts",
	".cts",
	".py",
	".pyi",
	".pyw",
	".rb",
	".erb",
	".rake",
	".go",
	".rs",
	".java",
	".kt",
	".kts",
	".scala",
	".c",
	".cpp",
	".cc",
	".cxx",
	".h",
	".hpp",
	".hxx",
	".cs",
	".swift",
	".sh",
	".bash",
	".zsh",
	".fish",
	".ps1",
	".bat",
	".cmd",
	".env",
	".ini",
	".cfg",
	".conf",
	".config",
	".properties",
	".sql",
	".graphql",
	".gql",
	".proto",
	".vue",
	".svelte",
	".astro",
	".ejs",
	".hbs",
	".pug",
	".jade",
	".php",
	".pl",
	".pm",
	".lua",
	".r",
	".dart",
	".ex",
	".exs",
	".erl",
	".hrl",
	".clj",
	".cljs",
	".cljc",
	".edn",
	".hs",
	".lhs",
	".elm",
	".ml",
	".mli",
	".f",
	".f90",
	".f95",
	".for",
	".cmake",
	".make",
	".makefile",
	".gradle",
	".sbt",
	".rst",
	".adoc",
	".asciidoc",
	".org",
	".tex",
	".latex",
	".lock",
	".log",
	".diff",
	".patch",
]);

export interface ContextFile {
	path: string;
	content: string;
	parentPath?: string;
	rootPath?: string;
	importDepth?: number;
}

interface ImportReference {
	path: string;
}

interface DependencySnapshot {
	path: string;
	realPath: string;
	mtimeMs: number;
	size: number;
}

interface CacheEntry {
	cwd: string;
	agentDir: string;
	rootPath: string;
	rootRealPath: string;
	rootContentHash: string;
	dependencies: DependencySnapshot[];
	files: ContextFile[];
	diagnostics: ResourceDiagnostic[];
}

export interface ContextFileImportCache {
	entries: Map<string, CacheEntry>;
}

export interface ExpandContextFilesResult {
	contextFiles: ContextFile[];
	diagnostics: ResourceDiagnostic[];
}

interface ExpandContextFilesOptions {
	cwd: string;
	agentDir: string;
	cache?: ContextFileImportCache;
}

interface ExpandRootState {
	rootPath: string;
	seenPaths: Set<string>;
	dependencies: DependencySnapshot[];
	diagnostics: ResourceDiagnostic[];
}

interface MarkdownToken {
	type?: string;
	raw?: unknown;
	text?: unknown;
	tokens?: MarkdownToken[];
	items?: Array<{ tokens?: MarkdownToken[] }>;
}

export function createContextFileImportCache(): ContextFileImportCache {
	return { entries: new Map() };
}

export function expandContextFilesImports(
	contextFiles: ContextFile[],
	options: ExpandContextFilesOptions,
): ExpandContextFilesResult {
	const expanded: ContextFile[] = [];
	const diagnostics: ResourceDiagnostic[] = [];
	// Cross-root dedup by realpath so an @import shared between roots is
	// included once. Mirrors Claude Code's single processedPaths Set across
	// the whole memory-loading pass.
	const seenRealPaths = new Set<string>();

	for (const contextFile of contextFiles) {
		const entry = expandRootContextFile(contextFile, options);
		for (const file of entry.files) {
			const realPath = normalizePath(realPathOrResolved(file.path));
			if (seenRealPaths.has(realPath)) continue;
			seenRealPaths.add(realPath);
			expanded.push(file);
		}
		diagnostics.push(...entry.diagnostics);
	}

	return { contextFiles: expanded, diagnostics };
}

export interface ExpandSystemPromptImportsResult {
	content: string;
	diagnostics: ResourceDiagnostic[];
}

interface InlineSubstitutionState {
	seenRealPaths: Set<string>;
	diagnostics: ResourceDiagnostic[];
	depth: number;
}

/**
 * Expand @-imports in a system-prompt-style file (SYSTEM.md, APPEND_SYSTEM.md)
 * via inline substitution. Each `@path` token is replaced in place with the
 * imported file's content, recursively, instead of being rendered as a sibling
 * "## /path" section the way AGENTS.md/CLAUDE.md children are.
 *
 * Why a different model from expandContextFilesImports:
 * - AGENTS.md content is rendered as a list of project-context blocks, each
 *   prefixed with "## /path". Children naturally become siblings.
 * - SYSTEM.md / APPEND_SYSTEM.md content is rendered as one continuous string
 *   pasted into the system prompt. Children must inline so the surrounding
 *   prose still reads correctly and so path strings aren't injected as
 *   spurious markdown headings.
 *
 * The inline scanner walks the file line-by-line and respects fenced code
 * blocks (```/~~~) so `@paths` inside code samples are preserved as written.
 * Limitations: @-paths inside inline code spans (`...`) and multi-line HTML
 * comments are still expanded — keep imports on their own logical line for
 * predictable behavior.
 *
 * Reuses the same realpath dedup, cycle protection, depth limit, file-type
 * gating, and diagnostics surface as the AGENTS.md expander, so behavior is
 * symmetric across the two surfaces.
 */
export function expandSystemPromptImports(content: string, parentPath: string): ExpandSystemPromptImportsResult {
	const parentReal = realPathOrResolved(parentPath);
	const state: InlineSubstitutionState = {
		seenRealPaths: new Set([normalizePath(parentReal)]),
		diagnostics: [],
		depth: 1,
	};
	const expanded = substituteImportsInline(content, parentReal, state);
	return { content: expanded, diagnostics: state.diagnostics };
}

function substituteImportsInline(content: string, parentRealPath: string, state: InlineSubstitutionState): string {
	if (state.depth >= MAX_CONTEXT_IMPORT_DEPTH) {
		for (const ref of extractContextFileImports(content, parentRealPath)) {
			state.diagnostics.push({
				type: "warning",
				message: `Maximum context import depth reached at ${ref.path}`,
				path: ref.path,
			});
		}
		return content;
	}

	const lines = content.split("\n");
	const out: string[] = [];
	let inFence = false;

	for (const line of lines) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			out.push(line);
			continue;
		}
		if (inFence) {
			out.push(line);
			continue;
		}
		out.push(substituteImportsInLine(line, parentRealPath, state));
	}

	return out.join("\n");
}

function substituteImportsInLine(line: string, parentRealPath: string, state: InlineSubstitutionState): string {
	INCLUDE_PATH_PATTERN.lastIndex = 0;
	return line.replace(INCLUDE_PATH_PATTERN, (match, prefix: string, rawPath: string) => {
		const cleaned = cleanImportPath(rawPath ?? "");
		if (!isImportPath(cleaned)) return match;

		const resolvedPath = resolveImportPath(cleaned, dirname(parentRealPath));
		const normalized = normalizePath(resolvedPath);

		if (!existsSync(normalized)) {
			state.diagnostics.push({
				type: "warning",
				message: `Context import does not exist: ${normalized}`,
				path: normalized,
			});
			return match;
		}

		let stats: Stats;
		try {
			stats = statSync(normalized);
		} catch (error) {
			state.diagnostics.push({
				type: "warning",
				message: `Could not stat context import ${normalized}: ${error}`,
				path: normalized,
			});
			return match;
		}

		if (!stats.isFile()) {
			state.diagnostics.push({
				type: "warning",
				message: `Context import is not a file: ${normalized}`,
				path: normalized,
			});
			return match;
		}

		if (!isTextFile(normalized)) {
			state.diagnostics.push({
				type: "warning",
				message: `Context import has unsupported file extension: ${normalized}`,
				path: normalized,
			});
			return match;
		}

		const realPath = realPathOrResolved(normalized);
		const realKey = normalizePath(realPath);
		if (state.seenRealPaths.has(realKey)) {
			state.diagnostics.push({
				type: "warning",
				message: `Skipping duplicate or circular context import: ${normalized}`,
				path: normalized,
			});
			// Drop the @-token entirely; the imported content was already inlined
			// at its first occurrence (or in an enclosing scope).
			return prefix;
		}
		state.seenRealPaths.add(realKey);

		let importedContent: string;
		try {
			importedContent = readFileSync(realPath, "utf-8");
		} catch (error) {
			state.diagnostics.push({
				type: "warning",
				message: `Could not read context import ${normalized}: ${error}`,
				path: normalized,
			});
			return match;
		}

		state.depth += 1;
		const expanded = substituteImportsInline(importedContent, realPath, state);
		state.depth -= 1;

		return prefix + expanded;
	});
}

function expandRootContextFile(contextFile: ContextFile, options: ExpandContextFilesOptions): CacheEntry {
	const rootPath = normalizePath(contextFile.path);
	const rootRealPath = realPathOrResolved(rootPath);
	const rootContentHash = sha1(contextFile.content);
	const cacheKey = `${options.cwd}\0${options.agentDir}\0${rootPath}`;
	const cached = options.cache?.entries.get(cacheKey);

	if (
		cached &&
		cached.cwd === options.cwd &&
		cached.agentDir === options.agentDir &&
		cached.rootRealPath === rootRealPath &&
		cached.rootContentHash === rootContentHash &&
		dependenciesAreCurrent(cached.dependencies)
	) {
		return cached;
	}

	const state: ExpandRootState = {
		rootPath,
		seenPaths: new Set([rootPath, normalizePath(rootRealPath)]),
		dependencies: [],
		diagnostics: [],
	};
	const rootFile: ContextFile = { path: contextFile.path, content: contextFile.content };
	const files = [rootFile, ...loadImportedContextFiles(contextFile.content, rootRealPath, state, 1, rootPath)];
	const entry: CacheEntry = {
		cwd: options.cwd,
		agentDir: options.agentDir,
		rootPath,
		rootRealPath,
		rootContentHash,
		dependencies: state.dependencies,
		files,
		diagnostics: state.diagnostics,
	};
	options.cache?.entries.set(cacheKey, entry);
	return entry;
}

function loadImportedContextFiles(
	content: string,
	filePath: string,
	state: ExpandRootState,
	depth: number,
	parentPath: string,
): ContextFile[] {
	if (depth >= MAX_CONTEXT_IMPORT_DEPTH) {
		for (const importRef of extractContextFileImports(content, filePath)) {
			state.diagnostics.push({
				type: "warning",
				message: `Maximum context import depth reached at ${importRef.path}`,
				path: importRef.path,
			});
		}
		return [];
	}

	const files: ContextFile[] = [];
	for (const importRef of extractContextFileImports(content, filePath)) {
		files.push(...loadImportedContextFile(importRef.path, state, depth, parentPath));
	}
	return files;
}

function loadImportedContextFile(
	importPath: string,
	state: ExpandRootState,
	depth: number,
	parentPath: string,
): ContextFile[] {
	const path = normalizePath(importPath);

	if (!existsSync(path)) {
		state.diagnostics.push({ type: "warning", message: `Context import does not exist: ${path}`, path });
		return [];
	}

	let stats: Stats;
	try {
		stats = statSync(path);
	} catch (error) {
		state.diagnostics.push({ type: "warning", message: `Could not stat context import ${path}: ${error}`, path });
		return [];
	}

	if (!stats.isFile()) {
		state.diagnostics.push({ type: "warning", message: `Context import is not a file: ${path}`, path });
		return [];
	}

	if (!isTextFile(path)) {
		state.diagnostics.push({
			type: "warning",
			message: `Context import has unsupported file extension: ${path}`,
			path,
		});
		return [];
	}

	const realPath = realPathOrResolved(path);
	const normalizedRealPath = normalizePath(realPath);
	if (state.seenPaths.has(path) || state.seenPaths.has(normalizedRealPath)) {
		state.diagnostics.push({
			type: "warning",
			message: `Skipping duplicate or circular context import: ${path}`,
			path,
		});
		return [];
	}

	state.seenPaths.add(path);
	state.seenPaths.add(normalizedRealPath);
	state.dependencies.push({ path, realPath: normalizedRealPath, mtimeMs: stats.mtimeMs, size: stats.size });

	let importedContent: string;
	try {
		importedContent = readFileSync(normalizedRealPath, "utf-8");
	} catch (error) {
		state.diagnostics.push({ type: "warning", message: `Could not read context import ${path}: ${error}`, path });
		return [];
	}

	const importedFile: ContextFile = {
		path: normalizedRealPath,
		content: importedContent,
		parentPath,
		rootPath: state.rootPath,
		importDepth: depth,
	};

	return [
		importedFile,
		...loadImportedContextFiles(importedContent, normalizedRealPath, state, depth + 1, normalizedRealPath),
	];
}

export function extractContextFileImports(content: string, filePath: string): ImportReference[] {
	const imports: ImportReference[] = [];
	for (const text of markdownTextSegments(content)) {
		INCLUDE_PATH_PATTERN.lastIndex = 0;
		for (let match = INCLUDE_PATH_PATTERN.exec(text); match !== null; match = INCLUDE_PATH_PATTERN.exec(text)) {
			const cleanedPath = cleanImportPath(match[2] ?? "");
			if (!isImportPath(cleanedPath)) {
				continue;
			}
			imports.push({ path: resolveImportPath(cleanedPath, dirname(filePath)) });
		}
	}
	return imports;
}

function markdownTextSegments(content: string): string[] {
	const segments: string[] = [];
	const visit = (tokens: MarkdownToken[]): void => {
		for (const token of tokens) {
			if (token.type === "code" || token.type === "codespan") {
				continue;
			}
			if (token.type === "html") {
				const raw = String(token.raw ?? "");
				const trimmed = raw.trimStart();
				if (trimmed.startsWith("<!--") && trimmed.includes("-->")) {
					const residue = raw.replace(/<!--[\s\S]*?-->/g, "");
					if (residue.trim()) segments.push(residue);
				}
				continue;
			}
			if (Array.isArray(token.tokens)) {
				visit(token.tokens);
			} else if (typeof token.text === "string") {
				segments.push(token.text);
			}
			if (Array.isArray(token.items)) {
				for (const item of token.items) {
					if (Array.isArray(item.tokens)) visit(item.tokens);
				}
			}
		}
	};

	try {
		visit(new Lexer({ gfm: false }).lex(content) as MarkdownToken[]);
	} catch {
		segments.push(content);
	}
	return segments;
}

function cleanImportPath(rawPath: string): string {
	const hashIndex = rawPath.indexOf("#");
	const withoutFragment = hashIndex === -1 ? rawPath : rawPath.slice(0, hashIndex);
	return withoutFragment.replace(/\\ /g, " ").trim();
}

function isImportPath(path: string): boolean {
	if (!path || path.startsWith("@")) return false;
	if (!extname(path)) return false;
	if (path.startsWith("./") || path.startsWith("../") || path.startsWith("~/")) return true;
	if (path.startsWith("/") && path !== "/") return true;
	return /^[a-zA-Z0-9._-]/.test(path) && !/^[#%^&*()]+/.test(path);
}

function resolveImportPath(importPath: string, baseDir: string): string {
	if (importPath === "~") return homedir();
	if (importPath.startsWith("~/")) return join(homedir(), importPath.slice(2));
	if (isAbsolute(importPath)) return importPath;
	return resolve(baseDir, importPath);
}

function isTextFile(filePath: string): boolean {
	const ext = extname(filePath).toLowerCase();
	return !ext || TEXT_FILE_EXTENSIONS.has(ext);
}

function normalizePath(path: string): string {
	return resolve(path);
}

function realPathOrResolved(path: string): string {
	try {
		// .native canonicalises case on case-insensitive filesystems (macOS APFS,
		// Windows NTFS) so AGENTS.md and AGENTS.MD dedup as one. The pure-JS
		// realpathSync preserves input casing and would leave them distinct.
		return realpathSync.native(path);
	} catch {
		return resolve(path);
	}
}

function sha1(content: string): string {
	return createHash("sha1").update(content).digest("hex");
}

function dependenciesAreCurrent(dependencies: DependencySnapshot[]): boolean {
	for (const dependency of dependencies) {
		try {
			const stats = statSync(dependency.realPath);
			if (!stats.isFile() || stats.mtimeMs !== dependency.mtimeMs || stats.size !== dependency.size) {
				return false;
			}
		} catch {
			return false;
		}
	}
	return true;
}

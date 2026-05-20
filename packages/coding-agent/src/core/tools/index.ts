export {
	type AgentToolDetails,
	type AgentToolInput,
	type AgentToolOptions,
	agentToolSchema,
	createAgentTool,
	createAgentToolDefinition,
	createTaskTool,
	createTaskToolDefinition,
	createUppercaseAgentTool,
	createUppercaseAgentToolDefinition,
} from "./agent.ts";
export {
	type BashBgDetails,
	type BashKillToolInput,
	type BashOperations,
	type BashOutputToolInput,
	type BashSpawnContext,
	type BashSpawnHook,
	type BashToolDetails,
	type BashToolInput,
	type BashToolOptions,
	createBashKillTool,
	createBashKillToolDefinition,
	createBashOutputNativeTool,
	createBashOutputNativeToolDefinition,
	createBashOutputTool,
	createBashOutputToolDefinition,
	createBashTool,
	createBashToolDefinition,
	createKillShellTool,
	createKillShellToolDefinition,
	createLocalBashOperations,
	createUppercaseBashTool,
	createUppercaseBashToolDefinition,
	listBashBgJobs,
} from "./bash.ts";
export {
	createEditTool,
	createEditToolDefinition,
	createUppercaseEditTool,
	createUppercaseEditToolDefinition,
	type EditOperations,
	type EditToolDetails,
	type EditToolInput,
	type EditToolOptions,
} from "./edit.ts";
export { withFileMutationQueue } from "./file-mutation-queue.ts";
export {
	createFindTool,
	createFindToolDefinition,
	createUppercaseFindTool,
	createUppercaseFindToolDefinition,
	type FindOperations,
	type FindToolDetails,
	type FindToolInput,
	type FindToolOptions,
} from "./find.ts";
export {
	createGrepTool,
	createGrepToolDefinition,
	createUppercaseGrepTool,
	createUppercaseGrepToolDefinition,
	type GrepOperations,
	type GrepToolDetails,
	type GrepToolInput,
	type GrepToolOptions,
} from "./grep.ts";
export {
	createLsTool,
	createLsToolDefinition,
	createUppercaseLsTool,
	createUppercaseLsToolDefinition,
	type LsOperations,
	type LsToolDetails,
	type LsToolInput,
	type LsToolOptions,
} from "./ls.ts";
export {
	createReadTool,
	createReadToolDefinition,
	createUppercaseReadTool,
	createUppercaseReadToolDefinition,
	type ReadOperations,
	type ReadToolDetails,
	type ReadToolInput,
	type ReadToolOptions,
} from "./read.ts";
export {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	type TruncationOptions,
	type TruncationResult,
	truncateHead,
	truncateLine,
	truncateTail,
} from "./truncate.ts";
export {
	createWebFetchTool,
	createWebFetchToolDefinition,
	type WebFetchToolInput,
	type WebFetchToolOptions,
} from "./web-fetch.ts";
export {
	createWebSearchTool,
	createWebSearchToolDefinition,
	type WebSearchToolInput,
	type WebSearchToolOptions,
} from "./web-search.ts";
export {
	createUppercaseWriteTool,
	createUppercaseWriteToolDefinition,
	createWriteTool,
	createWriteToolDefinition,
	type WriteOperations,
	type WriteToolInput,
	type WriteToolOptions,
} from "./write.ts";

import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ToolDefinition } from "../extensions/types.ts";
import {
	type AgentToolOptions,
	createAgentTool,
	createAgentToolDefinition,
	createTaskTool,
	createTaskToolDefinition,
	createUppercaseAgentTool,
	createUppercaseAgentToolDefinition,
} from "./agent.ts";
import {
	type BashToolOptions,
	createBashKillTool,
	createBashKillToolDefinition,
	createBashOutputNativeTool,
	createBashOutputNativeToolDefinition,
	createBashOutputTool,
	createBashOutputToolDefinition,
	createBashTool,
	createBashToolDefinition,
	createKillShellTool,
	createKillShellToolDefinition,
	createUppercaseBashTool,
	createUppercaseBashToolDefinition,
} from "./bash.ts";
import {
	createEditTool,
	createEditToolDefinition,
	createUppercaseEditTool,
	createUppercaseEditToolDefinition,
	type EditToolOptions,
} from "./edit.ts";
import {
	createFindTool,
	createFindToolDefinition,
	createUppercaseFindTool,
	createUppercaseFindToolDefinition,
	type FindToolOptions,
} from "./find.ts";
import {
	createGrepTool,
	createGrepToolDefinition,
	createUppercaseGrepTool,
	createUppercaseGrepToolDefinition,
	type GrepToolOptions,
} from "./grep.ts";
import {
	createLsTool,
	createLsToolDefinition,
	createUppercaseLsTool,
	createUppercaseLsToolDefinition,
	type LsToolOptions,
} from "./ls.ts";
import {
	createReadTool,
	createReadToolDefinition,
	createUppercaseReadTool,
	createUppercaseReadToolDefinition,
	type ReadToolOptions,
} from "./read.ts";
import { createWebFetchTool, createWebFetchToolDefinition, type WebFetchToolOptions } from "./web-fetch.ts";
import { createWebSearchTool, createWebSearchToolDefinition, type WebSearchToolOptions } from "./web-search.ts";
import {
	createUppercaseWriteTool,
	createUppercaseWriteToolDefinition,
	createWriteTool,
	createWriteToolDefinition,
	type WriteToolOptions,
} from "./write.ts";

// Tool registries erase concrete TypeBox/detail generics across heterogeneous built-ins.
// `any` is unavoidable here because AgentTool/ToolDefinition are intentionally variant in their schema parameter.
export type Tool = AgentTool<any>;
export type ToolDef = ToolDefinition<any, any>;
export type ToolName =
	| "read"
	| "Read"
	| "bash"
	| "Bash"
	| "bash_output"
	| "BashOutput"
	| "bash_kill"
	| "KillShell"
	| "edit"
	| "Edit"
	| "write"
	| "Write"
	| "grep"
	| "Grep"
	| "find"
	| "Find"
	| "ls"
	| "Ls"
	| "WebFetch"
	| "web_fetch"
	| "WebSearch"
	| "web_search"
	| "agent"
	| "Agent"
	| "Task";
export const allToolNames: Set<ToolName> = new Set([
	"read",
	"Read",
	"bash",
	"Bash",
	"bash_output",
	"BashOutput",
	"bash_kill",
	"KillShell",
	"edit",
	"Edit",
	"write",
	"Write",
	"grep",
	"Grep",
	"find",
	"Find",
	"ls",
	"Ls",
	"agent",
	"Agent",
	"Task",
]);

export interface ToolsOptions {
	read?: ReadToolOptions;
	bash?: BashToolOptions;
	write?: WriteToolOptions;
	edit?: EditToolOptions;
	grep?: GrepToolOptions;
	find?: FindToolOptions;
	ls?: LsToolOptions;
	agent?: AgentToolOptions;
	webFetch?: WebFetchToolOptions;
	webSearch?: WebSearchToolOptions;
}

export function createToolDefinition(toolName: ToolName, cwd: string, options?: ToolsOptions): ToolDef {
	switch (toolName) {
		case "read":
			return createReadToolDefinition(cwd, options?.read);
		case "Read":
			return createUppercaseReadToolDefinition(cwd, options?.read);
		case "bash":
			return createBashToolDefinition(cwd, options?.bash);
		case "Bash":
			return createUppercaseBashToolDefinition(cwd, options?.bash);
		case "bash_output":
			return createBashOutputToolDefinition();
		case "BashOutput":
			return createBashOutputNativeToolDefinition();
		case "bash_kill":
			return createBashKillToolDefinition();
		case "KillShell":
			return createKillShellToolDefinition();
		case "edit":
			return createEditToolDefinition(cwd, options?.edit);
		case "Edit":
			return createUppercaseEditToolDefinition(cwd, options?.edit);
		case "write":
			return createWriteToolDefinition(cwd, options?.write);
		case "Write":
			return createUppercaseWriteToolDefinition(cwd, options?.write);
		case "grep":
			return createGrepToolDefinition(cwd, options?.grep);
		case "Grep":
			return createUppercaseGrepToolDefinition(cwd, options?.grep);
		case "find":
			return createFindToolDefinition(cwd, options?.find);
		case "Find":
			return createUppercaseFindToolDefinition(cwd, options?.find);
		case "ls":
			return createLsToolDefinition(cwd, options?.ls);
		case "Ls":
			return createUppercaseLsToolDefinition(cwd, options?.ls);
		case "WebFetch":
			return createWebFetchToolDefinition(cwd, options?.webFetch);
		case "web_fetch":
			return createWebFetchToolDefinition(cwd, { ...options?.webFetch, toolName: "web_fetch", label: "web_fetch" });
		case "WebSearch":
			return createWebSearchToolDefinition(cwd, options?.webSearch);
		case "web_search":
			return createWebSearchToolDefinition(cwd, {
				...options?.webSearch,
				toolName: "web_search",
				label: "web_search",
			});
		case "agent":
			return createAgentToolDefinition(cwd, options?.agent);
		case "Agent":
			return createUppercaseAgentToolDefinition(cwd, options?.agent);
		case "Task":
			return createTaskToolDefinition(cwd, options?.agent);
		default:
			throw new Error(`Unknown tool name: ${toolName}`);
	}
}

export function createTool(toolName: ToolName, cwd: string, options?: ToolsOptions): Tool {
	switch (toolName) {
		case "read":
			return createReadTool(cwd, options?.read);
		case "Read":
			return createUppercaseReadTool(cwd, options?.read);
		case "bash":
			return createBashTool(cwd, options?.bash);
		case "Bash":
			return createUppercaseBashTool(cwd, options?.bash);
		case "bash_output":
			return createBashOutputTool();
		case "BashOutput":
			return createBashOutputNativeTool();
		case "bash_kill":
			return createBashKillTool();
		case "KillShell":
			return createKillShellTool();
		case "edit":
			return createEditTool(cwd, options?.edit);
		case "Edit":
			return createUppercaseEditTool(cwd, options?.edit);
		case "write":
			return createWriteTool(cwd, options?.write);
		case "Write":
			return createUppercaseWriteTool(cwd, options?.write);
		case "grep":
			return createGrepTool(cwd, options?.grep);
		case "Grep":
			return createUppercaseGrepTool(cwd, options?.grep);
		case "find":
			return createFindTool(cwd, options?.find);
		case "Find":
			return createUppercaseFindTool(cwd, options?.find);
		case "ls":
			return createLsTool(cwd, options?.ls);
		case "Ls":
			return createUppercaseLsTool(cwd, options?.ls);
		case "WebFetch":
			return createWebFetchTool(cwd, options?.webFetch);
		case "web_fetch":
			return createWebFetchTool(cwd, { ...options?.webFetch, toolName: "web_fetch", label: "web_fetch" });
		case "WebSearch":
			return createWebSearchTool(cwd, options?.webSearch);
		case "web_search":
			return createWebSearchTool(cwd, { ...options?.webSearch, toolName: "web_search", label: "web_search" });
		case "agent":
			return createAgentTool(cwd, options?.agent);
		case "Agent":
			return createUppercaseAgentTool(cwd, options?.agent);
		case "Task":
			return createTaskTool(cwd, options?.agent);
		default:
			throw new Error(`Unknown tool name: ${toolName}`);
	}
}

export function createCodingToolDefinitions(cwd: string, options?: ToolsOptions): ToolDef[] {
	return [
		createUppercaseReadToolDefinition(cwd, options?.read),
		createUppercaseBashToolDefinition(cwd, options?.bash),
		createBashOutputNativeToolDefinition(),
		createKillShellToolDefinition(),
		createUppercaseEditToolDefinition(cwd, options?.edit),
		createUppercaseWriteToolDefinition(cwd, options?.write),
	];
}

export function createReadOnlyToolDefinitions(cwd: string, options?: ToolsOptions): ToolDef[] {
	return [
		createUppercaseReadToolDefinition(cwd, options?.read),
		createUppercaseGrepToolDefinition(cwd, options?.grep),
		createUppercaseFindToolDefinition(cwd, options?.find),
		createUppercaseLsToolDefinition(cwd, options?.ls),
	];
}

export function createAllToolDefinitions(cwd: string, options?: ToolsOptions): Record<ToolName, ToolDef> {
	return {
		read: createReadToolDefinition(cwd, options?.read),
		Read: createUppercaseReadToolDefinition(cwd, options?.read),
		bash: createBashToolDefinition(cwd, options?.bash),
		Bash: createUppercaseBashToolDefinition(cwd, options?.bash),
		bash_output: createBashOutputToolDefinition(),
		BashOutput: createBashOutputNativeToolDefinition(),
		bash_kill: createBashKillToolDefinition(),
		KillShell: createKillShellToolDefinition(),
		edit: createEditToolDefinition(cwd, options?.edit),
		Edit: createUppercaseEditToolDefinition(cwd, options?.edit),
		write: createWriteToolDefinition(cwd, options?.write),
		Write: createUppercaseWriteToolDefinition(cwd, options?.write),
		grep: createGrepToolDefinition(cwd, options?.grep),
		Grep: createUppercaseGrepToolDefinition(cwd, options?.grep),
		find: createFindToolDefinition(cwd, options?.find),
		Find: createUppercaseFindToolDefinition(cwd, options?.find),
		ls: createLsToolDefinition(cwd, options?.ls),
		Ls: createUppercaseLsToolDefinition(cwd, options?.ls),
		WebFetch: createWebFetchToolDefinition(cwd, options?.webFetch),
		web_fetch: createWebFetchToolDefinition(cwd, { ...options?.webFetch, toolName: "web_fetch", label: "web_fetch" }),
		WebSearch: createWebSearchToolDefinition(cwd, options?.webSearch),
		web_search: createWebSearchToolDefinition(cwd, {
			...options?.webSearch,
			toolName: "web_search",
			label: "web_search",
		}),
		agent: createAgentToolDefinition(cwd, options?.agent),
		Agent: createUppercaseAgentToolDefinition(cwd, options?.agent),
		Task: createTaskToolDefinition(cwd, options?.agent),
	};
}

export function createCodingTools(cwd: string, options?: ToolsOptions): Tool[] {
	return [
		createUppercaseReadTool(cwd, options?.read),
		createUppercaseBashTool(cwd, options?.bash),
		createBashOutputNativeTool(),
		createKillShellTool(),
		createUppercaseEditTool(cwd, options?.edit),
		createUppercaseWriteTool(cwd, options?.write),
	];
}

export function createReadOnlyTools(cwd: string, options?: ToolsOptions): Tool[] {
	return [
		createUppercaseReadTool(cwd, options?.read),
		createUppercaseGrepTool(cwd, options?.grep),
		createUppercaseFindTool(cwd, options?.find),
		createUppercaseLsTool(cwd, options?.ls),
	];
}

export function createAllTools(cwd: string, options?: ToolsOptions): Record<ToolName, Tool> {
	return {
		read: createReadTool(cwd, options?.read),
		Read: createUppercaseReadTool(cwd, options?.read),
		bash: createBashTool(cwd, options?.bash),
		Bash: createUppercaseBashTool(cwd, options?.bash),
		bash_output: createBashOutputTool(),
		BashOutput: createBashOutputNativeTool(),
		bash_kill: createBashKillTool(),
		KillShell: createKillShellTool(),
		edit: createEditTool(cwd, options?.edit),
		Edit: createUppercaseEditTool(cwd, options?.edit),
		write: createWriteTool(cwd, options?.write),
		Write: createUppercaseWriteTool(cwd, options?.write),
		grep: createGrepTool(cwd, options?.grep),
		Grep: createUppercaseGrepTool(cwd, options?.grep),
		find: createFindTool(cwd, options?.find),
		Find: createUppercaseFindTool(cwd, options?.find),
		ls: createLsTool(cwd, options?.ls),
		Ls: createUppercaseLsTool(cwd, options?.ls),
		WebFetch: createWebFetchTool(cwd, options?.webFetch),
		web_fetch: createWebFetchTool(cwd, { ...options?.webFetch, toolName: "web_fetch", label: "web_fetch" }),
		WebSearch: createWebSearchTool(cwd, options?.webSearch),
		web_search: createWebSearchTool(cwd, { ...options?.webSearch, toolName: "web_search", label: "web_search" }),
		agent: createAgentTool(cwd, options?.agent),
		Agent: createUppercaseAgentTool(cwd, options?.agent),
		Task: createTaskTool(cwd, options?.agent),
	};
}

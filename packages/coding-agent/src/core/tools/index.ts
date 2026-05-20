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
} from "./agent.js";
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
	createBashOutputTool,
	createBashOutputToolDefinition,
	createBashTool,
	createBashToolDefinition,
	createLocalBashOperations,
	createUppercaseBashTool,
	createUppercaseBashToolDefinition,
	listBashBgJobs,
} from "./bash.js";
export {
	createEditTool,
	createEditToolDefinition,
	createUppercaseEditTool,
	createUppercaseEditToolDefinition,
	type EditOperations,
	type EditToolDetails,
	type EditToolInput,
	type EditToolOptions,
} from "./edit.js";
export { withFileMutationQueue } from "./file-mutation-queue.js";
export {
	createFindTool,
	createFindToolDefinition,
	createUppercaseFindTool,
	createUppercaseFindToolDefinition,
	type FindOperations,
	type FindToolDetails,
	type FindToolInput,
	type FindToolOptions,
} from "./find.js";
export {
	createGrepTool,
	createGrepToolDefinition,
	createUppercaseGrepTool,
	createUppercaseGrepToolDefinition,
	type GrepOperations,
	type GrepToolDetails,
	type GrepToolInput,
	type GrepToolOptions,
} from "./grep.js";
export {
	createLsTool,
	createLsToolDefinition,
	createUppercaseLsTool,
	createUppercaseLsToolDefinition,
	type LsOperations,
	type LsToolDetails,
	type LsToolInput,
	type LsToolOptions,
} from "./ls.js";
export {
	createReadTool,
	createReadToolDefinition,
	createUppercaseReadTool,
	createUppercaseReadToolDefinition,
	type ReadOperations,
	type ReadToolDetails,
	type ReadToolInput,
	type ReadToolOptions,
} from "./read.js";
export {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	type TruncationOptions,
	type TruncationResult,
	truncateHead,
	truncateLine,
	truncateTail,
} from "./truncate.js";
export {
	createUppercaseWriteTool,
	createUppercaseWriteToolDefinition,
	createWriteTool,
	createWriteToolDefinition,
	type WriteOperations,
	type WriteToolInput,
	type WriteToolOptions,
} from "./write.js";

import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ToolDefinition } from "../extensions/types.js";
import {
	type AgentToolOptions,
	createAgentTool,
	createAgentToolDefinition,
	createTaskTool,
	createTaskToolDefinition,
	createUppercaseAgentTool,
	createUppercaseAgentToolDefinition,
} from "./agent.js";
import {
	type BashToolOptions,
	createBashKillTool,
	createBashKillToolDefinition,
	createBashOutputTool,
	createBashOutputToolDefinition,
	createBashTool,
	createBashToolDefinition,
	createUppercaseBashTool,
	createUppercaseBashToolDefinition,
} from "./bash.js";
import {
	createEditTool,
	createEditToolDefinition,
	createUppercaseEditTool,
	createUppercaseEditToolDefinition,
	type EditToolOptions,
} from "./edit.js";
import {
	createFindTool,
	createFindToolDefinition,
	createUppercaseFindTool,
	createUppercaseFindToolDefinition,
	type FindToolOptions,
} from "./find.js";
import {
	createGrepTool,
	createGrepToolDefinition,
	createUppercaseGrepTool,
	createUppercaseGrepToolDefinition,
	type GrepToolOptions,
} from "./grep.js";
import {
	createLsTool,
	createLsToolDefinition,
	createUppercaseLsTool,
	createUppercaseLsToolDefinition,
	type LsToolOptions,
} from "./ls.js";
import {
	createReadTool,
	createReadToolDefinition,
	createUppercaseReadTool,
	createUppercaseReadToolDefinition,
	type ReadToolOptions,
} from "./read.js";
import {
	createUppercaseWriteTool,
	createUppercaseWriteToolDefinition,
	createWriteTool,
	createWriteToolDefinition,
	type WriteToolOptions,
} from "./write.js";

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
	| "bash_kill"
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
	| "agent"
	| "Agent"
	| "Task";
export const allToolNames: Set<ToolName> = new Set([
	"read",
	"Read",
	"bash",
	"Bash",
	"bash_output",
	"bash_kill",
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
		case "bash_kill":
			return createBashKillToolDefinition();
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
		case "bash_kill":
			return createBashKillTool();
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
		createBashOutputToolDefinition(),
		createBashKillToolDefinition(),
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
		bash_kill: createBashKillToolDefinition(),
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
		agent: createAgentToolDefinition(cwd, options?.agent),
		Agent: createUppercaseAgentToolDefinition(cwd, options?.agent),
		Task: createTaskToolDefinition(cwd, options?.agent),
	};
}

export function createCodingTools(cwd: string, options?: ToolsOptions): Tool[] {
	return [
		createUppercaseReadTool(cwd, options?.read),
		createUppercaseBashTool(cwd, options?.bash),
		createBashOutputTool(),
		createBashKillTool(),
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
		bash_kill: createBashKillTool(),
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
		agent: createAgentTool(cwd, options?.agent),
		Agent: createUppercaseAgentTool(cwd, options?.agent),
		Task: createTaskTool(cwd, options?.agent),
	};
}

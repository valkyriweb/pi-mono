/**
 * Unified background-task tools — Claude Code `task_id` parity.
 *
 * One id space over every long-running thing (background bash jobs + background
 * agent runs), dispatched through the `core/tasks` registry seam:
 *
 *   TaskOutput(task_id) → read accumulated output of any task
 *   TaskStop(task_id)   → stop any task
 *   TaskList()          → list every background task
 *
 * These replace the bash-only `BashOutput`/`KillShell` tools. The bash output
 * rendering (tail/head/all slicing, status header) is preserved verbatim via
 * the `local_bash` adapter's `output` capability, so retiring the old tools
 * loses no functionality — exactly CC's "BashOutput = shape, TaskOutput = tool".
 */

import { type Static, Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.ts";
import { findTaskAdapter, getTaskSnapshot, listTasks } from "../tasks/index.ts";
import { isTerminalTaskStatus, type TaskSnapshot } from "../tasks/types.ts";
import { wrapToolDefinition } from "./tool-definition-wrapper.ts";

const DEFAULT_BLOCK_TIMEOUT_MS = 60_000;
const BLOCK_POLL_INTERVAL_MS = 100;

const taskOutputSchema = Type.Object({
	task_id: Type.String({
		description: "Task id returned by bash(run_in_background:true) or Agent(run_in_background:true).",
	}),
	mode: Type.Optional(
		Type.Union([Type.Literal("tail"), Type.Literal("head"), Type.Literal("all")], {
			description: "For log-backed (bash) tasks: which slice of the log to return. Default: tail.",
		}),
	),
	maxLines: Type.Optional(
		Type.Number({ description: "For log-backed (bash) tasks: max lines to return (default 200, hard cap 1000)." }),
	),
	block: Type.Optional(
		Type.Boolean({
			description:
				"Wait until the task finishes (or timeout) before returning. Default: false (return current output immediately).",
		}),
	),
	timeout: Type.Optional(Type.Number({ description: "Max ms to wait when block=true. Default 60000." })),
});

export type TaskOutputToolInput = Static<typeof taskOutputSchema>;

const taskStopSchema = Type.Object({
	task_id: Type.Optional(
		Type.String({ description: "Task id to stop (bash background job or background agent run)." }),
	),
	shell_id: Type.Optional(Type.String({ description: "Deprecated: use task_id instead." })),
});

export type TaskStopToolInput = Static<typeof taskStopSchema>;

const taskListSchema = Type.Object({});

export type TaskListToolInput = Static<typeof taskListSchema>;

async function waitForTerminal(taskId: string, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const snap = getTaskSnapshot(taskId);
		if (!snap || isTerminalTaskStatus(snap.status)) return;
		await new Promise((resolve) => setTimeout(resolve, BLOCK_POLL_INTERVAL_MS));
	}
}

export function createTaskOutputToolDefinition(): ToolDefinition<typeof taskOutputSchema, TaskSnapshot | undefined> {
	return {
		name: "TaskOutput",
		label: "TaskOutput",
		description:
			"Read accumulated output from a background task by task_id — a background bash job (bash run_in_background:true) or a background agent run (Agent run_in_background:true). Bash tasks return a status header plus a bounded slice of stdout/stderr (mode/maxLines); agent tasks return their final result. Does not block by default; pass block:true to wait until the task finishes (up to timeout). For live wake-on-output streaming of bash, use monitor_start instead.",
		promptSnippet: "Read output from a background task by task_id",
		parameters: taskOutputSchema,
		async execute(_id, { task_id, mode, maxLines, block, timeout }) {
			const adapter = findTaskAdapter(task_id);
			if (!adapter) {
				const known =
					listTasks()
						.map((t) => t.id)
						.slice(-5)
						.join(", ") || "(none)";
				return {
					content: [{ type: "text", text: `No background task with task_id=${task_id}. Recent ids: ${known}` }],
					details: undefined,
				};
			}
			if (block) await waitForTerminal(task_id, timeout ?? DEFAULT_BLOCK_TIMEOUT_MS);
			if (!adapter.output) {
				const snap = adapter.snapshot(task_id);
				return {
					content: [
						{ type: "text", text: `task_id=${task_id} (${snap?.status ?? "unknown"}) has no readable output.` },
					],
					details: snap,
				};
			}
			const out = await adapter.output(task_id, { mode, maxLines });
			if (!out) {
				return {
					content: [{ type: "text", text: `No background task with task_id=${task_id}.` }],
					details: undefined,
				};
			}
			return { content: [{ type: "text", text: out.text }], details: out.snapshot };
		},
	};
}

export function createTaskOutputTool() {
	return wrapToolDefinition(createTaskOutputToolDefinition());
}

export function createTaskStopToolDefinition(): ToolDefinition<typeof taskStopSchema, TaskSnapshot | undefined> {
	return {
		name: "TaskStop",
		label: "TaskStop",
		description:
			"Stop a background task by task_id — a background bash job (SIGTERM to the process tree) or a background agent run (hard cancel). Idempotent: stopping an already-finished task is safe and just reports its state.",
		promptSnippet: "Stop a background task by task_id",
		parameters: taskStopSchema,
		async execute(_id, { task_id, shell_id }) {
			const id = task_id ?? shell_id;
			if (!id) {
				return { content: [{ type: "text", text: "TaskStop requires task_id." }], details: undefined };
			}
			const adapter = findTaskAdapter(id);
			if (!adapter || !adapter.kill) {
				return {
					content: [{ type: "text", text: `No stoppable background task with task_id=${id}.` }],
					details: undefined,
				};
			}
			const result = await adapter.kill(id);
			return { content: [{ type: "text", text: result.message }], details: result.snapshot };
		},
	};
}

export function createTaskStopTool() {
	return wrapToolDefinition(createTaskStopToolDefinition());
}

function renderTaskRow(task: TaskSnapshot): string {
	const elapsed = ((task.endedAt ?? Date.now()) - task.startedAt) / 1000;
	const flavor = task.type === "local_bash" ? "bash" : task.type === "local_agent" ? "agent" : task.type;
	return `${task.id}  [${flavor}]  ${task.status}  ${elapsed.toFixed(1)}s  ${task.description}`;
}

export function createTaskListToolDefinition(): ToolDefinition<typeof taskListSchema, TaskSnapshot[]> {
	return {
		name: "TaskList",
		label: "TaskList",
		description:
			"List every background task (background bash jobs and background agent runs) with id, kind, status, elapsed time, and description. Use to discover task_ids for TaskOutput/TaskStop.",
		promptSnippet: "List all background tasks",
		parameters: taskListSchema,
		async execute() {
			const tasks = listTasks().sort((a, b) => a.startedAt - b.startedAt);
			if (tasks.length === 0) {
				return { content: [{ type: "text", text: "No background tasks." }], details: [] };
			}
			const lines = tasks.map(renderTaskRow).join("\n");
			return { content: [{ type: "text", text: `${tasks.length} background task(s):\n${lines}` }], details: tasks };
		},
	};
}

export function createTaskListTool() {
	return wrapToolDefinition(createTaskListToolDefinition());
}

/**
 * Task registry — unified view over every long-running thing in the agent.
 *
 * v1 is a thin index: it knows which `Task` adapter to dispatch to based on
 * type, and enumerates live tasks by querying the underlying registries
 * (e.g. `listAgentRecentRuns`). No separate state is kept here — the source
 * of truth stays in the per-type registries.
 *
 * Layer B (TUI) consumes this surface. Future task types register via
 * `registerTaskAdapter`.
 */

import { listAgentRecentRuns, subscribeAgentRecentRuns } from "../agents/status.js";
import { LocalAgentTask } from "./local-agent-task.js";
import type { Task, TaskSnapshot, TaskType } from "./types.js";

const adapters = new Map<TaskType, Task>();

export function registerTaskAdapter(task: Task): void {
	adapters.set(task.type, task);
}

export function getTaskAdapter(type: TaskType): Task | undefined {
	return adapters.get(type);
}

/** Find which adapter owns a given task id by snapshotting each one. */
export function findTaskAdapter(taskId: string): Task | undefined {
	for (const task of adapters.values()) {
		if (task.snapshot(taskId)) return task;
	}
	return undefined;
}

/** Snapshot a single task by id. Returns undefined if no adapter owns it. */
export function getTaskSnapshot(taskId: string): TaskSnapshot | undefined {
	const adapter = findTaskAdapter(taskId);
	return adapter?.snapshot(taskId);
}

/**
 * Enumerate every known task across registered adapters.
 *
 * Order is adapter-defined; callers needing a stable sort should sort by
 * `startedAt` themselves. v1 only enumerates `local_agent` tasks via the
 * existing `listAgentRecentRuns` helper.
 */
export function listTasks(): TaskSnapshot[] {
	const out: TaskSnapshot[] = [];
	if (adapters.has("local_agent")) {
		for (const run of listAgentRecentRuns()) {
			const snap = LocalAgentTask.snapshot(run.id);
			if (snap) out.push(snap);
		}
	}
	return out;
}

/**
 * Subscribe to task-state changes across every adapter.
 *
 * v1 only forwards `subscribeAgentRecentRuns` since that's the only source of
 * truth wired up. Returns an unsubscribe function.
 */
export function subscribeTasks(listener: () => void): () => void {
	return subscribeAgentRecentRuns(listener);
}

/** For tests: clear the adapter table. Does NOT touch underlying registries. */
export function clearTaskAdaptersForTests(): void {
	adapters.clear();
}

// Default registration — keep at module bottom so `clearTaskAdaptersForTests`
// callers can re-register explicitly in setup.
registerTaskAdapter(LocalAgentTask);

/**
 * Sorted, filtered views over the unified task registry for TUI consumers.
 *
 * Mirrors Claude Code's `getRunningTeammatesSorted` pattern: one canonical
 * helper shared by the footer pill, the zoom-screen task selector, and any
 * future "cycle next/prev running task" navigation. Every UI surface that
 * cares about "what is the user actively zoomed on?" must consume this so
 * the cycle order stays identical across components.
 *
 * Order: ascending by `startedAt` (oldest-first) — matches Claude's tree
 * order, gives stable cycling, and makes "the task I just spawned" appear
 * predictably at the end.
 */

import { listTasks } from "./registry.ts";
import { isTerminalTaskStatus, type TaskSnapshot } from "./types.ts";

/**
 * Return every task that is not in a terminal state, sorted by `startedAt`
 * ascending. Includes `running`, `idle`, and `interrupted` — anything the
 * user might still want to zoom into and steer.
 */
export function getRunningTasksSorted(): TaskSnapshot[] {
	return listTasks()
		.filter((task) => !isTerminalTaskStatus(task.status))
		.sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * Step to the next/previous running task relative to `currentTaskId`. Wraps
 * at either end. Returns `undefined` when there are no running tasks.
 *
 * When `currentTaskId` is unknown (e.g. the previously zoomed task just
 * terminated and got filtered out), this falls back to the first task in
 * the sorted list for `direction: "next"` and the last for `"prev"`.
 */
export function cycleRunningTask(
	currentTaskId: string | undefined,
	direction: "next" | "prev",
	tasks: TaskSnapshot[] = getRunningTasksSorted(),
): TaskSnapshot | undefined {
	if (tasks.length === 0) return undefined;
	const currentIndex = currentTaskId ? tasks.findIndex((task) => task.id === currentTaskId) : -1;
	if (currentIndex === -1) {
		return direction === "next" ? tasks[0] : tasks[tasks.length - 1];
	}
	const offset = direction === "next" ? 1 : -1;
	const nextIndex = (currentIndex + offset + tasks.length) % tasks.length;
	return tasks[nextIndex];
}

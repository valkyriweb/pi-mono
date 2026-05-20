/**
 * LocalAgentTask — Task adapter over `AgentRecentRun`.
 *
 * Maps the unified Task verbs onto pi's existing background-agent control
 * surface in `core/agents/status.ts`:
 *
 *   Task.kill            → cancelAgentRecentRun     (hard abort)
 *   Task.requestShutdown → interruptAgentRecentRun  (cooperative, resumable)
 *   Task.injectMessage   → interrupt → resume(msg)  (turn-boundary steer)
 *
 * No behavior change to the underlying registry — this is a pure facade so the
 * TUI (Layer B) can talk to one interface regardless of task flavor.
 */

import type { AgentRecentRun } from "../agents/status.ts";
import {
	cancelAgentRecentRun,
	findAgentRecentRun,
	interruptAgentRecentRun,
	resumeAgentRecentRun,
} from "../agents/status.ts";
import type { AgentToolStatus } from "../agents/types.ts";
import type { Task, TaskControlResult, TaskSnapshot, TaskStatus } from "./types.ts";

function mapStatus(status: AgentToolStatus): TaskStatus {
	switch (status) {
		case "running":
			return "running";
		case "completed":
			return "completed";
		case "failed":
			return "failed";
		case "cancelled":
			return "cancelled";
		case "interrupted":
			return "interrupted";
	}
}

function describeRun(run: AgentRecentRun): string {
	const agents = run.agents.length > 0 ? run.agents.join(", ") : "agent";
	const first = run.tasks[0] ?? "";
	const preview = first.length > 60 ? `${first.slice(0, 59)}…` : first;
	return preview ? `${agents}: ${preview}` : agents;
}

function snapshotFromRun(run: AgentRecentRun): TaskSnapshot {
	return {
		id: run.id,
		type: "local_agent",
		status: mapStatus(run.status),
		description: describeRun(run),
		startedAt: Date.parse(run.startedAt),
		endedAt: run.endedAt ? Date.parse(run.endedAt) : undefined,
		resumable: run.resumable,
		error: run.error,
	};
}

function lookup(taskId: string): TaskSnapshot | undefined {
	const run = findAgentRecentRun(taskId);
	return run ? snapshotFromRun(run) : undefined;
}

function toControlResult(taskId: string, ok: boolean, message: string): TaskControlResult {
	return { ok, message, snapshot: lookup(taskId) };
}

export const LocalAgentTask: Task = {
	type: "local_agent",

	snapshot(taskId) {
		return lookup(taskId);
	},

	async kill(taskId) {
		const result = await cancelAgentRecentRun(taskId);
		return toControlResult(taskId, result.ok, result.message);
	},

	async requestShutdown(taskId) {
		const result = await interruptAgentRecentRun(taskId);
		return toControlResult(taskId, result.ok, result.message);
	},

	async injectMessage(taskId, message) {
		const trimmed = message.trim();
		if (!trimmed) {
			return toControlResult(taskId, false, "Cannot inject an empty message");
		}
		const current = findAgentRecentRun(taskId);
		if (!current) return toControlResult(taskId, false, `Run not found: ${taskId}`);

		// If still running, soft-stop first so the resume path can pick up the
		// new prompt at the next turn boundary. Mirrors Claude's
		// pendingUserMessages drain, except via interrupt+resume rather than an
		// in-loop hook (see executor.ts audit — single `session.prompt()` call
		// is opaque, no re-entry point today).
		if (current.status === "running") {
			const interrupt = await interruptAgentRecentRun(taskId);
			if (!interrupt.ok) return toControlResult(taskId, false, interrupt.message);
		}

		const resumed = await resumeAgentRecentRun(taskId, trimmed);
		return toControlResult(taskId, resumed.ok, resumed.message);
	},
};

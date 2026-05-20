/**
 * Module-level registry of live child `AgentSession` objects, keyed by
 * `AgentRecentRun` / task id. Written by `executor.ts` during a child run;
 * read by `ZoomedSessionTranscript` to subscribe to the child's event stream.
 *
 * A separate module (not part of `status.ts`) avoids coupling the pure
 * status store to the session object graph.
 */

import type { AgentSession } from "../agent-session.ts";

const liveSessions = new Map<string, AgentSession>();

/**
 * Register a live session for a task id. Called by executor.ts immediately
 * before driving the child session prompt loop.
 */
export function registerLiveSession(taskId: string, session: AgentSession): void {
	liveSessions.set(taskId, session);
}

/**
 * Deregister a live session. Called in the driveChildSession finally block.
 */
export function unregisterLiveSession(taskId: string): void {
	liveSessions.delete(taskId);
}

/**
 * Return the live session for a task id, or undefined if the task has not
 * started or has already finished.
 */
export function getLiveSession(taskId: string): AgentSession | undefined {
	return liveSessions.get(taskId);
}

/** For tests: clear all registrations. */
export function clearLiveSessionsForTests(): void {
	liveSessions.clear();
}

/**
 * Phase 2b: ZoomedSessionTranscript — live session rendering in the zoom view.
 *
 * Verifies that:
 *   1. Streaming assistant text mutates in place — no duplicate-prefix lines.
 *   2. Tool events create/finish ToolExecutionComponent widgets.
 *   3. Falls back to undefined when no live session is available.
 *
 * Uses a stubbed AgentSession (minimal subscribe/unsubscribe) — no real TUI,
 * model, or provider required.
 */

import type { Container } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, test, vi } from "vitest";
import type { AgentSessionEventListener } from "../src/core/agent-session.js";
import {
	clearLiveSessionsForTests,
	getLiveSession,
	registerLiveSession,
	unregisterLiveSession,
} from "../src/core/agents/live-sessions.js";
import {
	makeZoomedSessionTranscript,
	ZoomedSessionTranscript,
} from "../src/modes/interactive/components/zoomed-session-transcript.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

// ---------------------------------------------------------------------------
// Minimal stubs
// ---------------------------------------------------------------------------

function makeStubSession() {
	const listeners: AgentSessionEventListener[] = [];
	return {
		sessionManager: {
			getEntries: () => [],
		},
		subscribe(listener: AgentSessionEventListener) {
			listeners.push(listener);
			return () => {
				const idx = listeners.indexOf(listener);
				if (idx !== -1) listeners.splice(idx, 1);
			};
		},
		emit(event: Parameters<AgentSessionEventListener>[0]) {
			for (const l of [...listeners]) l(event);
		},
		listeners,
	};
}

const stubTui = {
	requestRender: vi.fn(),
} as unknown as import("@earendil-works/pi-tui").TUI;

const stubConfig = {
	cwd: "/tmp",
	hideThinkingBlock: false,
	showImages: false,
	imageWidthCells: 60,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function childCount(transcript: ZoomedSessionTranscript): number {
	return (transcript as unknown as Container).children.length;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ZoomedSessionTranscript — Phase 2b", () => {
	beforeAll(() => {
		initTheme("dark", false);
	});

	test("makeZoomedSessionTranscript returns undefined for missing session", () => {
		const result = makeZoomedSessionTranscript(undefined, stubTui, stubConfig);
		expect(result).toBeUndefined();
	});

	test("streaming text mutates in place — no duplicate children per message", () => {
		const session = makeStubSession();
		const transcript = new ZoomedSessionTranscript(session as never, stubTui, stubConfig);
		const initialChildren = childCount(transcript);

		// Start a streaming assistant message.
		session.emit({
			type: "message_start",
			message: {
				role: "assistant",
				content: [],
				usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: { total: 0 } },
				stopReason: "end_turn",
				errorMessage: undefined,
			},
		} as never);

		const afterStart = childCount(transcript);
		expect(afterStart).toBeGreaterThan(initialChildren);

		// Several text deltas — must NOT add new children per delta.
		for (const text of ["Hello", "Hello world", "Hello world, how are you?"]) {
			session.emit({
				type: "message_update",
				message: {
					role: "assistant",
					content: [{ type: "text", text }],
					usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: { total: 0 } },
					stopReason: "end_turn",
					errorMessage: undefined,
				},
				assistantMessageEvent: { type: "content_block_delta", delta: { type: "text_delta", text } } as never,
			} as never);
		}

		// Child count must not have grown since message_start.
		expect(childCount(transcript)).toBe(afterStart);

		// Finish the message.
		session.emit({
			type: "message_end",
			message: {
				role: "assistant",
				content: [{ type: "text", text: "Hello world, how are you?" }],
				usage: { input: 5, output: 10, cacheRead: 0, cacheWrite: 0, cost: { total: 0 } },
				stopReason: "end_turn",
				errorMessage: undefined,
			},
		} as never);

		// Still no extra children.
		expect(childCount(transcript)).toBe(afterStart);

		transcript.dispose();
	});

	test("tool_execution_start adds a child; tool_execution_end does not add another", () => {
		const session = makeStubSession();
		const transcript = new ZoomedSessionTranscript(session as never, stubTui, stubConfig);
		const initial = childCount(transcript);

		session.emit({
			type: "tool_execution_start",
			toolCallId: "call-1",
			toolName: "bash",
			args: { command: "echo hi" },
		} as never);

		const afterToolStart = childCount(transcript);
		expect(afterToolStart).toBeGreaterThan(initial);

		session.emit({
			type: "tool_execution_end",
			toolCallId: "call-1",
			toolName: "bash",
			result: { content: [{ type: "text", text: "hi" }], isError: false },
			isError: false,
		} as never);

		// tool_execution_end should not add more children.
		expect(childCount(transcript)).toBe(afterToolStart);

		transcript.dispose();
	});

	test("dispose unsubscribes from session — no more renders after dispose", () => {
		const session = makeStubSession();
		const transcript = new ZoomedSessionTranscript(session as never, stubTui, stubConfig);

		expect(session.listeners.length).toBe(1);
		transcript.dispose();
		expect(session.listeners.length).toBe(0);
	});

	test("live-session registry: register/get/unregister", () => {
		clearLiveSessionsForTests();
		const session = makeStubSession();
		registerLiveSession("task-99", session as never);
		expect(getLiveSession("task-99")).toBe(session);
		unregisterLiveSession("task-99");
		expect(getLiveSession("task-99")).toBeUndefined();
	});
});

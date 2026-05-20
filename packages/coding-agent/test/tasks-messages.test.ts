import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	appendTaskMessage,
	clearTaskMessagesForTests,
	evictTaskMessages,
	getTaskMessages,
	MAX_EVENTS_PER_TASK,
	subscribeTaskMessages,
} from "../src/core/tasks/index.ts";

describe("tasks/messages ring buffer", () => {
	beforeEach(() => {
		clearTaskMessagesForTests();
	});
	afterEach(() => {
		clearTaskMessagesForTests();
	});

	test("appendTaskMessage stores and getTaskMessages returns a copy", () => {
		appendTaskMessage("a1", { kind: "assistant_text", ts: 1, text: "hi" });
		appendTaskMessage("a1", { kind: "tool_start", ts: 2, toolName: "read" });

		const snap = getTaskMessages("a1");
		expect(snap.map((e) => e.kind)).toEqual(["assistant_text", "tool_start"]);

		// Mutating snapshot must not affect internal buffer
		snap.length = 0;
		expect(getTaskMessages("a1")).toHaveLength(2);
	});

	test("buffers are isolated per task id", () => {
		appendTaskMessage("a1", { kind: "assistant_text", ts: 1, text: "hi" });
		appendTaskMessage("a2", { kind: "assistant_text", ts: 1, text: "yo" });
		expect(getTaskMessages("a1")).toHaveLength(1);
		expect(getTaskMessages("a2")).toHaveLength(1);
		expect(getTaskMessages("a1")[0]).not.toEqual(getTaskMessages("a2")[0]);
	});

	test("subscribeTaskMessages fires on each append and respects unsubscribe", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeTaskMessages("a1", listener);

		appendTaskMessage("a1", { kind: "assistant_text", ts: 1, text: "one" });
		appendTaskMessage("a1", { kind: "assistant_text", ts: 2, text: "two" });
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
		appendTaskMessage("a1", { kind: "assistant_text", ts: 3, text: "three" });
		expect(listener).toHaveBeenCalledTimes(2);
	});

	test("subscribers for other tasks are not notified", () => {
		const listenerA = vi.fn();
		const listenerB = vi.fn();
		subscribeTaskMessages("a1", listenerA);
		subscribeTaskMessages("a2", listenerB);

		appendTaskMessage("a1", { kind: "assistant_text", ts: 1, text: "x" });
		expect(listenerA).toHaveBeenCalledOnce();
		expect(listenerB).not.toHaveBeenCalled();
	});

	test("ring buffer evicts oldest past MAX_EVENTS_PER_TASK", () => {
		for (let i = 0; i < MAX_EVENTS_PER_TASK + 50; i++) {
			appendTaskMessage("a1", { kind: "assistant_text", ts: i, text: String(i) });
		}
		const snap = getTaskMessages("a1");
		expect(snap).toHaveLength(MAX_EVENTS_PER_TASK);
		expect((snap[0] as { ts: number }).ts).toBe(50);
		expect((snap.at(-1) as { ts: number }).ts).toBe(MAX_EVENTS_PER_TASK + 49);
	});

	test("listener exceptions never break the sink", () => {
		const broken = vi.fn(() => {
			throw new Error("boom");
		});
		const good = vi.fn();
		subscribeTaskMessages("a1", broken);
		subscribeTaskMessages("a1", good);

		appendTaskMessage("a1", { kind: "assistant_text", ts: 1, text: "x" });
		expect(broken).toHaveBeenCalledOnce();
		expect(good).toHaveBeenCalledOnce();
		expect(getTaskMessages("a1")).toHaveLength(1);
	});

	test("evictTaskMessages drops the buffer", () => {
		appendTaskMessage("a1", { kind: "assistant_text", ts: 1, text: "x" });
		evictTaskMessages("a1");
		expect(getTaskMessages("a1")).toHaveLength(0);
	});
});

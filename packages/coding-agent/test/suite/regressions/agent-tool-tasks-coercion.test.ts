/**
 * Regression: some providers occasionally serialize the agent tool's `tasks`
 * (or `chain`) argument as a JSON string instead of a native array, despite
 * the schema declaring `Type.Array(...)`. Before this guard, `tasks?.map is
 * not a function` blew up inside `normalizeAgentToolAliases` and the model
 * had to retry the call. The harness should coerce common malformed shapes
 * (stringified array, single object) into the declared array shape and only
 * throw a clear error for genuinely uncoercible input.
 */
import { describe, expect, it } from "vitest";
import type { AgentToolInput } from "../../../src/core/tools/agent.ts";
import { normalizeAgentToolAliases, normalizeAgentToolMode } from "../../../src/core/tools/agent.ts";

describe("regression: agent tool tasks/chain coercion", () => {
	it("parses a JSON-stringified tasks array", () => {
		const input = {
			tasks: JSON.stringify([
				{ agent: "explore", task: "scan A" },
				{ agent: "explore", task: "scan B" },
			]),
		} as unknown as AgentToolInput;
		const normalized = normalizeAgentToolAliases(input);
		expect(Array.isArray(normalized.tasks)).toBe(true);
		expect(normalized.tasks).toHaveLength(2);
		expect(normalized.tasks?.[0]).toMatchObject({ agent: "explore", task: "scan A" });
	});

	it("wraps a single task object passed as tasks", () => {
		const input = {
			tasks: { agent: "explore", task: "scan once" },
		} as unknown as AgentToolInput;
		const normalized = normalizeAgentToolAliases(input);
		expect(normalized.tasks).toHaveLength(1);
		expect(normalized.tasks?.[0]).toMatchObject({ agent: "explore", task: "scan once" });
	});

	it("coerces chain the same way", () => {
		const input = {
			chain: '[{"agent":"plan","task":"step 1"},{"agent":"worker","task":"step 2"}]',
		} as unknown as AgentToolInput;
		const normalized = normalizeAgentToolAliases(input);
		expect(normalized.chain).toHaveLength(2);
		expect(normalized.chain?.[1]).toMatchObject({ agent: "worker", task: "step 2" });
	});

	it("normalizeAgentToolMode resolves a stringified parallel call", () => {
		const input = {
			tasks: '[{"agent":"explore","task":"a"},{"agent":"explore","task":"b"}]',
		} as unknown as AgentToolInput;
		const { mode, tasks } = normalizeAgentToolMode(input);
		expect(mode).toBe("parallel");
		expect(tasks).toHaveLength(2);
	});

	it("throws a clear error for an unparseable string", () => {
		const input = { tasks: "not json at all{" } as unknown as AgentToolInput;
		expect(() => normalizeAgentToolAliases(input)).toThrow(/unparseable/);
	});

	it("throws a clear error for a primitive value", () => {
		const input = { tasks: 42 } as unknown as AgentToolInput;
		expect(() => normalizeAgentToolAliases(input)).toThrow(/must be an array/);
	});

	it("leaves a native array unchanged in shape", () => {
		const input: AgentToolInput = {
			tasks: [
				{ agent: "explore", task: "a" },
				{ agent: "explore", task: "b" },
			],
		};
		const normalized = normalizeAgentToolAliases(input);
		expect(normalized.tasks).toHaveLength(2);
		expect(normalized.tasks?.[0]).toMatchObject({ agent: "explore", task: "a" });
	});
});

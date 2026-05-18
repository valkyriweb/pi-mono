import { describe, expect, it } from "vitest";
import { buildChildTaskPrompt } from "../../src/core/agents/context.js";
import type { AgentTaskConfig } from "../../src/core/agents/types.js";

const baseTask: AgentTaskConfig = {
	agent: "worker",
	task: "do the thing",
	context: "default",
};

describe("buildChildTaskPrompt", () => {
	it("prepends a child-agent reminder so subagents know not to call the agent tool", () => {
		const prompt = buildChildTaskPrompt(baseTask);
		// Reminder lives in the *user message* (not system prompt / not tool
		// schemas) so fork-mode children keep cache-identity with the parent's
		// system + tools prefix. The reminder text is the only enforcement
		// against recursion in fork mode, since fork mode preserves the parent's
		// tool schemas verbatim for prompt-cache reuse.
		expect(prompt).toMatch(/<system-reminder>/);
		expect(prompt).toMatch(/agent.*not available|cannot spawn/i);
		expect(prompt).toMatch(/<\/system-reminder>/);
	});

	it("keeps the existing 'Complete this delegated task:' marker after the reminder", () => {
		const prompt = buildChildTaskPrompt(baseTask);
		const reminderIdx = prompt.indexOf("</system-reminder>");
		const markerIdx = prompt.indexOf("Complete this delegated task:");
		expect(reminderIdx).toBeGreaterThan(-1);
		expect(markerIdx).toBeGreaterThan(reminderIdx);
		expect(prompt).toContain("do the thing");
	});

	it("includes extraContext when provided, after the task body", () => {
		const prompt = buildChildTaskPrompt({ ...baseTask, extraContext: "be careful with X" });
		expect(prompt).toContain("Additional context:");
		expect(prompt).toContain("be careful with X");
		expect(prompt.indexOf("do the thing")).toBeLessThan(prompt.indexOf("Additional context:"));
	});

	it("produces stable bytes across calls with the same input (cache-friendliness)", () => {
		const a = buildChildTaskPrompt(baseTask);
		const b = buildChildTaskPrompt(baseTask);
		expect(a).toBe(b);
	});
});

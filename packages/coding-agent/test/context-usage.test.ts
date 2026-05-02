import { describe, expect, it } from "vitest";
import { AgentSession } from "../src/core/agent-session.js";

function getContextUsageFor(options: { systemPrompt: string; messages?: unknown[]; contextWindow?: number }) {
	return AgentSession.prototype.getContextUsage.call({
		model: { contextWindow: options.contextWindow ?? 1000 },
		systemPrompt: options.systemPrompt,
		messages: options.messages ?? [],
		sessionManager: {
			getBranch: () => [],
		},
	});
}

describe("AgentSession context usage", () => {
	it("includes the startup system prompt before provider usage exists", () => {
		const usage = getContextUsageFor({ systemPrompt: "x".repeat(200), contextWindow: 1000 });

		expect(usage).toEqual({
			tokens: 50,
			contextWindow: 1000,
			percent: 5,
		});
	});

	it("does not double-count the system prompt after provider usage exists", () => {
		const usage = getContextUsageFor({
			systemPrompt: "x".repeat(200),
			contextWindow: 1000,
			messages: [
				{
					role: "assistant",
					content: [],
					stopReason: "end_turn",
					usage: {
						input: 100,
						output: 10,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 110,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
				},
			],
		});

		expect(usage).toEqual({
			tokens: 110,
			contextWindow: 1000,
			percent: 11,
		});
	});
});

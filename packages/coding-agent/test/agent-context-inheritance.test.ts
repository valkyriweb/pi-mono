import type { AssistantMessage, ToolResultMessage, UserMessage } from "@mariozechner/pi-ai";
import { describe, expect, test } from "vitest";
import {
	getChildResourceLoaderOptions,
	getFilteredForkMessages,
	resolveContextPolicy,
} from "../src/core/agents/context.js";
import type { AgentDefinition } from "../src/core/agents/types.js";
import { SessionManager } from "../src/core/session-manager.js";

const agent: AgentDefinition = {
	id: "scout",
	description: "Scout",
	prompt: "Scout prompt.",
	source: "builtin",
};

const assistantBase = {
	api: "openai-responses" as const,
	provider: "openai",
	model: "gpt-4o-mini",
	usage: {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	},
	timestamp: Date.now(),
};

describe("agent context inheritance", () => {
	test("resolves public context modes into independent tiers", () => {
		expect(resolveContextPolicy("default")).toMatchObject({
			includeTranscript: false,
			includeProjectContext: true,
			includeSkills: true,
			includeAppendSystemPrompt: true,
		});
		expect(resolveContextPolicy("fork").includeTranscript).toBe(true);
		expect(resolveContextPolicy("slim")).toMatchObject({
			includeProjectContext: false,
			includeSkills: false,
			includeAppendSystemPrompt: true,
		});
		expect(resolveContextPolicy("none")).toMatchObject({
			includeTranscript: false,
			includeProjectContext: false,
			includeSkills: false,
			includeAppendSystemPrompt: false,
		});
	});

	test("child resource options make slim and none observably different", () => {
		const slim = getChildResourceLoaderOptions(resolveContextPolicy("slim"), agent);
		expect(slim.noContextFiles).toBe(true);
		expect(slim.noSkills).toBe(true);
		expect(slim.appendSystemPromptOverride?.(["project append"])).toEqual(expect.arrayContaining(["project append"]));

		const none = getChildResourceLoaderOptions(resolveContextPolicy("none"), agent);
		expect(none.noContextFiles).toBe(true);
		expect(none.noSkills).toBe(true);
		expect(none.appendSystemPromptOverride?.(["project append"])).toEqual(
			expect.not.arrayContaining(["project append"]),
		);

		const defaults = getChildResourceLoaderOptions(resolveContextPolicy("default"), agent);
		expect(defaults.noContextFiles).toBe(false);
		expect(defaults.noSkills).toBe(false);
		expect(defaults.appendSystemPromptOverride?.(["project append"])).toEqual(
			expect.arrayContaining(["project append"]),
		);
	});

	test("fork filtering strips native agent and legacy subagent artifacts", () => {
		const session = SessionManager.inMemory();
		const userMessage: UserMessage = {
			role: "user",
			content: [{ type: "text", text: "keep" }],
			timestamp: Date.now(),
		};
		const normalAssistant: AssistantMessage = {
			...assistantBase,
			role: "assistant",
			content: [{ type: "text", text: "keep assistant" }],
			stopReason: "stop",
		};
		const agentAssistant: AssistantMessage = {
			...assistantBase,
			role: "assistant",
			content: [{ type: "toolCall", id: "call-1", name: "agent", arguments: { agent: "scout", task: "x" } }],
			stopReason: "toolUse",
		};
		const subagentResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "call-2",
			toolName: "subagent",
			content: [{ type: "text", text: "strip" }],
			isError: false,
			timestamp: Date.now(),
		};
		session.appendMessage(userMessage);
		session.appendMessage(normalAssistant);
		session.appendMessage(agentAssistant);
		session.appendMessage(subagentResult);

		const messages = getFilteredForkMessages(session);
		expect(messages).toContain(userMessage);
		expect(messages).toContain(normalAssistant);
		expect(messages).not.toContain(agentAssistant);
		expect(messages).not.toContain(subagentResult);
	});

	test("fork filtering removes orphaned tool calls and tool results", () => {
		const session = SessionManager.inMemory();
		const mixedAssistant: AssistantMessage = {
			...assistantBase,
			role: "assistant",
			content: [
				{ type: "toolCall", id: "keep-call", name: "read", arguments: { path: "README.md" } },
				{ type: "toolCall", id: "agent-call", name: "agent", arguments: { agent: "scout", task: "x" } },
			],
			stopReason: "toolUse",
		};
		const keepResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "keep-call",
			toolName: "read",
			content: [{ type: "text", text: "read result" }],
			isError: false,
			timestamp: Date.now(),
		};
		const orphanResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "missing-call",
			toolName: "read",
			content: [{ type: "text", text: "orphan" }],
			isError: false,
			timestamp: Date.now(),
		};
		session.appendMessage(mixedAssistant);
		session.appendMessage(keepResult);
		session.appendMessage(orphanResult);

		const messages = getFilteredForkMessages(session);
		expect(messages).toHaveLength(2);
		const assistant = messages[0];
		expect(assistant?.role).toBe("assistant");
		if (assistant?.role === "assistant") {
			expect(assistant.content).toEqual([
				{ type: "toolCall", id: "keep-call", name: "read", arguments: { path: "README.md" } },
			]);
		}
		expect(messages[1]).toBe(keepResult);
	});
});

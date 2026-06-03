import { visibleWidth } from "@valkyriweb/pi-tui";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AgentSession } from "../src/core/agent-session.ts";
import {
	clearAgentRecentRunsForTests,
	formatAgentFooterStatus,
	startAgentRecentRun,
} from "../src/core/agents/status.ts";
import type { ReadonlyFooterDataProvider } from "../src/core/footer-data-provider.ts";
import { FooterComponent, formatCwdForFooter } from "../src/modes/interactive/components/footer.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";

type AssistantUsage = {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: { total: number };
};

function createSession(options: {
	sessionName: string;
	modelId?: string;
	provider?: string;
	reasoning?: boolean;
	thinkingLevel?: string;
	usage?: AssistantUsage;
	entries?: unknown[];
	branchEntries?: unknown[];
	isStreaming?: boolean;
}): AgentSession {
	const usage = options.usage;
	const entries =
		options.entries ??
		(usage === undefined
			? []
			: [
					{
						type: "message",
						message: {
							role: "assistant",
							usage,
						},
					},
				]);

	const session = {
		state: {
			model: {
				id: options.modelId ?? "test-model",
				provider: options.provider ?? "test",
				contextWindow: 200_000,
				reasoning: options.reasoning ?? false,
			},
			thinkingLevel: options.thinkingLevel ?? "off",
		},
		isStreaming: options.isStreaming ?? false,
		sessionManager: {
			getEntries: () => entries,
			getBranch: () => options.branchEntries ?? entries,
			getSessionName: () => options.sessionName,
			getCwd: () => "/tmp/project",
		},
		getContextUsage: () => ({ contextWindow: 200_000, percent: 12.3 }),
		modelRegistry: {
			isUsingOAuth: () => false,
		},
		extensionRunner: {
			// Mirrors the production agents extension hook (core/extensions/agents.ts)
			// which contributes the background-agent status pill.
			getRegisteredFooters: () => {
				const rendered = formatAgentFooterStatus();
				if (rendered === undefined) return [];
				return [
					{
						id: "agents-status",
						extensionPath: "<builtin:hook:agents>",
						spec: {
							render: () => rendered,
							onActivate: () => {},
						},
					},
				];
			},
		},
	};

	return session as unknown as AgentSession;
}

function createFooterData(providerCount: number): ReadonlyFooterDataProvider {
	const provider = {
		getGitBranch: () => "main",
		getExtensionStatuses: () => new Map<string, string>(),
		getAvailableProviderCount: () => providerCount,
		onBranchChange: (callback: () => void) => {
			void callback;
			return () => {};
		},
	};

	return provider;
}

describe("formatCwdForFooter", () => {
	it("does not abbreviate sibling paths that share the home prefix", () => {
		expect(formatCwdForFooter("/home/user2", "/home/user")).toBe("/home/user2");
	});

	it("abbreviates the home directory and descendants", () => {
		expect(formatCwdForFooter("/home/user", "/home/user")).toBe("~");
		expect(formatCwdForFooter("/home/user/project", "/home/user")).toBe("~/project");
	});
});

describe("FooterComponent width handling", () => {
	beforeAll(() => {
		initTheme(undefined, false);
	});

	beforeEach(() => clearAgentRecentRunsForTests());

	it("keeps all lines within width for wide session names", () => {
		const width = 93;
		const session = createSession({ sessionName: "한글".repeat(30) });
		const footer = new FooterComponent(session, createFooterData(1));

		const lines = footer.render(width);
		for (const line of lines) {
			expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});

	it("keeps stats line within width for wide model and provider names", () => {
		const width = 60;
		const session = createSession({
			sessionName: "",
			modelId: "模".repeat(30),
			provider: "공급자",
			reasoning: true,
			thinkingLevel: "high",
			usage: {
				input: 12_345,
				output: 6_789,
				cacheRead: 0,
				cacheWrite: 0,
				cost: { total: 1.234 },
			},
		});
		const footer = new FooterComponent(session, createFooterData(2));

		const lines = footer.render(width);
		for (const line of lines) {
			expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});

	it("resets token and cache totals after the latest compaction entry", () => {
		const footer = new FooterComponent(
			createSession({
				sessionName: "",
				entries: [
					{
						id: "before",
						type: "message",
						message: {
							role: "assistant",
							usage: {
								input: 100_000,
								output: 1,
								cacheRead: 300_000,
								cacheWrite: 100_000,
								cost: { total: 9 },
							},
						},
					},
					{
						id: "compact",
						type: "compaction",
						timestamp: "2026-05-31T08:00:00.000Z",
						summary: "summary",
						firstKeptEntryId: "after",
						tokensBefore: 100_000,
					},
					{
						id: "after",
						type: "message",
						message: {
							role: "assistant",
							usage: {
								input: 2_000,
								output: 1,
								cacheRead: 8_000,
								cacheWrite: 2_000,
								cost: { total: 1 },
							},
						},
					},
				],
			}),
			createFooterData(1),
		);

		const rendered = footer.render(140).join("\n");

		expect(rendered).toContain("↑2.0k");
		expect(rendered).toContain("R8.0k");
		expect(rendered).toContain("W2.0k");
		expect(rendered).toContain("cache 67%");
		expect(rendered).toContain("t1");
		expect(rendered).not.toContain("↑102k");
		expect(rendered).not.toContain("t2");
	});

	it("computes token and cache totals from the active branch only", () => {
		const shared = {
			id: "shared",
			type: "message",
			message: {
				role: "assistant",
				usage: {
					input: 1_000,
					output: 1,
					cacheRead: 9_000,
					cacheWrite: 0,
					cost: { total: 1 },
				},
			},
		};
		const abandoned = {
			id: "abandoned",
			type: "message",
			message: {
				role: "assistant",
				usage: {
					input: 100_000,
					output: 1,
					cacheRead: 0,
					cacheWrite: 100_000,
					cost: { total: 9 },
				},
			},
		};
		const active = {
			id: "active",
			type: "message",
			message: {
				role: "assistant",
				usage: {
					input: 2_000,
					output: 1,
					cacheRead: 8_000,
					cacheWrite: 0,
					cost: { total: 1 },
				},
			},
		};
		const footer = new FooterComponent(
			createSession({
				sessionName: "",
				entries: [shared, abandoned, active],
				branchEntries: [shared, active],
			}),
			createFooterData(1),
		);

		const rendered = footer.render(140).join("\n");

		expect(rendered).toContain("↑3.0k");
		expect(rendered).toContain("R17k");
		expect(rendered).toContain("cache 85%");
		expect(rendered).not.toContain("↑103k");
		expect(rendered).not.toContain("W100k");
	});

	it("uses provider-normalized cache fields for OpenAI/Codex read-only cache reports", () => {
		const footer = new FooterComponent(
			createSession({
				sessionName: "",
				provider: "openai-codex",
				usage: {
					input: 34_000,
					output: 1,
					cacheRead: 33_000,
					cacheWrite: 0,
					cost: { total: 1 },
				},
			}),
			createFooterData(1),
		);

		const rendered = footer.render(140).join("\n");

		expect(rendered).toContain("↑34k");
		expect(rendered).toContain("R33k");
		expect(rendered).toContain("cache 49%");
	});

	it("shows the streaming work-bar only while streaming", () => {
		const idle = new FooterComponent(createSession({ sessionName: "" }), createFooterData(1));
		expect(idle.render(120).join("\n")).not.toContain("esc to interrupt");

		const streaming = new FooterComponent(
			createSession({ sessionName: "", isStreaming: true }),
			createFooterData(1),
		);
		const rendered = streaming.render(120).join("\n");
		expect(rendered).toContain("esc to interrupt");
		// Elapsed timer + pulse dot present (●/○ depending on sub-second phase).
		expect(rendered).toMatch(/[●○] \d+s/);
	});

	it("keeps the stats line within width while streaming on a narrow terminal", () => {
		const width = 50;
		const footer = new FooterComponent(
			createSession({
				sessionName: "",
				modelId: "claude-opus-4-8",
				isStreaming: true,
				usage: { input: 12_345, output: 6_789, cacheRead: 4_000, cacheWrite: 1_000, cost: { total: 1.234 } },
			}),
			createFooterData(2),
		);
		for (const line of footer.render(width)) {
			expect(visibleWidth(line)).toBeLessThanOrEqual(width);
		}
	});

	it("shows active background agent runs in the footer", () => {
		startAgentRecentRun("single", [{ agent: "worker", task: "Sleep" }], {
			background: true,
		});
		const footer = new FooterComponent(createSession({ sessionName: "" }), createFooterData(1));
		const rendered = footer.render(100).join("\n");

		expect(rendered).toContain("Agents: 1 running");
		expect(rendered).toContain("/agents runs");
	});
});

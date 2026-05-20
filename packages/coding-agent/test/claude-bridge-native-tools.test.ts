import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Model } from "@earendil-works/pi-ai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultResourceLoader } from "../src/core/resource-loader.ts";
import { createAgentSession } from "../src/core/sdk.ts";
import { SessionManager } from "../src/core/session-manager.ts";
import { SettingsManager } from "../src/core/settings-manager.ts";

function createModel(provider: string): Model<"anthropic-messages"> {
	return {
		id: "claude-sonnet-4-5",
		name: "Claude Sonnet 4.5",
		api: "anthropic-messages",
		provider,
		baseUrl: "https://example.invalid",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 32000,
	};
}

describe("claude-bridge native tools", () => {
	let tempDir: string;
	let agentDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-native-tools-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		agentDir = join(tempDir, "agent");
		mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		if (tempDir && existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	async function createSession(provider: string, activeToolNames?: string[]) {
		const settingsManager = SettingsManager.create(tempDir, agentDir);
		const resourceLoader = new DefaultResourceLoader({ cwd: tempDir, agentDir, settingsManager });
		await resourceLoader.reload();
		return createAgentSession({
			cwd: tempDir,
			agentDir,
			model: createModel(provider),
			settingsManager,
			sessionManager: SessionManager.inMemory(),
			resourceLoader,
			...(activeToolNames ? { activeToolNames } : {}),
		});
	}

	it("adds WebFetch and WebSearch only for claude-bridge sessions", async () => {
		const { session } = await createSession("claude-bridge");
		try {
			expect(session.getActiveToolNames()).toContain("WebFetch");
			expect(session.getActiveToolNames()).toContain("WebSearch");
			expect(
				(session.getToolDefinition("WebSearch")?.parameters as { properties?: unknown }).properties,
			).toHaveProperty("query");

			await session.reload();
			expect(session.getActiveToolNames()).toContain("WebFetch");
			expect(session.getActiveToolNames()).toContain("WebSearch");
		} finally {
			session.dispose();
		}
	});

	it("filters native WebFetch/WebSearch when the provider is not claude-bridge", async () => {
		const { session } = await createSession("anthropic", ["Read", "WebFetch", "WebSearch", "web_search"]);
		try {
			expect(session.getActiveToolNames()).toContain("Read");
			expect(session.getActiveToolNames()).not.toContain("WebFetch");
			expect(session.getActiveToolNames()).not.toContain("WebSearch");
			expect(session.getActiveToolNames()).not.toContain("web_search");
		} finally {
			session.dispose();
		}
	});

	it("does not restore lowercase bridge aliases for claude-bridge sessions", async () => {
		const { session } = await createSession("anthropic", ["Read"]);
		try {
			session.setActiveToolsByName(["Read", "web_fetch", "web_search"]);
			expect(session.getActiveToolNames()).toEqual(expect.arrayContaining(["Read", "web_fetch", "web_search"]));

			session.agent.state.model = createModel("claude-bridge");
			session.setActiveToolsByName(["Read", "WebFetch", "WebSearch"]);

			expect(session.getActiveToolNames()).toContain("Read");
			expect(session.getActiveToolNames()).toContain("WebFetch");
			expect(session.getActiveToolNames()).toContain("WebSearch");
			expect(session.getActiveToolNames()).not.toContain("web_fetch");
			expect(session.getActiveToolNames()).not.toContain("web_search");
		} finally {
			session.dispose();
		}
	});
});

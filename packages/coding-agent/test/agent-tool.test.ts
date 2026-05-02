import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { writeAgentOutput } from "../src/core/agents/output.js";
import { createAgentToolDefinition, normalizeAgentToolMode } from "../src/core/tools/agent.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "pi-agent-tool-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("agent tool", () => {
	test("schema mode validation requires exactly one mode", () => {
		expect(() => normalizeAgentToolMode({ agent: "scout", task: "find files" })).not.toThrow();
		expect(() => normalizeAgentToolMode({ tasks: [{ agent: "scout", task: "a" }] })).not.toThrow();
		expect(() => normalizeAgentToolMode({ chain: [{ agent: "scout", task: "a" }] })).not.toThrow();
		expect(() => normalizeAgentToolMode({})).toThrow("exactly one mode");
		expect(() =>
			normalizeAgentToolMode({ agent: "scout", task: "a", tasks: [{ agent: "scout", task: "b" }] }),
		).toThrow("exactly one mode");
	});

	test("output/outputMode writes parent-owned file", async () => {
		const cwd = await makeTempDir();
		await mkdir(join(cwd, "reports"), { recursive: true });
		const result = await writeAgentOutput({
			cwd,
			output: "reports/scout.md",
			outputMode: "file",
			content: "final report",
		});
		expect(result.displayText).toContain("Saved child agent output");
		expect(result.rawContent).toBe("final report");
		expect(result.outputPath).toBe(join(cwd, "reports", "scout.md"));
		expect(await readFile(result.outputPath ?? "", "utf-8")).toBe("final report");
	});

	test("tool guidelines nudge parent toward concurrent tool-use blocks", () => {
		const tool = createAgentToolDefinition(process.cwd());
		expect(tool.promptGuidelines?.join("\n")).toContain("multiple agent tool-use blocks");
	});

	test("project agent confirmation cannot be bypassed by tool arguments", async () => {
		const tool = createAgentToolDefinition(process.cwd(), {
			parentServices: {} as NonNullable<Parameters<typeof createAgentToolDefinition>[1]>["parentServices"],
			getParentActiveTools: () => [],
			getParentSessionManager: () => {
				throw new Error("should not reach execution");
			},
		});
		const modelSuppliedParams = {
			agent: "scout",
			task: "find files",
			agentScope: "project",
			confirmProjectAgents: false,
		} as unknown as Parameters<typeof tool.execute>[1];
		await expect(
			tool.execute("tool-1", modelSuppliedParams, undefined, undefined, {
				hasUI: false,
			} as Parameters<typeof tool.execute>[4]),
		).rejects.toThrow("Project agents require interactive confirmation");
	});

	test("execute fails clearly when runtime child services are not wired", async () => {
		const tool = createAgentToolDefinition(process.cwd());
		await expect(
			tool.execute("tool-1", { agent: "scout", task: "find files" }, undefined, undefined, {
				hasUI: false,
			} as Parameters<typeof tool.execute>[4]),
		).rejects.toThrow("agent tool is unavailable");
	});
});

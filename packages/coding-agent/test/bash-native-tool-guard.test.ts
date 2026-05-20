import { describe, expect, it } from "vitest";
import { createBashToolDefinition, redundantCdToCurrentWorkingDirectory } from "../src/core/tools/bash.ts";

function getText(result: any): string {
	return result.content?.[0]?.text ?? "";
}

function isError(result: any): boolean {
	return result.isError === true;
}

const ctx: any = {};

describe("bash native tool guidance (soft, instruction-only)", () => {
	it("does not block standalone grep/rg/find/ls (Claude-Code-style soft guidance)", async () => {
		const bash = createBashToolDefinition(process.cwd());
		for (const command of ["grep foo README.md", "rg foo src", "find . -name '*.ts'", "ls -la"]) {
			const result = await bash.execute("t1", { command }, undefined, undefined, ctx);
			expect(getText(result)).not.toContain("Blocked: bash command contains");
		}
	});

	it("does not block pipeline filters on command output", async () => {
		const bash = createBashToolDefinition(process.cwd());
		const result = await bash.execute("t1", { command: "echo hello | grep hello" }, undefined, undefined, ctx);
		expect(isError(result)).toBe(false);
		expect(getText(result)).toContain("hello");
	});

	it("documents Bash with soft guidance toward native tools and pipeline-filter exception", () => {
		const bash = createBashToolDefinition(process.cwd());

		expect(bash.description).toContain("prefer native file tools for repo exploration");
		expect(bash.description).toContain("Pipeline filters on command output");
		expect(bash.description).toContain("kubectl ... | jq");
	});

	it("detects redundant cd to the bash cwd", () => {
		const cwd = "/Users/luke/Projects/personal/pi-mono-fork";
		expect(redundantCdToCurrentWorkingDirectory(`cd ${cwd} && git status`, cwd)).toBe(true);
		expect(redundantCdToCurrentWorkingDirectory(`cd '${cwd}' && git status`, cwd)).toBe(true);
		expect(redundantCdToCurrentWorkingDirectory("cd packages/coding-agent && npm test", cwd)).toBe(false);
	});

	it("still blocks redundant cd to the bash cwd", async () => {
		const cwd = process.cwd();
		const bash = createBashToolDefinition(cwd);
		const result = await bash.execute("t1", { command: `cd ${cwd} && git status` }, undefined, undefined, ctx);

		expect(isError(result)).toBe(true);
		expect(getText(result)).toContain("Blocked redundant cd");
	});
});

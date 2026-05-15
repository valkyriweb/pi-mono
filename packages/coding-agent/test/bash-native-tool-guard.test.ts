import { describe, expect, it } from "vitest";
import {
	createBashToolDefinition,
	nativeToolCommandUsedInBash,
	redundantCdToCurrentWorkingDirectory,
} from "../src/core/tools/bash.js";

function getText(result: any): string {
	return result.content?.[0]?.text ?? "";
}

function isError(result: any): boolean {
	return result.isError === true;
}

const ctx: any = {};

describe("bash native tool guard", () => {
	it.each([
		["grep foo README.md", "grep"],
		["rg foo src", "rg"],
		["find . -name '*.ts'", "find"],
		["ls -la", "ls"],
		["git status && grep foo README.md", "grep"],
		["if true; then rg foo src; fi", "rg"],
	])("detects %s", (command, expected) => {
		expect(nativeToolCommandUsedInBash(command)).toBe(expected);
	});

	it.each(["git status", "npm --version", "echo grep is a word", "node -e \"console.log('grep')\""])(
		"allows non-native-tool command %s",
		(command) => {
			expect(nativeToolCommandUsedInBash(command)).toBeUndefined();
		},
	);

	it("blocks bash commands that should use native tools", async () => {
		const bash = createBashToolDefinition(process.cwd());
		const result = await bash.execute("t1", { command: "grep foo README.md" }, undefined, undefined, ctx);

		expect(isError(result)).toBe(true);
		expect(getText(result)).toContain("Blocked bash grep");
		expect(getText(result)).toContain("native grep tool");
	});

	it("detects redundant cd to the bash cwd", () => {
		const cwd = "/Users/luke/Projects/personal/pi-mono-fork";
		expect(redundantCdToCurrentWorkingDirectory(`cd ${cwd} && git status`, cwd)).toBe(true);
		expect(redundantCdToCurrentWorkingDirectory(`cd '${cwd}' && git status`, cwd)).toBe(true);
		expect(redundantCdToCurrentWorkingDirectory("cd packages/coding-agent && npm test", cwd)).toBe(false);
	});

	it("blocks redundant cd to the bash cwd", async () => {
		const cwd = process.cwd();
		const bash = createBashToolDefinition(cwd);
		const result = await bash.execute("t1", { command: `cd ${cwd} && git status` }, undefined, undefined, ctx);

		expect(isError(result)).toBe(true);
		expect(getText(result)).toContain("Blocked redundant cd");
	});
});

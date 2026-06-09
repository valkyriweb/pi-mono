import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBashToolDefinition } from "../src/core/tools/bash.ts";

function getText(result: any): string {
	return result.content?.[0]?.text ?? "";
}

const ctx: any = {};

// realpathSync so macOS's /var → /private/var symlink doesn't confuse the dirs.
function tmp(): string {
	return realpathSync(mkdtempSync(join(tmpdir(), "pi-workdir-")));
}

describe("bash workdir param", () => {
	it("runs the command in an absolute workdir", async () => {
		const dir = tmp();
		writeFileSync(join(dir, "marker.txt"), "ABSOLUTE_OK");
		const bash = createBashToolDefinition(process.cwd());
		const result = await bash.execute("t", { command: "cat marker.txt", workdir: dir }, undefined, undefined, ctx);
		expect(getText(result)).toContain("ABSOLUTE_OK");
	});

	it("resolves a relative workdir against the session cwd", async () => {
		const base = tmp();
		mkdirSync(join(base, "sub"));
		writeFileSync(join(base, "sub", "marker.txt"), "RELATIVE_OK");
		const bash = createBashToolDefinition(base);
		const result = await bash.execute("t", { command: "cat marker.txt", workdir: "sub" }, undefined, undefined, ctx);
		expect(getText(result)).toContain("RELATIVE_OK");
	});

	it("defaults to the session cwd when workdir is omitted (behaviour unchanged)", async () => {
		const dir = tmp();
		writeFileSync(join(dir, "marker.txt"), "DEFAULT_OK");
		const bash = createBashToolDefinition(dir);
		const result = await bash.execute("t", { command: "cat marker.txt" }, undefined, undefined, ctx);
		expect(getText(result)).toContain("DEFAULT_OK");
	});

	it("errors clearly on a non-existent workdir (background path)", async () => {
		const bash = createBashToolDefinition(process.cwd());
		await expect(
			bash.execute(
				"t",
				{ command: "echo hi", workdir: "/no/such/pi-workdir-xyz", run_in_background: true },
				undefined,
				undefined,
				ctx,
			),
		).rejects.toThrow(/Working directory does not exist/);
	});

	it("keys the redundant-cd guard off the effective workdir, not the session cwd", async () => {
		const dir = tmp();
		// session cwd is process.cwd() (≠ dir); the cd targets the effective workdir → redundant.
		// This only fires if the guard resolves against effectiveCwd (the change under test).
		const bash = createBashToolDefinition(process.cwd());
		const result = await bash.execute(
			"t",
			{ command: `cd ${dir} && echo hi`, workdir: dir },
			undefined,
			undefined,
			ctx,
		);
		// "Blocked redundant cd" is produced only by the guard path → proves it fired against effectiveCwd.
		expect(getText(result)).toContain("Blocked redundant cd");
	});
});

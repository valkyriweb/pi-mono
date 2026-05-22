import { describe, expect, it } from "vitest";
import {
	createBashKillToolDefinition,
	createBashOutputToolDefinition,
	createBashToolDefinition,
	killAllBashBgJobs,
	listBashBgJobs,
} from "../src/core/tools/bash.ts";

function getText(result: any): string {
	return result.content?.[0]?.text ?? "";
}

const ctx: any = {};

describe("bash run_in_background", () => {
	it("spawns detached, returns a bgId, and bash_output reads accumulated log", async () => {
		const bash = createBashToolDefinition(process.cwd());
		const out = createBashOutputToolDefinition();
		const kill = createBashKillToolDefinition();

		const r = await bash.execute(
			"t1",
			{ command: "for i in 1 2 3; do echo bg-line-$i; sleep 0.2; done", run_in_background: true },
			undefined,
			undefined,
			ctx,
		);
		const details = r.details as any;
		expect(details?.bgId).toMatch(/^bg_/);
		expect(getText(r)).toContain("Backgrounded bash job");

		// Wait long enough for the job to complete.
		await new Promise((res) => setTimeout(res, 1500));

		const readResult = await out.execute("t2", { bgId: details.bgId }, undefined, undefined, ctx);
		const readText = getText(readResult);
		expect(readText).toContain("bg-line-1");
		expect(readText).toContain("bg-line-3");
		expect(readText).toMatch(/status: exited/);
		expect(readResult.details?.fullOutputPath).toBe(readResult.details?.logPath);

		// Idempotent kill on a finished job.
		const killResult = await kill.execute("t3", { bgId: details.bgId }, undefined, undefined, ctx);
		expect(getText(killResult)).toMatch(/already exited/);
	});

	it("bash_output collapses vertically wrapped TUI prompt fragments", async () => {
		const bash = createBashToolDefinition(process.cwd());
		const out = createBashOutputToolDefinition();
		const verticalPrompt = [
			"before",
			"\u001b",
			"[",
			"9",
			"0",
			"m",
			..."Paste the auth code:".split(""),
			"\u001b",
			"[",
			"3",
			"9",
			"m",
			"after",
		].join("\r\n");

		const script = `process.stdout.write(${JSON.stringify(`${verticalPrompt}\n`)})`;
		const r = await bash.execute(
			"t1",
			{ command: `node -e ${JSON.stringify(script)}`, run_in_background: true },
			undefined,
			undefined,
			ctx,
		);
		const bgId = (r.details as any).bgId as string;
		await new Promise((res) => setTimeout(res, 500));

		const readText = getText(await out.execute("t2", { bgId, mode: "all" }, undefined, undefined, ctx));
		expect(readText).toContain("before");
		expect(readText).toContain("Paste the auth code:");
		expect(readText).toContain("after");
		expect(readText).not.toContain("\nP\n");
		expect(readText).not.toContain("[90m");
	});

	it("bash_output caps long line slices by bytes as well as line count", async () => {
		const bash = createBashToolDefinition(process.cwd());
		const out = createBashOutputToolDefinition();
		const script = `const line = "x".repeat(4096); for (let i = 0; i < 600; i++) console.log(line);`;
		const r = await bash.execute(
			"t1",
			{ command: `node -e ${JSON.stringify(script)}`, run_in_background: true },
			undefined,
			undefined,
			ctx,
		);
		const bgId = (r.details as any).bgId as string;
		await new Promise((res) => setTimeout(res, 500));

		const readText = getText(await out.execute("t2", { bgId, maxLines: 600 }, undefined, undefined, ctx));
		expect(readText).toContain("capped at 50.0KB");
		expect(Buffer.byteLength(readText, "utf8")).toBeLessThan(60 * 1024);
	});

	it("bash_output reports unknown bgId clearly", async () => {
		const out = createBashOutputToolDefinition();
		const r = await out.execute("t1", { bgId: "bg_does_not_exist" }, undefined, undefined, ctx);
		expect(getText(r)).toContain("No background bash job");
	});

	it("killAllBashBgJobs terminates running jobs and clears the registry (session teardown)", async () => {
		const bash = createBashToolDefinition(process.cwd());

		const r = await bash.execute(
			"t1",
			{ command: "while true; do echo teardown-tick; sleep 0.2; done", run_in_background: true },
			undefined,
			undefined,
			ctx,
		);
		const bgId = (r.details as any).bgId as string;
		await new Promise((res) => setTimeout(res, 200));

		// Registry sees the running job before teardown.
		const before = listBashBgJobs();
		expect(before.some((j) => j.id === bgId && j.status === "running")).toBe(true);

		// Simulate session shutdown (dispose / clear / reload).
		killAllBashBgJobs();

		// Registry is cleared so no bg job leaks across sessions.
		expect(listBashBgJobs()).toEqual([]);
	});

	it("bash_kill stops a running background job", async () => {
		const bash = createBashToolDefinition(process.cwd());
		const out = createBashOutputToolDefinition();
		const kill = createBashKillToolDefinition();

		const r = await bash.execute(
			"t1",
			{ command: "while true; do echo tick; sleep 0.2; done", run_in_background: true },
			undefined,
			undefined,
			ctx,
		);
		const bgId = (r.details as any).bgId as string;

		// Let it produce some output.
		await new Promise((res) => setTimeout(res, 400));

		const killResult = await kill.execute("t2", { bgId }, undefined, undefined, ctx);
		expect(getText(killResult)).toMatch(/Killed|already/);

		// Status must reflect terminal state.
		await new Promise((res) => setTimeout(res, 200));
		const final = await out.execute("t3", { bgId }, undefined, undefined, ctx);
		expect(getText(final)).toMatch(/status: (killed|exited)/);
	});
});

import { describe, expect, it, vi } from "vitest";

// Isolated file: killProcessTree is mocked to throw (models ESRCH — the target
// process already died a moment before the deliberate bash_kill). Kept in its
// own file so the module mock does not affect the real-kill tests elsewhere.
vi.mock("../src/utils/shell.ts", async (importActual) => {
	const actual = await importActual<typeof import("../src/utils/shell.ts")>();
	return {
		...actual,
		killProcessTree: () => {
			const err = new Error("kill ESRCH") as Error & { code?: string };
			err.code = "ESRCH";
			throw err;
		},
	};
});

const ctx: any = {};

describe("bash_kill where the process is already gone (ESRCH)", () => {
	it("marks the job killed and does NOT fire a spurious crash wake", async () => {
		const { createBashToolDefinition, createBashKillToolDefinition, listBashBgJobs, subscribeBashBgTerminal } =
			await import("../src/core/tools/bash.ts");

		const bash = createBashToolDefinition(process.cwd());
		const kill = createBashKillToolDefinition();
		const fired: Array<{ id: string }> = [];
		const unsubscribe = subscribeBashBgTerminal((job) => fired.push(job));
		try {
			// Short-lived so the exit handler runs within the test window — but still
			// "running" at the instant we kill it.
			const r = await bash.execute(
				"esrch1",
				{ command: "sleep 0.3", run_in_background: true },
				undefined,
				undefined,
				ctx,
			);
			const bgId = (r.details as any)?.bgId as string;

			// killProcessTree throws here; the deliberate-kill path must still mark
			// the job "killed" so the later natural exit stays silent.
			const killRes = await kill.execute("esrch2", { bgId }, undefined, undefined, ctx);
			expect((killRes as any).content?.[0]?.text ?? "").toMatch(/Killed|already/);

			const afterKill = listBashBgJobs().find((j) => j.id === bgId);
			expect(afterKill?.status).toBe("killed");

			// Let the underlying process exit; on baseline the exit handler saw
			// wasRunning=true and fired a wake here.
			await new Promise((res) => setTimeout(res, 600));
			expect(fired.filter((j) => j.id === bgId)).toHaveLength(0);
		} finally {
			unsubscribe();
		}
	});
});

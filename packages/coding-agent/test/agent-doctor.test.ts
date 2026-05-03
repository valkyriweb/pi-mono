import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { buildAgentDoctorReport } from "../src/core/agents/doctor.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "pi-agent-doctor-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("native agents doctor", () => {
	test("reports project dirs, invalid definitions, unavailable tools, and runtime services", async () => {
		const cwd = await makeTempDir();
		const agentsDir = join(cwd, ".pi", "agents");
		await mkdir(agentsDir, { recursive: true });
		await writeFile(
			join(agentsDir, "needs-tool.md"),
			"---\nname: needs-tool\ndescription: Needs missing tool\ntools: read, missing-tool\n---\nPrompt",
		);
		await writeFile(join(agentsDir, "bad.md"), "---\ndescription: Missing name\n---\nPrompt");

		const report = await buildAgentDoctorReport({
			cwd,
			activeTools: ["read", "agent"],
			runtimeServicesAvailable: true,
		});

		expect(report).toContain("Native agents doctor report");
		expect(report).toContain("agent runtime services: available");
		expect(report).toContain("project agents: require interactive confirmation");
		expect(report).toContain("Skipping invalid agent file");
		expect(report).toContain("unavailable tools for needs-tool: missing-tool");
	});
});

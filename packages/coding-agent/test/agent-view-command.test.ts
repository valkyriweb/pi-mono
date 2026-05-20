import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { __test, isAgentViewCommand } from "../src/cli/agent-view-command.js";

describe("agent view command", () => {
	test("recognizes pi agents", () => {
		expect(isAgentViewCommand(["agents"])).toBe(true);
		expect(isAgentViewCommand(["agents", "--bg", "check tests"])).toBe(true);
		expect(isAgentViewCommand(["agent"])).toBe(false);
		expect(isAgentViewCommand([])).toBe(false);
	});

	test("finds the nearest pi-agent-view package root", () => {
		const root = join(tmpdir(), `pi-agent-view-test-${Date.now()}-${Math.random().toString(16).slice(2)}`);
		const packageRoot = join(root, "extensions", "agent-view");
		const entrypoint = join(packageRoot, "src", "index.ts");
		mkdirSync(join(packageRoot, "src"), { recursive: true });
		writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ name: "pi-agent-view" }));
		writeFileSync(entrypoint, "export {};\n");

		expect(__test.findPackageRoot(entrypoint)).toBe(packageRoot);
		expect(__test.packageName(packageRoot)).toBe("pi-agent-view");
	});
});

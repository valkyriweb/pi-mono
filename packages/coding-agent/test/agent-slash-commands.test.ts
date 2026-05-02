import { describe, expect, test } from "vitest";
import { BUILTIN_SLASH_COMMANDS } from "../src/core/slash-commands.js";

describe("native agents slash commands", () => {
	test("registers native agents doctor and status aliases", () => {
		const names = BUILTIN_SLASH_COMMANDS.map((command) => command.name);
		expect(names).toContain("agents");
		expect(names).toContain("agents-doctor");
		expect(names).toContain("agents-status");
	});
});

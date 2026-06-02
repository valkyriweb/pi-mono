import { describe, expect, it } from "vitest";
import { getSupportedThinkingLevels } from "../src/models.ts";
import { allOf, isReasoning, pickModel, supportsThinkingLevel } from "./helpers/models.ts";

// These tests validate getSupportedThinkingLevels against capability classes pulled
// from the live registry rather than pinned model ids, so a renamed/dropped model
// in models.generated.ts cannot break the suite (fork issues #30, #33).

describe("getSupportedThinkingLevels", () => {
	it("includes xhigh for an Anthropic model that opts into xhigh", () => {
		const model = pickModel("anthropic", supportsThinkingLevel("xhigh"));
		expect(getSupportedThinkingLevels(model)).toContain("xhigh");
	});

	it("includes xhigh for an OpenAI Codex model that opts into xhigh", () => {
		const model = pickModel("openai-codex", supportsThinkingLevel("xhigh"));
		expect(getSupportedThinkingLevels(model)).toContain("xhigh");
	});

	it("includes xhigh for an OpenRouter model that opts into xhigh", () => {
		const model = pickModel("openrouter", supportsThinkingLevel("xhigh"));
		expect(getSupportedThinkingLevels(model)).toContain("xhigh");
	});

	it("excludes xhigh for a reasoning model that does not opt into xhigh", () => {
		const model = pickModel(
			"anthropic",
			allOf(isReasoning, (candidate) => !getSupportedThinkingLevels(candidate).includes("xhigh")),
		);
		expect(getSupportedThinkingLevels(model)).not.toContain("xhigh");
	});

	it("returns only off for a non-reasoning model", () => {
		const model = pickModel("openai", (candidate) => !candidate.reasoning);
		expect(getSupportedThinkingLevels(model)).toEqual(["off"]);
	});
});

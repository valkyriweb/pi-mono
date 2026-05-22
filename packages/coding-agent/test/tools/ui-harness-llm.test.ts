import { describe, expect, it } from "vitest";
import { LAYOUT_GRAPH_VERSION } from "../../src/core/tools/layout-graph.ts";
import {
	CATALOG_PROMPT,
	createLLMHarness,
	formatHarnessUserPrompt,
	HarnessParseError,
	HarnessValidationError,
	parseHarnessJSON,
	validateLayoutGraph,
} from "../../src/core/tools/ui-harness.ts";

const goodGraph = {
	version: LAYOUT_GRAPH_VERSION,
	ephemeral: true,
	root: {
		type: "card",
		children: [
			{ type: "text", value: "Pick one" },
			{
				type: "radio_group",
				id: "choice",
				options: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
				],
			},
		],
	},
};

// ---------------------------------------------------------------------------
// formatHarnessUserPrompt
// ---------------------------------------------------------------------------

describe("formatHarnessUserPrompt", () => {
	it("includes intent and data", () => {
		const prompt = formatHarnessUserPrompt({ intent: "ask", data: { x: 1 } });
		expect(prompt).toMatch(/intent:\s*"ask"/);
		expect(prompt).toMatch(/data:\s*\{"x":1\}/);
		expect(prompt).not.toMatch(/responseShape/);
	});

	it("includes responseShape when supplied", () => {
		const prompt = formatHarnessUserPrompt({
			intent: "ask",
			data: {},
			responseShape: { type: "object" },
		});
		expect(prompt).toMatch(/responseShape:/);
	});
});

// ---------------------------------------------------------------------------
// parseHarnessJSON
// ---------------------------------------------------------------------------

describe("parseHarnessJSON", () => {
	it("parses a bare JSON object", () => {
		expect(parseHarnessJSON('{"x": 1}')).toEqual({ x: 1 });
	});

	it("strips ```json fences", () => {
		const raw = '```json\n{"x": 1}\n```';
		expect(parseHarnessJSON(raw)).toEqual({ x: 1 });
	});

	it("strips bare ``` fences", () => {
		const raw = '```\n{"x": 1}\n```';
		expect(parseHarnessJSON(raw)).toEqual({ x: 1 });
	});

	it("tolerates leading/trailing prose around the object", () => {
		const raw = 'Here you go:\n{"x": 1}\nLet me know if you need more.';
		expect(parseHarnessJSON(raw)).toEqual({ x: 1 });
	});

	it("throws HarnessParseError on text with no JSON object", () => {
		expect(() => parseHarnessJSON("no json here")).toThrow(HarnessParseError);
	});

	it("throws HarnessParseError on malformed JSON", () => {
		expect(() => parseHarnessJSON("{ not json }")).toThrow(HarnessParseError);
	});
});

// ---------------------------------------------------------------------------
// validateLayoutGraph
// ---------------------------------------------------------------------------

describe("validateLayoutGraph", () => {
	it("accepts a well-formed graph", () => {
		expect(validateLayoutGraph(goodGraph)).toBe(goodGraph);
	});

	it("rejects non-objects", () => {
		expect(() => validateLayoutGraph("hi")).toThrow(HarnessValidationError);
		expect(() => validateLayoutGraph(null)).toThrow(HarnessValidationError);
	});

	it("rejects wrong version", () => {
		expect(() => validateLayoutGraph({ ...goodGraph, version: "0.9" })).toThrow(/version/);
	});

	it("rejects missing root", () => {
		expect(() => validateLayoutGraph({ version: LAYOUT_GRAPH_VERSION })).toThrow(/missing `root`/);
	});

	it("rejects invalid node types", () => {
		const bad = {
			version: LAYOUT_GRAPH_VERSION,
			root: { type: "make_up_node", value: "x" },
		};
		expect(() => validateLayoutGraph(bad)).toThrow(/catalog validation/);
	});

	it("rejects radio_group without an id", () => {
		const bad = {
			version: LAYOUT_GRAPH_VERSION,
			root: {
				type: "radio_group",
				options: [{ value: "a", label: "A" }],
			},
		};
		expect(() => validateLayoutGraph(bad)).toThrow(HarnessValidationError);
	});
});

// ---------------------------------------------------------------------------
// createLLMHarness — end-to-end with a mocked ModelCaller
// ---------------------------------------------------------------------------

describe("createLLMHarness", () => {
	it("returns the parsed + validated graph on a happy path", async () => {
		const calls: Array<{ system: string; user: string }> = [];
		const harness = createLLMHarness({
			call: async ({ system, user }) => {
				calls.push({ system, user });
				return JSON.stringify(goodGraph);
			},
		});

		const out = await harness({ intent: "ask", data: { foo: 1 } });
		expect(out).toEqual(goodGraph);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.system).toBe(CATALOG_PROMPT);
		expect(calls[0]?.user).toMatch(/intent:\s*"ask"/);
	});

	it("propagates parse errors as HarnessParseError", async () => {
		const harness = createLLMHarness({
			call: async () => "I don't know, sorry.",
		});
		await expect(harness({ intent: "x", data: {} })).rejects.toThrow(HarnessParseError);
	});

	it("propagates schema errors as HarnessValidationError", async () => {
		const harness = createLLMHarness({
			call: async () =>
				JSON.stringify({
					version: LAYOUT_GRAPH_VERSION,
					root: { type: "imaginary" },
				}),
		});
		await expect(harness({ intent: "x", data: {} })).rejects.toThrow(HarnessValidationError);
	});

	it("uses a custom system prompt when supplied", async () => {
		let seenSystem = "";
		const harness = createLLMHarness({
			systemPrompt: "CUSTOM",
			call: async ({ system }) => {
				seenSystem = system;
				return JSON.stringify(goodGraph);
			},
		});
		await harness({ intent: "x", data: {} });
		expect(seenSystem).toBe("CUSTOM");
	});

	it("tolerates the model wrapping its output in a code fence", async () => {
		const harness = createLLMHarness({
			call: async () => `\`\`\`json\n${JSON.stringify(goodGraph)}\n\`\`\``,
		});
		await expect(harness({ intent: "x", data: {} })).resolves.toEqual(goodGraph);
	});
});

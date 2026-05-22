/**
 * UI Harness — contract + test helpers + reference implementations.
 *
 * See: rusty/docs/prd/generative-ui-proposal.md §4.3.
 *
 * In production, the harness is an LLM (Oracle-routed cheap model) with a
 * system prompt that documents the catalog (LayoutNode types), the response
 * shape coupling, and a few-shot example set. Its only job: turn
 * `{ intent, data, responseShape }` into a valid LayoutGraph.
 *
 * In tests and during MVP staging, we use the helpers in this file:
 *
 *   - `staticHarness(graph)`     — always returns the given graph
 *   - `recordingHarness(graph)`  — same, but records every input it sees
 *   - `exampleQuestionsHarness`  — a deterministic implementation that
 *                                   produces the kind of graph an LLM
 *                                   *should* produce when the intent is
 *                                   "ask the user N questions". Useful as a
 *                                   test fixture *and* as few-shot fodder
 *                                   for the real harness's system prompt.
 */

import { Check, Errors } from "typebox/value";
import type { BuildInterfaceInput } from "./build-interface.ts";
import {
	LAYOUT_GRAPH_VERSION,
	type LayoutGraph,
	type LayoutNode,
	type LayoutOption,
	nodeSchema,
} from "./layout-graph.ts";
import { CATALOG_PROMPT } from "./ui-harness-prompt.ts";

/**
 * The single contract every harness implements. Pure async function:
 * input in, LayoutGraph out. No side effects required, no Pi-specific
 * surface — easy to substitute, easy to test.
 */
export type UIHarness = (input: BuildInterfaceInput) => Promise<LayoutGraph>;

// ============================================================================
// Test helpers
// ============================================================================

/** Returns the same graph for every call. Useful for end-to-end loop tests. */
export function staticHarness(graph: LayoutGraph): UIHarness {
	return async () => graph;
}

/**
 * Like `staticHarness` but also records every input it receives so a test
 * can assert what was passed through the dispatch.
 */
export function recordingHarness(graph: LayoutGraph): UIHarness & {
	readonly calls: ReadonlyArray<BuildInterfaceInput>;
} {
	const calls: BuildInterfaceInput[] = [];
	const fn = (async (input: BuildInterfaceInput) => {
		calls.push(input);
		return graph;
	}) as UIHarness & { calls: BuildInterfaceInput[] };
	Object.defineProperty(fn, "calls", { get: () => calls });
	return fn;
}

// ============================================================================
// exampleQuestionsHarness — reference implementation, NOT a production path
// ============================================================================

/**
 * Shape the model passes as `data` when the intent is "ask the user N
 * questions". Used by `exampleQuestionsHarness`. The real LLM harness will
 * infer this same shape from intent + free-form data.
 */
export interface ExampleQuestionsData {
	questions: Array<{
		header: string;
		question: string;
		multiSelect: boolean;
		options: Array<{ label: string; description: string }>;
	}>;
}

/** Stable id for the renderer's response envelope. */
function questionInputId(index: number): string {
	return `q${index}`;
}

/**
 * A deterministic harness that handles intents like "ask the user N
 * questions". It is **not** the production path — the production harness
 * is an LLM call. It exists to:
 *
 *   1. Anchor what the LLM harness should produce for this kind of intent
 *      (few-shot fodder for the system prompt — paste the graphs verbatim).
 *   2. Provide a zero-LLM test fixture so the rest of the system (renderer,
 *      response collection, lifecycle) can be exercised in CI without a
 *      model call.
 *
 * Throws if `data` doesn't look like ExampleQuestionsData, so tests catch
 * misuse early.
 */
export const exampleQuestionsHarness: UIHarness = async (input) => {
	const data = input.data as ExampleQuestionsData | undefined;
	if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
		throw new Error("exampleQuestionsHarness: input.data must be { questions: [...] } with at least one question");
	}

	const tabs = data.questions.map((q, i) => {
		const options: LayoutOption[] = q.options.map((o, j) => ({
			value: `${i}-${j}`,
			label: o.label,
			description: o.description,
		}));

		const group: LayoutNode = q.multiSelect
			? { type: "checkbox_group", id: questionInputId(i), options }
			: { type: "radio_group", id: questionInputId(i), options };

		const card: LayoutNode = {
			type: "card",
			children: [{ type: "text", value: q.question }, group],
		};

		return { header: q.header, content: card };
	});

	const root: LayoutNode = tabs.length === 1 ? tabs[0]!.content : { type: "tabs", tabs };

	return {
		version: LAYOUT_GRAPH_VERSION,
		root,
		ephemeral: true,
		timeout_ms: 60_000,
	};
};

export { questionInputId as exampleQuestionsInputId };

// ============================================================================
// LLM-backed harness — the production path
// ============================================================================

/**
 * Minimal abstraction over a model call. Inject Pi's Oracle-routed client
 * here (or any other LLM) — the harness only needs system + user text in,
 * a single text response out. No streaming, no tool calls.
 */
export type ModelCaller = (request: { system: string; user: string; signal?: AbortSignal }) => Promise<string>;

export interface LLMHarnessOptions {
	/** Function that calls the LLM. */
	call: ModelCaller;
	/** Override the catalog system prompt. Default: built-in CATALOG_PROMPT. */
	systemPrompt?: string;
	/** Abort signal forwarded to the model call. */
	signal?: AbortSignal;
}

/**
 * Build a harness that calls an LLM to produce LayoutGraphs from the
 * BuildInterface envelope. The returned harness is a plain `UIHarness` and
 * plugs into `createBuildInterfaceToolDefinition({ harness })` without
 * further ceremony.
 */
export function createLLMHarness(options: LLMHarnessOptions): UIHarness {
	const systemPrompt = options.systemPrompt ?? CATALOG_PROMPT;
	return async (input) => {
		const userPrompt = formatHarnessUserPrompt(input);
		const raw = await options.call({
			system: systemPrompt,
			user: userPrompt,
			signal: options.signal,
		});
		const parsed = parseHarnessJSON(raw);
		return validateLayoutGraph(parsed);
	};
}

/**
 * Format a BuildInterface input into the user-message portion of the harness
 * prompt. Stable structure makes few-shot examples in the system prompt
 * generalise predictably.
 */
export function formatHarnessUserPrompt(input: BuildInterfaceInput): string {
	const parts: string[] = [
		`INPUT`,
		`  intent: ${JSON.stringify(input.intent)}`,
		`  data: ${JSON.stringify(input.data)}`,
	];
	if (input.responseShape !== undefined) {
		parts.push(`  responseShape: ${JSON.stringify(input.responseShape)}`);
	}
	parts.push("OUTPUT");
	return parts.join("\n");
}

/**
 * Extract a single JSON object from the harness's text response. Tolerant
 * to code fences and leading/trailing prose (which the prompt forbids but
 * models sometimes emit anyway).
 */
export function parseHarnessJSON(raw: string): unknown {
	const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
	const candidate = fence ? fence[1]!.trim() : raw.trim();
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start < 0 || end < start) {
		throw new HarnessParseError("harness response contains no JSON object", raw);
	}
	try {
		return JSON.parse(candidate.slice(start, end + 1));
	} catch (e) {
		throw new HarnessParseError(`harness response is not valid JSON: ${(e as Error).message}`, raw);
	}
}

/**
 * Validate a parsed harness response against the LayoutGraph contract.
 * Throws `HarnessValidationError` on any violation. Returns the typed graph
 * on success.
 */
export function validateLayoutGraph(value: unknown): LayoutGraph {
	if (typeof value !== "object" || value === null) {
		throw new HarnessValidationError("harness response is not an object");
	}
	const v = value as Partial<LayoutGraph>;
	if (v.version !== LAYOUT_GRAPH_VERSION) {
		throw new HarnessValidationError(
			`expected LayoutGraph version "${LAYOUT_GRAPH_VERSION}", got "${String(v.version)}"`,
		);
	}
	if (!v.root || typeof v.root !== "object") {
		throw new HarnessValidationError("harness response missing `root` node");
	}
	if (!Check(nodeSchema, v.root)) {
		const firstErrors = [...Errors(nodeSchema, v.root)].slice(0, 3).map((e) => e.message);
		throw new HarnessValidationError(
			`root node failed catalog validation. First errors: ${JSON.stringify(firstErrors)}`,
		);
	}
	return value as LayoutGraph;
}

export class HarnessParseError extends Error {
	readonly raw: string;
	constructor(message: string, raw: string) {
		super(`UIHarness parse error: ${message}`);
		this.name = "HarnessParseError";
		this.raw = raw;
	}
}

export class HarnessValidationError extends Error {
	constructor(message: string) {
		super(`UIHarness validation error: ${message}`);
		this.name = "HarnessValidationError";
	}
}

export { CATALOG_PROMPT } from "./ui-harness-prompt.ts";

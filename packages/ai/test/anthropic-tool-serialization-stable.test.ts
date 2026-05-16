/**
 * Regression test for cache-stable tool serialization.
 *
 * Refs: my-pi/docs/cache-break-investigation-2026-05-16.md Fix #2 (~12M
 * write-token saving per 18d traffic window). The Anthropic prompt cache
 * hashes the exact JSON bytes of each tool definition; any per-turn drift
 * in `input_schema.properties` key order, `required` array order, or
 * conditional flag emission triggers a cache-prefix invalidation.
 *
 * `convertTools()` must produce byte-identical output for:
 *   1. the same tool object passed across calls (memoization)
 *   2. two equal tool objects whose schemas have differently-ordered keys
 *      (deterministic sort)
 *   3. nested schema objects whose keys are reordered
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { streamAnthropic } from "../src/providers/anthropic.js";
import type { Context, Model, Tool } from "../src/types.js";

function createModel(baseUrl: string): Model<"anthropic-messages"> {
	return {
		id: "claude-opus-4-7",
		name: "Claude Opus 4.7",
		api: "anthropic-messages",
		provider: "test-anthropic",
		baseUrl,
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 32000,
	};
}

function createContext(tools: Tool[]): Context {
	return {
		messages: [{ role: "user", content: "use the tool", timestamp: Date.now() }],
		...(tools.length > 0 ? { tools } : {}),
	};
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function emptySse(response: ServerResponse): void {
	response.writeHead(200, { "content-type": "text/event-stream" });
	response.end();
}

async function captureToolBytes(context: Context): Promise<string> {
	let toolsBytes = "";
	const server = createServer(async (request, response) => {
		const body = await readBody(request);
		toolsBytes = JSON.stringify(body.tools);
		emptySse(response);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address() as AddressInfo;
	try {
		const stream = streamAnthropic(createModel(`http://127.0.0.1:${address.port}`), context, {
			apiKey: "test-key",
			cacheRetention: "none",
		});
		for await (const event of stream) {
			if (event.type === "done" || event.type === "error") break;
		}
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}
	return toolsBytes;
}

describe("Anthropic convertTools — cache-stable serialization", () => {
	it("emits byte-identical tools for the same tool reference across calls (memoization)", async () => {
		const tool: Tool = {
			name: "lookup",
			description: "Look up a value",
			parameters: Type.Object({ value: Type.String(), kind: Type.String() }),
		};
		const first = await captureToolBytes(createContext([tool]));
		const second = await captureToolBytes(createContext([tool]));
		expect(second).toBe(first);
	});

	it("emits byte-identical tools when properties keys arrive in different orders", async () => {
		const toolA: Tool = {
			name: "lookup",
			description: "Look up a value",
			parameters: {
				type: "object",
				properties: { alpha: { type: "string" }, beta: { type: "string" }, gamma: { type: "string" } },
				required: [],
			} as Tool["parameters"],
		};
		const toolB: Tool = {
			name: "lookup",
			description: "Look up a value",
			parameters: {
				type: "object",
				properties: { gamma: { type: "string" }, alpha: { type: "string" }, beta: { type: "string" } },
				required: [],
			} as Tool["parameters"],
		};
		const bytesA = await captureToolBytes(createContext([toolA]));
		const bytesB = await captureToolBytes(createContext([toolB]));
		expect(bytesB).toBe(bytesA);
	});

	it("emits byte-identical tools when nested schema object keys are reordered", async () => {
		const toolA: Tool = {
			name: "lookup",
			description: "Look up a value",
			parameters: {
				type: "object",
				properties: {
					value: { type: "string", description: "v", minLength: 1 },
				},
				required: [],
			} as Tool["parameters"],
		};
		const toolB: Tool = {
			name: "lookup",
			description: "Look up a value",
			parameters: {
				type: "object",
				properties: {
					value: { minLength: 1, description: "v", type: "string" },
				},
				required: [],
			} as Tool["parameters"],
		};
		const bytesA = await captureToolBytes(createContext([toolA]));
		const bytesB = await captureToolBytes(createContext([toolB]));
		expect(bytesB).toBe(bytesA);
	});

	it("emits byte-identical tools when required array order differs", async () => {
		const toolA: Tool = {
			name: "lookup",
			description: "Look up a value",
			parameters: {
				type: "object",
				properties: { a: { type: "string" }, b: { type: "string" } },
				required: ["a", "b"],
			} as Tool["parameters"],
		};
		const toolB: Tool = {
			name: "lookup",
			description: "Look up a value",
			parameters: {
				type: "object",
				properties: { a: { type: "string" }, b: { type: "string" } },
				required: ["b", "a"],
			} as Tool["parameters"],
		};
		const bytesA = await captureToolBytes(createContext([toolA]));
		const bytesB = await captureToolBytes(createContext([toolB]));
		expect(bytesB).toBe(bytesA);
	});
});

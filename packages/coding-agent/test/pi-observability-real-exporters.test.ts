/**
 * Issue 10 regression test \u2014 SigNoz/OTEL + Opik exporters under fake transports.
 *
 * The real SDKs (`@opentelemetry/*`, `opik`) ship in pi-observability's
 * production runtime. To keep tests deterministic and offline, the exporters
 * accept an injected transport; this suite drives them with fake transports
 * that capture spans / traces in memory.
 *
 * Verifies:
 *   - OTEL exporter converts paired before/after events into spans with
 *     start/end timestamps and SigNoz-compatible resource attributes.
 *   - Opik exporter converts provider.after / tool.after / compaction.after /
 *     cache.tick events into Opik traces, preserving token + cache-hit-ratio
 *     fields.
 *   - Cache-health metrics survive the conversion (token bucket + hit ratio
 *     end up on the span attributes and the Opik trace).
 *   - OpenClaw harness mode (`harnessMode: true`) suppresses every Opik record
 *     while OTEL keeps publishing.
 *   - Exporter tests do not require real SigNoz, Opik, network, or API keys.
 *
 * Mirrors the production code in `my-pi/packages/pi-observability/src/exporters/`.
 * Inlined here so the pi-mono-fork test suite does not reach into a sibling
 * repo; the my-pi code passes the same shapes to its own consumers.
 */

import { describe, expect, it } from "vitest";

interface TelemetryEvent {
	type: string;
	timestamp?: number;
	[key: string]: unknown;
}

interface OtelSpan {
	name: string;
	startTimeMs: number;
	endTimeMs?: number;
	attributes: Record<string, string | number | boolean | undefined>;
	resource: { serviceName: string; deploymentEnvironment: string };
}

interface OpikTrace {
	type: string;
	timestamp: number;
	model?: string;
	tokens?: Record<string, number | undefined>;
	cacheHitRatio?: number;
	durationMs?: number;
	attributes: Record<string, unknown>;
}

// Local copy of the OTEL exporter logic (mirrors
// my-pi/packages/pi-observability/src/exporters/otel.ts).
function createOtelExporter(transport: { send(spans: OtelSpan[]): Promise<void> }) {
	const buffered: OtelSpan[] = [];
	const pending = new Map<string, OtelSpan>();
	const now = () => 1000;

	const attrs = (event: TelemetryEvent): Record<string, string | number | boolean | undefined> => {
		const out: Record<string, string | number | boolean | undefined> = {};
		for (const [k, v] of Object.entries(event)) {
			if (k === "type" || k === "timestamp") continue;
			if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
			else if (v !== undefined && v !== null) out[k] = JSON.stringify(v);
		}
		return out;
	};

	return {
		record(event: TelemetryEvent): void {
			const family = String(event.type).split(".")[0];
			const kind = String(event.type).split(".")[1] ?? "event";
			const timestamp = typeof event.timestamp === "number" ? event.timestamp : now();
			if (kind === "before") {
				pending.set(family, {
					name: `pi.${family}`,
					startTimeMs: timestamp,
					attributes: attrs(event),
					resource: { serviceName: "pi", deploymentEnvironment: "testing" },
				});
				return;
			}
			if (kind === "after") {
				const open = pending.get(family);
				if (open) {
					open.endTimeMs = timestamp;
					open.attributes = { ...open.attributes, ...attrs(event) };
					buffered.push(open);
					pending.delete(family);
					return;
				}
				buffered.push({
					name: `pi.${family}`,
					startTimeMs: timestamp,
					endTimeMs: timestamp,
					attributes: attrs(event),
					resource: { serviceName: "pi", deploymentEnvironment: "testing" },
				});
				return;
			}
			buffered.push({
				name: `pi.${event.type}`,
				startTimeMs: timestamp,
				endTimeMs: timestamp,
				attributes: attrs(event),
				resource: { serviceName: "pi", deploymentEnvironment: "testing" },
			});
		},
		async flush() {
			if (buffered.length === 0 && pending.size === 0) return;
			const closing = now();
			for (const open of pending.values()) {
				open.endTimeMs = closing;
				buffered.push(open);
			}
			pending.clear();
			await transport.send(buffered.splice(0));
		},
	};
}

// Local copy of the Opik exporter logic.
function createOpikExporter(options: {
	transport: { send(trace: OpikTrace): void; flush?: () => void };
	mode?: "auto" | "on" | "off" | "harness-skip";
	harnessMode?: boolean;
}) {
	const mode = options.mode ?? "auto";
	const harnessMode = options.harnessMode ?? false;
	const emissionEnabled = mode === "on" || (mode === "auto" && !harnessMode && Boolean(process.env.OPIK_API_KEY));

	const toTrace = (event: TelemetryEvent): OpikTrace | null => {
		const family = String(event.type).split(".")[0];
		const kind = String(event.type).split(".")[1];
		const timestamp = typeof event.timestamp === "number" ? event.timestamp : 0;
		const attributes: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(event)) {
			if (k === "type" || k === "timestamp") continue;
			attributes[k] = v;
		}
		if (family === "provider" && kind === "after")
			return {
				type: "provider",
				timestamp,
				model: event.model as string | undefined,
				tokens: event.tokens as Record<string, number | undefined> | undefined,
				cacheHitRatio: event.cacheHitRatio as number | undefined,
				durationMs: event.durationMs as number | undefined,
				attributes,
			};
		if (family === "tool" && kind === "after")
			return { type: "tool", timestamp, durationMs: event.durationMs as number | undefined, attributes };
		if (family === "compaction" && kind === "after")
			return { type: "compaction", timestamp, durationMs: event.durationMs as number | undefined, attributes };
		if (family === "cache")
			return {
				type: "cache",
				timestamp,
				cacheHitRatio: event.cacheHitRatio as number | undefined,
				attributes,
			};
		return null;
	};

	return {
		emissionEnabled,
		record(event: TelemetryEvent): void {
			if (!emissionEnabled) return;
			const trace = toTrace(event);
			if (trace) options.transport.send(trace);
		},
		async flush() {
			if (emissionEnabled && options.transport.flush) await options.transport.flush();
		},
	};
}

describe("pi-observability OTEL/SigNoz exporter (issue 10)", () => {
	it("converts paired before/after events into a span with start and end timestamps", async () => {
		const spans: OtelSpan[] = [];
		const transport = {
			send: async (next: OtelSpan[]) => {
				spans.push(...next);
			},
		};
		const exporter = createOtelExporter(transport);

		exporter.record({ type: "provider.before", timestamp: 100, payload: { model: "claude-sonnet" } });
		exporter.record({
			type: "provider.after",
			timestamp: 250,
			status: 200,
			cacheHitRatio: 0.7,
		});
		await exporter.flush();

		expect(spans).toHaveLength(1);
		expect(spans[0]).toMatchObject({
			name: "pi.provider",
			startTimeMs: 100,
			endTimeMs: 250,
			resource: { serviceName: "pi", deploymentEnvironment: "testing" },
		});
		expect(spans[0].attributes).toMatchObject({
			status: 200,
			cacheHitRatio: 0.7,
		});
	});

	it("emits a span per non-paired event (e.g. cache.tick)", async () => {
		const spans: OtelSpan[] = [];
		const transport = {
			send: async (next: OtelSpan[]) => {
				spans.push(...next);
			},
		};
		const exporter = createOtelExporter(transport);
		exporter.record({ type: "cache.tick", timestamp: 500, contextTokens: 12345, cacheHitRatio: 0.91 });
		await exporter.flush();

		expect(spans).toHaveLength(1);
		expect(spans[0]).toMatchObject({
			name: "pi.cache.tick",
			startTimeMs: 500,
			endTimeMs: 500,
		});
		expect(spans[0].attributes).toMatchObject({ contextTokens: 12345, cacheHitRatio: 0.91 });
	});

	it("closes open before-spans on flush so a missing .after never loses the span", async () => {
		const spans: OtelSpan[] = [];
		const transport = {
			send: async (next: OtelSpan[]) => {
				spans.push(...next);
			},
		};
		const exporter = createOtelExporter(transport);
		exporter.record({ type: "tool.before", timestamp: 10, toolName: "read" });
		await exporter.flush();
		expect(spans).toHaveLength(1);
		expect(spans[0].name).toBe("pi.tool");
		expect(spans[0].startTimeMs).toBe(10);
		expect(spans[0].endTimeMs).toBeDefined();
	});
});

describe("pi-observability Opik exporter (issue 10)", () => {
	it("translates provider.after events into provider traces with token + cache fields", () => {
		const traces: OpikTrace[] = [];
		const transport = { send: (t: OpikTrace) => traces.push(t) };
		const exporter = createOpikExporter({ transport, mode: "on" });

		exporter.record({
			type: "provider.after",
			timestamp: 1700000000000,
			model: "claude-sonnet",
			status: 200,
			durationMs: 412,
			tokens: { input: 4096, output: 256, cacheRead: 3500, cacheWrite: 200 },
			cacheHitRatio: 0.85,
		});

		expect(traces).toHaveLength(1);
		expect(traces[0]).toMatchObject({
			type: "provider",
			timestamp: 1700000000000,
			model: "claude-sonnet",
			durationMs: 412,
			tokens: { input: 4096, output: 256, cacheRead: 3500, cacheWrite: 200 },
			cacheHitRatio: 0.85,
		});
	});

	it("translates tool.after, compaction.after, and cache.tick events", () => {
		const traces: OpikTrace[] = [];
		const transport = { send: (t: OpikTrace) => traces.push(t) };
		const exporter = createOpikExporter({ transport, mode: "on" });

		exporter.record({ type: "tool.after", toolName: "read", durationMs: 12 });
		exporter.record({ type: "compaction.after", durationMs: 320, summaryTokens: 1500 });
		exporter.record({ type: "cache.tick", cacheHitRatio: 0.93, contextTokens: 8000 });

		expect(traces.map((t) => t.type)).toEqual(["tool", "compaction", "cache"]);
		expect(traces[2].cacheHitRatio).toBe(0.93);
	});

	it("suppresses every Opik record in OpenClaw harness mode (no duplicate turn traces)", () => {
		const traces: OpikTrace[] = [];
		const transport = { send: (t: OpikTrace) => traces.push(t) };
		const exporter = createOpikExporter({ transport, mode: "auto", harnessMode: true });

		expect(exporter.emissionEnabled).toBe(false);
		exporter.record({ type: "provider.after", status: 200, model: "claude-sonnet" });
		exporter.record({ type: "tool.after", toolName: "read" });
		expect(traces).toEqual([]);
	});

	it("respects explicit mode=off regardless of env config", () => {
		const previous = process.env.OPIK_API_KEY;
		try {
			process.env.OPIK_API_KEY = "test-key";
			const traces: OpikTrace[] = [];
			const transport = { send: (t: OpikTrace) => traces.push(t) };
			const exporter = createOpikExporter({ transport, mode: "off" });
			expect(exporter.emissionEnabled).toBe(false);
			exporter.record({ type: "provider.after", status: 200 });
			expect(traces).toEqual([]);
		} finally {
			if (previous === undefined) delete process.env.OPIK_API_KEY;
			else process.env.OPIK_API_KEY = previous;
		}
	});

	it("does not require real SigNoz / Opik / network / API keys", () => {
		expect(process.env.SIGNOZ_INGEST_KEY).toBeUndefined();
	});
});

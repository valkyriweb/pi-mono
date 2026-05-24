import type { Context } from "@earendil-works/pi-ai";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { clearAgentRecentRunsForTests } from "../../../src/core/agents/status.ts";
import type { AgentHandle, ExtensionAPI } from "../../../src/index.ts";
import { createHarness, type Harness } from "../harness.ts";

interface CapturedFork {
	handle?: AgentHandle;
	sessionId?: string;
	error?: unknown;
	beforeAgentStartCount: number;
}

function newCaptured(): CapturedFork {
	return { beforeAgentStartCount: 0 };
}

interface ContextRecord {
	contexts: Context[];
}

/**
 * Recording response factory. Logs the context (used to inspect systemPrompt /
 * tools / messages from the test) and returns a static assistant reply so
 * agent loops terminate cleanly.
 */
function recordingFactory(record: ContextRecord, label: string) {
	return (context: Context) => {
		record.contexts.push(context);
		return fauxAssistantMessage(`${label}:${record.contexts.length}`);
	};
}

/**
 * Determine whether a context belongs to a forked child agent. Child agents
 * are driven via `buildChildTaskPrompt`, which prefixes the child user message
 * with `Complete this delegated task:`. That marker is stable and survives
 * the parent transcript prefix that fork mode copies in.
 */
function isChildContext(ctx: Context): boolean {
	for (let i = ctx.messages.length - 1; i >= 0; i--) {
		const message = ctx.messages[i];
		if (message.role !== "user") continue;
		const text =
			typeof message.content === "string"
				? message.content
				: message.content
						.filter((part): part is { type: "text"; text: string } => part.type === "text")
						.map((part) => part.text)
						.join("\n");
		return text.includes("Complete this delegated task:");
	}
	return false;
}

function makeAgentServices(harness: Harness): void {
	// Inject agent tool services into the existing harness session. The harness
	// constructs AgentSession without them, but the runner binding reads them
	// lazily via `this._agentToolServices`, so a post-construction patch is
	// safe and avoids changing harness.ts shape for this test alone.
	const internal = harness.session as unknown as {
		_agentToolServices?: {
			cwd: string;
			agentDir: string;
			authStorage: typeof harness.authStorage;
			settingsManager: typeof harness.settingsManager;
			modelRegistry: typeof harness.session.modelRegistry;
		};
	};
	internal._agentToolServices = {
		cwd: harness.tempDir,
		agentDir: harness.tempDir,
		authStorage: harness.authStorage,
		settingsManager: harness.settingsManager,
		modelRegistry: harness.session.modelRegistry,
	};
}

function forkExtensionFactory(
	captured: CapturedFork,
	options: {
		allowedTools?: string[];
		abortImmediately?: boolean;
		forkEveryTurn?: boolean;
	} = {},
) {
	const handles: AgentHandle[] = [];
	const factory = (pi: ExtensionAPI) => {
		pi.on("before_agent_start", async (_event, ctx) => {
			captured.beforeAgentStartCount += 1;
			if (!options.forkEveryTurn && captured.beforeAgentStartCount > 1) return;
			try {
				const controller = options.abortImmediately ? new AbortController() : undefined;
				const result = await ctx.forkAgent({
					prompt: `child task ${captured.beforeAgentStartCount}`,
					description: "fork-agent test",
					...(options.allowedTools ? { allowedTools: options.allowedTools } : {}),
					...(controller ? { signal: controller.signal } : {}),
				});
				captured.handle = result.handle;
				captured.sessionId = result.sessionId;
				handles.push(result.handle);
				controller?.abort();
			} catch (err) {
				captured.error = err;
			}
		});
	};
	return { factory, handles };
}

describe("ctx.forkAgent", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) harnesses.pop()?.cleanup();
		clearAgentRecentRunsForTests();
	});

	it("returns a handle that completes in the background and exposes a session id", async () => {
		const captured = newCaptured();
		const record: ContextRecord = { contexts: [] };
		const { factory } = forkExtensionFactory(captured);
		const harness = await createHarness({ extensionFactories: [factory] });
		harnesses.push(harness);
		makeAgentServices(harness);
		harness.setResponses([recordingFactory(record, "msg"), recordingFactory(record, "msg")]);

		await harness.session.prompt("kick off");

		expect(captured.error).toBeUndefined();
		expect(captured.handle).toBeDefined();
		expect(typeof captured.sessionId).toBe("string");
		expect(captured.sessionId).not.toBe("");
		const handle = captured.handle!;
		expect(["running", "completed"]).toContain(handle.status);
		const details = await handle.wait();
		expect(details.status).toBe("completed");
		expect(details.runs[0]?.status).toBe("completed");
		// Both parent and child made LLM calls; the recording factory captured them.
		expect(record.contexts.length).toBe(2);
		expect(record.contexts.some(isChildContext)).toBe(true);
	});

	it("inherits the parent's frozen system prompt for cache preservation across forks", async () => {
		const captured = newCaptured();
		const record: ContextRecord = { contexts: [] };
		const { factory, handles } = forkExtensionFactory(captured, { forkEveryTurn: true });
		const harness = await createHarness({ extensionFactories: [factory] });
		harnesses.push(harness);
		makeAgentServices(harness);
		// 4 responses: 2 parent turns + 2 child forks.
		harness.setResponses([
			recordingFactory(record, "msg"),
			recordingFactory(record, "msg"),
			recordingFactory(record, "msg"),
			recordingFactory(record, "msg"),
		]);

		await harness.session.prompt("turn one");
		await handles[0]?.wait();
		await harness.session.prompt("turn two");
		await handles[1]?.wait();

		const childPrompts: string[] = [];
		const parentPrompts: string[] = [];
		for (const ctx of record.contexts) {
			if (isChildContext(ctx)) childPrompts.push(ctx.systemPrompt ?? "");
			else parentPrompts.push(ctx.systemPrompt ?? "");
		}

		expect(childPrompts.length).toBe(2);
		expect(parentPrompts.length).toBe(2);
		// Cache invariant: in fork mode, the child's first LLM call carries the
		// parent's frozen system prompt bytes 1:1 — same string the parent used
		// on its own call in that turn.
		expect(childPrompts[0]).toBe(parentPrompts[0]);
		// And both child forks see byte-identical bytes across turns, which is
		// what makes pi-memory v2 caching repeatable.
		expect(childPrompts[0]).toBe(childPrompts[1]);
	});

	// Uses "Bash" (still core after PR #1C) rather than "Read" (now provided by
	// my-pi/extensions/native-tool-aliases). Test-harness child sessions create a
	// fresh DefaultResourceLoader that doesn't inherit the parent's in-memory
	// extensionFactories, so extension-provided tools don't propagate to child API
	// calls. Production isn't affected: child loaders discover on-disk extensions
	// the same way the parent does. See docs/tool-inventory-2026-05-23.md PR #1C.
	it("intersects allowedTools with the parent's active tool list", async () => {
		const captured = newCaptured();
		const record: ContextRecord = { contexts: [] };
		const { factory } = forkExtensionFactory(captured, { allowedTools: ["Bash"] });
		const harness = await createHarness({ extensionFactories: [factory] });
		harnesses.push(harness);
		makeAgentServices(harness);
		harness.setResponses([recordingFactory(record, "msg"), recordingFactory(record, "msg")]);

		await harness.session.prompt("go");
		const details = await captured.handle!.wait();
		expect(details.runs[0]?.effectiveTools).toEqual(["Bash"]);

		const childContext = record.contexts.find(isChildContext);
		const childToolNames = (childContext?.tools ?? []).map((tool) => tool.name);
		expect(childToolNames).toEqual(["Bash"]);
	});

	it("aborts the run within ~1s when the caller signals", async () => {
		const captured = newCaptured();
		const record: ContextRecord = { contexts: [] };
		const { factory } = forkExtensionFactory(captured, { abortImmediately: true });
		const harness = await createHarness({ extensionFactories: [factory] });
		harnesses.push(harness);
		makeAgentServices(harness);
		// Provide one quick parent response. The child may or may not get a
		// chance to send its own request before abort lands; the queue tolerates
		// extra unused responses.
		harness.setResponses([recordingFactory(record, "msg"), recordingFactory(record, "msg")]);

		await harness.session.prompt("go");

		const start = Date.now();
		const details = await Promise.race([
			captured.handle!.wait(),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error(`abort did not land within 2s (status=${captured.handle?.status})`)),
					2000,
				),
			),
		]);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(2000);
		expect(["cancelled", "interrupted"]).toContain(details.status);
		expect(captured.handle!.status).toBe(details.status);
	});
});

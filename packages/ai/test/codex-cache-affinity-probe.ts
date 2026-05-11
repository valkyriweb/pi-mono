#!/usr/bin/env tsx
/**
 * Live probe for OpenAI Codex prompt-cache affinity across fresh Pi sessions.
 *
 * It sends the same large first request with different session ids. A good
 * cross-session prompt-cache key should make the second request report cacheRead.
 */

import { AuthStorage } from "../../coding-agent/src/core/auth-storage.js";
import { getModel } from "../src/models.js";
import { streamOpenAICodexResponses } from "../src/providers/openai-codex-responses.js";
import type { Context, Model, Transport } from "../src/types.js";

interface Args {
	pairs: number;
	padding: number;
	transport: Transport;
	delayMs: number;
}

interface ProbeResult {
	request: number;
	sessionId: string;
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	totalTokens: number;
}

function parseArgs(argv: string[]): Args {
	let pairs = 1;
	let padding = 240;
	let transport: Transport = "sse";
	let delayMs = 0;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--pairs":
				pairs = Number.parseInt(required(argv[++i], arg), 10);
				break;
			case "--padding":
				padding = Number.parseInt(required(argv[++i], arg), 10);
				break;
			case "--transport": {
				const value = required(argv[++i], arg);
				if (value !== "sse" && value !== "websocket" && value !== "websocket-cached" && value !== "auto") {
					throw new Error(`Invalid transport: ${value}`);
				}
				transport = value;
				break;
			}
			case "--delay-ms":
				delayMs = Number.parseInt(required(argv[++i], arg), 10);
				break;
			case "--help":
				printHelp();
				process.exit(0);
				break;
			default:
				throw new Error(`Unknown argument: ${arg}`);
		}
	}

	if (!Number.isInteger(pairs) || pairs < 1 || pairs > 5) {
		throw new Error("--pairs must be an integer between 1 and 5");
	}
	if (!Number.isInteger(padding) || padding < 80 || padding > 600) {
		throw new Error("--padding must be an integer between 80 and 600");
	}
	if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 60_000) {
		throw new Error("--delay-ms must be an integer between 0 and 60000");
	}

	return { pairs, padding, transport, delayMs };
}

function required(value: string | undefined, flag: string): string {
	if (!value) throw new Error(`Missing value for ${flag}`);
	return value;
}

function printHelp(): void {
	console.log(`Usage: npx tsx test/codex-cache-affinity-probe.ts [options]

Options:
  --pairs <n>        Number of two-session pairs to run. Default: 1
  --padding <n>      Repeated prompt-padding lines. Default: 240
  --transport <mode> sse | websocket | websocket-cached | auto. Default: sse
  --delay-ms <n>     Delay between the first and second session in each pair. Default: 0
`);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(padding: number): string {
	const lines = [
		"This is a live OpenAI Codex prompt-cache affinity probe.",
		"Reply exactly: codex cache affinity probe ok",
		"The following repeated block is intentionally stable across fresh sessions.",
	];
	for (let i = 1; i <= padding; i++) {
		lines.push(
			`Stable cache affinity record ${String(i).padStart(3, "0")}: alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega.`,
		);
	}
	return lines.join("\n");
}

function buildContext(padding: number): Context {
	return {
		systemPrompt: "You are participating in a benchmark. Reply exactly as requested and keep answers minimal.",
		messages: [{ role: "user", content: buildPrompt(padding), timestamp: Date.now() }],
	};
}

function hitRate(cacheRead: number, input: number, cacheWrite: number): number {
	const denominator = cacheRead + input + cacheWrite;
	return denominator === 0 ? 0 : cacheRead / denominator;
}

async function runProbe(
	model: Model<"openai-codex-responses">,
	apiKey: string,
	args: Args,
	request: number,
	sessionId: string,
): Promise<ProbeResult> {
	const message = await streamOpenAICodexResponses(model, buildContext(args.padding), {
		apiKey,
		sessionId,
		transport: args.transport,
		reasoningEffort: "low",
	}).result();

	if (message.stopReason === "error" || message.stopReason === "aborted") {
		throw new Error(message.errorMessage ?? `Probe request ${request} failed`);
	}

	return {
		request,
		sessionId,
		input: message.usage.input,
		output: message.usage.output,
		cacheRead: message.usage.cacheRead,
		cacheWrite: message.usage.cacheWrite,
		totalTokens: message.usage.totalTokens,
	};
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const model = getModel("openai-codex", "gpt-5.5") as Model<"openai-codex-responses"> | undefined;
	if (!model) throw new Error("Model openai-codex/gpt-5.5 not found");

	const authStorage = AuthStorage.create();
	const apiKey = (await authStorage.getApiKey("openai-codex")) ?? (await authStorage.getApiKey("openai"));
	if (!apiKey) throw new Error("No OpenAI Codex API key found in coding-agent auth storage.");

	const startedAt = Date.now();
	const results: ProbeResult[] = [];
	const runId = `codex-cache-affinity-${Date.now()}`;
	for (let pair = 1; pair <= args.pairs; pair++) {
		for (let index = 1; index <= 2; index++) {
			if (index === 2 && args.delayMs > 0) {
				console.log(`delay ${args.delayMs}ms before second session in pair ${pair}`);
				await sleep(args.delayMs);
			}
			const request = (pair - 1) * 2 + index;
			const sessionId = `${runId}-pair-${pair}-session-${index}`;
			const result = await runProbe(model, apiKey, args, request, sessionId);
			results.push(result);
			console.log(
				[
					`request ${request}`,
					`session ${sessionId}`,
					`input ${result.input}`,
					`output ${result.output}`,
					`cache ${result.cacheRead}/${result.cacheWrite}`,
					`hitRate ${hitRate(result.cacheRead, result.input, result.cacheWrite).toFixed(4)}`,
				].join(" | "),
			);
		}
	}

	const secondRequests = results.filter((result) => result.request % 2 === 0);
	const secondInput = secondRequests.reduce((sum, result) => sum + result.input, 0);
	const secondCacheRead = secondRequests.reduce((sum, result) => sum + result.cacheRead, 0);
	const secondCacheWrite = secondRequests.reduce((sum, result) => sum + result.cacheWrite, 0);
	const totalInput = results.reduce((sum, result) => sum + result.input, 0);
	const totalCacheRead = results.reduce((sum, result) => sum + result.cacheRead, 0);
	const totalCacheWrite = results.reduce((sum, result) => sum + result.cacheWrite, 0);
	const elapsedSeconds = (Date.now() - startedAt) / 1000;

	console.log(`METRIC first_request_hit_rate=${hitRate(secondCacheRead, secondInput, secondCacheWrite)}`);
	console.log(`METRIC overall_hit_rate=${hitRate(totalCacheRead, totalInput, totalCacheWrite)}`);
	console.log(`METRIC second_cache_read=${secondCacheRead}`);
	console.log(`METRIC second_input=${secondInput}`);
	console.log(`METRIC requests=${results.length}`);
	console.log(`METRIC elapsed_seconds=${elapsedSeconds.toFixed(3)}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});

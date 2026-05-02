import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { withFileMutationQueue } from "../tools/file-mutation-queue.js";
import type { AgentOutputMode } from "./types.js";

export interface AgentOutputWriteResult {
	contentForParent: string;
	outputPath?: string;
}

export function resolveAgentOutputPath(output: string, cwd: string, baseDir?: string): string {
	if (isAbsolute(output)) return output;
	return resolve(baseDir ? join(cwd, baseDir) : cwd, output);
}

export async function writeAgentOutput(options: {
	cwd: string;
	output?: string;
	outputMode: AgentOutputMode;
	content: string;
	chainDir?: string;
}): Promise<AgentOutputWriteResult> {
	if (!options.output || options.outputMode === "inline") {
		return { contentForParent: options.content };
	}

	const outputPath = resolveAgentOutputPath(options.output, options.cwd, options.chainDir);
	await mkdir(dirname(outputPath), { recursive: true });
	await withFileMutationQueue(outputPath, async () => {
		await writeFile(outputPath, options.content, { encoding: "utf-8", mode: 0o600 });
	});

	if (options.outputMode === "file") {
		return { contentForParent: `Saved child agent output to ${outputPath}`, outputPath };
	}
	return { contentForParent: `${options.content}\n\n[Saved child agent output to ${outputPath}]`, outputPath };
}

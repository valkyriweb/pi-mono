import { createHash } from "node:crypto";
import type { Model } from "@valkyriweb/pi-ai";

/**
 * Stable prompt-cache affinity shared by normal turns and cache heartbeats.
 *
 * `sessionId` remains the transport/session identity. Cache affinity is broader:
 * requests from the same cwd + model should land near the same provider-side
 * prompt cache so a heartbeat can warm the long static prefix for new sessions.
 */
export function createPromptCacheAffinityKey(model: Model<any>, cwd: string): string {
	const digest = createHash("sha256")
		.update(`${model.provider}\0${model.id}\0${cwd}`)
		.digest("base64url")
		.slice(0, 16);
	return `pi:${model.provider}:${model.id}:${digest}`;
}

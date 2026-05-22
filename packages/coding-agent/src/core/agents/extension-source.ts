/**
 * Module-level bridge between the extension runner (which owns the
 * `pi.registerAgentDefinitions` registry per extension) and `loadAgentRegistry`
 * (which assembles the registry from builtin + user + project sources). The
 * runner installs a provider once at bind time; `loadAgentRegistry` consults it
 * so packages such as `pi-agents` can publish definitions without core
 * importing the package.
 *
 * Mirrors `live-sessions.ts`: a module-level registry that lets a producer
 * (extension runner) and a consumer (agent loader) communicate through core
 * without an import edge between them.
 */

import type { AgentDefinition } from "./types.ts";

export type AgentExtensionDefinitionsProvider = () => AgentDefinition[];

let provider: AgentExtensionDefinitionsProvider | undefined;

/**
 * Register the provider that supplies extension-registered agent definitions.
 * The runner calls this from `bindCore`. Later registrations overwrite the
 * previous provider so a session replacement (`/clear`, `/fork`, `/reload`)
 * cleanly hands off to the new runner.
 */
export function setAgentExtensionDefinitionsProvider(next: AgentExtensionDefinitionsProvider): void {
	provider = next;
}

/**
 * Return the current extension-registered agent definitions, or an empty
 * array if no provider has been installed.
 */
export function getAgentExtensionDefinitions(): AgentDefinition[] {
	return provider ? provider() : [];
}

/** For tests: drop the provider. */
export function clearAgentExtensionDefinitionsProviderForTests(): void {
	provider = undefined;
}

import { getBuiltinAgentDefinitions } from "./definitions.ts";
import { findNearestProjectAgentsDir, getUserAgentsDir, loadAgentDefinitionsFromDirectory } from "./loader.ts";
import type { AgentDefinition, AgentRegistry, AgentScope } from "./types.ts";

function mergeDefinitions(base: AgentRegistry, next: AgentRegistry): AgentRegistry {
	const byId = new Map<string, AgentDefinition>();
	for (const agent of base.agents) {
		byId.set(agent.id, agent);
	}
	for (const agent of next.agents) {
		byId.set(agent.id, agent);
	}
	return {
		agents: Array.from(byId.values()),
		diagnostics: [...base.diagnostics, ...next.diagnostics],
		projectAgentsDir: next.projectAgentsDir ?? base.projectAgentsDir,
	};
}

export async function loadAgentRegistry(options: { cwd: string; agentScope?: AgentScope }): Promise<AgentRegistry> {
	const scope = options.agentScope ?? "user";
	let registry: AgentRegistry = {
		agents: getBuiltinAgentDefinitions(),
		diagnostics: [],
	};

	if (scope === "user" || scope === "both") {
		registry = mergeDefinitions(registry, await loadAgentDefinitionsFromDirectory(getUserAgentsDir(), "user"));
	}

	if (scope === "project" || scope === "both") {
		const projectAgentsDir = findNearestProjectAgentsDir(options.cwd);
		if (projectAgentsDir) {
			registry = mergeDefinitions(registry, {
				...(await loadAgentDefinitionsFromDirectory(projectAgentsDir, "project")),
				projectAgentsDir,
			});
		}
	}

	registry.agents.sort((a, b) => a.id.localeCompare(b.id));
	return registry;
}

export function findAgentDefinition(registry: AgentRegistry, id: string): AgentDefinition | undefined {
	const exact = registry.agents.find((agent) => agent.id === id);
	if (exact) return exact;

	const lowerId = id.toLowerCase();
	const caseInsensitiveMatches = registry.agents.filter((agent) => agent.id.toLowerCase() === lowerId);
	return caseInsensitiveMatches.length === 1 ? caseInsensitiveMatches[0] : undefined;
}

export function formatAvailableAgents(registry: AgentRegistry): string {
	return registry.agents
		.map((agent) => agent.id)
		.sort()
		.join(", ");
}

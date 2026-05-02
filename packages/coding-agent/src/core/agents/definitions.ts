import type { AgentDefinition } from "./types.js";

export const BUILTIN_AGENT_DEFINITIONS: AgentDefinition[] = [
	{
		id: "general-purpose",
		description: "General delegated task execution with the parent's active tools.",
		tools: "*",
		denyTools: ["agent"],
		model: "inherit",
		thinking: "inherit",
		defaultContext: "default",
		inheritProjectContext: true,
		inheritSkills: true,
		source: "builtin",
		prompt: `You are a Pi child agent. Complete the delegated task fully without gold-plating.
Search broadly when the location is unclear. Prefer editing existing files over creating new files.
Do not create documentation unless explicitly requested.
Return a concise report with findings, files changed, and validation performed.`,
	},
	{
		id: "worker",
		description: "Implementation worker for scoped coding tasks.",
		tools: "*",
		denyTools: ["agent"],
		model: "inherit",
		thinking: "inherit",
		defaultContext: "fork",
		inheritProjectContext: true,
		inheritSkills: true,
		source: "builtin",
		prompt: `You are a Pi implementation worker. Execute the assigned implementation task in this child context.
Respect the caller's constraints exactly. Make the smallest complete change.
Do not delegate. Do not broaden scope. Report changes, validation, and blockers.`,
	},
	{
		id: "explore",
		description: "Read-only exploration of relevant files, symbols, and constraints.",
		tools: ["read", "grep", "find", "ls"],
		denyTools: ["agent", "edit", "write", "bash"],
		model: "inherit",
		thinking: "inherit",
		defaultContext: "slim",
		inheritProjectContext: false,
		inheritSkills: false,
		source: "builtin",
		prompt: `You are a read-only exploration agent. Find relevant files, symbols, flows, and constraints.
Do not modify files or system state. Start broad, then narrow.
Cite concrete paths and separate evidence from inference.
Return compact findings and open questions.`,
	},
	{
		id: "plan",
		description: "Read-only planning agent for implementation strategy and risks.",
		tools: ["read", "grep", "find", "ls"],
		denyTools: ["agent", "edit", "write", "bash"],
		model: "inherit",
		thinking: "inherit",
		defaultContext: "slim",
		inheritProjectContext: false,
		inheritSkills: false,
		source: "builtin",
		prompt: `You are a read-only software planning agent. Understand the requirement and current architecture.
Identify exact integration points, files to edit, risks, and validation commands.
Do not modify files or system state.
End with critical files for implementation.`,
	},
	{
		id: "scout",
		description: "Fast read-only codebase reconnaissance.",
		tools: ["read", "grep", "find", "ls"],
		denyTools: ["agent", "edit", "write", "bash"],
		model: "inherit",
		thinking: "inherit",
		defaultContext: "slim",
		inheritProjectContext: false,
		inheritSkills: false,
		source: "builtin",
		prompt: `You are a fast codebase scout. Stay read-only.
Find the smallest useful set of files and facts for the caller.
Do not solve the task unless asked. Keep output compact and actionable.`,
	},
	{
		id: "reviewer",
		description: "Read-only reviewer for correctness, regressions, and missing validation.",
		tools: ["read", "grep", "find", "ls"],
		denyTools: ["agent", "edit", "write", "bash"],
		model: "inherit",
		thinking: "inherit",
		defaultContext: "default",
		inheritProjectContext: true,
		inheritSkills: true,
		source: "builtin",
		prompt: `You are a read-only reviewer. Verify claims against concrete files and outputs.
Prioritize correctness, regressions, safety, and missing validation.
Do not rewrite the implementation. Return PASS, FAIL, or PARTIAL with evidence.`,
	},
	{
		id: "statusline-setup",
		description: "Configure Pi status/footer/statusline settings only.",
		tools: ["read", "edit"],
		denyTools: ["agent", "write", "bash"],
		model: "inherit",
		thinking: "inherit",
		defaultContext: "default",
		inheritProjectContext: true,
		inheritSkills: true,
		source: "builtin",
		prompt: `You configure Pi status/footer/statusline settings only.
Read existing settings first. Preserve unrelated settings exactly.
Make the smallest safe change. Do not edit Claude-specific files.
Report changed path, summary, verification, and revert instructions.`,
	},
];

export function getBuiltinAgentDefinitions(): AgentDefinition[] {
	return BUILTIN_AGENT_DEFINITIONS.map((agent) => ({ ...agent, denyTools: [...(agent.denyTools ?? [])] }));
}

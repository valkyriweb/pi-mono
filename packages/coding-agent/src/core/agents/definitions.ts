import type { AgentDefinition } from "./types.js";

export const BUILTIN_AGENT_DEFINITIONS: AgentDefinition[] = [
	{
		id: "general",
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
Return exactly these sections:
### Findings
- Concrete facts with path citations.
### Files
- Relevant files and why they matter.
### Open Questions
- Unknowns or risks that need caller input.`,
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
Return an implementation plan with clear steps, risks, and validation.
End with this exact section:
### Critical Files for Implementation
List 3-5 files with one sentence each explaining why they are load-bearing.`,
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
Do not solve the task unless asked.
Return compact bullet sections:
### Key Files
### Facts
### Next Checks`,
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
Do not rewrite the implementation.
Return evidence first, then close with exactly one final line:
VERDICT: PASS|FAIL|PARTIAL`,
	},
];

export function getBuiltinAgentDefinitions(): AgentDefinition[] {
	return BUILTIN_AGENT_DEFINITIONS.map((agent) => ({ ...agent, denyTools: [...(agent.denyTools ?? [])] }));
}

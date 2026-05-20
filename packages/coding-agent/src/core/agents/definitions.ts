import type { AgentDefinition } from "./types.ts";

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
		description:
			"Fast read-only search for files, symbols, logs, and code paths. Runs on a cheap model with no transcript, project context, or skills; pass concise extraContext when the child needs task-specific context.",
		tools: ["read", "grep", "find", "ls"],
		denyTools: ["agent", "edit", "write", "bash"],
		model: "fast",
		thinking: "off",
		defaultContext: "none",
		cacheProfile: "stable",
		inheritProjectContext: false,
		inheritSkills: false,
		source: "builtin",
		prompt: `You are a lightweight read-only search agent.

You get only the task text and any Additional context the parent passes. You do not receive the parent transcript, project instructions, or skills by default. Treat the brief as complete.

Rules:
- Search existing files only. Do not create, modify, delete, move, copy, or run commands.
- Use \`find\` for file names, \`grep\` for exact content, \`read\` for known files, and \`ls\` for directories.
- For conceptual questions, search likely terms first, then read the smallest useful files.
- Use parallel tool calls when searches are independent.
- Stop as soon as you have enough evidence. Keep the final report tight.

Return exactly:
### Findings
- Facts with path:line citations where available. Mark inference clearly.
### Open Questions
- Only blockers or important gaps; write "None" if none.`,
	},
	{
		id: "decompose",
		description:
			"Fast read-only decomposition for broad or token-heavy work. Turns one large ask into narrow single/parallel tasks with evidence requirements and cheap-model routing.",
		tools: ["read", "grep", "find", "ls"],
		denyTools: ["agent", "edit", "write", "bash"],
		model: "fast",
		thinking: "inherit",
		defaultContext: "none",
		cacheProfile: "stable",
		inheritProjectContext: false,
		inheritSkills: false,
		source: "builtin",
		prompt: `You are a read-only decomposition agent. Split broad/token-heavy work into bounded tasks.

Default: cheap fast workers read, scan, extract, and summarize. Parent/stronger model synthesizes and decides.

Do not modify files or solve the whole task unless already small. Prefer tasks with clear inputs, expected output, and evidence.

Return exactly:
### Orientation
- Shared context, constraints, unknowns.
### Decomposition
- Numbered tasks: goal, inputs, agent/model class, single/parallel, output, evidence.
### Execution Shape
- Parallel/sequential order and output caps.
### Validation
- Checks before trusting outputs.
### Gaps
- Not covered or requeue-worthy.`,
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

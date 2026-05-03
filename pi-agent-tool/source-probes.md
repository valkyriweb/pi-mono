# Source Probes

Generated: 2026-05-03T16:13:10Z

These probes back the scorecard where live child-agent execution would spend model tokens. They also document isolation setup for the two arms.


## Native CLI/resource isolation options

```bash
$ grep -nE -- --no-extensions\|--no-builtin-tools\|--tools\ \<list\>\|--thinking /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/docs/usage.md
172:| `--thinking <level>` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh` |
233:Child tools are computed from the parent active tools, requested tools, agent allow/deny lists, and a global recursive `agent` denial. `--tools`, `--no-builtin-tools`, and `--no-tools` continue to set the parent ceiling; children cannot gain tools the parent does not have active.
239:| `--tools <list>`, `-t <list>` | Allowlist specific built-in, extension, and custom tools, including `agent` |
240:| `--no-builtin-tools`, `-nbt` | Disable built-in tools but keep extension/custom tools enabled |
252:| `--no-extensions` | Disable extension discovery |
264:pi --no-extensions -e ./my-extension.ts
# exit=0
```

## Native built-in slash command surface

```bash
$ grep -nE agents\|agents-doctor\|agents-status /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/src/core/slash-commands.ts
20:	{ name: "agents", description: "List native child agents, run native agent workflows, or open selector" },
21:	{ name: "agents-doctor", description: "Diagnose native agent configuration and runtime availability" },
22:	{ name: "agents-status", description: "Show recent native child-agent runs" },
# exit=0
```

## Native interactive /agents subcommands

```bash
$ grep -nE /agents-doctor\|/agents-status\|handleAgentsCommand\|list-chains\|run-chain\|parallel\|run\  /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/src/modes/interactive/interactive-mode.ts
591:				rawKeyHint("!", "to run bash"),
592:				rawKeyHint("!!", "to run bash (no context)"),
2447:			if (text === "/agents-doctor") {
2452:			if (text === "/agents-status" || text.startsWith("/agents-status ")) {
2454:				const detailId = text.startsWith("/agents-status ") ? text.slice(15).trim() : undefined;
2461:				await this.handleAgentsCommand(agentArgs);
3902:	private async handleAgentsCommand(args?: string): Promise<void> {
3917:		if (args === "list-chains") {
3926:		if (args.startsWith("run ")) {
3928:			await this.session.prompt(`Use the native agent tool to run ${agentId} with this task: ${task}`);
3931:		if (args.startsWith("parallel ")) {
3938:				`Use the native agent tool parallel mode for these agents: ${agents.join(", ")}. Task for each: ${task}`,
3942:		if (args.startsWith("run-chain ")) {
3959:				`Use the native agent tool chain mode to run saved chain ${chain.name}${task ? ` for this task: ${task}` : ""}. Chain input: ${chainInput}`,
# exit=0
```

## Native agent tool schema/modes

```bash
$ grep -nE agentToolSchema\|taskSchema\|tasks\|chain\|context\|agentScope\|exactly\ one\ mode\|createAgentToolDefinition /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/src/core/tools/agent.ts
11:const contextModeSchema = Type.Union([
29:const taskSchema = Type.Object({
33:	context: Type.Optional(contextModeSchema),
34:	extraContext: Type.Optional(Type.String({ description: "Additional task-specific context" })),
42:export const agentToolSchema = Type.Object({
46:	tasks: Type.Optional(Type.Array(taskSchema, { maxItems: 8 })),
47:	chain: Type.Optional(Type.Array(taskSchema, { minItems: 1 })),
49:	context: Type.Optional(contextModeSchema),
56:	chainDir: Type.Optional(Type.String({ description: "Base directory for relative chain outputs" })),
57:	agentScope: Type.Optional(Type.Union([Type.Literal("user"), Type.Literal("project"), Type.Literal("both")])),
60:export type AgentToolInput = Static<typeof agentToolSchema>;
72:	tasks: NonNullable<AgentToolInput["tasks"]>;
75:	const hasParallel = Boolean(params.tasks && params.tasks.length > 0);
76:	const hasChain = Boolean(params.chain && params.chain.length > 0);
79:		throw new Error("agent tool requires exactly one mode: {agent, task}, {tasks}, or {chain}");
84:			tasks: [
89:					context: params.context,
100:	if (hasParallel) return { mode: "parallel", tasks: params.tasks ?? [] };
101:	return { mode: "chain", tasks: params.chain ?? [] };
230:	ctx: Parameters<ToolDefinition<typeof agentToolSchema>["execute"]>[4],
232:	const scope = params.agentScope;
246:export function createAgentToolDefinition(
249:): ToolDefinition<typeof agentToolSchema, AgentToolDetails> {
254:			"Launch a built-in or configured Pi child agent. Supports single {agent, task}, parallel {tasks}, and sequential chain {chain} modes.",
257:			"Use agent for delegated work that benefits from an isolated child context.",
258:			"When parallel exploration or review is needed, send multiple agent tool-use blocks in one assistant message; Pi runs those calls concurrently. Use tasks[] only for explicit batched fan-out inside one agent call.",
261:		parameters: agentToolSchema,
272:					tasks: mode.tasks,
274:					context: params.context,
281:					chainDir: params.chainDir,
282:					agentScope: params.agentScope,
298:		renderCall(args, theme, context) {
299:			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
303:				const names = mode.tasks.map((task) => task.agent).join(", ");
311:		renderResult(result, options, _theme, context) {
312:			const component = (context.lastComponent as Container | undefined) ?? new Container();
335:export function createAgentTool(cwd: string, options?: AgentToolOptions): AgentTool<typeof agentToolSchema> {
336:	return wrapToolDefinition(createAgentToolDefinition(cwd, options));
# exit=0
```

## Native context discipline

```bash
$ grep -nE resolveContextPolicy\|case\ \"fork\"\|case\ \"slim\"\|case\ \"none\"\|deniedToolNames\|agent\"\,\ \"subagent\" /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/src/core/agents/context.ts
7:export function resolveContextPolicy(mode: ContextMode): ResolvedContextPolicy {
9:		case "fork":
17:		case "slim":
25:		case "none":
69:function filterDeniedToolArtifacts(messages: AgentMessage[], deniedToolNames: Set<string>): AgentMessage[] {
73:				return deniedToolNames.has(message.toolName) ? undefined : message;
77:				return part.type !== "toolCall" || !deniedToolNames.has(part.name);
125:	const deniedToolNames = new Set(["agent", "subagent"]);
127:	return filterIncompleteToolCalls(filterDeniedToolArtifacts(messages, deniedToolNames));
# exit=0
```

## Native status diagnostics

```bash
$ grep -nE Native\ agent\ status\|Background\ control\|formatAgentStatus\|usage\|session\|output /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/src/core/agents/status.ts
12:	outputPaths: string[];
13:	sessionRefs: Array<{ agent: string; sessionId?: string; sessionPath?: string }>;
44:	return runs.map((run) => run.outputPath).filter((path): path is string => Boolean(path));
47:function summarizeSessions(runs: AgentRunDetails[]): AgentRecentRun["sessionRefs"] {
48:	return runs.map((run) => ({ agent: run.agent, sessionId: run.sessionId, sessionPath: run.sessionPath }));
62:		outputPaths: [],
63:		sessionRefs: [],
75:	run.outputPaths = summarizeOutputs(details.runs);
76:	run.sessionRefs = summarizeSessions(details.runs);
93:		outputPaths: [...run.outputPaths],
94:		sessionRefs: run.sessionRefs.map((session) => ({ ...session })),
105:	if (!run.usage) return undefined;
107:		run.usage.cacheRead || run.usage.cacheWrite ? ` cache r/w ${run.usage.cacheRead}/${run.usage.cacheWrite}` : "";
108:	const cost = run.usage.cost.total > 0 ? ` $${run.usage.cost.total.toFixed(4)}` : "";
109:	return `${run.usage.totalTokens} tok${cache}${cost}`;
114:	lines.push(`   session: ${run.sessionPath ?? run.sessionId ?? "n/a"}`);
127:	const usage = formatUsage(run);
128:	if (usage) lines.push(`   usage: ${usage}`);
129:	if (run.outputPath) lines.push(`   output: ${run.outputPath}`);
134:export function formatAgentStatus(runs = listAgentRecentRuns(), detailId?: string): string {
136:		"Native agent status",
138:		"Background control: unsupported in native Pi; recent foreground runs are listed below.",
151:		const outputs = run.outputPaths.length > 0 ? ` outputs: ${run.outputPaths.join(", ")}` : "";
152:		const sessions =
153:			run.sessionRefs.length > 0
154:				? ` sessions: ${run.sessionRefs
155:						.map((s) => s.sessionId ?? s.sessionPath)
161:			`${run.id} ${run.mode} ${run.status} ${duration} agents: ${run.agents.join(", ")}${sessions}${outputs}${error}`,
# exit=0
```

## Native doctor diagnostics

```bash
$ grep -nE Native\ agents\ doctor\ report\|active\ parent\ tools\|agent\ runtime\ services\|chains\|unavailable\ tools /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/src/core/agents/doctor.ts
5:import { loadAgentChainRegistry } from "./chains.js";
23:	if (unavailable.length > 0) warnings.push(`- unavailable tools for ${agent.id}: ${unavailable.join(", ")}`);
35:	const chains = await loadAgentChainRegistry(options.cwd);
40:		"Native agents doctor report",
44:		`- agent runtime services: ${options.runtimeServicesAvailable ? "available" : "unavailable"}`,
45:		`- active parent tools: ${options.activeTools.length > 0 ? options.activeTools.join(", ") : "none"}`,
54:		`- chains: ${chains.chains.length}`,
55:		`- user chains dir: ${chains.userChainsDir}`,
56:		`- project chains dir: ${chains.projectChainsDir ?? "not found"}`,
58:	const diagnostics = [...registry.diagnostics, ...chains.diagnostics];
# exit=0
```

## Native task lifecycle action probe

```bash
$ grep -nE taskId\|action\|Type\\.Literal\\\(\"create\"\|Type\\.Literal\\\(\"list\"\|Type\\.Literal\\\(\"get\"\|Type\\.Literal\\\(\"update\"\|deleted\|activeForm\|blockedBy\|metadata /Users/luke/Projects/personal/pi-mono-fork/packages/coding-agent/src/core/tools/agent.ts
# exit=1
```

## pi-subagents package version

```bash
$ node -e const\ p=require\(process.argv\[1\]\)\;\ console.log\(p.name+\'\ \'+p.version\) /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/package.json
pi-subagents 0.24.0
# exit=0
```

## pi-subagents slash commands actually registered

```bash
$ grep -nE registerCommand\\\(\"\(run\|chain\|parallel\|run-chain\|subagents\|subagents-status\|subagents-doctor\|agents\)\"\|--bg\|--fork /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/slash/slash-commands.ts
73:		if (args.endsWith(" --bg") || args === "--bg") {
75:			args = args === "--bg" ? "" : args.slice(0, -5).trim();
78:		if (args.endsWith(" --fork") || args === "--fork") {
80:			args = args === "--fork" ? "" : args.slice(0, -7).trim();
407:	pi.registerCommand("run", {
408:		description: "Run a subagent directly: /run agent[output=file] [task] [--bg] [--fork]",
414:			if (!input) { ctx.ui.notify("Usage: /run <agent> [task] [--bg] [--fork]", "error"); return; }
436:	pi.registerCommand("chain", {
437:		description: "Run agents in sequence: /chain scout \"task\" -> planner [--bg] [--fork]",
460:	pi.registerCommand("run-chain", {
461:		description: "Run a saved chain: /run-chain chainName -- task [--bg] [--fork]",
466:			const usage = "Usage: /run-chain <chainName> -- <task> [--bg] [--fork]";
489:	pi.registerCommand("parallel", {
490:		description: "Run agents in parallel: /parallel scout \"task1\" -> reviewer \"task2\" [--bg] [--fork]",
514:	pi.registerCommand("subagents-doctor", {
# exit=0
```

## pi-subagents removed surfaces in 0.24.0

```bash
$ grep -nE Removed\ the\ .\*/agents.\*manager\|Removed\ the\ .\*/subagents-status\|0\\.24\\.0\|subagents-status /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/CHANGELOG.md
5:## [0.24.0] - 2026-05-03
13:- Removed the unnecessary `/agents` manager overlay, its `Ctrl+Shift+A` shortcut, and the `agentManager.newShortcut` setting to cut unnecessary UI surface area; agent and chain management remains available through tool actions, settings, and markdown files.
15:- Removed the `/subagents-status` read-only overlay and its slash command; async runs remain inspectable through `subagent({ action: "status" })`, completion notifications, logs, and the async widget.
43:- Align single-run async subagent widgets and `/subagents-status` rendering with foreground subagent result styling for parallel, chain, and grouped chain runs, including inline live detail when tool output expansion is enabled, while keeping multi-job async widgets compact.
66:- Scoped `/subagents-status` to async runs launched from the current pi session instead of showing prior or unrelated sessions.
100:- Wrap long `/subagents-status` detail output/event lines instead of truncating them with ellipses.
184:- Added a read-only detail view to `/subagents-status` for inspecting selected async runs, including recent events, output tails, and useful run paths.
270:- Slash-run status text and `/subagents-status` summary output now use the same more explicit observability language, including clearer live-detail hints and surfaced output/session paths in the async status overlay.
427:- Added `/subagents-status`, a read-only overlay for active async runs plus recent completed/failed runs with per-run step details. The overlay auto-refreshes while open and preserves the selected run when possible.
# exit=0
```

## pi-subagents tool schema actions/control

```bash
$ grep -nE action\|status\|interrupt\|resume\|doctor\|chainName\|async\|tasks\|chain\|context\|fork /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/extension/schemas.ts
54:	task: Type.Optional(Type.String({ description: "Task template with {task}, {previous}, {chain_dir} variables. Defaults to {previous}." })),
60:	progress: Type.Optional(Type.Boolean({ description: "Enable progress.md tracking in {chain_dir}" })),
65:// Flattened so chain steps do not need an object-shape anyOf/oneOf union.
69:		description: "Task template with variables: {task}=original request, {previous}=prior step's text response, {chain_dir}=shared folder. Required for first step, defaults to '{previous}' for subsequent steps."
75:	progress: Type.Optional(Type.Boolean({ description: "Enable progress.md tracking in {chain_dir}" })),
79:	concurrency: Type.Optional(Type.Number({ description: "Max concurrent tasks (default: 4)" })),
96:	notifyChannels: Type.Optional(Type.Array(Type.String({ enum: ["event", "async", "intercom"] }), {
97:		description: "Notification channels to use when available. Defaults to event, async, and intercom.",
104:	// Management action (when present, tool operates in management mode)
105:	action: Type.Optional(Type.String({
107:		description: "Management/control action. Omit for execution mode."
110:		description: "Run id or prefix for action='status', action='interrupt', or action='resume'."
113:		description: "Target run ID for action='interrupt' or action='resume'. Defaults to the most recently active controllable run for interrupt. Prefer id for new calls."
116:		description: "Async run directory for action='status' or action='resume'."
118:	index: Type.Optional(Type.Integer({ minimum: 0, description: "Zero-based child index for actions that target a specific child." })),
119:	message: Type.Optional(Type.String({ description: "Follow-up message for action='resume'. Use index to choose a child from multi-child runs." })),
120:	// Chain identifier for management (can't reuse 'chain' — that's the execution array)
121:	chainName: Type.Optional(Type.String({
122:		description: "Chain name for get/update/delete management actions"
124:	// Agent/chain configuration for create/update (nested to avoid conflicts with execution fields)
130:		description: "Agent or chain config for create/update. Agent: name, package (optional namespace; runtime name becomes package.name), description, scope ('user'|'project', default 'user'), systemPrompt, systemPromptMode, inheritProjectContext, inheritSkills, defaultContext ('fresh'|'fork'), model, tools (comma-separated), extensions (comma-separated), skills (comma-separated), thinking, output, reads, progress, maxSubagentDepth. Chain: name, package, description, scope, steps (array of {agent, task?, output?, outputMode?, reads?, model?, skill?, progress?}). Presence of 'steps' creates a chain instead of an agent. String values must be valid JSON."
132:	tasks: Type.Optional(Type.Array(TaskItem, { description: "PARALLEL mode: [{agent, task, count?, output?, outputMode?, reads?, progress?}, ...]" })),
133:	concurrency: Type.Optional(Type.Integer({ minimum: 1, description: "Top-level PARALLEL mode only: max concurrent tasks. Defaults to config.parallel.concurrency or 4." })),
139:	chain: Type.Optional(Type.Array(ChainItem, { description: "CHAIN mode: sequential pipeline where each step's response becomes {previous} for the next. Use {task}, {previous}, {chain_dir} in task templates." })),
140:	context: Type.Optional(Type.String({
141:		enum: ["fresh", "fork"],
142:		description: "'fresh' or 'fork' to branch from parent session. If omitted, any requested agent with defaultContext: 'fork' makes the whole invocation forked; otherwise the default is 'fresh'.",
144:	chainDir: Type.Optional(Type.String({ description: "Persistent directory for chain artifacts. Default: a user-scoped temp directory under <tmpdir>/ (auto-cleaned after 24h)" })),
145:	async: Type.Optional(Type.Boolean({ description: "Run in background (default: false, or per config)" })),
155:	clarify: Type.Optional(Type.Boolean({ description: "Show TUI to preview/edit before execution (default: true for chains, false for single/parallel). Implies sync mode." })),
# exit=0
```

## pi-subagents tool registration

```bash
$ grep -nE name:\ \"subagent\"\|description:\ \`Delegate\|CONTROL:\|DIAGNOSTICS:\|registerSlashCommands /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/extension/index.ts
30:import { registerSlashCommands } from "../slash/slash-commands.ts";
399:		name: "subagent",
401:		description: `Delegate to subagents or manage agent definitions.
425:CONTROL:
430:DIAGNOSTICS:
476:	registerSlashCommands(pi, state);
# exit=0
```

## pi-subagents doctor implementation

```bash
$ grep -nE Subagent\ doctor\|async\ support\|Filesystem\|Intercom\|session\|diagnostics /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/extension/doctor.ts
5:import { diagnoseIntercomBridge, type IntercomBridgeDiagnostic } from "../intercom/intercom-bridge.ts";
27:	diagnoseIntercomBridge: typeof diagnoseIntercomBridge;
39:	sessionError?: string;
56:	diagnoseIntercomBridge,
118:	const sessionFile = input.currentSessionFile ?? null;
120:		lineFromCheck("configured session dir", () => `- configured session dir: ${formatConfiguredSessionDir(input)}`),
121:		`- current session file: ${sessionFile ?? "not available"}`,
122:		`- current session dir: ${sessionFile ? path.dirname(sessionFile) : "not available"}`,
123:		`- current session id: ${input.currentSessionId ?? input.state.currentSessionId ?? "not available"}`,
125:	if (input.sessionError) lines.push(`- session manager: failed — ${input.sessionError}`);
154:function formatIntercomDiagnostic(diagnostic: IntercomBridgeDiagnostic, context: "fresh" | "fork" | undefined): string[] {
159:		`- pi-intercom: ${diagnostic.piIntercomAvailable ? "available" : "unavailable"} at ${diagnostic.extensionDir}`,
178:		lineFromCheck("async support", () => `- async support: ${deps.isAsyncAvailable() ? "available" : "unavailable"}`),
181:		"Filesystem",
190:		"Intercom bridge",
191:		...lineFromCheck("intercom bridge", () => formatIntercomDiagnostic(deps.diagnoseIntercomBridge({
# exit=0
```

## pi-subagents async/status implementation

```bash
$ grep -nE async\|status\|resume\|interrupt\|result\|asyncDir\|runId /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:4:import { formatActivityLabel, formatParallelOutcome } from "../../shared/status-format.ts";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:13:	status: AsyncJobStep["status"];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:34:	asyncDir: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:63:	resultsDir?: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:86:		throw new Error(`Failed to inspect async run path '${entryPath}': ${getErrorMessage(error)}`, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:98:		throw new Error(`Failed to inspect async output file '${outputFile}': ${getErrorMessage(error)}`, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:104:function deriveAsyncActivityState(asyncDir: string, status: AsyncStatus): { activityState?: ActivityState; lastActivityAt?: number } {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:105:	if (status.state !== "running") return { activityState: status.activityState, lastActivityAt: status.lastActivityAt };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:106:	const outputPath = status.outputFile ? (path.isAbsolute(status.outputFile) ? status.outputFile : path.join(asyncDir, status.outputFile)) : undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:107:	const currentStep = typeof status.currentStep === "number" ? status.steps?.[status.currentStep] : undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:109:		activityState: status.activityState,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:110:		lastActivityAt: status.lastActivityAt ?? outputFileMtime(outputPath) ?? currentStep?.lastActivityAt ?? currentStep?.startedAt ?? status.startedAt,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:114:function statusToSummary(asyncDir: string, status: AsyncStatus & { cwd?: string }): AsyncRunSummary {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:115:	if (status.sessionId !== undefined && typeof status.sessionId !== "string") {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:116:		throw new Error(`Invalid async status '${path.join(asyncDir, "status.json")}': sessionId must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:118:	const { activityState, lastActivityAt } = deriveAsyncActivityState(asyncDir, status);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:119:	const steps = status.steps ?? [];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:120:	const chainStepCount = status.chainStepCount ?? steps.length;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:121:	const parallelGroups = normalizeParallelGroups(status.parallelGroups, steps.length, chainStepCount);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:123:		id: status.runId || path.basename(asyncDir),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:124:		asyncDir,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:125:		...(status.sessionId ? { sessionId: status.sessionId } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:126:		state: status.state,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:129:		currentTool: status.currentTool,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:130:		currentToolStartedAt: status.currentToolStartedAt,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:131:		currentPath: status.currentPath,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:132:		turnCount: status.turnCount,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:133:		toolCount: status.toolCount,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:134:		mode: status.mode,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:135:		cwd: status.cwd,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:136:		startedAt: status.startedAt,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:137:		lastUpdate: status.lastUpdate,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:138:		endedAt: status.endedAt,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:139:		currentStep: status.currentStep,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:140:		...(status.chainStepCount !== undefined ? { chainStepCount: status.chainStepCount } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:148:				status: step.status,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:167:		...(status.sessionDir ? { sessionDir: status.sessionDir } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:168:		...(status.outputFile ? { outputFile: status.outputFile } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:169:		...(status.totalTokens ? { totalTokens: status.totalTokens } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:170:		...(status.sessionFile ? { sessionFile: status.sessionFile } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:193:export function listAsyncRuns(asyncDirRoot: string, options: AsyncRunListOptions = {}): AsyncRunSummary[] {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:196:		entries = fs.readdirSync(asyncDirRoot).filter((entry) => isAsyncRunDir(asyncDirRoot, entry));
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:199:		throw new Error(`Failed to list async runs in '${asyncDirRoot}': ${getErrorMessage(error)}`, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:207:		const asyncDir = path.join(asyncDirRoot, entry);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:210:			: reconcileAsyncRun(asyncDir, { resultsDir: options.resultsDir, kill: options.kill, now: options.now });
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:211:		const status = (reconciliation?.status ?? readStatus(asyncDir)) as (AsyncStatus & { cwd?: string }) | null;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:212:		if (!status) continue;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:213:		const summary = statusToSummary(asyncDir, status);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:235:	const parts = [`${step.index + 1}. ${step.agent}`, step.status];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:244:export function formatAsyncRunOutputPath(run: Pick<AsyncRunSummary, "asyncDir" | "outputFile">): string | undefined {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:246:	return path.isAbsolute(run.outputFile) ? run.outputFile : path.join(run.asyncDir, run.outputFile);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:272:	const cwd = run.cwd ? shortenPath(run.cwd) : shortenPath(run.asyncDir);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-status.ts:277:export function formatAsyncRunList(runs: AsyncRunSummary[], heading = "Active async runs"): string {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:9:	runId?: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:15:	asyncDirRoot?: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:16:	resultsDir?: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:23:	runId: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:24:	asyncDir?: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:35:	runId?: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:42:	results?: Array<{ agent?: string; success?: boolean; sessionFile?: string; intercomTarget?: string }>;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:46:	asyncDir: string | null;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:47:	resultPath: string | null;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:57:		throw new Error(`Async result file '${source}' must contain a JSON object.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:65:	if (typeof fieldValue !== "string") throw new Error(`Invalid async result file '${source}': ${displayField} must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:69:function validateResultFile(value: unknown, resultPath: string): AsyncResultFile {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:70:	const data = ensureObject(value, resultPath);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:71:	const resultsValue = data.results;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:72:	let results: AsyncResultFile["results"];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:73:	if (resultsValue !== undefined) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:74:		if (!Array.isArray(resultsValue)) throw new Error(`Invalid async result file '${resultPath}': results must be an array.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:75:		results = resultsValue.map((entry, index) => {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:76:			const child = ensureObject(entry, `${resultPath} results[${index}]`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:77:			const agent = validateOptionalString(child, "agent", resultPath, `results[${index}].agent`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:78:			const sessionFile = validateOptionalString(child, "sessionFile", resultPath, `results[${index}].sessionFile`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:79:			const intercomTarget = validateOptionalString(child, "intercomTarget", resultPath, `results[${index}].intercomTarget`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:81:			if (success !== undefined && typeof success !== "boolean") throw new Error(`Invalid async result file '${resultPath}': results[${index}].success must be a boolean.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:86:	if (success !== undefined && typeof success !== "boolean") throw new Error(`Invalid async result file '${resultPath}': success must be a boolean.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:88:		id: validateOptionalString(data, "id", resultPath),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:89:		runId: validateOptionalString(data, "runId", resultPath),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:90:		agent: validateOptionalString(data, "agent", resultPath),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:91:		mode: validateOptionalString(data, "mode", resultPath),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:92:		state: validateOptionalString(data, "state", resultPath),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:93:		cwd: validateOptionalString(data, "cwd", resultPath),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:94:		sessionFile: validateOptionalString(data, "sessionFile", resultPath),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:96:		...(results ? { results } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:100:function readResultFile(resultPath: string): AsyncResultFile {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:103:		raw = fs.readFileSync(resultPath, "utf-8");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:105:		throw new Error(`Failed to read async result file '${resultPath}': ${getErrorMessage(error)}`, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:110:		return validateResultFile(JSON.parse(raw), resultPath);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:113:			throw new Error(`Failed to parse async result file '${resultPath}': ${getErrorMessage(error)}`, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:121:function assertRunId(value: string | undefined, field: "id" | "runId"): string | undefined {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:125:		throw new Error(`${field} must be an async run id or prefix, not a path.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:146:function exactResultPath(resultsDir: string, runId: string): string | null {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:147:	const resultPath = path.join(resultsDir, `${runId}.json`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:148:	assertInsideRoot(resultsDir, resultPath, "Async result file");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:149:	return fs.existsSync(resultPath) ? resultPath : null;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:152:export function resolveAsyncRunLocation(params: AsyncResumeParams, asyncDirRoot: string, resultsDir: string): AsyncRunLocation {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:153:	const asyncRoot = path.resolve(asyncDirRoot);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:154:	const resultRoot = path.resolve(resultsDir);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:155:	const requestedId = assertRunId(params.id, "id") ?? assertRunId(params.runId, "runId");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:157:		const asyncDir = path.resolve(params.dir);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:158:		assertInsideRoot(asyncRoot, asyncDir, "Async run directory");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:159:		const resolvedId = requestedId ?? path.basename(asyncDir);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:160:		if (requestedId && requestedId !== path.basename(asyncDir)) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:161:			throw new Error(`Async run id '${requestedId}' does not match directory '${path.basename(asyncDir)}'.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:163:		return { asyncDir, resultPath: exactResultPath(resultRoot, resolvedId), resolvedId };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:165:	if (!requestedId) return { asyncDir: null, resultPath: null };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:167:	const directAsyncDir = path.join(asyncRoot, requestedId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:168:	assertInsideRoot(asyncRoot, directAsyncDir, "Async run directory");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:169:	const directResultPath = exactResultPath(resultRoot, requestedId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:172:			asyncDir: fs.existsSync(directAsyncDir) ? directAsyncDir : null,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:173:			resultPath: directResultPath,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:179:		...prefixedRunIds(asyncRoot, requestedId),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:180:		...prefixedRunIds(resultRoot, requestedId, ".json"),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:182:	if (matchingIds.length === 0) return { asyncDir: null, resultPath: null, resolvedId: requestedId };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:184:		throw new Error(`Ambiguous async run id prefix '${requestedId}' matched: ${matchingIds.join(", ")}. Provide a longer id.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:187:	const asyncDir = path.join(asyncRoot, resolvedId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:188:	assertInsideRoot(asyncRoot, asyncDir, "Async run directory");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:190:		asyncDir: fs.existsSync(asyncDir) ? asyncDir : null,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:191:		resultPath: exactResultPath(resultRoot, resolvedId),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:196:function resultState(result: AsyncResultFile): AsyncStatus["state"] {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:197:	if (result.state === "complete" || result.state === "failed" || result.state === "paused" || result.state === "running" || result.state === "queued") {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:198:		return result.state;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:200:	return result.success ? "complete" : "failed";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:203:function validateStatusForResume(status: AsyncStatus | null, source: string): void {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:204:	if (!status) return;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:205:	if (typeof status.runId !== "string") throw new Error(`Invalid async status '${source}': runId must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:206:	if (status.sessionId !== undefined && typeof status.sessionId !== "string") throw new Error(`Invalid async status '${source}': sessionId must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:207:	if (status.cwd !== undefined && typeof status.cwd !== "string") throw new Error(`Invalid async status '${source}': cwd must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:208:	if (status.sessionFile !== undefined && typeof status.sessionFile !== "string") throw new Error(`Invalid async status '${source}': sessionFile must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:209:	if (status.steps !== undefined) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:210:		if (!Array.isArray(status.steps)) throw new Error(`Invalid async status '${source}': steps must be an array.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:211:		status.steps.forEach((step, index) => {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:212:			if (!step || typeof step !== "object" || Array.isArray(step)) throw new Error(`Invalid async status '${source}': steps[${index}] must be an object.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:213:			if (typeof step.agent !== "string") throw new Error(`Invalid async status '${source}': steps[${index}].agent must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:214:			if (step.sessionFile !== undefined && typeof step.sessionFile !== "string") throw new Error(`Invalid async status '${source}': steps[${index}].sessionFile must be a string.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:219:function validateResumeSessionFile(runId: string, sessionFile: string): string {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:220:	if (path.extname(sessionFile) !== ".jsonl") throw new Error(`Async run '${runId}' session file must be a .jsonl file: ${sessionFile}`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:222:	if (!fs.existsSync(resolved)) throw new Error(`Async run '${runId}' session file does not exist: ${sessionFile}`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:227:	const asyncDirRoot = deps.asyncDirRoot ?? ASYNC_DIR;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:228:	const resultsDir = deps.resultsDir ?? RESULTS_DIR;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:229:	const location = resolveAsyncRunLocation(params, asyncDirRoot, resultsDir);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:230:	if (!location.asyncDir && !location.resultPath) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:234:	const reconciliation = location.asyncDir
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:235:		? reconcileAsyncRun(location.asyncDir, { resultsDir, kill: deps.kill, now: deps.now })
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:237:	const status = reconciliation?.status ?? null;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:238:	validateStatusForResume(status, location.asyncDir ? path.join(location.asyncDir, "status.json") : "status.json");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:239:	const result = location.resultPath ? readResultFile(location.resultPath) : undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:240:	const runId = status?.runId ?? result?.runId ?? result?.id ?? location.resolvedId ?? (location.asyncDir ? path.basename(location.asyncDir) : "unknown");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:241:	const state = status?.state ?? (result ? resultState(result) : undefined);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:242:	if (!state) throw new Error(`Status file not found for async run '${runId}'.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:244:	const statusSteps = status?.steps ?? [];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:245:	const resultSteps = result?.results ?? [];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:246:	const stepCount = statusSteps.length || resultSteps.length || (result?.agent ? 1 : 0);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:248:	if (requestedIndex !== undefined && !Number.isInteger(requestedIndex)) throw new Error(`Async run '${runId}' index must be an integer.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:253:			if (requestedIndex < 0 || requestedIndex >= stepCount) throw new Error(`Async run '${runId}' has ${stepCount} children. Index ${requestedIndex} is out of range.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:254:			const selectedStep = statusSteps[requestedIndex];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:255:			if (selectedStep?.status === "running") {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:258:					runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:259:					asyncDir: location.asyncDir ?? undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:263:					intercomTarget: resolveSubagentIntercomTarget(runId, selectedStep.agent, requestedIndex),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:264:					cwd: status?.cwd ?? result?.cwd,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:265:					sessionFile: selectedStep.sessionFile ?? status?.sessionFile ?? result?.sessionFile,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:268:			if (selectedStep?.status === "pending") throw new Error(`Async run '${runId}' child ${requestedIndex} is pending and has not started yet. Wait for it to run or complete before resuming.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:269:			if (selectedStep && !terminalStepStatuses.has(selectedStep.status)) throw new Error(`Async run '${runId}' child ${requestedIndex} is ${selectedStep.status} and cannot be revived yet.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:271:			const running = statusSteps
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:273:				.filter(({ step }) => step.status === "running");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:276:				throw new Error(`Async run '${runId}' has ${running.length} running children. Provide index to choose one.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:280:				runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:281:				asyncDir: location.asyncDir ?? undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:285:				intercomTarget: resolveSubagentIntercomTarget(runId, selected.step.agent, selected.index),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:286:				cwd: status?.cwd ?? result?.cwd,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:287:				sessionFile: selected.step.sessionFile ?? status?.sessionFile ?? result?.sessionFile,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:293:		throw new Error(`Async run '${runId}' has ${stepCount} children. Provide index to choose one.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:296:	if (!Number.isInteger(index)) throw new Error(`Async run '${runId}' index must be an integer.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:297:	if (index < 0 || index >= stepCount) throw new Error(`Async run '${runId}' has ${stepCount} children. Index ${index} is out of range.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:298:	const agent = statusSteps[index]?.agent ?? resultSteps[index]?.agent ?? result?.agent;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:299:	if (!agent) throw new Error(`Could not determine child agent for async run '${runId}'.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:300:	const sessionFile = statusSteps[index]?.sessionFile
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:301:		?? resultSteps[index]?.sessionFile
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:302:		?? (stepCount === 1 ? status?.sessionFile ?? result?.sessionFile : undefined);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:303:	if (!sessionFile) throw new Error(`Async run '${runId}' child ${index} does not have a persisted session file to resume from.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:304:	const resolvedSessionFile = validateResumeSessionFile(runId, sessionFile);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:308:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:309:		asyncDir: location.asyncDir ?? undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:313:		intercomTarget: resolveSubagentIntercomTarget(runId, agent, index),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:314:		cwd: status?.cwd ?? result?.cwd,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/background/async-resume.ts:323:		`Original run: ${target.runId}`,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:33:import { executeAsyncChain, executeAsyncSingle, formatAsyncStartedMessage, isAsyncAvailable } from "../background/async-execution.ts";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:47:} from "../../intercom/result-intercom.ts";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:48:import { buildRevivedAsyncTask, resolveAsyncResumeTarget } from "../background/async-resume.ts";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:49:import { inspectSubagentStatus } from "../background/run-status.ts";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:50:import { applyForceTopLevelAsyncOverride } from "../background/top-level-async.ts";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:104:	runId?: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:115:	async?: boolean;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:136:	asyncByDefault: boolean;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:150:	runId: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:167:function getForegroundControl(state: SubagentState, runId: string | undefined) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:168:	if (runId) return state.foregroundControls.get(runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:202:		`Run: ${control.runId}`,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:208:	return { content: [{ type: "text", text: lines.join("\n") }], details: { mode: "management", results: [] } };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:211:function rememberForegroundRun(state: SubagentState, input: { runId: string; mode: "single" | "parallel" | "chain"; cwd: string; results: SingleResult[] }): void {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:213:	state.foregroundRuns.set(input.runId, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:214:		runId: input.runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:218:		children: input.results.map((result, index) => ({
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:219:			agent: result.agent,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:221:			status: resolveSubagentResultStatus({ exitCode: result.exitCode, interrupted: result.interrupted, detached: result.detached }),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:222:			...(result.sessionFile ? { sessionFile: result.sessionFile } : {}),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:228:		state.foregroundRuns.delete(oldest.runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:232:function resolveForegroundResumeTarget(params: SubagentParamsLike, state: SubagentState): { runId: string; mode: "single" | "parallel" | "chain"; state: "complete"; agent: string; index: number; intercomTarget: string; cwd: string; sessionFile: string } | undefined {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:233:	const requested = (params.id ?? params.runId)?.trim();
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:236:	const matches = direct ? [direct] : [...state.foregroundRuns.values()].filter((run) => run.runId.startsWith(requested));
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:238:	if (matches.length > 1) throw new Error(`Ambiguous foreground run id prefix '${requested}' matched: ${matches.map((run) => run.runId).join(", ")}. Provide a longer id.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:240:	if (run.children.length > 1 && params.index === undefined) throw new Error(`Foreground run '${run.runId}' has ${run.children.length} children. Provide index to choose one.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:242:	if (!Number.isInteger(index)) throw new Error(`Foreground run '${run.runId}' index must be an integer.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:243:	if (index < 0 || index >= run.children.length) throw new Error(`Foreground run '${run.runId}' has ${run.children.length} children. Index ${index} is out of range.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:245:	if (child.status === "detached") throw new Error(`Foreground run '${run.runId}' child ${index} is detached for intercom coordination and cannot be revived safely from the remembered foreground state. Reply to the supervisor request first; after the child exits, start a fresh follow-up if needed.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:246:	if (!child.sessionFile) throw new Error(`Foreground run '${run.runId}' child ${index} does not have a persisted session file to resume from.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:247:	if (path.extname(child.sessionFile) !== ".jsonl") throw new Error(`Foreground run '${run.runId}' child ${index} session file must be a .jsonl file: ${child.sessionFile}`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:249:	if (!fs.existsSync(sessionFile)) throw new Error(`Foreground run '${run.runId}' child ${index} session file does not exist: ${child.sessionFile}`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:250:	return { runId: run.runId, mode: run.mode, state: "complete", agent: child.agent, index, intercomTarget: resolveSubagentIntercomTarget(run.runId, child.agent, index), cwd: run.cwd, sessionFile };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:253:type AsyncResumeSourceTarget = ReturnType<typeof resolveAsyncResumeTarget> & { source: "async" };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:265:function resumeTargetExact(target: { runId: string } | undefined, requested: string): boolean {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:266:	return target?.runId === requested;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:273:function isExactResumeError(error: unknown, source: "async" | "foreground", requested: string): boolean {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:279:	const requested = (params.id ?? params.runId)?.trim() ?? "";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:282:	let asyncTarget: AsyncResumeSourceTarget | undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:283:	let asyncError: unknown;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:292:		asyncTarget = { source: "async", ...resolveAsyncResumeTarget(params) };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:294:		asyncError = error;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:297:	if (foregroundTarget && asyncTarget) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:298:		const foregroundExact = resumeTargetExact(foregroundTarget, requested);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:299:		const asyncExact = resumeTargetExact(asyncTarget, requested);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:300:		if (foregroundExact && !asyncExact) return foregroundTarget;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:301:		if (asyncExact && !foregroundExact) return asyncTarget;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:302:		throw new Error(`Resume id '${requested}' is ambiguous between foreground run '${foregroundTarget.runId}' and async run '${asyncTarget.runId}'. Provide a full run id.`);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:305:		if (isExactResumeError(asyncError, "async", requested)) throw asyncError;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:306:		if (isResumeAmbiguity(asyncError) && !resumeTargetExact(foregroundTarget, requested)) throw asyncError;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:309:	if (asyncTarget) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:311:		if (isResumeAmbiguity(foregroundError) && !resumeTargetExact(asyncTarget, requested)) throw foregroundError;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:312:		return asyncTarget;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:314:	if (foregroundError && !isAsyncRunNotFound(asyncError)) throw foregroundError;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:316:	if (asyncError) throw asyncError;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:317:	throw new Error("Run not found. Provide id or runId.");
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:320:function getAsyncInterruptTarget(state: SubagentState, runId: string | undefined): { asyncId: string; asyncDir: string } | undefined {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:321:	if (runId) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:322:		const direct = state.asyncJobs.get(runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:323:		if (direct) return { asyncId: direct.asyncId, asyncDir: direct.asyncDir };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:325:	let newest: { asyncId: string; asyncDir: string; updatedAt: number } | undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:326:	for (const job of state.asyncJobs.values()) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:327:		if (job.status !== "running") continue;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:329:			newest = { asyncId: job.asyncId, asyncDir: job.asyncDir, updatedAt: job.updatedAt ?? 0 };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:332:	return newest ? { asyncId: newest.asyncId, asyncDir: newest.asyncDir } : undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:343:		? resolveSubagentIntercomTarget(input.event.runId, input.event.agent, input.event.index)
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:363:function interruptAsyncRun(state: SubagentState, runId: string | undefined): AgentToolResult<Details> | null {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:364:	const target = getAsyncInterruptTarget(state, runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:366:	const status = readStatus(target.asyncDir);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:367:	if (!status || status.state !== "running" || typeof status.pid !== "number") {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:369:			content: [{ type: "text", text: `No running async run with an interrupt-capable pid was found for '${runId ?? "current"}'.` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:371:			details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:375:		process.kill(status.pid, ASYNC_INTERRUPT_SIGNAL);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:376:		const tracked = state.asyncJobs.get(target.asyncId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:382:			content: [{ type: "text", text: `Interrupt requested for async run ${target.asyncId}.` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:383:			details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:388:			content: [{ type: "text", text: `Failed to interrupt async run ${target.asyncId}: ${message}` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:390:			details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:395:async function resumeAsyncRun(input: {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:404:			content: [{ type: "text", text: "action='resume' requires message." }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:406:			details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:415:		return { content: [{ type: "text", text: message }], isError: true, details: { mode: "management", results: [] } };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:422:			`Follow-up for async run ${target.runId} (${target.agent}):\n\n${followUp}`,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:424:			{ source: "async-resume", runId: target.runId, agent: target.agent, index: target.index },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:428:				content: [{ type: "text", text: [`Delivered follow-up to live async child.`, `Run: ${target.runId}`, `Intercom target: ${target.intercomTarget}`].join("\n") }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:429:				details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:433:			content: [{ type: "text", text: [`Async child appears live but its intercom target is not registered.`, `Run: ${target.runId}`, `Intercom target: ${target.intercomTarget}`, `Wait for completion, then retry action='resume'.`].join("\n") }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:435:			details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:442:			content: [{ type: "text", text: `Nested subagent resume blocked (depth=${depth}, max=${maxDepth}). Complete the follow-up directly instead.` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:444:			details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:466:			content: [{ type: "text", text: `Unknown agent for resume: ${target.agent}` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:468:			details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:472:	const runId = randomUUID().slice(0, 8);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:475:	const result = executeAsyncSingle(runId, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:497:		childIntercomTarget: intercomBridge.active ? (agent, index) => resolveSubagentIntercomTarget(runId, agent, index) : undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:500:	if (result.isError) return result;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:502:	const revivedId = result.details.asyncId ?? runId;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:504:	const sourceLabel = target.source === "foreground" ? "foreground" : "async";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:506:		`Revived ${sourceLabel} subagent from ${target.runId}.`,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:510:		result.details.asyncDir ? `Async dir: ${result.details.asyncDir}` : undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:512:		`Status if needed: subagent({ action: "status", id: "${revivedId}" })`,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:514:	return { content: [{ type: "text", text: formatAsyncStartedMessage(lines.join("\n")) }], details: result.details };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:517:function resultSummaryForIntercom(result: SingleResult): string {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:518:	const output = getSingleResultOutput(result);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:519:	if (result.exitCode !== 0 && result.error) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:520:		return output ? `${result.error}\n\nOutput:\n${output}` : result.error;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:522:	return output || result.error || "(no output)";
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:534:async function emitForegroundResultIntercom(input: {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:537:	runId: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:539:	results: SingleResult[];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:543:	const children = input.results.flatMap((result, index) => result.detached ? [] : [{
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:544:		agent: result.agent,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:545:		status: resolveSubagentResultStatus({
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:546:			exitCode: result.exitCode,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:547:			interrupted: result.interrupted,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:548:			detached: result.detached,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:550:		summary: resultSummaryForIntercom(result),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:552:		artifactPath: result.artifactPaths?.outputPath,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:553:		sessionPath: result.sessionFile,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:554:		intercomTarget: resolveSubagentIntercomTarget(input.runId, result.agent, index),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:559:		runId: input.runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:570:async function maybeBuildForegroundIntercomReceipt(input: {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:573:	runId: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:580:		runId: input.runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:582:		results: input.details.results,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:587:		text: formatSubagentResultReceipt({ mode: input.mode, runId: input.runId, payload }),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:609:			details: { mode: "single" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:617:			details: { mode: "single" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:628:					details: { mode: "parallel" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:639:				details: { mode: "chain" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:649:					details: { mode: "chain" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:656:				details: { mode: "chain" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:667:						details: { mode: "chain" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:675:					details: { mode: "chain" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:708:			details: { mode: getRequestedModeLabel(params), results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:774:	result: AgentToolResult<Details>,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:777:	if (context !== "fork" || !result.details) return result;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:779:		...result,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:781:			...result.details,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:793:			details: { mode: getRequestedModeLabel(params), results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:865:				details: { mode: "chain" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:885:			details: { mode: "single" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:889:	const asyncCtx = {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:924:			resultMode: "parallel",
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:926:			ctx: asyncCtx,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:953:			ctx: asyncCtx,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:978:				details: { mode: "single" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:992:			ctx: asyncCtx,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1017:async function runChainPath(data: ExecutionContextData, deps: ExecutorDeps): Promise<AgentToolResult<Details>> {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1024:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1036:	const foregroundControl = deps.state.foregroundControls.get(runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1048:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1060:		childIntercomTarget: childIntercomTarget ? (agent, index) => childIntercomTarget(runId, agent, index) : undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1075:				details: { mode: "chain" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1079:		const asyncCtx = {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1085:		const asyncChain = wrapChainTasksForFork(chainResult.requestedAsync.chain, params.context);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1087:			chain: asyncChain,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1090:			ctx: asyncCtx,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1099:			sessionFilesByFlatIndex: collectChainSessionFiles(asyncChain, sessionFileForIndex),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1109:	const chainDetails = chainResult.details ? compactForegroundDetails({ ...chainResult.details, runId }) : undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1110:	if (chainDetails) rememberForegroundRun(deps.state, { runId, mode: "chain", cwd: effectiveCwd, results: chainDetails.results });
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1111:	const intercomReceipt = chainDetails && !chainDetails.results.some((result) => result.interrupted || result.detached)
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1115:			runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1138:	runId: string;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1167:		details: { mode: "parallel" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1174:	runId: string,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1182:			setup: createWorktrees(cwd, runId, tasks.length, {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1262:async function runForegroundParallelTasks(input: ForegroundParallelRunInput): Promise<SingleResult[]> {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1263:	return mapConcurrent(input.tasks, input.concurrencyLimit, async (task, index) => {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1278:		const interruptController = new AbortController();
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1284:			input.foregroundControl.interrupt = () => {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1285:				if (interruptController.signal.aborted) return false;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1286:				interruptController.abort();
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1296:			interruptSignal: interruptController.signal,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1299:			runId: input.runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1320:						const stepResults = progressUpdate.details?.results || [];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1338:						const mergedResults = input.liveResults.filter((result): result is SingleResult => result !== undefined);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1344:								results: mergedResults,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1354:				input.foregroundControl.interrupt = undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1361:async function runParallelPath(data: ExecutionContextData, deps: ExecutorDeps): Promise<AgentToolResult<Details>> {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1368:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1391:			details: { mode: "parallel" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1401:				details: { mode: "parallel" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1441:		const result = await ctx.ui.custom<ChainClarifyResult>(
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1459:		if (!result || !result.confirmed) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1460:			return { content: [{ type: "text", text: "Cancelled" }], details: { mode: "parallel", results: [] } };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1463:		taskTexts = result.templates;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1464:		for (let i = 0; i < result.behaviorOverrides.length; i++) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1465:			const override = result.behaviorOverrides[i];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1479:		if (result.runInBackground) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1484:					details: { mode: "parallel" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1488:			const asyncCtx = {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1511:				resultMode: "parallel",
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1513:				ctx: asyncCtx,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1537:	const foregroundControl = deps.state.foregroundControls.get(runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1541:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1573:		const results = await runForegroundParallelTasks({
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1580:			runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1594:			childIntercomTarget: childIntercomTarget ? (agent, index) => childIntercomTarget(runId, agent, index) : undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1604:		for (let i = 0; i < results.length; i++) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1605:			const run = results[i]!;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1609:		for (const result of results) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1610:			if (result.progress) allProgress.push(result.progress);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1611:			if (result.artifactPaths) allArtifactPaths.push(result.artifactPaths);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1614:		const interrupted = results.find((result) => result.interrupted);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1617:			runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1618:			results,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1622:		rememberForegroundRun(deps.state, { runId, mode: "parallel", cwd: effectiveCwd, results: details.results });
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1623:		if (interrupted) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1625:				content: [{ type: "text", text: `Parallel run paused after interrupt (${interrupted.agent}). Waiting for explicit next action.` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1629:		const detachedIndex = results.findIndex((result) => result.detached);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1630:		const detached = detachedIndex >= 0 ? results[detachedIndex] : undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1641:			runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1653:		const ok = results.filter((result) => result.exitCode === 0).length;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1656:			results.map((result) => ({
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1657:				agent: result.agent,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1658:				output: result.truncation?.text || getSingleResultOutput(result),
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1659:				exitCode: result.exitCode,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1660:				error: result.error,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1665:		const summary = `${ok}/${results.length} succeeded${downgradeNote}`;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1679:async function runSinglePath(data: ExecutionContextData, deps: ExecutorDeps): Promise<AgentToolResult<Details>> {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1686:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1697:	const childIntercomTarget = data.intercomBridge.active ? resolveSubagentIntercomTarget(runId, params.agent!, 0) : undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1705:			details: { mode: "single", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1728:		const result = await ctx.ui.custom<ChainClarifyResult>(
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1746:		if (!result || !result.confirmed) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1747:			return { content: [{ type: "text", text: "Cancelled" }], details: { mode: "single", results: [] } };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1750:		task = result.templates[0]!;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1751:		const override = result.behaviorOverrides[0];
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1756:		if (result.runInBackground) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1761:					details: { mode: "single" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1765:			const asyncCtx = {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1775:				ctx: asyncCtx,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1805:		return { content: [{ type: "text", text: validationError }], isError: true, details: { mode: "single", results: [] } };
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1815:	const interruptController = new AbortController();
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1816:	const foregroundControl = deps.state.foregroundControls.get(runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1822:		foregroundControl.interrupt = () => {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1823:			if (interruptController.signal.aborted) return false;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1824:			interruptController.abort();
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1854:		interruptSignal: interruptController.signal,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1857:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1879:		foregroundControl.interrupt = undefined;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1908:		runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1909:		results: [r],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1914:	rememberForegroundRun(deps.state, { runId, mode: "single", cwd: effectiveCwd, results: details.results });
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1916:	if (!r.detached && !r.interrupted) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1920:			runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1940:	if (r.interrupted) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1942:			content: [{ type: "text", text: `Run paused after interrupt (${params.agent}). Waiting for explicit next action.` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:1968:	const execute = async (
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2012:					details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2015:			if (params.action === "status") {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2016:				const foreground = getForegroundControl(deps.state, paramsWithResolvedCwd.id ?? paramsWithResolvedCwd.runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2020:			if (params.action === "resume") {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2021:				return resumeAsyncRun({ params: paramsWithResolvedCwd, requestCwd, ctx, deps });
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2023:			if (params.action === "interrupt") {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2024:				const targetRunId = paramsWithResolvedCwd.runId ?? paramsWithResolvedCwd.id;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2026:				if (foreground?.interrupt) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2027:					const interrupted = foreground.interrupt();
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2028:					if (interrupted) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2032:							content: [{ type: "text", text: `Interrupt requested for foreground run ${foreground.runId}.` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2033:							details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2037:						content: [{ type: "text", text: `Foreground run ${foreground.runId} has no active child step to interrupt.` }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2039:						details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2042:				const asyncInterruptResult = interruptAsyncRun(deps.state, targetRunId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2043:				if (asyncInterruptResult) return asyncInterruptResult;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2045:					content: [{ type: "text", text: "No interrupt-capable run found in this session." }],
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2047:					details: { mode: "management", results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2054:					details: { mode: "management" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2073:				details: { mode: "single" as const, results: [] },
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2103:		const runId = randomUUID().slice(0, 8);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2129:		const requestedAsync = effectiveParams.async ?? deps.asyncByDefault;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2148:			sessionRoot = path.join(baseSessionRoot, runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2175:			runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2192:				runId,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2199:				interrupt: undefined,
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2202:			deps.state.foregroundControls.set(runId, foregroundControl);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2203:			deps.state.lastForegroundControlId = runId;
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2207:			const asyncResult = runAsyncPath(execData, deps);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2208:			if (asyncResult) return withForkContext(asyncResult, effectiveParams.context);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2216:				clearPendingForegroundControlNotices(deps.state, runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2217:				deps.state.foregroundControls.delete(runId);
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2218:				if (deps.state.lastForegroundControlId === runId) {
/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/src/runs/foreground/subagent-executor.ts:2227:			details: { mode: "single" as const, results: [] },
# exit=0
```

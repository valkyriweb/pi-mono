# Claude Code CLI native Agent/Task model — discovery report

Scope: read-only discovery against `/Users/luke/Projects/testing/claude-code-cli-src-code` plus local `~/.claude` config and safe CLI help/version probes. No network, no interactive/quota-burning Claude invocation.

## Executive summary

Claude Code's parent-facing delegation primitive is the `AgentTool` (aliased from legacy `Task` naming in permission rules/config). It exposes a schema with `description`, `prompt`, optional `subagent_type`, optional model alias, background execution, and gated team/isolation fields. The parent model invokes it as a normal tool call; synchronous agents return their final assistant text as a `tool_result`, while background agents immediately return `async_launched` and later inject a task notification user message. The child normally starts with a fresh prompt and its own agent-specific system prompt; only the experimental fork path inherits the parent's full conversation and system/tool prefix for prompt-cache reuse. Tool access is controlled per agent by allowlists/denylists plus global subagent disallow lists, and actual permission mode is overridden per worker.

Pi should copy the clean agent registry + per-agent tool allowlists + structured async notification shape; adapt progress UI and backgrounding; avoid Claude's feature-flagged swarm/fork complexity until Pi has the simpler flow solid.

## 1. Task/Agent tool

### Naming and parent prompt

- Tool implementation is `AgentTool` with `name: AGENT_TOOL_NAME`, alias `LEGACY_AGENT_TOOL_NAME`, search hint `delegate work to a subagent`, and description `Launch a new agent` (`src/tools/AgentTool/AgentTool.tsx:196-231`).
- README describes `AgentTool` as `Sub-agent spawning` and says sub-agents are spawned via `AgentTool`, with coordinator/team tooling for multi-agent orchestration (`README.md:136`, `README.md:284`).
- The tool prompt tells the model: specialized agents are subprocesses, select with `subagent_type`, default to `general-purpose` when omitted (unless fork gate), each invocation starts fresh, use a single assistant message with multiple Agent tool calls for parallelism, and result is invisible to user until parent summarizes it (`src/tools/AgentTool/prompt.ts:218-265`, `src/tools/AgentTool/prompt.ts:269-285`).
- Local settings still contain permission syntax using legacy `Task(...)`, e.g. `Task(Bash(php artisan test:*))`, confirming user-facing/config lineage (`~/.claude/settings.json:41-43`).

### Input schema

Evidence: `baseInputSchema` and `fullInputSchema` in `AgentTool.tsx`:

- `description: string` — `A short (3-5 word) description of the task` (`src/tools/AgentTool/AgentTool.tsx:82-84`).
- `prompt: string` — `The task for the agent to perform` (`src/tools/AgentTool/AgentTool.tsx:82-85`).
- `subagent_type?: string` — `The type of specialized agent to use for this task` (`src/tools/AgentTool/AgentTool.tsx:82-86`).
- `model?: 'sonnet' | 'opus' | 'haiku'` — override, precedence over agent definition, otherwise definition or parent inheritance (`src/tools/AgentTool/AgentTool.tsx:82-87`).
- `run_in_background?: boolean` — run in background and notify on completion (`src/tools/AgentTool/AgentTool.tsx:82-87`).
- Gated team fields: `name`, `team_name`, `mode` (`src/tools/AgentTool/AgentTool.tsx:91-99`).
- Isolation/cwd fields: `isolation?: 'worktree'` (external build; ant has remote too) and gated `cwd` (`src/tools/AgentTool/AgentTool.tsx:98-99`, `src/tools/AgentTool/AgentTool.tsx:115-123`).

### Output schema and return-to-parent behavior

- Output schema is a union of sync completed result and async launch result (`src/tools/AgentTool/AgentTool.tsx:141-154`).
- Sync result extends `agentToolResultSchema` with `status: 'completed'` and `prompt` (`src/tools/AgentTool/AgentTool.tsx:141-145`; result schema includes `agentId`, `agentType`, `content`, tool count, duration, tokens, usage at `src/tools/AgentTool/agentToolUtils.ts:229-259`).
- Async result is `status: 'async_launched'`, `agentId`, `description`, `prompt`, `outputFile`, optional `canReadOutputFile` (`src/tools/AgentTool/AgentTool.tsx:146-154`).
- Sync completion is mapped to the parent as a `tool_result`: final content plus (except one-shot built-ins) `agentId`, SendMessage hint, optional worktree info, and `<usage>` trailer (`src/tools/AgentTool/AgentTool.tsx:1340-1374`).
- Background launch maps to `tool_result` text saying the agent is working in the background, will notify automatically, includes output file if readable, and instructs parent not to duplicate work/poll (`src/tools/AgentTool/AgentTool.tsx:1327-1338`).
- Background completion enqueues a `<task-notification>` user-role message with task id, output path, status, summary, optional result and usage (`src/tasks/LocalAgentTask/LocalAgentTask.tsx:211-260`).

### Streaming/progress behavior

- `AgentTool` progress type forwards both `agent_progress` and shell progress from child agents (`src/tools/AgentTool/AgentTool.tsx:192-195`).
- Sync child emits an initial progress message containing the normalized prompt metadata (`src/tools/AgentTool/AgentTool.tsx:795-804`).
- During sync iteration it forwards child `bash_progress`/`powershell_progress` directly to the parent SDK/progress channel (`src/tools/AgentTool/AgentTool.tsx:1084-1089`).
- It also forwards normalized child `tool_use` and `tool_result` blocks as `agent_progress` (`src/tools/AgentTool/AgentTool.tsx:1110-1121`).
- Background tasks track tool count/tokens/recent activities with `ProgressTracker` and update app state/SDK events (`src/tasks/LocalAgentTask/LocalAgentTask.tsx:41-103`, `src/tools/AgentTool/AgentTool.tsx:943-949`).

### Permission model

- The Agent tool itself is read-only: `isReadOnly() { return true; // delegates permission checks to its underlying tools }` (`src/tools/AgentTool/AgentTool.tsx:1264-1266`).
- Agent tool permission check normally auto-allows the spawn; in ant+auto mode it routes through classifier passthrough (`src/tools/AgentTool/AgentTool.tsx:1273-1295`).
- Worker permission context is built from the current app permission context but mode is forced to `selectedAgent.permissionMode ?? 'acceptEdits'`, then `assembleToolPool` builds the worker's tools independently of parent restrictions (`src/tools/AgentTool/AgentTool.tsx:569-577`).
- Inside `runAgent`, agent definition `permissionMode` can override state except when parent is bypass/acceptEdits/auto; async agents set `shouldAvoidPermissionPrompts` unless bubble/interactive, and async+prompt-capable agents await automated checks before showing UI (`src/tools/AgentTool/runAgent.ts:415-459`).
- If `allowedTools` is passed, session allow rules are replaced with those tools while preserving CLI `--allowedTools` rules (`src/tools/AgentTool/runAgent.ts:465-477`).

## 2. Built-in/base agents discovered

Built-ins are returned by `getBuiltInAgents()`: always `general-purpose` and `statusline-setup`; `Explore`/`Plan` only when `BUILTIN_EXPLORE_PLAN_AGENTS` feature/gate enables them; `claude-code-guide` for non-SDK entrypoints; `verification` only under feature+GrowthBook gate (`src/tools/AgentTool/builtInAgents.ts:22-69`). CLI `--agent` selects a main-thread agent, and `--agents <json>` defines custom agents (`src/main.tsx:1000`, `src/main.tsx:2033-2051`, `src/main.tsx:2054-2060`). `claude --help` also prints `--agent <agent>` and `--agents <json>`.

### general-purpose

- Trigger/description: `General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks...` (`src/tools/AgentTool/built-in/generalPurposeAgent.ts:25-29`).
- Tools: `['*']` (`src/tools/AgentTool/built-in/generalPurposeAgent.ts:29`).
- Model: intentionally omitted, uses default subagent model (`src/tools/AgentTool/built-in/generalPurposeAgent.ts:31`).
- Context: normal fresh child prompt; no `omitClaudeMd`, so it receives normal user/system context (`src/tools/AgentTool/runAgent.ts:370-391`, `src/tools/AgentTool/runAgent.ts:748-754`).
- Output format: prompt says return concise report; sync tool result returns content to parent only (`src/tools/AgentTool/built-in/generalPurposeAgent.ts:20-22`, `src/tools/AgentTool/AgentTool.tsx:1340-1374`).
- System prompt (verbatim from source):

```text
You are an agent for Claude Code, Anthropic's official CLI for Claude. Given the user's message, you should use the tools available to complete the task. Complete the task fully—don't gold-plate, but don't leave it half-done. When you complete the task, respond with a concise report covering what was done and any key findings — the caller will relay this to the user, so it only needs the essentials.

Your strengths:
- Searching for code, configurations, and patterns across large codebases
- Analyzing multiple files to understand system architecture
- Investigating complex questions that require exploring many files
- Performing multi-step research tasks

Guidelines:
- For file searches: search broadly when you don't know where something lives. Use Read when you know the specific file path.
- For analysis: Start broad and narrow down. Use multiple search strategies if the first doesn't yield results.
- Be thorough: Check multiple locations, consider different naming conventions, look for related files.
- NEVER create files unless they're absolutely necessary for achieving your goal. ALWAYS prefer editing an existing file to creating a new one.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested.
```

### Explore

- Trigger/description: fast codebase exploration/search, with caller-specified thoroughness `quick|medium|very thorough` (`src/tools/AgentTool/built-in/exploreAgent.ts:59-66`).
- Tools: no explicit `tools`, so all available after global filters, but `disallowedTools` removes Agent, ExitPlanMode, Edit, Write, NotebookEdit (`src/tools/AgentTool/built-in/exploreAgent.ts:64-77`). Prompt says it only has read/search/bash-read operations (`src/tools/AgentTool/built-in/exploreAgent.ts:26-53`).
- Model: `inherit` for ant users, otherwise `haiku` (`src/tools/AgentTool/built-in/exploreAgent.ts:78`).
- Context: `omitClaudeMd: true`, and `runAgent` omits CLAUDE.md for agents with that flag under `tengu_slim_subagent_claudemd`; Explore/Plan also omit stale git status (`src/tools/AgentTool/built-in/exploreAgent.ts:81`, `src/tools/AgentTool/runAgent.ts:391-413`).
- Output format: final report directly as regular message; no file creation (`src/tools/AgentTool/built-in/exploreAgent.ts:49-57`). One-shot built-in result omits agentId/usage trailer (`src/tools/AgentTool/AgentTool.tsx:1351-1364`).
- System prompt: source constructs search-tool names dynamically; core verbatim body at `src/tools/AgentTool/built-in/exploreAgent.ts:20-57` says read-only, no creation/modification/deletion/move/copy/tmp/redirection, use Glob/Grep/Read/Bash read-only, spawn parallel search/read calls where possible, and report findings clearly.

### Plan

- Trigger/description: software architect planning agent for implementation strategy, step-by-step plans, critical files, tradeoffs (`src/tools/AgentTool/built-in/planAgent.ts:73-76`).
- Tools: inherits Explore's tools (`tools: EXPLORE_AGENT.tools`, which is undefined) but has the same disallowed Agent/Edit/Write/NotebookEdit set (`src/tools/AgentTool/built-in/planAgent.ts:77-85`).
- Model: `inherit` (`src/tools/AgentTool/built-in/planAgent.ts:87`).
- Context: `omitClaudeMd: true`; comments explain Plan can read CLAUDE.md directly if needed and omitting saves tokens (`src/tools/AgentTool/built-in/planAgent.ts:88-90`; enforcement at `src/tools/AgentTool/runAgent.ts:391-413`).
- Output format: must end with `### Critical Files for Implementation` and list 3-5 files (`src/tools/AgentTool/built-in/planAgent.ts:60-68`).
- System prompt: verbatim body at `src/tools/AgentTool/built-in/planAgent.ts:19-69` defines a read-only software architect/planning role, forbids any file modifications/deletions/tmp writes/redirection/system-state changes, requires understanding requirements, thorough exploration, design solution, detailed plan, and final critical files list.

### statusline-setup

- Trigger/description: configure the user's Claude Code status line setting (`src/tools/AgentTool/built-in/statuslineSetup.ts:134-137`).
- Tools: `['Read', 'Edit']` (`src/tools/AgentTool/built-in/statuslineSetup.ts:138`).
- Model: `sonnet`; color `orange` (`src/tools/AgentTool/built-in/statuslineSetup.ts:141-142`).
- Context: normal fresh child prompt; no `omitClaudeMd` (`src/tools/AgentTool/runAgent.ts:370-391`).
- Output format: summary of what was configured and tell parent/user to use `statusline-setup` for future status-line changes (`src/tools/AgentTool/built-in/statuslineSetup.ts:126-131`).
- System prompt is the `STATUSLINE_SYSTEM_PROMPT` starting at `src/tools/AgentTool/built-in/statuslineSetup.ts:3`; it instructs conversion of shell `PS1`, explains JSON stdin fields including `session_id`, `cwd`, `model`, workspace, version, output style, context window, rate limits, vim, agent, worktree, and says to update `~/.claude/settings.json` preserving settings (`src/tools/AgentTool/built-in/statuslineSetup.ts:3-131`).
- Local `~/.claude/statusline.js` confirms the statusline contract in practice: script comment says it receives JSON from Claude Code's `statusLine`, reads stdin JSON, uses `workspace.current_dir|cwd`, model display name, output style, git info, context and rate-limit data, then prints two lines (`~/.claude/statusline.js:1-3`, `~/.claude/statusline.js:82-105`).

### claude-code-guide (additional built-in)

- Added for non-SDK entrypoints (`src/tools/AgentTool/builtInAgents.ts:54-62`).
- Trigger/description: user asks how/does/can about Claude Code, Agent SDK, or Claude API; should reuse existing/running guide via SendMessage if possible (`src/tools/AgentTool/built-in/claudeCodeGuideAgent.ts:98-100`).
- Tools: local Read/Glob/Grep or Bash depending embedded search, plus WebFetch/WebSearch (`src/tools/AgentTool/built-in/claudeCodeGuideAgent.ts:103-118`).
- Model/permission: `haiku`, `permissionMode: 'dontAsk'` (`src/tools/AgentTool/built-in/claudeCodeGuideAgent.ts:119-120`).
- System prompt: at `src/tools/AgentTool/built-in/claudeCodeGuideAgent.ts:23-95`, with docs-map URLs and approach; appends current custom skills, custom agents, MCP servers, plugin skills, and settings into the prompt when present (`src/tools/AgentTool/built-in/claudeCodeGuideAgent.ts:121-184`).
- Caveat for this discovery: because network was forbidden, no live docs fetch was performed.

### verification (additional gated built-in)

- Added only if `VERIFICATION_AGENT` feature and `tengu_hive_evidence` gate are true (`src/tools/AgentTool/builtInAgents.ts:65-68`).
- Trigger/description: verify non-trivial implementation work after edits; pass original task, files changed, approach; produces PASS/FAIL/PARTIAL with evidence (`src/tools/AgentTool/built-in/verificationAgent.ts:134-137`).
- Tools: disallows Agent, ExitPlanMode, Edit, Write, NotebookEdit; otherwise read/run/web-fetch tools after global filters (`src/tools/AgentTool/built-in/verificationAgent.ts:138-146`).
- Model/background: `inherit`, `background: true`, color red (`src/tools/AgentTool/built-in/verificationAgent.ts:138-148`).
- System prompt: full verifier prompt at `src/tools/AgentTool/built-in/verificationAgent.ts:8-132`; critical requirements include do not modify project, run actual commands, include `Command run`/`Output observed` for every check, and end with exact `VERDICT: PASS|FAIL|PARTIAL`.

## 3. Context inheritance

### Normal AgentTool child: fresh transcript + project/system context, not parent transcript

- Normal path builds `promptMessages = [createUserMessage({ content: prompt })]`; only fork path calls `buildForkedMessages` and uses parent assistant message (`src/tools/AgentTool/AgentTool.tsx:483-537`).
- `runAgent` builds `contextMessages` from `forkContextMessages` only; otherwise `contextMessages` is `[]`, so `initialMessages` is just prompt messages (`src/tools/AgentTool/runAgent.ts:370-373`).
- It still loads `getUserContext()` and `getSystemContext()` unless overridden (`src/tools/AgentTool/runAgent.ts:382-385`) and sends those into `query(...)` with `messages: initialMessages` (`src/tools/AgentTool/runAgent.ts:748-754`).
- Therefore: normal subagents do **not** see parent transcript, but do see project/user/system context (including CLAUDE.md unless omitted by agent).

### Fork path: inherits parent transcript/system/tool prefix

- If `subagent_type` is omitted and fork gate is enabled, effective type is undefined and selected agent is `FORK_AGENT`; otherwise missing `subagent_type` defaults to `general-purpose` (`src/tools/AgentTool/AgentTool.tsx:319-323`).
- Fork path comments say it inherits the parent system prompt and builds messages from the parent's full assistant message plus placeholders/directive (`src/tools/AgentTool/AgentTool.tsx:483-492`).
- `runAgentParams` passes `forkContextMessages: toolUseContext.messages` and `useExactTools: true`; comments say this uses parent exact tools/thinking/noninteractive settings for cache-identical prefix (`src/tools/AgentTool/AgentTool.tsx:603-632`).
- `runAgent` clones file state cache when `forkContextMessages` exists (`src/tools/AgentTool/runAgent.ts:375-379`) and `createSubagentContext` clones content replacement state for cache stability (`src/utils/forkedAgent.ts:384-402`).

### Skills/context preload

- Agent definitions support `skills`, `initialPrompt`, `memory`, `mcpServers`, `hooks`, `maxTurns`, `background`, and `permissionMode` (`src/tools/AgentTool/loadAgentsDir.ts:73-94`, `src/tools/AgentTool/loadAgentsDir.ts:107-125`).
- `runAgent` preloads agent frontmatter skills by resolving commands and adding their content as meta user messages before the query loop (`src/tools/AgentTool/runAgent.ts:585-644`).
- Agent memory is appended into custom agent prompts when enabled (`src/tools/AgentTool/loadAgentsDir.ts:482-489`, `src/tools/AgentTool/loadAgentsDir.ts:727-729`).

## 4. Tool permission/allowlist mechanism per agent

- Custom/JSON agent schema accepts `tools`, `disallowedTools`, `prompt`, `model`, `permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `skills`, `initialPrompt`, `memory`, `background`, and `isolation` (`src/tools/AgentTool/loadAgentsDir.ts:73-94`). SDK schema describes same fields and says `background` runs non-blocking/fire-and-forget, `memory` scopes to user/project/local agent memory (`src/entrypoints/sdk/coreSchemas.ts:1110-1181`).
- `resolveAgentTools` first runs global filtering unless main-thread, then removes explicit disallowed tools, expands wildcard/undefined tools to all available, validates explicit tool specs, and extracts `Agent(typeA,typeB)` allowed-agent metadata (`src/tools/AgentTool/agentToolUtils.ts:122-223`).
- Global subagent filters always allow MCP tools, can allow ExitPlanMode only in plan mode, deny all tools in `ALL_AGENT_DISALLOWED_TOOLS`, deny custom-agent disallowed tools, and restrict async agents to `ASYNC_AGENT_ALLOWED_TOOLS` (`src/tools/AgentTool/agentToolUtils.ts:70-118`).
- Source-of-truth constants: all agents disallow TaskOutput, ExitPlanModeV2, EnterPlanMode, Agent (external users), AskUserQuestion, TaskStop, Workflow; async agents allow Read, WebSearch, TodoWrite, Grep, WebFetch, Glob, shell tools, Edit/Write/NotebookEdit, Skill, SyntheticOutput, ToolSearch, Worktree tools (`src/constants/tools.ts:29-67`).
- Parent can restrict spawnable agent types via `Agent(x,y)` metadata; call-time filtering applies `allowedAgentTypes` before selecting `subagent_type` (`src/tools/AgentTool/AgentTool.tsx:340-345`).

## 5. Concurrency / parallel Task invocations

- Tool definition marks `isConcurrencySafe() { return true; }` (`src/tools/AgentTool/AgentTool.tsx:1273-1275`).
- Parent prompt explicitly instructs: launch multiple agents concurrently whenever possible (for non-Pro inline list path) and, if user asks for parallel, **must** send a single message with multiple `Agent` tool-use blocks (`src/tools/AgentTool/prompt.ts:253-258`, `src/tools/AgentTool/prompt.ts:276-279`).
- Async/background flow is fire-and-forget: `registerAsyncAgent` creates task state and the tool call returns `async_launched` immediately while lifecycle continues in detached `void runWithAgentContext(...)` (`src/tools/AgentTool/AgentTool.tsx:686-764`).
- Sync foreground agents can be backgrounded after registration; loop races child iterator with `backgroundSignal` and returns `async_launched` if user/background transition happens (`src/tools/AgentTool/AgentTool.tsx:808-830`, `src/tools/AgentTool/AgentTool.tsx:883-905`, `src/tools/AgentTool/AgentTool.tsx:1039-1051`).

## 6. UI/UX surface

- `AgentTool` renderers are wired into the tool definition: result, use, tag, progress, rejected, error, grouped use (`src/tools/AgentTool/AgentTool.tsx:1379-1386`).
- Progress UI limits visible progress messages to 3 outside transcript mode (`src/tools/AgentTool/UI.tsx:33`, `src/tools/AgentTool/UI.tsx:507-516`).
- Verbose transcript renders child messages through normal message components using subagent lookups (`src/tools/AgentTool/UI.tsx:241-270`).
- `renderToolResultMessage` shows completed agent content, verbose transcript, and final assistant message depending status/progress (`src/tools/AgentTool/UI.tsx:315-403`).
- Grouped agent display calculates per-agent stats and renders `AgentProgressLine` rows (`src/tools/AgentTool/UI.tsx:653-757`).
- Foreground sync agents show a background hint after 2 seconds if backgrounding is available (`src/tools/AgentTool/AgentTool.tsx:62-63`, `src/tools/AgentTool/AgentTool.tsx:871-881`).
- Background tasks are represented in app task state with `type: 'local_agent'`, `status`, progress, retained messages, output symlink/transcript, and notification lifecycle (`src/tasks/LocalAgentTask/LocalAgentTask.tsx:118-151`, `src/tasks/LocalAgentTask/LocalAgentTask.tsx:466-611`).

## 7. Lifecycle: spawn, interrupt, resume, errors

### Spawn

1. Resolve effective agent type: explicit `subagent_type`, fork path, or default `general-purpose` (`src/tools/AgentTool/AgentTool.tsx:319-323`).
2. Filter denied/allowed agents and fail if missing/denied (`src/tools/AgentTool/AgentTool.tsx:340-356`).
3. Check required MCP servers have tools/auth (`src/tools/AgentTool/AgentTool.tsx:369-408`).
4. Build system prompt and prompt messages (fork vs normal) (`src/tools/AgentTool/AgentTool.tsx:483-537`).
5. Build worker tool pool and `runAgentParams` (`src/tools/AgentTool/AgentTool.tsx:569-632`).
6. Run async lifecycle or sync loop (`src/tools/AgentTool/AgentTool.tsx:686-764`, `src/tools/AgentTool/AgentTool.tsx:766-1262`).

### Persistence/resume

- `runAgent` records sidechain transcript initial and subsequent messages and writes agent metadata containing `agentType`, worktree path, and description (`src/tools/AgentTool/runAgent.ts:733-745`, `src/tools/AgentTool/runAgent.ts:794-799`).
- `LocalAgentTask` initializes task output as a symlink to the agent transcript path for async/foreground tasks (`src/tasks/LocalAgentTask/LocalAgentTask.tsx:483`, `src/tasks/LocalAgentTask/LocalAgentTask.tsx:547`).
- There is a dedicated `resumeAgent.ts` file in source tree (discovered path) but this report did not read it deeply; resume behavior beyond transcript/metadata persistence is therefore not fully characterized.

### Interrupt/kill

- Sync agents share parent abort controller; async agents get new/unlinked controller unless override (`src/tools/AgentTool/runAgent.ts:520-528`).
- `createSubagentContext` default makes child abort controller linked to parent unless explicitly shared/overridden (`src/utils/forkedAgent.ts:345-354`).
- Background agents deliberately do not link to parent abort so ESC/cancel in main thread does not kill them; killed explicitly via task stop/chat kill (`src/tools/AgentTool/AgentTool.tsx:688-696`).
- `killAsyncAgent` aborts task controller, unregisters cleanup, sets status `killed`, clears selected agent, evicts task output (`src/tasks/LocalAgentTask/LocalAgentTask.tsx:281-301`).

### Errors

- Sync loop rethrows `AbortError`; non-abort errors are stored and, if any assistant messages exist, tries to finalize partial result so parent can see progress; otherwise rethrows (`src/tools/AgentTool/AgentTool.tsx:1128-1149`, `src/tools/AgentTool/AgentTool.tsx:1225-1234`).
- Background lifecycle marks task complete before potentially hanging handoff/classifier/worktree cleanup, then notifies; abort path kills and notifies killed with partial result; generic error calls `failAsyncAgent` and notifies failed (`src/tools/AgentTool/AgentTool.tsx:951-1031`).
- `runAgent` finally cleans up agent-specific MCP servers, session hooks, prompt-cache tracking, file cache, transcript subdir, todos, and background shell tasks (`src/tools/AgentTool/runAgent.ts:818-853`).

## 8. Source vs inferred vs unknown

### Verifiable from source / local probes

- Schema, result mapping, progress forwarding, permission/tool filters, context construction, built-in definitions, async notification shape, and CLI help/options are directly source-backed above.
- Local `~/.claude/settings.json` contains `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, and allow rules including legacy `Task(...)` syntax (`~/.claude/settings.json:3-6`, `~/.claude/settings.json:41-43`).
- Safe CLI probes:
  - `claude --help` output includes `--agent <agent>`, `--agents <json>`, `--permission-mode <mode>`, `--tools <tools...>`, and `agents` command.
  - `claude --version` output: `2.1.126 (Claude Code)`.
  - `claude agents --help` output: `Manage background and configured agents`; only option is `--setting-sources`.
- Docs directory had no agent/task matches; README has high-level architecture/tool table only. Python port zip only showed `src/task.py` and `src/tasks.py` as agent/task-related paths in first path scan; no source extraction was performed.
- Architecture diagram file exists as `claude-code-architecture-diagram.jpeg` (filename hint only; not interpreted in this text report).

### Inferred

- `Task` is legacy/user-facing nomenclature for what source now calls `AgentTool`, based on `LEGACY_AGENT_TOOL_NAME` alias plus `Task(...)` permission syntax in local settings. I did not trace `constants.js` line for actual string value in this pass.
- Default subagent model resolution likely honors `CLAUDE_CODE_SUBAGENT_MODEL` or settings through `getAgentModel`, but `utils/model/agent.ts` was not read, so exact precedence is unknown.
- Multiple Agent tool calls in one assistant message likely execute concurrently because tool is concurrency-safe and prompt instructs a single message with multiple tool uses; exact scheduler implementation for parallel tool calls is outside files read.

### Unknown / not fully characterized

- Complete resume protocol in `src/tools/AgentTool/resumeAgent.ts` was discovered but not deeply read.
- Exact `AGENT_TOOL_NAME`/`LEGACY_AGENT_TOOL_NAME` string constants not read; evidence points strongly to `Agent`/legacy `Task` but cite is indirect.
- Runtime feature flag state in the source snapshot is unknown; built-ins like Explore/Plan/verification may not be active in every build/session.
- `/agents` interactive TUI was not invoked by rule; only `claude agents --help` was probed.

## 9. Recommendations for Pi

### COPY

- **Agent registry shape**: `description/whenToUse`, `prompt`, `tools`, `disallowedTools`, `model`, `permissionMode`, `background`, `maxTurns` — simple, extensible, source-backed (`loadAgentsDir.ts:73-94`).
- **Fresh-context default**: normal subagents get task prompt + project context, not parent transcript; cheaper and forces explicit delegation (`runAgent.ts:370-385`).
- **Per-agent tool allow/deny lists**: allow `tools: ['*']` but support deny lists and global subagent exclusions (`agentToolUtils.ts:122-223`).
- **Structured async notification**: immediate launch result + later task notification with output path/status/result/usage (`AgentTool.tsx:1327-1338`, `LocalAgentTask.tsx:211-260`).
- **One-shot read-only Explore/Plan agents**: strong read-only prompts + no Edit/Write tools + omit heavy project docs; high utility for planning/research (`exploreAgent.ts:26-81`, `planAgent.ts:23-90`).

### ADAPT

- **Progress UI**: keep recent child tool activity and grouped agent rows, but Pi can simplify from Claude's Ink/transcript machinery (`UI.tsx:507-516`, `UI.tsx:653-757`).
- **Backgrounding**: support explicit `run_in_background` first; auto-background and mid-flight foreground-to-background can come later (`AgentTool.tsx:808-830`, `AgentTool.tsx:883-905`).
- **Fork/inherit-parent-context mode**: useful for cache/context sharing, but make it an explicit advanced mode; default fresh agents are easier to reason about (`AgentTool.tsx:483-492`, `AgentTool.tsx:603-632`).
- **Statusline setup agent**: copy the idea of a config-editing specialist, but gate file edits tightly and keep local config schema small (`statuslineSetup.ts:3-143`).

### AVOID (for now)

- **Feature-flag swarm/team complexity**: many ant-only gates, teammate modes, tmux/in-process branches, and remote isolation paths complicate core semantics (`AgentTool.tsx:270-315`, `main.tsx:3827-3858`).
- **Implicit permission escalation**: Claude defaults worker mode to `acceptEdits`; Pi should make any write-capable default explicit and visible (`AgentTool.tsx:573-577`).
- **Network-doc guide agent by default**: useful but not essential; it depends on web fetch/search and current docs, which may be noisy in a local-first CLI (`claudeCodeGuideAgent.ts:23-95`).
- **Too many hidden gates affecting schema**: runtime schema changes via flags/env make behavior harder to document/test (`AgentTool.tsx:108-123`, `builtInAgents.ts:14-20`).

## Commands & probes run

1. `pwd; test -d /Users/luke/Projects/testing/claude-code-cli-src-code; test -d ~/.claude; command -v claude`
2. `find` primary source paths via tool: `/Users/luke/Projects/testing/claude-code-cli-src-code/**/*`
3. `grep` primary source for `Task|agent|Agent|Explore|Plan|general-purpose|statusline-setup|subagent|sub-agent`
4. `ls /Users/luke/Projects/testing/claude-code-cli-src-code`
5. `ls /Users/luke/.claude`
6. `find /Users/luke/Projects/testing/claude-code-cli-src-code/src '**/*Agent*'`
7. Read: `src/tools/AgentTool/AgentTool.tsx`
8. Read: `src/tools/AgentTool/runAgent.ts`
9. Read: `src/tools/AgentTool/builtInAgents.ts`
10. Read: `src/Tool.ts`
11. Read: `src/main.tsx`
12. Read built-ins: `generalPurposeAgent.ts`, `exploreAgent.ts`, `planAgent.ts`, `statuslineSetup.ts`, `claudeCodeGuideAgent.ts`, `verificationAgent.ts`
13. Read: `src/tools/AgentTool/agentToolUtils.ts`
14. Read: `src/tools/AgentTool/UI.tsx`
15. Read: `src/tasks/LocalAgentTask/LocalAgentTask.tsx`
16. Read: `src/tools/AgentTool/loadAgentsDir.ts`
17. Read additional `AgentTool.tsx` chunks at offsets 221, 581, 1101
18. Read `runAgent.ts` chunks at offsets 260, 780
19. Read `src/utils/forkedAgent.ts`
20. `grep` docs for agent/task/statusline terms
21. `grep` README for agent/task/statusline terms
22. `grep` python port directory for agent/task/statusline terms
23. `find docs/**/*`
24. `find claude-code-cli-python-port/**/*`
25. `unzip -l claude-code-cli-python-port/claw-code-main.zip | sed -n '1,80p'; ls -l claude-code-architecture-diagram.jpeg`
26. `unzip -l claude-code-cli-python-port/claw-code-main.zip | grep -Ei 'agent|task|statusline|plan|explore' | sed -n '1,160p'`
27. `claude --help | sed -n '1,220p'; claude --version`
28. `claude agents --help | sed -n '1,220p'`
29. `find ~/.claude/agents/**/*`
30. Read: `~/.claude/settings.json`
31. Read: `~/.claude/statusline.js`
32. `find ~/.claude/tasks/**/*` sample
33. `find ~/.claude/commands/**/*` sample
34. `nl -ba` + `grep` targeted line extraction across AgentTool, runAgent, utilities, built-ins, schemas, README
35. Read: `src/constants/tools.ts`
36. `nl -ba` targeted UI/lifecycle files (`UI.tsx`, `AgentProgressLine.tsx`, `LocalAgentTask.tsx`, `TaskOutputTool.tsx`, `TaskStopTool.ts`)
37. Read: `src/tools/AgentTool/prompt.ts`
38. `grep src/main.tsx` for `--agent|--agents|agentDefinitions|parseAgentsFromJson|saveAgentSetting|mainThreadAgentType|initialPrompt`
39. `nl -ba ~/.claude/settings.json`, `nl -ba ~/.claude/statusline.js`, `find ~/.claude/tasks -maxdepth 2 -type f | sed -n '1,30p'`
40. `mkdir -p /Users/luke/Projects/personal/pi-agent-tool/handoff`
41. Wrote this report to `/Users/luke/Projects/personal/pi-agent-tool/handoff/claude-code-agent-model.md`

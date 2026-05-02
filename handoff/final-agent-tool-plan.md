# Native `agent` Tool Implementation Plan

## 1. Executive summary

Build Pi's native delegation primitive as a first-class built-in `agent` tool that runs an in-process child `AgentSession`, not a spawned `pi --mode json` process. The MVP ships synchronous foreground execution, built-in agent definitions, fresh/fork context modes, parent-bounded tool/model inheritance, basic progress rendering, `/agents` discovery UI, and a staged migration path from `pi-subagents`.

- Use `packages/coding-agent/src/core/tools/agent.ts` with TypeBox schema and `createAgentSessionFromServices()` + `SessionManager.inMemory()`.
- Default to fresh child context; support explicit/per-agent `fork` by seeding a child session from parent transcript after filtering delegation artifacts.
- Parent tool allowlist is a hard ceiling; children never gain tools the parent did not have active.
- Ship native `agent` alongside legacy `subagent`; defer chain/async/worktree/intercom/manager parity.
- Add `/agents` as list/describe/scaffold UI, not an orchestration manager.

## 2. Goals & non-goals

### MVP goals

1. Add a built-in `agent` tool, active by default with other default tools.
2. Run children in-process via child `AgentSession`; no CLI spawning.
3. Bundle base agents: `general-purpose`, `explore`, `plan`, `statusline-setup`, `reviewer`, `scout`.
4. Implement fresh and fork context modes with explicit inheritance rules.
5. Enforce parent-bounded tool permissions, recursive `agent` denial, per-agent allow/deny lists.
6. Implement model/thinking override precedence.
7. Stream child progress through `onUpdate` into existing `ToolExecutionComponent`.
8. Add `/agents` metadata, selector, and detail/scaffold behavior.
9. Document native usage and migration from legacy `pi-subagents`.
10. Add focused unit/integration tests and run the package gate.

### Deferred / non-goals

- True backgrounding / detached async resume: defer. Claude has `async_launched` + task notifications, but Pi lacks a built-in detached tool scheduler; synchronous long-running tool calls are supported today (`claude-code-agent-model.md` §1. Task/Agent tool; `pi-native-integration-points.md` §7. Async/background execution).
- Worktree fan-out: defer. Preserve as a future safety feature; do not port `pi-subagents` worktree logic into MVP (`current-pi-subagents.md` §5. Parallel mode internals).
- Chain mode: defer. Replace simple chains with parent-driven sequential tool calls for now (`current-pi-subagents.md` §4. Chain mode internals).
- Top-level parallel manager: defer. Let the parent model issue multiple `agent` tool calls in one assistant turn; Pi's agent loop already supports concurrent tool calls (`claude-code-agent-model.md` §5. Concurrency / parallel Task invocations; `pi-native-integration-points.md` §7. Async/background execution).
- Intercom bridge: defer. Children return blockers/findings in final output; no injected `intercom` tool in MVP (`current-pi-subagents.md` §6. Async/control: dirs, status, interrupt, resume, intercom).
- Full `/agents` manager UI and LLM authoring actions: defer. MVP selector lists/describes/scaffolds only (`current-pi-subagents.md` §11. Complexity to delete or simplify).
- User/project/package agent resource discovery: defer implementation, design now. Built-ins live in source initially (`pi-native-integration-points.md` §4. Settings/config integration).
- Legacy `subagent` removal: defer. Phase 0 ships native `agent` alongside existing extension (`current-pi-subagents.md` §12. Migration risks).

## 3. Recommended architecture

### Decision

Implement a built-in `agent` tool at `packages/coding-agent/src/core/tools/agent.ts`. The tool creates a child `AgentSession` in-process using `createAgentSessionFromServices()` and `SessionManager.inMemory()` by default. The child receives parent-bounded tools, selected model/thinking, child system prompt append, and fresh/fork context per the selected agent definition.

### Runtime flow

1. Parent LLM calls built-in tool `agent` with `{ agent, task, context?, model?, tools?, thinking?, description? }`.
2. `agent.ts` resolves the agent definition from built-ins.
3. Resolve model/thinking/tool allowlist:
   - model: call arg → agent definition → parent model → provider default.
   - thinking: call arg → agent definition → parent thinking → Pi default.
   - tools: parent active tools ∩ call-arg allowlist ∩ agent allowlist - agent denylist - `agent`.
4. Build child prompt:
   - system append = selected agent system prompt + child boundary rules.
   - user prompt = task + optional context + output expectations.
5. Create child session manager:
   - fresh: `SessionManager.inMemory(ctx.cwd)` with no parent transcript.
   - fork: `SessionManager.inMemory(ctx.cwd)` seeded with filtered `buildSessionContext(parentEntries, parentLeaf).messages`.
6. Create child session using `createAgentSessionFromServices({ services, sessionManager, model, thinkingLevel, tools, sessionStartEvent: { type: "session_start", reason: "new" } })`.
7. Subscribe to child `AgentSession` events and call `onUpdate()` with last activity, tool usage, elapsed time, and partial assistant text.
8. Run `await childSession.prompt(composeChildUserPrompt(...), { expandPromptTemplates: false, source: "agent-tool" })`.
9. Extract final assistant text from child messages and return it as the parent tool result content with structured details.

### Required core plumbing

Current `ToolDefinition.execute()` receives `ExtensionContext`, which has cwd, read-only session manager, model, and model registry, but not parent `AuthStorage`, `SettingsManager`, `ResourceLoader`, or active tool access (`pi-native-integration-points.md` §1. Built-in tool architecture; `pi-native-integration-points.md` §6. Model resolution and permission inheritance). Add an internal child-session factory rather than making `agent.ts` guess:

- Extend `AgentSessionConfig` with parent runtime services needed by built-in tools:
  - `authStorage`
  - `settingsManager`
  - `modelRegistry`
  - `resourceLoader`
  - `getActiveToolNames()` closure or direct parent session accessor
  - optional `systemPromptAppend` for child sessions
- In `AgentSession._refreshToolRegistry()`, pass `ToolsOptions.agent` into `createAllToolDefinitions()`.
- In `sdk.ts`, retain the created `authStorage` and pass it into `AgentSession`.
- In `agent-session-services.ts`, keep using `createAgentSessionFromServices()` as the child creation boundary.

### Why this beats spawning `pi --mode json`

- Reuses Pi's existing auth/model/settings/resource-loader stack without shelling out or re-parsing JSONL (`pi-native-integration-points.md` §2. Session/runtime model and clean child/forked session creation).
- Avoids `PI_SUBAGENT_CHILD` env hacks, child process discovery, detached jiti runner, temp config files, JSONL parsing, and stale PID reconciliation (`current-pi-subagents.md` §3. Runtime flow for single execution; §6. Async/control: dirs, status, interrupt, resume, intercom).
- Keeps tool progress on the native `tool_execution_update` path already rendered by `ToolExecutionComponent` (`pi-native-integration-points.md` §1. Built-in tool architecture; §3. Tool rendering in TUI).
- Makes permission inheritance enforceable in one process via `AgentSession` active/allowed tool lists instead of CLI flags (`pi-native-integration-points.md` §6. Model resolution and permission inheritance).
- Reduces lifecycle surface to one synchronous tool call for MVP; background task management stays explicitly deferred.

## 4. Built-in `agent` tool schema

### TypeBox input schema

```ts
const thinkingSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("minimal"),
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
  Type.Literal("xhigh"),
]);

export const agentToolSchema = Type.Object({
  agent: Type.String({ description: "Agent id/name to run" }),
  task: Type.String({ description: "Task for the child agent to perform" }),
  context: Type.Optional(Type.String({ description: "Additional context to include with the task" })),
  model: Type.Optional(Type.String({ description: "Optional model override" })),
  tools: Type.Optional(Type.Array(Type.String(), { description: "Optional child tool allowlist" })),
  thinking: Type.Optional(thinkingSchema),
  description: Type.Optional(Type.String({ description: "Short 3-5 word UI label" })),
});
```

### Tool details type

```ts
export interface AgentToolDetails {
  status: "completed" | "failed" | "cancelled";
  agentId: string;
  agentDescription: string;
  model?: { provider: string; id: string; name?: string };
  thinking?: ThinkingLevel;
  defaultContext: "fresh" | "fork";
  effectiveTools: string[];
  deniedTools: string[];
  durationMs: number;
  toolCallCount: number;
  childMessageCount: number;
  lastActivity?: string;
  usage?: unknown;
  sessionId?: string;
  sessionFile?: string;
}
```

### Rejected/deferred fields

- `run_in_background`: defer; no native detached scheduler yet (`pi-native-integration-points.md` §7. Async/background execution).
- `async`: reject; keep schema smaller than legacy `subagent`.
- `isolation`, `worktree`, `cwd`: defer; worktree fan-out is not MVP and cwd switching is a permission/escalation surface (`current-pi-subagents.md` §5. Parallel mode internals).
- `chain`, `tasks`, `concurrency`: reject; use multiple `agent` tool calls or parent sequential calls.
- `output`, `outputMode`, `reads`, `chainDir`: defer file artifact workflows.
- LLM management actions (`list/create/update/delete/status/interrupt/resume/doctor`): reject from tool; use `/agents` and docs.

## 5. Base agent definitions

All built-ins live in `packages/coding-agent/src/core/agents/definitions.ts`. All effective tools are still intersected with parent active tools and hard-deny `agent` in MVP. Model value `inherit` means use parent model unless call arg overrides.

### `general-purpose`

- id: `general-purpose`
- Description / when-to-use: general research, code navigation, and multi-step implementation tasks when no specialist fits.
- Default tools allow/deny: allow `*`; deny `agent`.
- Default model resolution: `inherit`.
- defaultContext: `fresh`.
- System prompt outline:
  1. You are a Pi child agent completing one delegated task.
  2. Complete the task fully; avoid gold-plating.
  3. Search broadly before editing when location is unclear.
  4. Use available tools carefully; do not exceed explicit task scope.
  5. Prefer editing existing files over creating new files.
  6. Do not create documentation unless explicitly requested.
  7. Return a concise report with changes/findings/validation.
- Output format: concise report; include files touched and validation if edits occurred.

### `explore`

- id: `explore`
- Description / when-to-use: fast read-only codebase exploration, locating files, patterns, architecture, and likely integration points.
- Default tools allow/deny: allow `read`, `grep`, `find`, `ls`; deny `agent`, `edit`, `write`, `bash`.
- Default model resolution: `inherit`.
- defaultContext: `fresh`.
- System prompt outline:
  1. You are a read-only code exploration agent.
  2. Do not modify, create, delete, move, or write files.
  3. Start broad, then narrow to relevant files.
  4. Use `find`/`grep` for discovery and `read` for exact files.
  5. Cite concrete file paths and symbols.
  6. Separate evidence from inference.
  7. Return only useful findings for the caller.
- Output format: findings grouped by area; include exact files and open questions.
- Prompt status: draft prompt — finalize before merge.

### `plan`

- id: `plan`
- Description / when-to-use: implementation planning after requirements are known; identifies files, order, risks, and validation.
- Default tools allow/deny: allow `read`, `grep`, `find`, `ls`; deny `agent`, `edit`, `write`, `bash`.
- Default model resolution: `inherit`.
- defaultContext: `fresh`.
- System prompt outline:
  1. You are a read-only software planning agent.
  2. Do not modify files or system state.
  3. Understand requirements and current architecture first.
  4. Identify integration points and required files.
  5. Break work into small ordered tasks.
  6. Call out dependencies, risks, and validation gates.
  7. End with critical files for implementation.
- Output format: `# Implementation Plan` with Goal, Tasks, Files to Modify, New Files, Dependencies, Risks, Validation.
- Prompt status: draft prompt — finalize before merge.

### `statusline-setup`

- id: `statusline-setup`
- Description / when-to-use: configure or repair Pi status/footer/statusline behavior after the Pi statusline mechanism is confirmed.
- Default tools allow/deny: allow `read`, `edit`; deny `agent`, `write`, `bash`, `grep`, `find`, `ls` unless implementation proves extra reads are required.
- Default model resolution: `inherit`.
- defaultContext: `fresh`.
- System prompt outline:
  1. You configure Pi status/footer/statusline settings only.
  2. Read existing settings before editing.
  3. Preserve unrelated settings exactly.
  4. Make the smallest safe config change.
  5. Do not touch Claude-specific files.
  6. Explain what changed and how to revert.
- Output format: changed settings path, summary, verification/revert instructions.
- Prompt status: draft prompt — finalize before merge. Claude's statusline prompt is Claude-specific and must not be copied verbatim (`claude-code-agent-model.md` §2. Built-in/base agents discovered / statusline-setup).

### `reviewer`

- id: `reviewer`
- Description / when-to-use: independent read-only review of a plan, diff, or implementation for correctness, regressions, and missing validation.
- Default tools allow/deny: allow `read`, `grep`, `find`, `ls`; deny `agent`, `edit`, `write`, `bash`.
- Default model resolution: `inherit`.
- defaultContext: `fresh`.
- System prompt outline:
  1. You are a read-only reviewer.
  2. Verify claims against files and evidence.
  3. Prioritize correctness, safety, and regressions.
  4. Do not rewrite the implementation.
  5. Identify blockers separately from nits.
  6. Include exact file paths and reasons.
  7. Return PASS/FAIL/PARTIAL with evidence.
- Output format: verdict, findings ordered by severity, evidence, recommended fixes.
- Prompt status: draft prompt — finalize before merge.

### `scout`

- id: `scout`
- Description / when-to-use: quick reconnaissance before planning or implementation; produces a compact handoff of relevant files and facts.
- Default tools allow/deny: allow `read`, `grep`, `find`, `ls`; deny `agent`, `edit`, `write`, `bash`.
- Default model resolution: `inherit`.
- defaultContext: `fresh`.
- System prompt outline:
  1. You are a fast codebase scout.
  2. Stay read-only.
  3. Find the smallest set of relevant files.
  4. Capture architecture, entrypoints, and gotchas.
  5. Do not solve the task unless asked.
  6. Keep output compact and actionable.
- Output format: relevant files, key facts, likely next steps, unknowns.
- Prompt status: draft prompt — finalize before merge.

## 6. Context inheritance model

| Item | `fresh` child sees | `fork` child sees | Pi API / implementation |
|---|---|---|---|
| Parent transcript | No parent messages. Only child task/context prompt. | Filtered parent branch messages plus child task prompt. Strip prior native `agent` and legacy `subagent` tool calls/results. | `SessionManager.inMemory(ctx.cwd)`; `buildSessionContext(ctx.sessionManager.getEntries(), ctx.sessionManager.getLeafId())`; seed child session before `createAgentSessionFromServices()` (`pi-native-integration-points.md` §2. Session/runtime model and clean child/forked session creation; `current-pi-subagents.md` §3. Runtime flow for single execution). |
| Project AGENTS.md / CLAUDE.md context | Yes by default. | Yes by default. | `DefaultResourceLoader.reload()` loads AGENTS/CLAUDE context files for cwd (`pi-native-integration-points.md` §2. AGENTS.md, skills, prompts, system prompt loading). |
| Skills | Available according to child active tools and resource loader. | Same. | `buildSystemPrompt()` formats skills only when `read` is active (`pi-native-integration-points.md` §2. AGENTS.md, skills, prompts, system prompt loading). |
| System prompt | Pi base system prompt + active tool snippets + agent-specific system append + child boundary rules. | Same, plus inherited transcript. | Add `systemPromptAppend`/child prompt option to `AgentSessionConfig` and `_rebuildSystemPrompt()`. |
| Active tools | Parent-bounded effective child tool list. | Same. | `createAgentSessionFromServices({ tools: effectiveTools })`; `AgentSession` active/allowed tool names (`pi-native-integration-points.md` §6. Model resolution and permission inheritance). |
| Model | Resolved model by precedence. | Same. | `ctx.model`, `ctx.modelRegistry`, `defaultModelPerProvider` (`pi-native-integration-points.md` §6. Model resolution and permission inheritance). |
| Thinking | Resolved thinking by precedence, clamped by session/model behavior. | Same. | `createAgentSessionFromServices({ thinkingLevel })`; existing `createAgentSession()` clamp logic (`pi-native-integration-points.md` §6. Model resolution and permission inheritance). |
| cwd | Parent cwd. | Parent cwd. | `ctx.cwd`; `SessionManager.inMemory(ctx.cwd)`. |
| Settings layering | Same global/project settings as parent. | Same. | Reuse parent `SettingsManager`; settings deep-merge global then project (`pi-native-integration-points.md` §4. Settings/config integration). |
| Resource loader | Same loaded resources for MVP; child-specific system append is injected outside resource discovery. | Same. | Reuse or wrap parent `ResourceLoader` via child services (`pi-native-integration-points.md` §2. AGENTS.md, skills, prompts, system prompt loading). |

## 7. Tool permission & model selection

### Tool rules

1. Parent active tools are a hard ceiling.
2. Effective child tools = `parentActiveTools ∩ requestedToolsOrAll ∩ agentAllowTools - agentDenyTools - globalDenyTools`.
3. Global deny list for MVP: `agent` always denied recursively.
4. If `params.tools` asks for a tool not active in the parent, return a tool error listing blocked names; do not silently broaden.
5. `tools: ["*"]` in an agent definition means all parent-active tools except denied tools.
6. Read-only agents (`explore`, `plan`, `reviewer`, `scout`) do not receive `bash` in MVP because Pi's `bash` tool is not read-only-enforced.
7. Extension tools are allowed only if they are already active in the parent and pass the selected agent allowlist. MVP built-in agents do not depend on extension tools.

### Recursive calls

- Hard-deny `agent` inside child sessions in MVP.
- Do not add a config escape hatch in MVP.
- Rationale: both Claude and `pi-subagents` have explicit global subagent disallow/boundary logic to avoid delegation loops (`claude-code-agent-model.md` §4. Tool permission/allowlist mechanism per agent; `current-pi-subagents.md` §10. Best ideas to preserve).

### Model precedence

1. `params.model`
2. `agentDefinition.model` when not `inherit`
3. parent `ctx.model`
4. provider default via existing model resolver

Validate the selected model against `ctx.modelRegistry`; return a tool error if not found/configured. Do not invent aliases beyond existing Pi model resolution.

### Thinking precedence

1. `params.thinking`
2. `agentDefinition.thinking` when set
3. parent current thinking level
4. Pi default from `createAgentSession()`

### Child boundary flag

- Use an in-memory child marker, not `PI_SUBAGENT_CHILD`, because the child is in the same process.
- Add internal option: `isAgentToolChild: true` or `parentAgentToolCallId` on child session/tool runtime.
- Use it to:
  - deny recursive `agent`,
  - add child boundary prompt text,
  - avoid any future parent-only agent instructions leaking into child system prompt.

## 8. TUI/status/progress UX

### Minimum viable rendering

- `renderCall`: show `agent: <id>`, optional `description`, model if known, context mode, and requested task preview.
- Pending state from `onUpdate`: show elapsed time, last child activity, child tool count, and partial summary.
- `renderResult`: show status, duration, tool count, model, and final child report.
- Use `renderShell: "default"`; custom components should be compact and rely on `ToolExecutionComponent` shell.

### Progress mapping

Child `AgentSession` event listener maps to `onUpdate({ content, details })`:

- `tool_execution_start`: `lastActivity = "<tool> started"`, increment active activity.
- `tool_execution_update`: `lastActivity = "<tool> running"` with short content preview.
- `tool_execution_end`: increment `toolCallCount`, record status.
- `message_update`: update partial assistant text preview.
- `agent_end`: final status preparation.

This follows Pi's existing `tool_execution_update` path (`pi-native-integration-points.md` §1. Built-in tool architecture; §3. Tool rendering in TUI).

### Multiple parallel `agent` calls

- No special grouped UI in MVP.
- Pi's agent loop can run parallel tool calls; each `agent` call renders as its own `ToolExecutionComponent`.
- Nice-to-have deferred: grouped agent progress rows like Claude's UI (`claude-code-agent-model.md` §6. UI/UX surface).

### Nice-to-have deferred

- Background hint after long-running child.
- Collapsible child transcript preview.
- Grouped parallel agent display.
- Persisted child transcript link.
- Live child token usage.

## 9. Discovery & config

### MVP

- Built-in definitions only, bundled in source.
- Registry file: `packages/coding-agent/src/core/agents/definitions.ts`.
- Lookup helpers: `packages/coding-agent/src/core/agents/registry.ts`.
- No user/project/package agent file loading in MVP.

### Post-MVP resource model

Add first-class agent definitions as a fifth resource type through `DefaultPackageManager`/`ResourceLoader`, matching the package resource architecture already used for extensions/skills/prompts/themes (`pi-native-integration-points.md` §4. Settings/config integration).

Locations:

1. Built-in source definitions.
2. User: `~/.pi/agent/agents/*.md`.
3. Project: nearest `.pi/agents/*.md`.
4. Package: `agents/*.md` from packages declaring `pi.agents`.

Precedence:

1. project
2. user
3. package
4. builtin

If duplicate ids exist at the same precedence, warn and skip later duplicates.

### Frontmatter schema

```yaml
---
id: reviewer
description: Review implementation for correctness and regressions
tools: [read, grep, find, ls]
denyTools: [agent, edit, write, bash]
model: inherit
thinking: inherit
defaultContext: fresh
output: verdict-findings
---
System prompt body here.
```

Validation:

- TypeBox schema + compiled validator.
- Required: `id`, `description`, prompt body.
- Optional: `tools`, `denyTools`, `model`, `thinking`, `defaultContext`, `output`.
- Invalid file: warn-and-skip, do not abort startup.
- Unknown optional field: warn, ignore for MVP.

Settings:

- Add `Settings.agents?: string[]` only when post-MVP discovery ships.
- Add resource getters/setters analogous to existing package resource paths.
- Do not add in MVP unless file discovery is implemented.

## 10. Slash command `/agents`

### Metadata

- File: `packages/coding-agent/src/core/slash-commands.ts`
- Add to `BUILTIN_SLASH_COMMANDS`:
  - `{ name: "agents", description: "List and inspect built-in agents" }`

### Handler

- File: `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- In `setupEditorSubmitHandler()`, before extension command fallback:
  - `/agents`: open selector.
  - `/agents <id>`: show details for that agent; if id unknown, show warning and open selector filtered by id.

### Selector component sketch

- File: `packages/coding-agent/src/modes/interactive/components/agents-selector.ts`
- Model after `ModelSelectorComponent`/`SettingsSelectorComponent`.
- Left/list: agent ids and one-line descriptions.
- Detail panel: description, default context, model, tools, deny tools, output expectation.
- Key behavior:
  - Enter: insert scaffold into editor and close.
  - Escape: close.
  - Search: filter by id/description.

### Selection behavior

Selecting an agent inserts a prompt scaffold into the editor, not a tool call and not a persistent default:

```text
Use the <agent-id> agent to: 
```

Rationale: keeps `/agents` user-facing and model-mediated; does not bypass normal tool invocation or invent a default-agent state. Manager actions remain deferred (`current-pi-subagents.md` §8. UI/UX today; `pi-native-integration-points.md` §5. Existing slash commands and `/agents`).

## 11. Migration & removal plan for existing `pi-subagents`

### Phase 0 — this PR

- Ship native built-in `agent` tool and base agents alongside existing extension.
- Do not remove installed packages or user settings.
- Native tool name: `agent`.
- Existing extension tool name: `subagent`; no collision (`current-pi-subagents.md` §2. Tool registration: schema, dispatcher, actions, execution modes).
- Add docs explaining native MVP vs legacy capabilities.

### Phase 1 — deprecate skill/docs only

- Mark `pi-subagents/skills/pi-subagents/SKILL.md` deprecated once native docs cover parent orchestration behavior.
- Add migration table:
  - `subagent agent=<name> task=<task>` → `agent agent=<name> task=<task>`.
  - `/agents` manager → native `/agents` list/detail/scaffold only.
  - `/parallel` prompt workflows → ask parent to launch multiple `agent` calls.
  - `/chain` workflows → parent sequential prompts or documented manual sequence.

### Phase 2 — parity-driven removal from defaults

Remove extension from default package list only after deliberate parity decisions:

- Chain mode: defer; replace with parent-driven sequential calls unless demand proves otherwise.
- Parallel: defer dedicated schema; use concurrent tool calls per Claude pattern (`claude-code-agent-model.md` §5. Concurrency / parallel Task invocations).
- Async/background: defer until native task manager exists.
- Worktree: defer until parallel writer workflow is justified.
- Intercom bridge: defer; native child final output is the handoff channel.
- Manager UI: defer; native selector is not a manager.
- Prompt templates depending on `/run-`, `/parallel-`, `/chain-`: document manual/native equivalents before removal.

### Phase 3 — manual user settings cleanup

- Document manual deletion of extension dependencies from `~/.pi/agent/settings.json`:
  - `https://github.com/nicobailon/pi-subagents`
  - optionally `https://github.com/nicobailon/pi-intercom` only if no other workflows need it.
- Do not modify user settings automatically.
- Warn that old async runs/status dirs may be orphaned (`current-pi-subagents.md` §12. Migration risks).

## 12. Compatibility decisions

1. `agent` in default active tools: yes. Add to default active tool names in `sdk.ts`.
2. `--tools`: explicit allowlist controls availability. `--tools read,agent` enables only `read` and `agent`; child effective tools cannot exceed `read` after recursive `agent` denial.
3. `--no-tools`: disables `agent` when mode is `all`; no tool call possible.
4. `--no-builtin-tools`: disables default built-ins, including native `agent`; extension/custom tools remain according to existing semantics.
5. Bundled base agents: always available for lookup when the code is present, but runnable only when `agent` tool is active.
6. Tool conflicts: native built-in `agent` should win over extension tool registration with the same name. If current registry last-wins behavior would allow override, add a guard/warning for built-in `agent` (`pi-native-integration-points.md` §12. Constraints and risks).
7. Legacy alias: do not add `subagent` alias in MVP. Add only after legacy extension removal to avoid collision.
8. Child extension tools: allowed only when parent active and included by effective tools. Do not force-load all extension tools in children.

## 13. Files to edit / create

### `packages/coding-agent` — MVP edits

- `src/core/tools/index.ts` — add `agent` to `ToolName`, `allToolNames`, `ToolsOptions`, exports, dispatchers, `createAllToolDefinitions()`.
- `src/core/sdk.ts` — add `agent` to default active tools; pass auth/session services needed by the native tool into `AgentSession`.
- `src/core/agent-session.ts` — store child-session services/factory; pass `ToolsOptions.agent`; add child system prompt append support; expose active tool list to agent tool via closure; protect native `agent` from extension override if needed.
- `src/core/agent-session-services.ts` — support child session creation options needed by `agent`, including child system prompt append and in-memory session use.
- `src/core/index.ts` — export public/native agent types if they are intended for SDK consumers.
- `src/index.ts` — re-export native agent types only if `core/index.ts` exports them publicly.
- `src/core/slash-commands.ts` — add `/agents` metadata.
- `src/modes/interactive/interactive-mode.ts` — handle `/agents` and `/agents <id>`.
- `src/modes/interactive/components/index.ts` — export `AgentsSelectorComponent`.
- `README.md` — document native `agent` tool and `/agents`.
- `docs/usage.md` — document command/tool usage and compatibility with `--tools`/`--no-tools`.
- `docs/sdk.md` — document SDK-visible behavior if `agent` types/factory are exported.
- `docs/tui.md` — document `/agents` selector and progress rendering.
- `CHANGELOG.md` — add Unreleased entry.

### `packages/coding-agent` — MVP new files

- `src/core/tools/agent.ts` — TypeBox schema, execution, child session creation, progress mapping, renderers, details type.
- `src/core/agents/types.ts` — `AgentDefinition`, context/model/thinking/tool policy types, validation helpers.
- `src/core/agents/definitions.ts` — bundled base agent definitions.
- `src/core/agents/registry.ts` — built-in lookup/list/resolve helpers.
- `src/core/agents/context.ts` — fresh/fork context composition and parent delegation-artifact filtering.
- `src/modes/interactive/components/agents-selector.ts` — `/agents` selector UI.
- `test/agent-tool.test.ts` — native tool execution and behavior tests.
- `test/agent-definitions.test.ts` — built-in definitions and validation tests.
- `test/agent-context-inheritance.test.ts` — fresh/fork context tests.
- `test/interactive-mode-agents-command.test.ts` — slash command behavior.

### Deferred discovery/resource files — do not touch in MVP

- `src/core/settings-manager.ts` — add `Settings.agents?: string[]` when user/project discovery ships.
- `src/core/package-manager.ts` — add package `agents` resource type when package discovery ships.
- `src/core/resource-loader.ts` — load/validate user/project/package agent resources when discovery ships.
- `docs/settings.md` — document `agents` setting when implemented.
- `docs/packages.md` — document package agent resources when implemented.

## 14. Tests to add

### Unit / integration tests

- `packages/coding-agent/test/agent-definitions.test.ts`
  - verifies built-in ids exist: `general-purpose`, `explore`, `plan`, `statusline-setup`, `reviewer`, `scout`.
  - verifies required fields, defaultContext values, tool allow/deny lists, no recursive `agent` in effective tools.
  - verifies invalid duplicate/missing agent lookup errors.

- `packages/coding-agent/test/agent-tool.test.ts`
  - verifies TypeBox schema accepts required and optional fields.
  - verifies missing `agent`/`task` fails validation.
  - verifies unknown agent returns clear tool error.
  - verifies child session creation uses `SessionManager.inMemory()`.
  - verifies child final assistant content becomes parent tool result content.
  - verifies `onUpdate` receives progress details from child events.

- `packages/coding-agent/test/agent-context-inheritance.test.ts`
  - fresh mode excludes parent transcript.
  - fork mode includes filtered parent branch messages.
  - fork mode strips prior native `agent` and legacy `subagent` artifacts.
  - task/context prompt is always present in both modes.

- `packages/coding-agent/test/tools.test.ts`
  - updates built-in tool registry expectations for `agent`.
  - verifies `createAllToolDefinitions()` includes `agent`.

- `packages/coding-agent/test/agent-session-dynamic-tools.test.ts` or new focused test
  - verifies parent allowlist intersection: child cannot gain inactive parent tools.
  - verifies `--tools agent,read` child effective tools exclude `edit/write/bash`.
  - verifies recursive `agent` hard-denial.

- `packages/coding-agent/test/model-resolver.test.ts` or `agent-tool.test.ts`
  - verifies model precedence: call arg → definition → parent → default.
  - verifies invalid model override errors.

- `packages/coding-agent/test/tool-execution-component.test.ts`
  - verifies `agent` renderer shows agent id, model/context, elapsed/last activity on partial, final status on result.

- `packages/coding-agent/test/interactive-mode-agents-command.test.ts`
  - verifies `/agents` opens selector.
  - verifies `/agents <id>` shows detail/scaffold.
  - verifies unknown id warns and does not submit to LLM.

### Suite/regression tests

Use `packages/coding-agent/test/suite/harness.ts` and faux provider for any model-running tests. Do not call real provider APIs.

Regression naming convention when issue-driven:

- `packages/coding-agent/test/suite/regressions/<issue-number>-agent-tool-<short-slug>.test.ts`

Do not add issue-numbered regression files unless there is a real issue/PR number.

## 15. Validation commands

Run from `packages/coding-agent`.

```bash
npm run check
```

Targeted tests after adding/modifying the listed test files:

```bash
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-definitions.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-tool.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-context-inheritance.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/tools.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/tool-execution-component.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/interactive-mode-agents-command.test.ts
```

If suite-level harness tests are added:

```bash
npx tsx ../../node_modules/vitest/dist/cli.js --run test/suite/<new-agent-tool-test>.test.ts
```

Do not run `npm test`, `npm run build`, or `npm run dev`.

## 16. Docs/changelog updates

- `packages/coding-agent/README.md` — add native `agent` tool, base agents, and `/agents` quick usage.
- `packages/coding-agent/docs/usage.md` — document `agent` schema, examples, default availability, `--tools`/`--no-tools` behavior.
- `packages/coding-agent/docs/tui.md` — document `agent` progress rendering and `/agents` selector.
- `packages/coding-agent/docs/sdk.md` — document exported types/factories only if made public.
- `packages/coding-agent/docs/settings.md` — do not change for MVP unless `Settings.agents` is implemented; otherwise add a short “future custom agents” note only if docs require it.
- `packages/coding-agent/docs/packages.md` — do not change for MVP unless package agent resources are implemented.
- `packages/coding-agent/CHANGELOG.md` — add under `## [Unreleased]`, likely `### Added`: native `agent` tool and `/agents` command.

## 17. Risks & open questions

1. Should `agent` ship in default active tools?
   - Proposed default: yes. It is the native delegation primitive; parent allowlists still control child capabilities.

2. In-memory vs persisted child sessions for transcript provenance?
   - Proposed default: in-memory MVP. Add optional persisted child transcript later after path/provenance UX is designed.

3. Recursive subagent calls — hard-deny or configurable?
   - Proposed default: hard-deny in MVP. Configurable recursion is a footgun and not needed for first-class delegation.

4. Naming: `agent` vs `task` vs `subagent`?
   - Proposed default: `agent`. Keep `subagent` for legacy extension until removal; optional legacy alias only after extension is gone.

5. `statusline-setup` applicability to Pi?
   - Proposed default: keep definition as draft/gated but finalize prompt before merge. Do not copy Claude's statusline prompt; Pi's status/footer mechanism differs (`claude-code-agent-model.md` §2. Built-in/base agents discovered / statusline-setup).

6. Skill removal: when can `pi-subagents/SKILL.md` safely deprecate?
   - Proposed default: only after native docs cover parent orchestration knowledge and the native tool has shipped alongside legacy for at least one release. The skill currently carries parent orchestration behavior that the tool alone does not replace (`current-pi-subagents.md` §9. Skill content: parent behaviors a built-in tool would need to absorb/replace).

7. Child system prompt injection API could disturb normal sessions.
   - Proposed default: add a narrow `systemPromptAppend` option used only by child sessions; test that normal sessions produce unchanged prompts.

8. ResourceLoader reuse may leak mutable extension state.
   - Proposed default: reuse parent auth/settings/model registry; wrap or clone resource loader for child-specific system append if direct reuse is unsafe. Validate with tests around extension prompt rewrites.

9. Parent active tools are not currently on `ToolDefinition.execute()` context.
   - Proposed default: pass a closure through `ToolsOptions.agent` from `AgentSession`, not through public `ExtensionContext`.

10. Read-only agents without `bash` may be less capable than Claude Explore/Plan.
    - Proposed default: keep them strictly read/grep/find/ls until Pi has read-only shell enforcement.

11. Extension tool name conflict with native `agent`.
    - Proposed default: native built-in wins; warn on extension conflict. Do not let extension override a core delegation primitive.

12. Fork mode can include too much context.
    - Proposed default: filter delegation artifacts and preserve normal parent messages; document that fresh is default for most built-ins.

## 18. Final worker-ready implementation prompt

```text
Implement Pi's native built-in `agent` tool MVP. Read these first:

- /Users/luke/Projects/personal/pi-agent-tool/handoff/claude-code-agent-model.md
- /Users/luke/Projects/personal/pi-agent-tool/handoff/current-pi-subagents.md
- /Users/luke/Projects/personal/pi-agent-tool/handoff/pi-native-integration-points.md
- /Users/luke/Projects/personal/pi-agent-tool/handoff/final-agent-tool-plan.md

Scope:
- Build a native built-in `agent` tool at packages/coding-agent/src/core/tools/agent.ts.
- Use in-process child AgentSession via createAgentSessionFromServices + SessionManager.inMemory by default.
- Do not spawn `pi --mode json` and do not use dynamic/inline imports.
- Ship synchronous foreground execution only.
- Bundle built-in agent definitions: general-purpose, explore, plan, statusline-setup, reviewer, scout.
- Implement fresh/fork context modes, parent-bounded tool allowlist intersection, recursive `agent` hard-denial, model/thinking precedence, progress updates via onUpdate, renderCall/renderResult, and `/agents` list/detail/scaffold UI.
- Add docs/changelog and focused tests.

Touch only MVP files named in section 13 of final-agent-tool-plan.md. Do not implement custom agent file discovery, true background/async, chains, worktrees, intercom bridge, manager UI, output artifact workflows, or legacy `subagent` alias.

Required validation from packages/coding-agent:
- npm run check
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-definitions.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-tool.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-context-inheritance.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/tools.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/tool-execution-component.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/interactive-mode-agents-command.test.ts

Repo rules:
- No inline/dynamic imports.
- No `any` unless unavoidable.
- Do not remove intentional functionality.
- Do not run npm test, npm run build, or npm run dev.
- If modifying a test file, run that specific test and iterate until it passes.
```

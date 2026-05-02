# Native `agent` Tool — Oracle Review + Revised Implementation Plan

## 1. Executive summary

Build Pi's native delegation primitive as a first-class built-in `agent` tool with **single, parallel, and chain modes in MVP**.

Decisions:

- **Runtime:** in-process child `AgentSession`, not spawned `pi --mode json`.
- **Modes:** one schema supports exactly one of single `{agent, task}`, parallel `{tasks}`, or sequential chain `{chain}`.
- **Context:** replace binary fresh/fork with independent tiers: transcript, project context, skills, and system context. Public shorthands: `default`, `fork`, `slim`, `none`.
- **Discovery:** built-in + user agents in MVP; project agents require explicit scope and UI confirmation.
- **Permissions:** parent active tools are a hard ceiling; recursive `agent` is hard-denied.
- **Migration:** keep legacy `subagent` and the official example until native parity is real; repurpose the official example as a migration/reference example, not delete it.

Why this changes the plan:

- Pi's official example already supports single/parallel/chain (`packages/coding-agent/examples/extensions/subagent/README.md:91-97`, `packages/coding-agent/examples/extensions/subagent/index.ts:7-10`). Dropping chain/parallel would regress the Pi baseline.
- Claude's “fresh” agents do **not** mean blank context: they omit parent transcript but still load user/project/system context (`/Users/luke/Projects/testing/claude-code-cli-src-code/src/tools/AgentTool/runAgent.ts:368-383`). Explore/Plan then selectively omit CLAUDE.md and git status (`runAgent.ts:385-410`).
- The official Pi example spawns processes because it is an extension (`README.md:7`, `README.md:57`; `index.ts:304-310`). Native core should not copy that workaround when `createAgentSessionFromServices()` exists (`packages/coding-agent/src/core/agent-session-services.ts:179-198`).

## 2. Goals & non-goals

### MVP goals

1. Add built-in `agent` tool, available through normal Pi tool activation semantics.
2. Support **single**, **top-level parallel**, and **sequential chain** execution in the public schema.
3. Run child agents as in-process child `AgentSession`s with isolated `SessionManager`s and child resource loading.
4. Implement context modes:
   - `default`: no parent transcript; project context + skills inherited.
   - `fork`: filtered parent transcript + project context + skills inherited.
   - `slim`: no transcript; omit project context/skills; keep Pi base/system/tool prompt.
   - `none`: no transcript, no project context, no skills, no project append prompt; only Pi base + selected agent prompt + task.
5. Bundle portable base agents: `general-purpose`, `worker`, `explore`, `plan`, `scout`, `reviewer`, `statusline-setup`.
6. Load user agent markdown files from `~/.pi/agent/agents/*.md` in MVP.
7. Load project agent markdown files from nearest `.pi/agents/*.md` only when `agentScope` explicitly includes project and UI confirmation passes.
8. Enforce parent-bounded tool inheritance, per-agent allow/deny lists, and recursive `agent` denial.
9. Implement model/thinking precedence.
10. Stream child progress through `onUpdate` into the existing tool rendering path.
11. Preserve compact output and artifact workflows with parent-owned `output`/`outputMode` for child final reports.
12. Add `/agents` list/detail/scaffold UI.
13. Document native usage, migration from `subagent`, and what remains legacy-only.
14. Add focused tests using the existing harness/faux provider pattern.

### Deferred / non-goals

- **True background/detached async:** defer. Claude has `run_in_background` (`AgentTool.tsx:82-87`) and `async_launched`; `pi-subagents` has detached jiti runners (`handoff/current-pi-subagents.md:77-84`, `242-253`). Pi core has no native detached tool scheduler yet (`handoff/pi-native-integration-points.md:40-47`).
- **Worktree isolation:** defer. Claude supports `isolation: "worktree"` (`AgentTool.tsx:98-100`) and `pi-subagents` supports worktrees (`handoff/current-pi-subagents.md:237-240`), but the official Pi example does not. Implement after native chain/parallel basics are stable.
- **Nested parallel steps inside chain:** defer. Current `pi-subagents` supports chain parallel groups (`handoff/current-pi-subagents.md:147-149`, `214`); official Pi example chain is sequential only (`examples/extensions/subagent/README.md:97`, `index.ts:501-554`). MVP matches official baseline.
- **Intercom bridge / SendMessage-style live child follow-up:** defer. `pi-subagents` intercom is optional and package-specific (`handoff/current-pi-subagents.md:280-283`). Claude has SendMessage for named/background agents (`prompt.ts:267`), but native Pi needs a task/session addressing layer first.
- **Full `/agents` manager authoring UI:** defer. MVP lists/details/scaffolds. LLM-powered create/update/delete is legacy-only until native resource editing is designed.
- **Package-provided agent resources:** defer. User/project markdown discovery ships first; package resources need package-manager/resource-loader changes.
- **Legacy `subagent` removal:** defer. Native `agent` ships side-by-side.

## 3. Recommended architecture

### Decision

Use an **in-process child `AgentSession`** for native execution.

The official example proves the behavior shape, not the process model. It spawns a separate `pi` process because extension code only has public extension APIs (`examples/extensions/subagent/index.ts:304-310`). Native core can construct child sessions directly through `createAgentSessionFromServices()` (`packages/coding-agent/src/core/agent-session-services.ts:179-198`) and avoid the extension workaround.

### Why not spawn for native MVP

Spawn is proven, but wrong for first-class core:

- It duplicates auth/settings/model/resource loading through CLI flags (`examples/extensions/subagent/index.ts:265-268`, `294-310`).
- It parses JSONL stdout instead of receiving typed session events (`index.ts:313-347`).
- It forces OS/env boundaries (`PI_SUBAGENT_CHILD` in `pi-subagents`) to avoid recursive registration (`handoff/current-pi-subagents.md:93`, `333`).
- It makes progress, abort, artifacts, and status depend on process lifecycle plumbing.

In-process is still sound if isolation is explicit:

- Each child gets its own `SessionManager.inMemory()` or persisted child session, not the parent session.
- Each child gets a child `ResourceLoader` configured for context mode; do **not** share mutable extension/runtime state blindly.
- Each child gets effective tools computed before session creation; recursive `agent` is removed.
- Each child gets parent auth/settings/model registry references, not shell-reloaded copies.

### Runtime flow

1. Parent LLM calls `agent` with exactly one mode: single, parallel, or chain.
2. Tool resolves agent definitions from built-ins + configured scopes.
3. Tool validates project agent confirmation if project scope is used.
4. Tool normalizes each task with inherited defaults: `context`, `tools`, `model`, `thinking`, `output`.
5. For each child run:
   - resolve effective context tiers,
   - resolve model/thinking,
   - compute effective tools,
   - create child services/session,
   - run child prompt,
   - stream progress to parent `onUpdate`,
   - collect final report/details/usage,
   - optionally write parent-owned output file.
6. Parallel uses a concurrency-limited Promise pool; default max 8 tasks, concurrency 4, matching the official example (`README.md:96`, `172`; `index.ts:27-28`, `597-618`).
7. Chain runs sequentially, replacing `{previous}` with the previous final output, matching the official example (`README.md:97`; `index.ts:501-554`).
8. Tool returns a compact aggregate result with structured details for UI replay.

### Required core plumbing

Add a narrow child-session factory to `AgentSession`, not public extension context:

- parent services: `authStorage`, `settingsManager`, `modelRegistry`;
- child resource-loader factory/config;
- parent active tool getter;
- parent session context getter;
- optional child session persistence root;
- child marker: `isAgentToolChild`.

Do not expose auth/settings internals to third-party tools.

## 4. Built-in `agent` tool schema

Use TypeBox. No dynamic/inline imports.

### Input schema

```ts
const contextModeSchema = Type.Union([
  Type.Literal("default"),
  Type.Literal("fork"),
  Type.Literal("slim"),
  Type.Literal("none"),
]);

const thinkingSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("minimal"),
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
  Type.Literal("xhigh"),
]);

const taskSchema = Type.Object({
  agent: Type.String({ description: "Agent id/name to run" }),
  task: Type.String({ description: "Task for the child agent" }),
  description: Type.Optional(Type.String({ description: "Short UI label" })),
  context: Type.Optional(contextModeSchema),
  extraContext: Type.Optional(Type.String({ description: "Additional task-specific context" })),
  model: Type.Optional(Type.String()),
  tools: Type.Optional(Type.Array(Type.String())),
  thinking: Type.Optional(thinkingSchema),
  output: Type.Optional(Type.String({ description: "Path for parent to save final child report" })),
  outputMode: Type.Optional(Type.Union([Type.Literal("inline"), Type.Literal("file"), Type.Literal("both")])),
});

export const agentToolSchema = Type.Object({
  agent: Type.Optional(Type.String()),
  task: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  tasks: Type.Optional(Type.Array(taskSchema, { maxItems: 8 })),
  chain: Type.Optional(Type.Array(taskSchema, { minItems: 1 })),
  concurrency: Type.Optional(Type.Number({ minimum: 1, maximum: 8, default: 4 })),
  context: Type.Optional(contextModeSchema),
  extraContext: Type.Optional(Type.String()),
  model: Type.Optional(Type.String()),
  tools: Type.Optional(Type.Array(Type.String())),
  thinking: Type.Optional(thinkingSchema),
  output: Type.Optional(Type.String()),
  outputMode: Type.Optional(Type.Union([Type.Literal("inline"), Type.Literal("file"), Type.Literal("both")])),
  chainDir: Type.Optional(Type.String({ description: "Base directory for relative chain outputs" })),
  agentScope: Type.Optional(Type.Union([Type.Literal("user"), Type.Literal("project"), Type.Literal("both")])),
  confirmProjectAgents: Type.Optional(Type.Boolean({ default: true })),
});
```

### Mode validation

Exactly one of these must be true:

- single: `agent && task`
- parallel: `tasks.length > 0`
- chain: `chain.length > 0`

This matches the official example's mode validation (`examples/extensions/subagent/index.ts:449-474`).

### Details type

```ts
export interface AgentRunDetails {
  agent: string;
  source: "builtin" | "user" | "project";
  task: string;
  description?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  context: ResolvedContextPolicy;
  model?: { provider: string; id: string; name?: string };
  thinking?: ThinkingLevel;
  effectiveTools: string[];
  deniedTools: string[];
  durationMs: number;
  toolCallCount: number;
  messageCount: number;
  outputPath?: string;
  usage?: unknown;
  error?: string;
}

export interface AgentToolDetails {
  mode: "single" | "parallel" | "chain";
  status: "running" | "completed" | "failed" | "cancelled";
  runs: AgentRunDetails[];
  concurrency?: number;
  chainDir?: string;
}
```

### Rejected schema fields

- `async` / `run_in_background`: defer until native task scheduler exists.
- `worktree` / `isolation`: defer until safe parallel-writer design.
- `cwd`: defer; cwd switching is a permission boundary. All MVP children run in parent cwd.
- `action: list|get|create|update|delete|status|interrupt|resume|doctor`: not in native tool. Use `/agents` and docs.

## 5. Base agent definitions and default prompts

Definitions live in `packages/coding-agent/src/core/agents/definitions.ts`.

Common fields:

```ts
interface AgentDefinition {
  id: string;
  description: string;
  prompt: string;
  tools?: string[] | "*";
  denyTools?: string[];
  model?: string | "inherit";
  thinking?: ThinkingLevel | "inherit";
  defaultContext?: "default" | "fork" | "slim" | "none";
  inheritProjectContext?: boolean;
  inheritSkills?: boolean;
}
```

### `general-purpose`

- Tools: `*`; deny `agent`.
- Model: `inherit`.
- Context: `default`.

```text
You are a Pi child agent. Complete the delegated task fully without gold-plating.
Search broadly when the location is unclear. Prefer editing existing files over creating new files.
Do not create documentation unless explicitly requested.
Return a concise report with findings, files changed, and validation performed.
```

### `worker`

- Tools: `*`; deny `agent`.
- Model: `inherit`.
- Context: `fork` by default only when selected explicitly; otherwise caller default applies.
- Rationale: preserves official/current `worker` workflow names (`README.md:25`, `151`, `157`, `159`).

```text
You are a Pi implementation worker. Execute the assigned implementation task in this child context.
Respect the caller's constraints exactly. Make the smallest complete change.
Do not delegate. Do not broaden scope. Report changes, validation, and blockers.
```

### `explore`

- Tools: `read`, `grep`, `find`, `ls`.
- Deny: `agent`, `edit`, `write`, `bash`.
- Model: `inherit`.
- Context: `slim`.

```text
You are a read-only exploration agent. Find relevant files, symbols, flows, and constraints.
Do not modify files or system state. Start broad, then narrow.
Cite concrete paths and separate evidence from inference.
Return compact findings and open questions.
```

### `plan`

- Tools: `read`, `grep`, `find`, `ls`.
- Deny: `agent`, `edit`, `write`, `bash`.
- Model: `inherit`.
- Context: `slim`.

```text
You are a read-only software planning agent. Understand the requirement and current architecture.
Identify exact integration points, files to edit, risks, and validation commands.
Do not modify files or system state.
End with critical files for implementation.
```

### `scout`

- Tools: `read`, `grep`, `find`, `ls`.
- Deny: `agent`, `edit`, `write`, `bash`.
- Model: `inherit`.
- Context: `slim`.

```text
You are a fast codebase scout. Stay read-only.
Find the smallest useful set of files and facts for the caller.
Do not solve the task unless asked. Keep output compact and actionable.
```

### `reviewer`

- Tools: `read`, `grep`, `find`, `ls`.
- Deny: `agent`, `edit`, `write`, `bash`.
- Model: `inherit`.
- Context: `default` unless caller asks for `fork`.

```text
You are a read-only reviewer. Verify claims against concrete files and outputs.
Prioritize correctness, regressions, safety, and missing validation.
Do not rewrite the implementation. Return PASS, FAIL, or PARTIAL with evidence.
```

### `statusline-setup`

- Tools: `read`, `edit`.
- Deny: `agent`, `write`, `bash` by default.
- Model: `inherit`.
- Context: `default`.
- Status: draft/gated until Pi's status/footer target behavior is confirmed.

```text
You configure Pi status/footer/statusline settings only.
Read existing settings first. Preserve unrelated settings exactly.
Make the smallest safe change. Do not edit Claude-specific files.
Report changed path, summary, verification, and revert instructions.
```

Do not copy Claude's statusline prompt verbatim; it targets Claude settings and JSON stdin contract (`handoff/claude-code-agent-model.md:108-113`).

## 6. Context inheritance model

Claude proves the important distinction:

- Parent transcript is present only when `forkContextMessages` is supplied (`runAgent.ts:368-373`).
- User/project context still loads via `getUserContext()` and `getSystemContext()` (`runAgent.ts:380-383`).
- Read-only Explore/Plan omit CLAUDE.md and stale git status separately (`runAgent.ts:385-410`).

Pi should model those as independent tiers.

| Public mode | Parent transcript | Project context files | Skills | Append/system project context | Use case |
|---|---:|---:|---:|---:|---|
| `default` | No | Yes | Yes | Yes | General delegated task with normal Pi project knowledge. |
| `fork` | Yes, filtered | Yes | Yes | Yes | High-context continuation/review where prior conversation matters. |
| `slim` | No | No | No by default | Pi base only + agent prompt | Explore/plan/scout where context docs are token-heavy or biasing. |
| `none` | No | No | No | Pi base only + agent prompt | Sandboxed specialist: task-only, no repo instructions outside base prompt. |

### Filtering for `fork`

When forking parent transcript:

- include normal user/assistant messages on current branch;
- strip native `agent` tool calls/results;
- strip legacy `subagent` tool calls/results;
- strip extension-only custom entries unless they are `CustomMessageEntry`s intended for LLM context;
- preserve compaction summaries via `buildSessionContext()`.

Pi has the needed APIs: `buildSessionContext()` and `SessionManager.buildSessionContext()` (`packages/coding-agent/src/core/session-manager.ts:315-419`, `1049-1050`), `getEntries()` (`session-manager.ts:1066-1067`), and `SessionManager.inMemory()` (`session-manager.ts:1305-1307`).

### Resource loader policy

Create child `AgentSessionServices` with child-specific `DefaultResourceLoaderOptions`:

- `default`/`fork`: normal loader.
- `slim`: `noContextFiles: true`, `noSkills: true`, keep normal Pi base system prompt and tool snippets.
- `none`: `noContextFiles: true`, `noSkills: true`, ignore discovered `APPEND_SYSTEM.md` via `appendSystemPromptOverride`, and append only child boundary + agent prompt.

Existing resource-loader hooks support this shape (`resource-loader.ts:169-195`, `531-545`). The system prompt accepts appended text (`system-prompt.ts:17-50`; `agent-session.ts:940-953`).

### Agent defaults

- `general-purpose`: `default`
- `worker`: `fork` when explicitly invoked for implementation handoff; otherwise caller may override.
- `explore`, `plan`, `scout`: `slim`
- `reviewer`: `default`
- `statusline-setup`: `default`

## 7. Tool permission & model selection behavior

### Tool policy

Effective child tools:

```text
effective = parentActiveTools
  ∩ requestedToolsOrAll
  ∩ agentAllowTools
  - agentDenyTools
  - globalDenyTools
```

Rules:

1. Parent active tools are a hard ceiling.
2. `agent` is always removed in MVP.
3. `tools: "*"` means all parent-active tools except denies.
4. Unknown requested tools are hard errors.
5. Parent-inactive requested tools are hard errors; do not silently broaden.
6. Read-only agents do not receive `bash` until Pi has read-only shell enforcement.
7. Extension tools are allowed only when already active in parent and allowed by agent policy.
8. `--tools`, `--no-tools`, and `--no-builtin-tools` semantics must stay unchanged.

Pi's registry/allowlist code is session-level (`agent-session.ts:2266-2355`), default active tools are currently `read,bash,edit,write` (`sdk.ts:269-275`; `agent-session.ts:2401-2408`), and built-ins are created in `createAllToolDefinitions()` (`agent-session.ts:2362-2379`). Thread `agent` through those paths without bypassing them.

### Model precedence

1. task-level `model`
2. tool-level `model`
3. agent definition `model` if not `inherit`
4. parent current model
5. provider default

Validate through `ModelRegistry`; error if unavailable.

### Thinking precedence

1. task-level `thinking`
2. tool-level `thinking`
3. agent definition `thinking` if not `inherit`
4. parent current thinking
5. Pi default, clamped by model capability (`sdk.ts:260-267`)

### Permission prompt stance

The `agent` tool itself is read-only in intent, but child tools are not. Follow Claude's split: the parent-facing agent tool delegates permission checks to underlying child tools (`AgentTool.tsx:1264-1266`). In Pi MVP, enforce that by using child `AgentSession` tool lists and existing extension interception.

## 8. TUI/status/progress UX

### Minimum rendering

`renderCall`:

- mode: single / parallel / chain;
- agent names;
- context mode;
- model override if any;
- task previews;
- scope marker for project/user.

`onUpdate` pending content:

- single: last child activity + final text preview;
- parallel: `N/M done, R running`, with per-task status;
- chain: completed steps + current step status.

`renderResult`:

- final status;
- per-agent rows;
- tool call count;
- output path reference if file output used;
- markdown-rendered final child reports when expanded.

The official example's UI is the baseline: collapsed rows, expanded markdown, usage stats, and parallel status (`README.md:99-121`; `index.ts:881-980`). Native can start simpler but must preserve mode visibility.

### Progress mapping

Map child session events to `onUpdate` details:

- child tool start/end → update `lastActivity`, `toolCallCount`;
- child assistant text → update preview;
- child completion/error → update run status;
- parallel pool state → aggregate progress;
- chain step boundary → aggregate step progress.

Pi already renders tool execution updates (`handoff/pi-native-integration-points.md:40-47`).

### Usage accounting

MVP should report whatever child session exposes without inventing totals. If usage is unavailable through events, leave `usage` undefined and add a follow-up task. Do not block MVP on perfect token accounting.

## 9. Discovery & config

### MVP discovery

Sources, in precedence order:

1. project agents: nearest `.pi/agents/*.md`, only when `agentScope` is `project` or `both`;
2. user agents: `~/.pi/agent/agents/*.md`;
3. built-in definitions.

Project overrides user; user overrides built-in. This matches the official example's project-over-user behavior (`examples/extensions/subagent/README.md:138-142`; `agents.ts:97-115`).

Default scope:

- Built-ins always visible.
- User agents visible by default.
- Project agents require explicit `agentScope: "project" | "both"` and UI confirmation when `ctx.hasUI`, matching the official example's security model (`README.md:55-65`; `index.ts:476-499`).

### Markdown agent format

Support the official example's existing frontmatter first (`README.md:123-136`; `agents.ts:52-71`):

```markdown
---
name: scout
description: Fast codebase recon
tools: read, grep, find, ls
model: inherit
context: slim
---
System prompt body.
```

Native extensions:

```yaml
denyTools: agent, edit, write, bash
thinking: inherit
defaultContext: slim
inheritProjectContext: false
inheritSkills: false
```

Validation:

- required: `name`, `description`, prompt body;
- invalid file: warn and skip;
- duplicate same precedence: warn and skip later duplicate;
- unknown fields: warn and ignore.

### Deferred discovery

Package-provided agents (`pi.agents` / package `agents/`) are deferred. Reason: package manager/resource loader needs a fifth resource type; not required to avoid regression against the official example, which documents user/project locations only (`README.md:138-140`).

## 10. Slash command `/agents`

### MVP behavior

- `/agents`: open selector/list of built-in + active-scope user agents.
- `/agents <id>`: show detail for that agent.
- Project agents: show hint to use `agentScope: "both"` or a future UI toggle; do not auto-enable project prompts.
- Enter on an agent inserts a prompt scaffold:

```text
Use the <agent-id> agent to: 
```

No direct tool call injection. Keep the model in the loop.

### Files

- `packages/coding-agent/src/core/slash-commands.ts` — add autocomplete metadata.
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts` — handle command.
- `packages/coding-agent/src/modes/interactive/components/agents-selector.ts` — list/detail/scaffold UI.

### Deferred

- create/update/delete manager;
- chain template manager;
- project-agent authoring UI;
- native replacement for legacy `/parallel` and `/chain` prompt commands.

Reason: current `pi-subagents` manager UI is user-visible but broad (`handoff/current-pi-subagents.md:313-321`, `367`); MVP needs execution parity first.

## 11. Migration & removal plan

### Phase 0 — native side-by-side

- Ship native `agent` tool.
- Keep legacy `subagent` extension untouched.
- Keep official example untouched except docs note “native exists; example demonstrates extension patterns and migration”.
- Add docs comparing native vs legacy.

### Phase 1 — official example repurpose

Do **not** delete `packages/coding-agent/examples/extensions/subagent/`.

Repurpose it:

- rename docs framing from “recommended subagent path” to “legacy extension implementation/reference”; or add a banner at top of README;
- keep it compiling/tests passing as an extension API example;
- add migration notes:
  - single: `subagent {agent, task}` → `agent {agent, task}`;
  - parallel: `subagent {tasks}` → `agent {tasks}`;
  - chain: `subagent {chain}` → `agent {chain}`;
  - project/user agents: same markdown locations, native subset of fields;
  - process isolation: legacy only until native adds optional spawn/isolation.

Reason: the example is valuable extension documentation and evidence of baseline behavior (`README.md:1-12`, `91-121`). Deleting it would remove a useful API sample and break docs history.

### Phase 2 — deprecate external `pi-subagents` package usage

Only after native covers:

- single/parallel/chain;
- user/project discovery;
- context modes including fork/default/none/slim;
- output file references;
- basic `/agents` list/detail;
- docs replacing parent orchestration guidance.

Then mark nicobailon `pi-subagents` skill/package as optional/legacy in docs. Do not auto-remove Luke's installed packages (`handoff/current-pi-subagents.md:302`, `358`).

### Phase 3 — parity decisions before removal

Before removing from defaults or recommending uninstall, decide explicitly on:

- async/status/interrupt/resume;
- intercom bridge;
- worktree isolation;
- chain parallel groups;
- manager UI;
- prompt-template workflows.

Old async dirs/status files may remain orphaned if extension is removed (`handoff/current-pi-subagents.md:363`). Document cleanup only; do not delete automatically.

## 12. Compatibility decisions

1. **Tool name:** native is `agent`. No `subagent` alias until legacy extension is gone.
2. **Default active:** add `agent` to default active built-ins if product wants first-class delegation by default. `--no-builtin-tools` and `--tools` must still control it.
3. **Tool conflict:** built-in `agent` wins. If an extension registers `agent`, warn and ignore/namespace the extension registration. Current registry lets extension tools override built-ins (`agent-session.ts:2291-2296`, `2326-2329`); fix for this name.
4. **Legacy extension:** `subagent` remains a separate extension tool. No behavior changes.
5. **User agents:** native supports official markdown subset. Unknown legacy fields ignored with warnings.
6. **Project agents:** explicit opt-in + confirm.
7. **Context default:** public default is `default`, not blank and not fork.
8. **Read-only agents:** no `bash` in MVP.
9. **Recursive delegation:** hard-denied.
10. **Parallel writers:** possible only if their effective tools include write/edit; no worktree safety in MVP. Docs should recommend one writer unless worktree isolation exists.
11. **Output files:** parent writes child final output; child does not need `write` just to save report.
12. **No dynamic imports:** all new imports top-level.

## 13. Files to edit / create

### Edit

- `packages/coding-agent/src/core/tools/index.ts`
  - add `agent` to `ToolName`, `allToolNames`, `ToolsOptions`, dispatchers, exports.
- `packages/coding-agent/src/core/sdk.ts`
  - include `agent` in default active tool names if approved;
  - retain/pass services needed for child factory.
- `packages/coding-agent/src/core/agent-session.ts`
  - store child factory inputs;
  - pass `ToolsOptions.agent` into `createAllToolDefinitions()`;
  - expose parent active tools through internal closure;
  - protect built-in `agent` from extension override.
- `packages/coding-agent/src/core/agent-session-services.ts`
  - add child resource-loader options / service cloning support if needed.
- `packages/coding-agent/src/core/resource-loader.ts`
  - use existing override hooks for `slim`/`none`; add tiny helper only if current API is too awkward.
- `packages/coding-agent/src/core/slash-commands.ts`
  - add `/agents` metadata.
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
  - route `/agents`.
- `packages/coding-agent/src/modes/interactive/components/index.ts`
  - export selector if component index exists.
- `packages/coding-agent/README.md`
- `packages/coding-agent/docs/usage.md`
- `packages/coding-agent/docs/extensions.md`
  - document official example's legacy/reference status.
- `packages/coding-agent/docs/tui.md`
- `packages/coding-agent/docs/sdk.md` only if public types/factories are exported.
- `packages/coding-agent/CHANGELOG.md`

### Create

- `packages/coding-agent/src/core/tools/agent.ts`
  - schema, execution dispatcher, run aggregation, renderers.
- `packages/coding-agent/src/core/agents/types.ts`
- `packages/coding-agent/src/core/agents/definitions.ts`
- `packages/coding-agent/src/core/agents/loader.ts`
  - user/project markdown loading and validation.
- `packages/coding-agent/src/core/agents/registry.ts`
  - built-in/user/project resolution and precedence.
- `packages/coding-agent/src/core/agents/context.ts`
  - context policies, fork filtering, child resource options.
- `packages/coding-agent/src/core/agents/executor.ts`
  - single run primitive, parallel pool, sequential chain.
- `packages/coding-agent/src/core/agents/output.ts`
  - safe parent-owned output writes.
- `packages/coding-agent/src/modes/interactive/components/agents-selector.ts`

### Do not touch in MVP

- package manager resource-type support for `pi.agents`;
- worktree helpers;
- detached async runner/status/resume;
- legacy extension removal.

## 14. Tests to add

Use existing harness patterns; faux provider only.

### Unit tests

- `test/agent-definitions.test.ts`
  - built-in ids exist;
  - prompts non-empty;
  - read-only agents have no `bash/edit/write/agent`;
  - `worker`/`general-purpose` deny recursive `agent`.

- `test/agent-loader.test.ts`
  - loads official markdown frontmatter subset;
  - user/project precedence;
  - invalid files warn/skip;
  - project agents excluded by default.

- `test/agent-context-inheritance.test.ts`
  - `default` excludes transcript and includes context files;
  - `fork` includes filtered transcript;
  - `slim` excludes context files/skills;
  - `none` excludes transcript/context files/skills/append project prompt;
  - fork strips native `agent` and legacy `subagent` artifacts.

- `test/agent-tool.test.ts`
  - schema requires exactly one mode;
  - single execution returns final child output;
  - parallel runs with concurrency limit and preserves order;
  - chain substitutes `{previous}` and stops on failure;
  - unknown agent error includes available names;
  - output/outputMode writes expected parent-owned file.

- `test/agent-permissions.test.ts`
  - child cannot gain inactive parent tools;
  - `--tools agent,read` yields child `read` only after recursive denial;
  - requested inactive tool errors;
  - extension tool allowed only when active and allowed.

- `test/agent-model-selection.test.ts`
  - task → tool → definition → parent → default precedence;
  - invalid model errors;
  - thinking precedence and clamp behavior.

- `test/tool-execution-component.test.ts`
  - `agent` renderer displays single/parallel/chain states;
  - partial progress displays running rows;
  - expanded mode renders markdown outputs.

- `test/interactive-mode-agents-command.test.ts`
  - `/agents` opens selector;
  - `/agents <id>` shows details;
  - selecting inserts scaffold;
  - project agents not shown unless explicitly enabled.

### Suite tests

Add suite/harness tests only for model-running behavior:

- `test/suite/agent-tool-single.test.ts`
- `test/suite/agent-tool-parallel-chain.test.ts`
- `test/suite/agent-tool-context-modes.test.ts`

No real provider APIs.

## 15. Validation commands

Run from `packages/coding-agent`.

```bash
npm run check
```

Targeted tests after modifying/adding them:

```bash
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-definitions.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-loader.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-context-inheritance.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-tool.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-permissions.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-model-selection.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/tool-execution-component.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/interactive-mode-agents-command.test.ts
```

If suite tests are added:

```bash
npx tsx ../../node_modules/vitest/dist/cli.js --run test/suite/agent-tool-single.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/suite/agent-tool-parallel-chain.test.ts
npx tsx ../../node_modules/vitest/dist/cli.js --run test/suite/agent-tool-context-modes.test.ts
```

Do not run `npm test`, `npm run build`, or `npm run dev`.

## 16. Docs/changelog updates

- `packages/coding-agent/README.md`
  - native `agent` tool overview;
  - base agents;
  - single/parallel/chain examples;
  - context modes.
- `packages/coding-agent/docs/usage.md`
  - schema, examples, `--tools`/`--no-tools`/`--no-builtin-tools` behavior.
- `packages/coding-agent/docs/extensions.md`
  - note official `examples/extensions/subagent/` is now legacy/reference; explain extension-vs-native tradeoff.
- `packages/coding-agent/docs/skills.md`
  - clarify native agents are not skills; skills may still be inherited by context mode.
- `packages/coding-agent/docs/tui.md`
  - `/agents` selector and progress rendering.
- `packages/coding-agent/docs/sdk.md`
  - only if native agent types/factory become public.
- `packages/coding-agent/examples/extensions/subagent/README.md`
  - add migration banner; do not delete example.
- `packages/coding-agent/CHANGELOG.md`
  - `## [Unreleased]` → `### Added`: native `agent` tool with single/parallel/chain modes and `/agents`.

## 17. Risks & open questions

1. **In-process isolation is not OS isolation.** Mitigation: separate child `SessionManager`, child resource loader, hard-denied recursion, tests for no transcript/context leakage.
2. **ResourceLoader/extension state may not be safe to share.** Decision: create child services/resource loader per run; share only auth/settings/model registry unless tests prove safe.
3. **Default active `agent` may surprise users.** Proposed: yes, because native first-class tool. `--tools` and `--no-builtin-tools` remain escape hatches.
4. **Project agents are repo-controlled prompts.** Mitigation: explicit scope + UI confirmation, matching official example security model (`README.md:55-65`).
5. **Parallel writers can conflict without worktrees.** Mitigation: docs warn; no worktree in MVP; output path collision detection required.
6. **`none` mode can hide important project rules.** Mitigation: only explicit or per-agent default for sandboxed specialists; default remains `default`.
7. **Statusline agent may be premature.** Keep prompt draft/gated until Pi statusline target is confirmed.
8. **Usage accounting may be incomplete.** Do not block MVP; include fields opportunistically.
9. **Legacy prompt workflows depend on slash commands.** Native `agent` execution parity does not replace `/implement` etc. Document legacy-only until native prompt templates are migrated.
10. **Package resource discovery deferred.** External packaged agents still require legacy extension or manual user/project copy until package-manager support lands.
11. **Child session persistence undecided.** MVP can use in-memory plus parent-owned output files; persisted child transcripts can follow.
12. **Tool override semantics need care.** Built-in `agent` should not be overrideable by extension registration; current registry allows custom tools to replace built-ins.

## 18. Final worker-ready implementation prompt

```text
Implement Pi's native built-in `agent` tool MVP. No dynamic/inline imports. Do not remove or break the legacy `subagent` extension or the official example.

Read first:
- /Users/luke/Projects/personal/pi-agent-tool/handoff/oracle-review-and-revised-plan.md
- /Users/luke/Projects/personal/pi-agent-tool/handoff/claude-code-agent-model.md
- /Users/luke/Projects/personal/pi-agent-tool/handoff/current-pi-subagents.md
- /Users/luke/Projects/personal/pi-agent-tool/handoff/pi-native-integration-points.md
- /Users/luke/Projects/personal/pi-agent-tool/packages/coding-agent/examples/extensions/subagent/README.md
- /Users/luke/Projects/personal/pi-agent-tool/packages/coding-agent/examples/extensions/subagent/index.ts

Scope:
- Add a native built-in `agent` tool in packages/coding-agent/src/core/tools/agent.ts.
- Use in-process child AgentSession via createAgentSessionFromServices and isolated child SessionManager; do not spawn `pi --mode json`.
- Implement exactly-one-mode schema: single `{agent, task}`, parallel `{tasks}`, sequential chain `{chain}`.
- Implement context modes: default, fork, slim, none.
- Implement built-in agents: general-purpose, worker, explore, plan, scout, reviewer, statusline-setup.
- Implement user agent discovery from ~/.pi/agent/agents/*.md and explicit project discovery from nearest .pi/agents/*.md with UI confirmation.
- Implement parent-bounded tool intersection, recursive `agent` hard-denial, model/thinking precedence, progress updates, compact renderers, output/outputMode file saving, and `/agents` list/detail/scaffold UI.
- Preserve --tools, --no-tools, and --no-builtin-tools semantics.
- Keep legacy `subagent` untouched. Add docs that the official subagent example is legacy/reference and document migration.

Do not implement:
- detached async/background/status/resume,
- worktree isolation,
- nested parallel chain steps,
- intercom/SendMessage bridge,
- full /agents manager create/update/delete,
- package-provided agent resources,
- `subagent` alias.

Validation from packages/coding-agent:
- npm run check
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-definitions.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-loader.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-context-inheritance.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-tool.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-permissions.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-model-selection.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/tool-execution-component.test.ts
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/interactive-mode-agents-command.test.ts
- suite tests only if added, using test/suite/harness.ts and faux provider.

Repo rules:
- No `any` unless unavoidable.
- Never use inline/dynamic imports.
- Do not run npm test, npm run build, or npm run dev.
- If modifying a test file, run that exact test and iterate until it passes.
```

## Δ vs v1 plan

- **Promoted chain into MVP** — official Pi example documents chain mode and implements `{previous}` sequential execution (`examples/extensions/subagent/README.md:91-97`, `index.ts:501-554`); v1 deferred it (`handoff/final-agent-tool-plan.md:32`).
- **Promoted top-level parallel into MVP** — official Pi example documents parallel mode, max 8 / concurrency 4, and streams aggregate progress (`README.md:96`, `172`; `index.ts:556-634`); v1 deferred it (`handoff/final-agent-tool-plan.md:33`).
- **Replaced binary fresh/fork with four context modes** — Claude source separates parent transcript, user/project context, and system context (`runAgent.ts:368-410`); v1 modeled only fresh/fork (`handoff/final-agent-tool-plan.md:256-266`).
- **Added `none` context mode** — Luke requested blank/no context outside base; implemented as no transcript/context files/skills/project append.
- **Renamed default fresh semantics to `default`** — Claude “fresh” still loads project/system context (`runAgent.ts:380-383`), so `fresh` was misleading.
- **Kept in-process architecture** — official example spawn is extension-era implementation (`README.md:7`, `57`; `index.ts:304-310`), while native core has `createAgentSessionFromServices()` (`agent-session-services.ts:179-198`); no reversal.
- **Strengthened in-process isolation requirements** — child must get its own `SessionManager` and child resource loader, not shared mutable runtime state; this addresses the official example's process-isolation guarantee.
- **Promoted user/project markdown agent discovery into MVP** — official example supports `~/.pi/agent/agents` and `.pi/agents` with project override (`README.md:138-142`; `agents.ts:97-115`); v1 deferred user/project discovery (`handoff/final-agent-tool-plan.md:337-352`).
- **Added project-agent confirmation** — official example confirms project-local agents interactively (`README.md:55-65`; `index.ts:476-499`); v1 did not include the security prompt.
- **Added `worker` base agent** — official/current workflows include worker (`README.md:25`, `151`, `157`, `159`); v1 omitted it as a base definition.
- **Added parent-owned `output`/`outputMode` to MVP** — current `pi-subagents` preservation points include saved output/file-only references (`handoff/current-pi-subagents.md:336`); v1 deferred output artifacts (`handoff/final-agent-tool-plan.md:139`).
- **Kept async/background deferred with stronger rationale** — Claude and nicobailon support async, but official Pi example does not and Pi lacks native detached scheduler (`handoff/pi-native-integration-points.md:40-47`; `handoff/current-pi-subagents.md:242-253`).
- **Kept worktree deferred with stronger rationale** — Claude/current extension support it, official example does not; parallel execution parity can ship without parallel-writer isolation (`handoff/current-pi-subagents.md:237-240`).
- **Clarified chain-parallel deferral** — current `pi-subagents` supports nested chain parallel groups (`handoff/current-pi-subagents.md:147-149`), but official example chain is sequential only (`README.md:97`); MVP matches official baseline.
- **Changed official example migration plan** — v1 only handled external `pi-subagents`; revised plan keeps and repurposes `packages/coding-agent/examples/extensions/subagent/` as legacy/reference instead of deleting it.
- **Expanded tests** — added loader, permissions, model-selection, parallel/chain, and context-mode tests required by promoted MVP surface.

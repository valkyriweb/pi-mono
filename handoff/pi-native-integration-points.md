# Pi Native `agent` Tool Integration Points (Discovery Only)

Scope: first-class built-in `agent` tool (Task-style) with bundled base agents such as Explore, general-purpose, Plan, statusline-setup. No implementation performed.

## Executive take

Pi already has almost all primitives needed for a native agent tool:

- Built-in tools are TypeBox-backed `ToolDefinition`s created in `packages/coding-agent/src/core/tools/*` and collected by `createAllToolDefinitions()`.
- `AgentSession` owns built-in/extension/SDK tool registration, active tool allowlists, source metadata, prompt snippets, prompt guidelines, and extension interception.
- `createAgentSession()` and `AgentSessionRuntime` provide clean session construction/fork/new-session APIs with transcript/session-manager support, model resolution, settings, resources, and extension rebinding.
- TUI tool rendering is centralized in `ToolExecutionComponent`; custom rendering is per-tool `renderCall`/`renderResult` on `ToolDefinition`.

Big design decision: whether the native `agent` tool creates a full `AgentSession` backed by a child `SessionManager` (best fit for transcript/AGENTS/skills/model/tool inheritance), or uses bare `Agent` directly (less surface but you must rebuild resource loading, settings, permissions, and transcript logic). I would use `createAgentSessionFromServices()`/`createAgentSessionServices()` plus `SessionManager.inMemory()` or child persisted session files, not raw `Agent`.

## 1. Built-in tool architecture

### Where built-ins live/register

- Built-in tool exports and registry are in `packages/coding-agent/src/core/tools/index.ts`.
  - `ToolName` is the built-in union: `"read" | "bash" | "edit" | "write" | "grep" | "find" | "ls"` and `allToolNames` mirrors it (`packages/coding-agent/src/core/tools/index.ts:81-84`).
  - `createToolDefinition()` and `createTool()` dispatch by `ToolName` (`packages/coding-agent/src/core/tools/index.ts:96-135`).
  - `createAllToolDefinitions()` is what `AgentSession` uses for the built-in registry (`packages/coding-agent/src/core/agent-session.ts:2362-2379`).
  - Default active tools are only `read,bash,edit,write`; grep/find/ls are built-in but not default-active (`packages/coding-agent/src/core/agent-session.ts:2401-2408`, `packages/coding-agent/src/core/sdk.ts:269-275`).

### Schema/type pattern

- Tool parameters use TypeBox, not zod. Example `readSchema = Type.Object(...)` and `ReadToolInput = Static<typeof readSchema>` (`packages/coding-agent/src/core/tools/read.ts:20-26`).
- The common `ToolDefinition` contract includes `name`, `label`, `description`, `promptSnippet`, `promptGuidelines`, `parameters`, `renderShell`, `prepareArguments`, `executionMode`, `execute`, `renderCall`, and `renderResult` (`packages/coding-agent/src/core/extensions/types.ts:434-480`).
- Tool args are prepared then validated through `validateToolArguments()` in the agent loop before execution (`packages/agent/src/agent-loop.ts:503-535`).

### Permissions / interception

- There is no per-tool permission prompt framework in core; permission-like behavior is extension interception:
  - `tool_call` can block or mutate input (`packages/coding-agent/src/core/extensions/types.ts:760-820`, result type at `packages/coding-agent/src/core/extensions/types.ts:866-870`).
  - `tool_result` can modify content/details/error (`packages/coding-agent/src/core/extensions/types.ts:822-852`, result type at `packages/coding-agent/src/core/extensions/types.ts:876-880`).
  - `AgentSession._installAgentToolHooks()` wires `Agent.beforeToolCall` / `afterToolCall` to extension runner (`packages/coding-agent/src/core/agent-session.ts:333-390`).
- Tool allowlisting is session-level: `CreateAgentSessionOptions.tools`, `noTools`, `initialActiveToolNames`, `allowedToolNames` (`packages/coding-agent/src/core/sdk.ts:269-275`, `packages/coding-agent/src/core/agent-session.ts:2266-2355`). CLI exposes this as `--tools`, `--no-builtin-tools`, `--no-tools` (docs `packages/coding-agent/docs/usage.md`, Tool Options section).

### Progress events / async updates

- Core agent loop emits `tool_execution_start`, optional `tool_execution_update`, and `tool_execution_end` (`packages/agent/src/agent-loop.ts:371-399`, `packages/agent/src/agent-loop.ts:422-463`, `packages/agent/src/agent-loop.ts:577-590`).
- Tool `execute()` receives `onUpdate`; bash uses it for an initial empty partial and later output (`packages/coding-agent/src/core/tools/bash.ts:281-285`, `packages/coding-agent/test/tool-execution-component.test.ts:104-127`).
- A long-running `agent` tool can stream status by calling `onUpdate({ content, details })`; TUI will render partials as pending.

## 2. Session/runtime model and clean child/forked session creation

### Session creation stack

- `createAgentSession()` creates/loads `SettingsManager`, `AuthStorage`, `ModelRegistry`, `DefaultResourceLoader`, `SessionManager`, resolves/restores model/thinking, creates an `Agent`, then wraps it in `AgentSession` (`packages/coding-agent/src/core/sdk.ts:193-410`).
- It restores existing transcript from `sessionManager.buildSessionContext()` (`packages/coding-agent/src/core/sdk.ts:213-230`, `packages/coding-agent/src/core/sdk.ts:376-388`).
- It wires model auth, provider request hooks, extension context transform, steering/follow-up modes, transport, thinking budgets, and retry caps into the underlying `Agent` (`packages/coding-agent/src/core/sdk.ts:318-374`).

### Runtime replacement / fork APIs

- `AgentSessionRuntime` owns active session replacement for new/resume/fork and emits shutdown/start events around replacement (`packages/coding-agent/src/core/agent-session-runtime.ts:150-172`).
- `newSession()` creates a fresh `SessionManager`, supports `parentSession`, optional setup, and `withSession` callback (`packages/coding-agent/src/core/agent-session-runtime.ts:200-231`).
- `fork(entryId)` creates a branched session from an existing session tree; persisted sessions use `SessionManager.open(...).createBranchedSession(targetLeafId)` (`packages/coding-agent/src/core/agent-session-runtime.ts:234-300`).
- For an `agent` tool, using a full `AgentSessionRuntime` is probably overkill unless child agents need `/new`/`/fork` semantics internally. A single child `AgentSession` with `SessionManager.inMemory()` or a new `SessionManager.create(cwd, childSessionDir)` is likely enough.

### Transcript/context inheritance

- Session file entries are tree-structured; header supports `parentSession` (`packages/coding-agent/src/core/session-manager.ts:30-42`).
- `CustomEntry` persists extension state but is not LLM context; `CustomMessageEntry` participates in LLM context and controls display (`packages/coding-agent/src/core/session-manager.ts:88-135`).
- Child transcript strategies:
  1. **Independent child session**: create child session with empty `SessionManager`, pass a synthesized user prompt containing task/context summary. Lowest coupling.
  2. **Forked child session**: use parent session file + `createBranchedSession()`/runtime `fork()` when the child should inherit exact branch context. Cleaner transcript provenance, but if the parent session is not persisted, behavior differs.
  3. **In-memory inherited messages**: create a `SessionManager.inMemory()`, append selected parent messages or a compaction-style summary in `setup`; safe but requires explicit selection policy.

### AGENTS.md, skills, prompts, system prompt loading

- `DefaultResourceLoader.reload()` loads extensions, skills, prompts, themes, AGENTS/CLAUDE context files, SYSTEM.md, and APPEND_SYSTEM.md (`packages/coding-agent/src/core/resource-loader.ts:421-545`).
- AGENTS/CLAUDE loading starts with global `agentDir`, then walks ancestor dirs to cwd, deduped by realpath (`packages/coding-agent/src/core/resource-loader.ts:117-155`).
- System prompt builder appends context files and formats skills only when `read` is active (`packages/coding-agent/src/core/system-prompt.ts:54-80`, `packages/coding-agent/src/core/system-prompt.ts:154-170`).
- A child session should use `createAgentSessionServices({ cwd: parentCwd, agentDir: parentAgentDir, authStorage, settingsManager?, modelRegistry?, resourceLoaderOptions? })` so it reloads the same cwd-bound AGENTS/skills/project settings path stack.

## 3. Tool rendering in TUI

- Live stream handling in interactive mode creates/updates `ToolExecutionComponent` on assistant `toolCall` deltas and tool execution events (`packages/coding-agent/src/modes/interactive/interactive-mode.ts:2689-2804`).
- Initial session replay matches assistant tool calls to later `toolResult` messages (`packages/coding-agent/src/modes/interactive/interactive-mode.ts:3098-3144`).
- `ToolExecutionComponent`:
  - accepts `toolName`, `toolCallId`, args, optional active `ToolDefinition`, `TUI`, and cwd (`packages/coding-agent/src/modes/interactive/components/tool-execution.ts:43-61`).
  - falls back to built-in definitions via `createAllToolDefinitions(cwd)[toolName]` (`packages/coding-agent/src/modes/interactive/components/tool-execution.ts:56-58`).
  - uses custom/built-in `renderCall` and `renderResult`; if none exists, it falls back to generic tool name + JSON args + text output (`packages/coding-agent/src/modes/interactive/components/tool-execution.ts:81-144`, `packages/coding-agent/src/modes/interactive/components/tool-execution.ts:228-293`).
  - passes renderer state/context including `executionStarted`, `argsComplete`, `isPartial`, `expanded`, `showImages`, and `isError` (`packages/coding-agent/src/modes/interactive/components/tool-execution.ts:115-132`).
- For native `agent`, default JSON is acceptable for MVP, but custom rendering should show agent kind/name, model, status, elapsed time, and collapsed transcript summary. Add `renderCall`/`renderResult` on `createAgentToolDefinition()`.

## 4. Settings/config integration

### Current layering

- Settings shape is TypeScript interface only (not TypeBox/zod). Global/project settings include model, resource paths, UI, compaction, retry, packages, extensions, skills, prompts, themes, etc. (`packages/coding-agent/src/core/settings-manager.ts:76-110`).
- `SettingsManager.reload()` loads global then project and deep-merges project over global (`packages/coding-agent/src/core/settings-manager.ts:404-430`). Docs say project settings override global and nested objects merge (`packages/coding-agent/docs/settings.md`).
- Writes are queued, lock-protected, and merge only modified fields back into the file (`packages/coding-agent/src/core/settings-manager.ts:475-521`).
- Resource path getters/setters already exist for packages/extensions/skills/prompts/themes (`packages/coding-agent/src/core/settings-manager.ts:808-900`).

### Where agent definitions could live

Pi currently has no `agents` setting or `~/.pi/agent/agents/` discovery. Options:

1. **Native resource type (best long-term):** add `agents?: string[]` settings plus `~/.pi/agent/agents` and `.pi/agents` auto-discovery, analogous to skills/prompts/themes in `DefaultPackageManager`. Requires touching settings, package manager, resource loader, docs, startup display, tests.
2. **Settings-only map:** add `agents` object/array directly to `settings.json`. Simpler but less Pi-like for shareable resources/packages.
3. **Bundled base agents only initially:** add built-in definitions in source and allow future external definitions. This avoids immediate package-manager churn but should still define a schema that can become a resource later.

Given Pi packages already bundle `extensions`, `skills`, `prompts`, `themes` through package manifest/conventional dirs (`packages/coding-agent/src/core/package-manager.ts:526-625`, `packages/coding-agent/src/core/package-manager.ts:2138-2236`), first-class agents should probably become a fifth resource type if user/project/package-defined agents are part of the goal.

### Validation pattern

- Models config uses TypeBox schemas + `Compile()` for JSON validation (`packages/coding-agent/src/core/model-registry.ts:116-180`), while settings are interface/migration-based. For new agent definition files, prefer TypeBox + compile diagnostics like models/skills, not loose settings-only parsing.
- Skills validate leniently and warn, with missing description not loaded (docs `packages/coding-agent/docs/skills.md`). Agent definitions should mirror that style: warn on invalid optional fields, skip if missing required `name`/`description`/`prompt`.

## 5. Existing slash commands and `/agents`

- Built-in command metadata for autocomplete lives in `BUILTIN_SLASH_COMMANDS` (`packages/coding-agent/src/core/slash-commands.ts:1-40`). Add `/agents` there for autocomplete/docs.
- Interactive autocomplete combines built-ins, prompt templates, extension commands, and skill commands (`packages/coding-agent/src/modes/interactive/interactive-mode.ts:428-505`).
- Actual built-in command execution is hardcoded in `setupEditorSubmitHandler()` with `if (text === "/model" ...)` style (`packages/coding-agent/src/modes/interactive/interactive-mode.ts:2440-2555`). Add `/agents` handling there.
- Extension commands with the same names as built-ins are filtered from autocomplete and conflict-diagnosed (`packages/coding-agent/src/modes/interactive/interactive-mode.ts:473-481`, `packages/coding-agent/src/modes/interactive/interactive-mode.ts:413-423`). Native `/agents` will reserve that command.

Likely UI path: create a selector component modeled after `ModelSelectorComponent`/`SettingsSelectorComponent` and route `/agents` to list/select available agent definitions; selection could either paste an `agent` tool invocation prompt, set a default task agent, or show metadata only. Decide product behavior before implementation.

## 6. Model resolution and permission inheritance

- Initial model restoration/selection happens in `createAgentSession()` from existing session, settings defaults, then provider defaults (`packages/coding-agent/src/core/sdk.ts:221-248`).
- Thinking level is restored or from settings and clamped to `off` for non-reasoning models (`packages/coding-agent/src/core/sdk.ts:250-267`).
- Provider default model IDs live in `defaultModelPerProvider` (`packages/coding-agent/src/core/model-resolver.ts:13-42`).
- Custom models/providers are TypeBox-validated in `models.json` (`packages/coding-agent/src/core/model-registry.ts:136-180`).
- Active tools and allowlist behavior are controlled by `tools`/`noTools`; when `allowedToolNames` exists, only allowlisted names enter the registry/active set (`packages/coding-agent/src/core/agent-session.ts:2266-2355`).

Recommended inheritance model:

- Default child model = parent `session.model`, child thinking = parent `session.thinkingLevel` unless agent definition overrides.
- Per-agent override accepts either exact provider/model or model pattern resolved through `ModelRegistry`/`model-resolver` utilities.
- Default child tools = parent active tools minus `agent` unless recursive subagents are explicitly allowed. Otherwise recursive `agent` calls can explode.
- Honor parent CLI/session allowlist: if parent was launched with `--tools read,grep`, child must not gain `bash/edit/write` unless explicitly allowed by user config and parent allowlist permits it.
- For per-agent tool restrictions, call `createAgentSession({ tools: allowedToolNames })` or pass `noTools` + custom active list. Avoid bypassing `AgentSession` registry.

## 7. Async/background execution

Existing infra:

- Agent loop executes multiple tool calls in parallel by default unless global/per-tool sequential mode applies (`packages/agent/src/agent-loop.ts:338-352`, `packages/coding-agent/src/core/extensions/types.ts:453-460`).
- Tool calls can be long-running and stream progress via `onUpdate` (`packages/agent/src/agent-loop.ts:577-590`).
- TUI displays partial updates as pending and final result as success/error (`packages/coding-agent/src/modes/interactive/interactive-mode.ts:2787-2804`, `packages/coding-agent/src/modes/interactive/components/tool-execution.ts:228-233`).
- Extension UI supports footer statuses/widgets/working messages, but built-in tool execution does not have a separate background task manager (`packages/coding-agent/src/core/extensions/types.ts:93-145`).

Gap:

- No detached/background tool-call scheduler exists for a tool to continue after the parent turn completes. A native `agent` tool can run synchronously as a long-running tool and report progress. True background agents would need new task tracking/state/UI (probably not MVP).

## 8. Likely files to edit/create

### Edit

- `packages/coding-agent/src/core/tools/index.ts` — add `agent` to `ToolName`, `allToolNames`, `ToolsOptions`, exports, create dispatchers, `createAllToolDefinitions()`.
- `packages/coding-agent/src/core/tools/agent.ts` — new tool should be exported from index; if keeping file size sane, create here (see Create below).
- `packages/coding-agent/src/core/agent-session.ts` — likely pass child-session factory/context into agent tool options; ensure default active tools include `agent` if first-class default; possibly expose helper for child session creation without depending on interactive runtime.
- `packages/coding-agent/src/core/sdk.ts` — include `agent` in default active tool list if it ships enabled by default; ensure `noTools`/allowlist semantics include it.
- `packages/coding-agent/src/core/settings-manager.ts` — if adding user-defined agents, add settings shape/getters/setters/migration.
- `packages/coding-agent/src/core/package-manager.ts` and `resource-loader.ts` — if agents become package resources, add resource type and discovery.
- `packages/coding-agent/src/core/slash-commands.ts` and `modes/interactive/interactive-mode.ts` — add `/agents` metadata, autocomplete, command handler.
- `packages/coding-agent/src/index.ts` / `core/sdk.ts` exports — export agent definitions/types if public.
- `packages/coding-agent/README.md`, `docs/extensions.md`, `docs/sdk.md`, `docs/settings.md`, `docs/packages.md`, `docs/tui.md`, maybe `docs/usage.md`/`docs/index.md` — document native tool and resource/command behavior.
- `packages/coding-agent/CHANGELOG.md` — add under `## [Unreleased]` appropriate section.

### Create

- `packages/coding-agent/src/core/tools/agent.ts` — TypeBox schema, `AgentToolInput`, `AgentToolDetails`, `AgentDefinition`, `createAgentToolDefinition()`, renderer.
- `packages/coding-agent/src/core/agents/definitions.ts` — bundled base agent definitions (Explore, general-purpose, Plan, statusline-setup, etc.).
- `packages/coding-agent/src/core/agents/loader.ts` — only if supporting user/project/package agent definitions.
- `packages/coding-agent/src/modes/interactive/components/agents-selector.ts` — if `/agents` lists/selects agents with rich UI.
- Tests:
  - `packages/coding-agent/test/agent-tool.test.ts`
  - `packages/coding-agent/test/agent-definitions.test.ts`
  - `packages/coding-agent/test/tool-execution-component.test.ts` additions for renderer
  - `packages/coding-agent/test/suite/regressions/<issue>-agent-tool*.test.ts` if issue-driven

## 9. Public API/schema choices Pi already favors

Exemplars:

1. **read tool**
   - TypeBox schema + `Static<typeof schema>` (`packages/coding-agent/src/core/tools/read.ts:20-28`).
   - Pluggable operations for testability/remote delegation (`packages/coding-agent/src/core/tools/read.ts:34-49`).
   - `createReadToolDefinition()` returns `ToolDefinition`, `createReadTool()` wraps it (`packages/coding-agent/src/core/tools/read.ts:123-273`).
   - Custom renderer reuses `Text` component through `context.lastComponent` (`packages/coding-agent/src/core/tools/read.ts:258-267`).

2. **bash tool**
   - TypeBox schema and details type with truncation/fullOutputPath (`packages/coding-agent/src/core/tools/bash.ts:23-31`).
   - Pluggable `BashOperations` and local backend (`packages/coding-agent/src/core/tools/bash.ts:36-126`).
   - Streams partial progress via `onUpdate` (`packages/coding-agent/src/core/tools/bash.ts:281-285`).

3. **dynamic/extension tools**
   - Extension tool contract is same `ToolDefinition` (`packages/coding-agent/src/core/extensions/types.ts:434-480`).
   - Dynamic tool test shows `promptSnippet` controls visibility in system prompt and source metadata is asserted (`packages/coding-agent/test/agent-session-dynamic-tools.test.ts:28-89`).

Public choice: define `agent` schema with TypeBox. Suggested shape:

```ts
Type.Object({
  agent: Type.String({ description: "Agent name/id to run" }),
  task: Type.String({ description: "Task for the child agent" }),
  context: Type.Optional(Type.String({ description: "Additional context/instructions" })),
  model: Type.Optional(Type.String({ description: "Optional model override" })),
})
```

Details should be JSON-serializable: `{ agentName, model, sessionId, sessionFile?, summary, transcriptPreview?, status }`.

## 10. Validation strategy

Run from package root (`packages/coding-agent`) per repo rules. Do not run `npm test`; use specific vitest files only when instructed/when tests are modified.

Targeted tests to add/use:

- Tool unit tests analogous to `packages/coding-agent/test/tools.test.ts` for schema, agent lookup, errors, abort handling, child output summary.
- Agent session integration with faux provider via `packages/coding-agent/test/suite/harness.ts`; it creates temp dirs, faux provider, in-memory auth/model registry, `Agent`, `SessionManager`, `SettingsManager`, resource loader, and captures events (`packages/coding-agent/test/suite/harness.ts:92-208`).
- Runtime/session tests analogous to `packages/coding-agent/test/suite/agent-session-runtime.test.ts`, especially if child sessions use runtime/fork/new APIs.
- TUI renderer tests in `packages/coding-agent/test/tool-execution-component.test.ts`; existing tests instantiate `ToolExecutionComponent` with fake TUI and assert rendered strings (`packages/coding-agent/test/tool-execution-component.test.ts:31-66`).
- Resource discovery tests in `resource-loader.test.ts` / `package-manager.test.ts` if adding `agents` as resource type.
- Slash command tests: follow existing `interactive-mode-*-command.test.ts` patterns.

Minimum gate after implementation: `npm run check` from package root. If tests added/modified, run that specific test file with `npx tsx ../../node_modules/vitest/dist/cli.js --run <test-file>` from `packages/coding-agent`.

## 11. Docs/changelog conventions

- User-facing docs required: README command/tool list, docs index if new doc, usage/settings/packages/sdk/extensions/tui depending on feature surface.
- Changelog: `packages/coding-agent/CHANGELOG.md`, under `## [Unreleased]`; append to existing subsection, do not edit released sections (repo AGENTS.md).
- If adding package resource type, update `docs/packages.md` and `docs/settings.md` because resource arrays/locations are documented there.
- If adding a slash command, update README and `docs/usage.md` command tables.
- If exposing SDK types/factories, update `docs/sdk.md` and root exports.

## 12. Constraints and risks

- No dynamic/inline imports. This repo’s AGENTS.md explicitly forbids inline imports/dynamic type imports. Add normal top-level imports only. Note: existing code has a few `typeof import(...)` type positions; do not copy that pattern for new code.
- Avoid overlap/conflict with any still-shipping `pi-subagents` extension/package. Local repo search found no in-tree `pi-subagents` extension, but native `/agents` and `agent` tool names may collide with third-party extension commands/tools. Built-in command conflict diagnostics already warn for command names; tool conflicts currently last definition wins in `_refreshToolRegistry()` (`packages/coding-agent/src/core/agent-session.ts:2291-2296`, `packages/coding-agent/src/core/agent-session.ts:2326-2329`). Decide whether native `agent` should be protected against extension override.
- Recursive `agent` tool calls are a real footgun. Default child tool set should probably exclude `agent` unless explicitly enabled.
- Child sessions must not silently broaden tool permissions beyond parent allowlist.
- True background execution needs new infra; synchronous long-running tool is supported today.
- If child sessions persist, session tree/provenance/path naming needs a product decision. In-memory children are simpler but lose inspectable transcript unless details store summary/transcript.

## Commands & Probes Run

- `pwd && git status --short && grep -R "\.md" ...` for required docs cross-reference scan.
- Read required docs: `packages/coding-agent/README.md`, `docs/index.md`, `docs/extensions.md`, `docs/skills.md`, `docs/tui.md`, `docs/sdk.md`, `docs/prompt-templates.md`, `docs/keybindings.md`, `docs/models.md`, `docs/packages.md`.
- Followed docs cross-refs: `docs/settings.md`, `docs/usage.md`, `docs/sessions.md`, `docs/session-format.md`, `docs/compaction.md`.
- `find packages/coding-agent/src -name '*.{ts,tsx}'`; `find packages/agent/src -name '*.ts'`; read target source files listed above.
- `grep`/`nl -ba` targeted probes for tool registry, agent loop events, session/runtime, resource loading, settings, slash commands, TUI rendering, model resolution, and tests.
- `grep -R "subagent|sub-agent|agents" ...` to check for in-tree pi-subagents overlap.
- No network. No subagents. No edits outside this handoff file.

# Current Pi Subagents System Discovery

Discovery-only map of the current `pi-subagents` extension, skill, runtime coupling, user/project config, sibling `pi-intercom` dependency, and Pi core APIs it consumes.

## Executive summary

`pi-subagents` is a Pi extension package (`package.json` declares `pi.extensions`, `pi.skills`, and `pi.prompts`) that registers one LLM-callable `subagent` tool plus message renderers, slash commands, widgets, async result watchers, and prompt-template bridges. The child process model is not an in-process AgentSession API; foreground runs spawn `pi --mode json -p ...` and parse the JSONL stream, while async runs spawn a detached Node+jiti runner. Child sessions are isolated from the parent `subagent` tool by `PI_SUBAGENT_CHILD=1`, and a runtime extension filters parent-only subagent artifacts and rewrites child system prompts. Core preservation points: agent discovery/overrides, fork-vs-fresh context, child boundary filtering, saved output references, chain artifact directories, control/status/interrupt, and intercom bridge.

## Sources inspected

- Extension/plugin source: `/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/`
- Skill instructions: `/Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents/skills/pi-subagents/SKILL.md`
- User config: `/Users/luke/.pi/agent/settings.json`; searched user agent dirs.
- Project config: `/Users/luke/Projects/personal/pi-agent-tool/.pi/`; no project subagent agents/settings found, only local extensions/prompts.
- Sibling intercom extension: `/Users/luke/.pi/agent/git/github.com/nicobailon/pi-intercom/`
- Pi core integration points: `/Users/luke/Projects/personal/pi-agent-tool/packages/coding-agent/src/core/...`

## 1. File map: meaningful files and purpose

### Package/root

- `package.json` — package identity (`pi-subagents` v0.21.4), Pi package entry points (`pi.extensions: ./src/extension/index.ts`, `pi.skills: ./skills`, `pi.prompts: ./prompts`), peer deps on Pi packages, TypeBox dependency.
- `README.md` — user-facing install/usage docs, builtin agents table, orchestration pattern, optional pi-intercom notes, settings examples.
- `CHANGELOG.md` — package release history.
- `install.mjs` — package binary installer entry.
- `banner.png`, `.gitignore`, `.github/workflows/test.yml`, `package-lock.json` — assets/metadata/CI/lockfile.

### Builtin agents (`agents/*.md`)

- `agents/context-builder.md` — requirements/codebase handoff builder; tools include read/grep/find/ls/bash/write/web_search/intercom; default output `context.md`.
- `agents/delegate.md` — minimal generic delegate; inherits parent-ish behavior via append prompt mode and project context.
- `agents/oracle.md` — forked high-context advisory reviewer; uses read/grep/find/ls/bash/intercom; defaultContext `fork`.
- `agents/planner.md` — planning-only agent; writes `plan.md`; defaultReads `context.md`; defaultContext `fork`.
- `agents/researcher.md` — web/docs research agent; writes `research.md`; uses web/fetch tools and progress.
- `agents/reviewer.md` — code/plan/diff review specialist; can edit/write; defaultReads plan/progress; progress on.
- `agents/scout.md` — fast codebase recon agent; writes `context.md`; progress on.
- `agents/worker.md` — implementation agent / single-writer thread; defaultContext `fork`; defaultReads context/plan; progress on.

### Skills/prompts

- `skills/pi-subagents/SKILL.md` — parent-orchestrator behavior guide, workflows, slash/tool mapping, constraints, discovery/scope, intercom, management, error handling. Explicitly says child subagents should not receive/follow it (lines 13-16).
- `prompts/gather-context-and-clarify.md` — prompt template for scout/researcher context then clarification.
- `prompts/parallel-cleanup.md` — two fresh-context review-only cleanup reviewers.
- `prompts/parallel-context-build.md` — chain-mode parallel context-builder artifacts.
- `prompts/parallel-handoff-plan.md` — researcher/context-builder fanout plus synthesis handoff plan.
- `prompts/parallel-research.md` — researcher + scout fanout with evidence synthesis.
- `prompts/parallel-review.md` — fresh-context parallel reviewers with dynamic angles.

### Extension entry and UI

- `src/extension/index.ts` — extension bootstrap: skips child sessions when `PI_SUBAGENT_CHILD=1`, initializes dirs/state, creates executor, registers message renderers, bridges, `subagent` tool, slash commands, async watcher/poller, cleanup (key lines: imports and schema/executor at 19-35; child skip at 221-222; executor at 283-291; message renderers at 294-330; tool definition at 390-424; registerTool at 467).
- `src/extension/schemas.ts` — TypeBox schema for `subagent` params, actions, single/parallel/chain fields, output/outputMode, skill/model/read/progress overrides, control thresholds.
- `src/extension/doctor.ts` — setup diagnostics for discovery/session/async/intercom.
- `src/extension/control-notices.ts` — visible control/attention notices and formatting.
- `src/tui/render.ts`, `src/tui/render-helpers.ts`, `src/tui/subagents-status.ts`, `src/tui/text-editor.ts` — custom TUI rendering/widgets/status UI and edit components.

### Agent discovery/management

- `src/agents/agents.ts` — loads builtin/user/project agents, settings overrides, chains, precedence, frontmatter fields. User settings path `~/.pi/agent/settings.json` at line 216; project settings `.pi/settings.json` at 221; file loader at 540; project dirs at 693; discovery at 710-732; discoverAll/chains at 738-779.
- `src/agents/frontmatter.ts` — simple YAML-ish frontmatter parser.
- `src/agents/identity.ts` — package/name validation and runtime name `{package}.{name}`.
- `src/agents/agent-selection.ts` — precedence merge: builtin first, user overrides, project overrides for `both`.
- `src/agents/agent-management.ts` — `list/get/create/update/delete` tool actions, validation, warnings, serialization. Management actions are only user/project mutable; builtins require override/copy.
- `src/agents/agent-serializer.ts` — writes agent frontmatter/body; known fields include model/fallback/thinking/context/skills/output/maxSubagentDepth.
- `src/agents/chain-serializer.ts` — parses/serializes `.chain.md` files using `## agent` sections and per-step output/reads/model/skills/progress.
- `src/agents/agent-scope.ts` — normalizes execution scope to `user|project|both`.
- `src/agents/agent-templates.ts` — templates for agent creation.
- `src/agents/skills.ts` — skill discovery/injection for child system prompt, including project/user/package/settings sources and `pi-subagents` guard.

### Foreground execution

- `src/runs/foreground/subagent-executor.ts` — main dispatcher and lifecycle: action routing, validation, discovery, defaultContext, intercom bridge, session roots, async vs foreground routing, single/parallel/chain modes. Key: imports action/async/intercom at 14-45; action list at 70; defaultContext logic at 579-588; chain path at 908; parallel path at 1251; single path at 1558; main execute/action routing at 1839-2090.
- `src/runs/foreground/execution.ts` — `runSync` and `runSingleAttempt`: builds Pi CLI args, spawns child Pi, parses JSON events, tracks progress/usage/tool calls/control, writes output/artifacts, model fallback. Key: `buildPiArgs` at 139; spawn at 201-204; output write at 678-683; `runSync` at 712; model loop at 792-824; artifact write at 852-865.
- `src/runs/foreground/chain-execution.ts` — sequential/parallel chain execution, chain dir, template substitution, progress/output files, chain summaries. Key: `runParallelChainTasks` at 159; `{previous}` substitution at 191 and 713; `createChainDir` at 387; `resolveChainTemplates` at 389; parallel step execution at 560; sequential `runSync` at 755.
- `src/runs/foreground/chain-clarify.ts` — custom clarification TUI for single/parallel/chain before launch.

### Background/async execution

- `src/runs/background/async-execution.ts` — builds async runner config and detached process using Node+jiti. Key: `spawnRunner` at 128-154; `executeAsyncChain` at 179; chain step command/system prompt assembly at 259-263; spawn result handling at 343-401; async single output path at 478; async single spawn at 483-545.
- `src/runs/background/subagent-runner.ts` — detached async runner that executes configured steps, writes status/results/events/logs. (Not exhaustively quoted; consumed by async-execution spawn.)
- `src/runs/background/async-job-tracker.ts` — in-memory/UI tracker for async jobs.
- `src/runs/background/async-status.ts` — lists async run dirs/status files.
- `src/runs/background/run-status.ts` — `action: status` implementation, reads/reconciles async status/results and shows revive guidance. Entry at line 34.
- `src/runs/background/async-resume.ts` — resolves async resume targets and builds revived task from previous session/result.
- `src/runs/background/result-watcher.ts` — watches result files and emits completion events.
- `src/runs/background/stale-run-reconciler.ts` — reconciles dead PIDs/stale runs.
- `src/runs/background/top-level-async.ts` — force top-level async behavior.
- `src/runs/background/notify.ts` — completion notifications.
- `src/runs/background/completion-dedupe.ts` — avoids duplicate completion processing.

### Shared runtime

- `src/runs/shared/pi-args.ts` — child `pi` CLI arg/env builder; sets `PI_SUBAGENT_CHILD=1`, project/skills inheritance env, `MCP_DIRECT_TOOLS`, intercom session name. Key: child env const at 9; builder at 43; env set at 116.
- `src/runs/shared/subagent-prompt-runtime.ts` — runtime extension injected into every child: sets session name, strips parent-only subagent context/messages, strips inherited `pi-subagents` skill, adds child boundary instructions. Key: boundary instructions at 7-13; rewrite inject at 77-79; message stripping at 108-129.
- `src/runs/shared/model-fallback.ts` — model candidate resolution/fallback retry policy.
- `src/runs/shared/single-output.ts` — output path resolution, save/reference/file-only validation.
- `src/runs/shared/parallel-utils.ts` — concurrency helper and parallel output aggregation.
- `src/runs/shared/worktree.ts` — clean-repo git worktree isolation, branch/path creation, setup hook, diff summaries, cleanup.
- `src/runs/shared/subagent-control.ts` — attention/control threshold logic and event formatting.
- `src/runs/shared/long-running-guard.ts` — activity/mutation failure tracking.
- `src/runs/shared/completion-guard.ts` — detects implementation tasks that complete without edits.
- `src/runs/shared/pi-spawn.ts` — resolves Pi executable/package root for child spawn.
- `src/runs/shared/run-history.ts` — run history recording.

### Shared support

- `src/shared/types.ts` — all shared types/constants: actions, temp dirs, async status, details payload, config shape. Constants include `RESULTS_DIR`, `ASYNC_DIR`, `CHAIN_RUNS_DIR`, `SUBAGENT_ACTIONS`, fork preamble, depth guard (lines 535-571 and 573-615).
- `src/shared/settings.ts` — chain dir/templates/behavior/instructions/parallel output namespacing. Key: `createChainDir` at 101; `resolveChainTemplates` at 151; `buildChainInstructions` at 242.
- `src/shared/artifacts.ts` — input/output/metadata/jsonl artifact paths and cleanup.
- `src/shared/fork-context.ts` — creates forked child session files from parent SessionManager.
- `src/shared/utils.ts` — output extraction, status reads, `mapConcurrent`, child cwd, etc.
- `src/shared/formatters.ts` — summaries and formatting.
- `src/shared/jsonl-writer.ts`, `atomic-json.ts`, `file-coalescer.ts`, `post-exit-stdio-guard.ts`, `session-tokens.ts` — durability/logging/watch helpers.

### Slash/manager UI

- `src/slash/slash-commands.ts` — registers `/run`, `/parallel`, `/chain`, `/run-chain`, `/agents`, `/subagents-status`, `/subagents-doctor` etc.
- `src/slash/slash-bridge.ts`, `slash-live-state.ts`, `prompt-template-bridge.ts` — slash and prompt-template delegation bridge into executor/live result rendering.
- `src/manager-ui/*.ts` — `/agents` manager list/detail/edit/chain/parallel screens.

### Intercom coupling files

- `src/intercom/intercom-bridge.ts` — bridge availability/mode, session target names, child target names, injects `intercom` tool and prompt instruction when available. Key: mode config at 76-89; diagnose at 145; resolve at 182; apply-to-agent at 227.
- `src/intercom/result-intercom.ts` — grouped foreground/async result delivery over Pi event bus to `pi-intercom`, with receipt fallback. Key delivery event function at 174-206.

### Tests

- `test/unit/*.test.ts` — unit coverage for agent scope/selection/management, schemas, chain serialization, output handling, async resume/status, intercom bridge/results, fork context, worktree, control, recursion, rendering, etc.
- `test/integration/*.test.ts` — integration coverage for single/chain/parallel/async execution, fork-context execution, intercom result delivery, slash live state, doctor, status, templates.
- `test/support/*` — mock Pi script and loader harness.

## 2. Tool registration: schema, dispatcher, actions, execution modes

Registration path:

1. Package declares `pi.extensions: ["./src/extension/index.ts"]` in `package.json`.
2. `src/extension/index.ts` default export `registerSubagentExtension(pi)` is called by Pi. It immediately returns in child sessions when `PI_SUBAGENT_CHILD=1` (`src/extension/index.ts:221-222`).
3. It creates a foreground executor with `createSubagentExecutor(...)`, passing config/state/session-root helpers and `discoverAgents` (`src/extension/index.ts:283-291`).
4. It defines `const tool: ToolDefinition<typeof SubagentParams, Details>` with `name: "subagent"`, label/description, `parameters: SubagentParams`, `execute(...) => executor.execute(...)`, and custom call/result renderers (`src/extension/index.ts:390-462`).
5. It registers the tool via `pi.registerTool(tool)` (`src/extension/index.ts:467`).

Schema source:

- `src/extension/schemas.ts` defines `SubagentParams` using TypeBox.
- `action` enum is sourced from `SUBAGENT_ACTIONS` (`src/extension/schemas.ts`, action field; constants in `src/shared/types.ts:553`: `list,get,create,update,delete,status,interrupt,resume,doctor`).
- Execution-mode fields:
  - Single: `agent`, `task`, optional `context`, `async`, `cwd`, `output`, `outputMode`, `skill`, `model`, `clarify`, `control`, etc.
  - Parallel: `tasks: TaskItem[]`, `concurrency`, `worktree`.
  - Chain: `chain: ChainItem[]`, `chainDir`; each step can be sequential or `parallel` group with `concurrency`, `failFast`, `worktree`.

Dispatcher:

- Main dispatcher is `createSubagentExecutor(...).execute(...)` (`src/runs/foreground/subagent-executor.ts:1839-2090`).
- Action path: if `params.action`, route `doctor`, `status`, `resume`, `interrupt`, then generic `handleManagementAction` for `list/get/create/update/delete` (`src/runs/foreground/subagent-executor.ts:1850-1935`).
- Execution path: validates depth, normalizes repeated counts, resolves scope, discovers agents, applies default fork context, resolves intercom bridge, builds session roots/files, then dispatches mode:
  - async path first if requested (`runAsyncPath`)
  - chain -> `runChainPath`
  - parallel -> `runParallelPath`
  - single -> `runSinglePath` (`src/runs/foreground/subagent-executor.ts:2087-2089`).

## 3. Runtime flow for single execution

Single foreground flow:

1. Tool invocation reaches `execute(...)` in `subagent-executor.ts`.
2. `requestCwd` resolves from `ctx.cwd` and optional `params.cwd`; `agentScope` defaults to `both`; agents are discovered at `effectiveCwd` (`src/runs/foreground/subagent-executor.ts:1968-1970`).
3. Agent defaults can set `context: "fork"`; if no explicit context and any requested agent has `defaultContext: "fork"`, params are rewritten to fork (`src/runs/foreground/subagent-executor.ts:579-588`).
4. Intercom bridge is resolved; if active, all discovered agents are mapped through `applyIntercomBridgeToAgent` (`src/runs/foreground/subagent-executor.ts:1973-1979`). That may add `intercom` to tools and append bridge instructions (`src/intercom/intercom-bridge.ts:227-253`).
5. Session root is created: default is `<parent session dir>/<parent basename>/<runId>/` via `getSubagentSessionRoot` in `index.ts`, then each child gets `run-<idx>/session.jsonl` unless fork context returns a forked session file (`src/runs/foreground/subagent-executor.ts:2015-2042`).
6. `runSinglePath` resolves agent config, current model/provider, skill/output overrides, max depth, optional clarify UI, output path and output instruction (`src/runs/foreground/subagent-executor.ts:1558-1692`).
7. If `context: "fork"`, the task is wrapped with the default fork preamble (`src/shared/types.ts:555-571`, `wrapForkTask`; used in `runSinglePath` before output injection at `src/runs/foreground/subagent-executor.ts:1681-1683`).
8. `runSinglePath` calls `runSync(ctx.cwd, agents, agent, task, options...)` with cwd/session/artifact/output/model/skills/intercom/control settings (`src/runs/foreground/subagent-executor.ts:1734-1759`).
9. `runSync` resolves skills and injects their content into the system prompt (`src/runs/foreground/execution.ts:748-763`), builds model candidates from override/agent model/fallbacks/current registry (`src/runs/foreground/execution.ts:765-772`), then attempts each retryable model (`src/runs/foreground/execution.ts:792-824`).
10. `runSingleAttempt` builds Pi args via `buildPiArgs(...)` (`src/runs/foreground/execution.ts:139-156`), which:
    - sets `--session`/`--session-dir`/`--no-session`, `--model`, `--tools`, `--extension`, `--no-skills`, prompt file, task arg/file (`src/runs/shared/pi-args.ts:43-113`)
    - always injects the prompt runtime extension unless extensions are explicitly sandboxed (`src/runs/shared/pi-args.ts:62-83`)
    - sets env `PI_SUBAGENT_CHILD=1`, project/skills inheritance flags, intercom session name, `MCP_DIRECT_TOOLS` (`src/runs/shared/pi-args.ts:116-124`).
11. Child process is spawned as `pi` with JSON mode; stdout is parsed line-by-line and optionally mirrored to JSONL artifact (`src/runs/foreground/execution.ts:201-207`, `400-463`).
12. The injected runtime extension strips parent-only messages from forked context and rewrites system prompt to add child boundary instructions, remove project context/skills if disabled, and remove `pi-subagents` skill (`src/runs/shared/subagent-prompt-runtime.ts:7-13`, `77-79`, `108-136`). This is the key tool/skill/extension inheritance boundary.
13. Output capture uses final assistant text/session messages via `getFinalOutput`; if `outputPath` is set and exit code is 0, `resolveSingleOutput` writes the output and stores saved path/reference; `file-only` returns a compact reference (`src/runs/foreground/execution.ts:677-689`).
14. `runSync` writes debug artifacts (input/output/metadata/jsonl depending config), truncates large output if configured, and records sessionFile if available (`src/runs/foreground/execution.ts:852-890`).
15. `runSinglePath` finalizes display output with saved-output behavior, emits optional intercom grouped receipt, and returns either result text, detached/interrupted pause text, or error (`src/runs/foreground/subagent-executor.ts:1772-1835`).

Model selection:

- Single/parallel/chain first resolve explicit per-run/per-step model against `ctx.modelRegistry` and current provider (`subagent-executor.ts:1581-1588`, `1320-1330`; chain `chain-execution.ts:717-721`).
- `runSync` then builds candidates from `options.modelOverride ?? agent.model`, `agent.fallbackModels`, available models, preferred provider (`execution.ts:765-772`) and retries only retryable model failures (`execution.ts:821-824`).

Fresh vs fork:

- Fresh/default: child starts new session file with only provided task/system prompt/project context as configured.
- Fork: `createForkContextResolver(ctx.sessionManager, "fork")` supplies forked child session files (`subagent-executor.ts:1994-2000`), and tasks are wrapped with `DEFAULT_FORK_PREAMBLE` (`shared/types.ts:555-571`). Prompt runtime strips parent-only subagent messages/tool calls/results while preserving normal history (`subagent-prompt-runtime.ts:108-129`).

## 4. Chain mode internals

Chain setup:

- `runChainPath` wraps fork tasks if needed, passes chain/task/agents/context/session files/artifacts/control/intercom to `executeChain` (`src/runs/foreground/subagent-executor.ts:908-955`).
- `executeChain` creates a persistent chain directory with `createChainDir(runId, chainDirBase)`: if no `chainDir`, under temp `CHAIN_RUNS_DIR`; with `chainDir`, resolves user path and appends `runId` (`src/shared/settings.ts:101-104`, `src/shared/types.ts:538`).
- Templates are resolved by `resolveChainTemplates`: parallel tasks default to `{previous}` when omitted; sequential first defaults to `{task}`, later steps to `{previous}` (`src/shared/settings.ts:151-168`).

Template substitution:

- Sequential step substitution: `{task}` -> original task, `{previous}` -> previous output, `{chain_dir}` -> chain directory (`src/runs/foreground/chain-execution.ts:709-713`).
- Parallel chain task substitution does the same (`src/runs/foreground/chain-execution.ts:187-192`).
- If a template does not include `{previous}`, `buildChainInstructions` appends previous output as a suffix (`src/runs/foreground/chain-execution.ts:182-186`, `704-708`; `src/shared/settings.ts:273-275`).

Step persistence/file outputs:

- `resolveStepBehavior` merges step overrides over agent frontmatter/defaults: output, reads, progress, skills, model, outputMode (`src/shared/settings.ts:176-220`).
- `buildChainInstructions` prepends `[Read from: ...]` and `[Write to: ...]`, resolves relative paths under `chainDir`, and adds progress instructions to `progress.md` (`src/shared/settings.ts:242-275`).
- Sequential chain `output` path is passed directly to `runSync`; after success the chain checks whether expected file exists and annotates warning if not (`src/runs/foreground/chain-execution.ts:727-774`, `785-801`).
- For chain parallel steps, `resolveParallelBehaviors` namespaces relative outputs under `parallel-<step>/<taskIndex>-<agent>/...` to avoid collisions (`src/shared/settings.ts:293-358`), and `createParallelDirs` creates those dirs (`src/shared/settings.ts:363-374`).
- `{previous}` after a parallel step becomes `aggregateParallelOutputs(...)` of each child result, optionally with worktree diff summary (`src/runs/foreground/chain-execution.ts:629-642`).

Clarify:

- Chains default to clarify mode unless `clarify: false`, but only when UI exists and no parallel steps (`executeChain` sets `shouldClarify = clarify !== false && ctx.hasUI && !hasParallelSteps`, `chain-execution.ts:389-390`). Clarify can edit templates/behaviors and can request background launch.

## 5. Parallel mode internals

Top-level parallel:

- `runParallelPath` validates max tasks (`resolveTopLevelParallelMaxTasks`, default 8), concurrency (`resolveTopLevelParallelConcurrency`, default 4), agent existence, per-task models/skills/outputs/progress, optional clarify UI (`src/runs/foreground/subagent-executor.ts:1251-1426`).
- Concurrency uses `mapConcurrent(items, limit, fn)`, a simple worker pool preserving result order (`src/runs/shared/parallel-utils.ts:35-54`).
- Duplicate output paths are detected before launch (`subagent-executor.ts:1135-1149`, used at 1436-1443).
- Each task independently resolves cwd (or worktree cwd), read/progress/output instructions, output path, intercom target, model override, skills, session file, and calls `runSync` (`subagent-executor.ts:1156-1232`).
- Aggregation returns `N/M succeeded` plus `aggregateParallelOutputs` sections (`subagent-executor.ts:1505-1525`; aggregator `parallel-utils.ts:65-91`).

Chain parallel step:

- Inside `executeChain`, each parallel group uses its own concurrency (`step.concurrency ?? MAX_CONCURRENCY`) and optional `failFast` (`chain-execution.ts:160-164`).
- Fail-fast skips remaining tasks with exitCode `-1` after first failure (`chain-execution.ts:166-178`, `276-278`).

Worktree isolation:

- `worktree: true` calls `createWorktrees` for top-level parallel or chain parallel steps (`subagent-executor.ts:1428-1435`, `chain-execution.ts:506-523`).
- Requirements/constraints: must be inside a git repo and clean working tree; otherwise error `worktree isolation requires a clean git working tree` (`src/runs/shared/worktree.ts:74-83`, `125-130`).
- Task-level `cwd` cannot conflict with shared cwd under worktree mode; conflict is detected and formatted (`worktree.ts:95-116`; top-level use at `subagent-executor.ts:1277-1280`).
- Worktrees are temp dirs `os.tmpdir()/pi-worktree-<runId>-<index>` with branch `pi-parallel-<runId>-<index>` (`worktree.ts:121-128`), optional node_modules symlink, optional setup hook, diff summary artifacts, and cleanup in `finally` (`subagent-executor.ts:1530-1532`; chain `chain-execution.ts:643-645`).

## 6. Async/control: dirs, status, interrupt, resume, intercom

Async dirs/constants:

- Temp root is `os.tmpdir()/pi-subagents-<scope>`, with `async-subagent-runs`, `async-subagent-results`, `chain-runs`, `artifacts` (`src/shared/types.ts:535-540`).
- Async config is written to `async-cfg-<id>.json` (`src/shared/types.ts:551`).

Async launch:

- Async availability requires jiti; `async-execution.ts` probes `jiti` or `@mariozechner/jiti` (`async-execution.ts:28-49`, `isAsyncAvailable` at 120-122).
- `spawnRunner` writes config and spawns `node <jiti-cli> subagent-runner.ts <cfgPath>` detached with stdio ignored (`async-execution.ts:128-154`).
- `executeAsyncChain` builds serial/parallel runner steps with fully resolved task/systemPrompt/tools/extensions/model candidates/skills/output/session files, then spawns and emits `SUBAGENT_ASYNC_STARTED_EVENT` (`async-execution.ts:179-401`).
- `executeAsyncSingle` does analogous single run (output path around 478, spawn 483-545).

Status:

- `action: status` first checks in-memory foreground controls, then `inspectSubagentStatus` (`subagent-executor.ts:1893-1898`).
- With no id/dir, it lists queued/running async runs (`run-status.ts:34-47`).
- With id/dir, it resolves async run location, reconciles stale run, prints state/mode/step/log/events/result/session/intercom targets, and revive guidance when possible (`run-status.ts:65-136`).

Interrupt:

- Foreground interrupt targets current foreground control by id/current run; calls child AbortController and returns pause notice (`subagent-executor.ts:1899-1927`).
- Async interrupt resolves newest/rid running job and sends `SIGUSR2` (`SIGBREAK` on Windows) to stored pid (`subagent-executor.ts:249-276`).
- Child result returns `interrupted`/paused messaging rather than success/failure.

Resume:

- `action: resume` requires `message`; if live async child has intercom target, it sends follow-up over intercom (`subagent-executor.ts:281-320`).
- If not live, it resolves prior async run/session, rebuilds a task, and launches a revived async single run from the prior session file when allowed (`subagent-executor.ts:326-402`). Multi-child resume is mostly unsupported; status says so (`run-status.ts:122-129`, `157-162`).

Control/attention:

- Control thresholds are in schema (`control` object) and shared types (`ControlConfig`, `ResolvedControlConfig`). Runtime tracks last activity/current tool/tool failures. Events can notify via Pi event bus, async events, or intercom (`subagent-executor.ts:220-247`; `execution.ts` progress parsing/long-running guard).
- Visible notices use custom message renderer `subagent_control_notice` (`src/extension/index.ts:330-334`).

Intercom coupling:

- Optional. Bridge active when mode not off, context matches `fork-only` if configured, orchestrator target exists, pi-intercom dir exists, intercom config not disabled (`intercom-bridge.ts:145-180`, `182-225`).
- It injects prompt instructions with orchestrator target and adds `intercom` tool unless agent extension sandbox excludes intercom (`intercom-bridge.ts:227-253`).
- Foreground/async grouped completion results are delivered via Pi event bus events `subagent:result-intercom` and acknowledged by `subagent:result-intercom-delivery` (`result-intercom.ts:174-206`).
- Sibling `pi-intercom` listens for `SUBAGENT_CONTROL_INTERCOM_EVENT`, `SUBAGENT_RESULT_INTERCOM_EVENT`, and detach events (`pi-intercom/index.ts:11-15`); it registers sessions/presence with fallback alias prefix `subagent-chat` (`pi-intercom/index.ts:16-17`, `65-76`).

## 7. Agent discovery: scope, namespacing, schema, validation

Locations/rules from code:

- Builtins: `pi-subagents/agents` resolved relative to `src/agents/agents.ts` (`BUILTIN_AGENTS_DIR`).
- User agents: legacy `~/.pi/agent/agents` and new `~/.agents` (`agents.ts:710-728`).
- Project agents: nearest ancestor containing `.pi` or `.agents`; reads legacy `.agents` and canonical `.pi/agents`, preferred write dir `.pi/agents` (`agents.ts:181-191`, `693-706`, `731`).
- Chains: same dirs but files ending `.chain.md` (`agents.ts:623-638`, `738-779`).
- Scope: execution accepts `agentScope: user|project|both`, default both (`agent-scope.ts:3-5`; schema field). Project wins over user over builtin for `both` (`agent-selection.ts:8-15`).
- Builtin overrides: `settings.subagents.agentOverrides` in user/project settings; project override/bulk disable wins over user (`agents.ts:216-221`, `353-384`).
- Runtime namespacing: frontmatter `package` validated as dot/dash lowercase identifier, runtime name becomes `{package}.{localName}` (`identity.ts:3-20`). Serialization keeps separate name/package (`identity.ts:22-29`).
- Agent frontmatter fields: name/description required; supports tools with `mcp:` split, model/fallback/thinking, systemPromptMode, inheritProjectContext, inheritSkills, defaultContext, skill(s), extensions, output, defaultReads/defaultProgress, interactive, maxSubagentDepth, extra fields (`agents.ts:540-671`; known fields in `agent-serializer.ts:4-23`).
- Chain schema: frontmatter name/description required, steps are `## agent` sections with per-step output/outputMode/reads/model/skills/progress (`chain-serializer.ts:3-61`, `63-102`).
- Management validation warns for missing models/skills and blocks duplicate names in same scope (`agent-management.ts:118-159`, `161-215`, `239-279`). Builtins cannot be modified directly (`agent-management.ts:280-301`).

Current local config found:

- `/Users/luke/.pi/agent/settings.json` has packages including `https://github.com/nicobailon/pi-subagents` and `https://github.com/nicobailon/pi-intercom`; no `subagents` override block currently present.
- No user/project agent definitions found in the configured agent dirs for this project. `find ~/.pi/agent/agents ~/.agents ...` found no `*.md` agent or `*.chain.md`; `~/.agents` exists but contains skills/plugins only.
- `/Users/luke/Projects/personal/pi-agent-tool/.pi/` contains local extensions (`prompt-url-widget.ts`, `redraws.ts`, `tps.ts`) and prompts (`cl.md`, `is.md`, `pr.md`, `wr.md`), no `.pi/settings.json` or `.pi/agents` found.
- `/Users/luke/.pi/agent/extensions/subagent/config.json` not found; defaults apply. `/Users/luke/.pi/agent/intercom/broker.pid` exists; no intercom config file found in the probe.

## 8. UI/UX today

Custom extension rendering, not just default tool rendering:

- `subagent` tool defines `renderCall` for action/chain/parallel/single labels and `renderResult` via `renderSubagentResult` (`src/extension/index.ts:430-462`). It does not set `renderShell: "self"`, so core `ToolExecutionComponent` shell behavior still applies unless default semantics change.
- Custom message renderers registered for slash results, subagent notifications, and control notices (`src/extension/index.ts:294-330`). Slash result renderer uses a `Container` with colored `Box` and animated result syncing (`index.ts:131-156`).
- Async jobs render as widget `subagent-async`; after subagent tool results, it calls `renderWidget(ctx, asyncJobs)` and ensures poller (`index.ts:503-509`).
- Slash commands and prompt template bridges feed live updates into custom `subagent-slash-result` messages.
- Clarify TUI uses `ctx.ui.custom(..., { overlay: true, overlayOptions: { anchor: "center", width: 84, maxHeight: "80%" } })` for chain/single/parallel launch editing (`chain-execution.ts:425-443`; `subagent-executor.ts:1344-1362`, `1601-1618`).
- `/agents` manager is a custom TUI under `src/manager-ui/*`.
- Pi core APIs used: `registerTool`, `registerMessageRenderer`, `registerCommand`, `sendMessage`, `events`, `getSessionName`, `ctx.ui.custom/setWidget`, `ctx.sessionManager`, `ctx.modelRegistry` (`packages/coding-agent/src/core/extensions/types.ts:434-480`, `1149-1196`, `1219`, `1326`).

## 9. Skill content: parent behaviors a built-in tool would need to absorb/replace

The `pi-subagents` skill is parent-orchestrator guidance, not child guidance: “parent session owns delegation… child subagents should receive concrete role-specific tasks and should not run their own subagent workflows” (`SKILL.md:13-16`). Built-in migration must absorb these parent behaviors if the external skill is removed:

- Decide when to use subagents: advisory review, implementation handoff, scout/research/planning, parallel exploration, async long-running work, control/status, authoring.
- Map natural language and slash recipes to tool calls: `/run`, `/chain`, `/parallel`, `/agents`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, plus packaged prompt workflows.
- Preserve workflow recipes: parallel review/research/context-build/handoff-plan/cleanup, gather-context-and-clarify, oracle loop, clarify-plan-worker-review-fix-worker scaffolding.
- Preserve prompting standards for GPT-5.5 children: compact contract with goal/context/success criteria/hard constraints/validation/output/stop rules.
- Preserve discovery/scope docs: user/project/builtin locations, `.chain.md`, package namespacing, precedence, settings overrides.
- Preserve operational constraints: fork requires persisted parent session (`SKILL.md:537-539`), fork inherits parent history, default depth guard, attention vs lifecycle states, intercom ask behavior, single-writer best practice.
- Preserve error-handling guidance: unknown agent -> list; setup -> doctor; max depth -> flatten/config; session missing -> persist or fresh; intercom waiting; parallel output conflict; worktree clean repo.

## 10. Best ideas to preserve

1. **Child runtime boundary** — `PI_SUBAGENT_CHILD` prevents recursive tool registration and prompt runtime strips parent-only artifacts/skill while adding child boundary instructions. This is essential to avoid delegation loops and polluted forked context (`index.ts:221-222`; `subagent-prompt-runtime.ts:7-13`, `108-129`).
2. **Agent discovery with project/user/builtin precedence** — simple file-based agents plus settings overrides gives useful customization without code changes (`agents.ts:710-732`; `agent-selection.ts:8-15`).
3. **DefaultContext per agent** — oracle/worker/planner can default to fork while reviewers can be fresh; parent can override explicitly (`subagent-executor.ts:579-588`).
4. **Saved output/file-only references** — avoids dumping huge child outputs into parent context while preserving artifact paths (`execution.ts:677-689`).
5. **Chain directory and `{task}/{previous}/{chain_dir}` variables** — practical way to pass summaries/artifacts without making every child rediscover context (`settings.ts:151-168`; `chain-execution.ts:709-713`).
6. **Parallel output collision prevention and namespacing** — especially important if keeping parallel writers or artifacts (`subagent-executor.ts:1135-1149`; `settings.ts:293-358`).
7. **Control/status/interrupt/resume vocabulary** — makes long-running children manageable; status exposes exact dirs/logs/events and revive limits (`run-status.ts:34-136`).
8. **Optional intercom bridge** — cleanly optional, uses event bus and injected tool/prompt only when available; avoids hard dependency (`intercom-bridge.ts:145-253`).
9. **Worktree isolation as opt-in** — good safety valve for intentional parallel writers, with clean-tree guard (`worktree.ts:74-83`).
10. **Clarify TUI before launch** — useful for human-controlled workflows and manager UI, though probably too heavy for built-in minimal core.

## 11. Complexity to delete or simplify

1. **Slash/prompt-template bridge duplication** — tool, slash commands, prompt templates, slash live-state, and manager UI all route to same executor with substantial glue. A built-in system could keep one canonical tool/API and add UI later.
2. **Async as detached jiti runner** — fragile operational surface: jiti discovery, temp config files, result watchers, stale reconciliation, PID signals. If Pi core can host child sessions natively, replace detached process orchestration.
3. **Intercom result receipt delivery** — grouped result via event bus plus receipt fallback is clever but complex. Native parent-child result channels could remove delivery acknowledgement events.
4. **Worktree parallel writers** — powerful but high-risk/rare. Consider preserving as later optional mode, not baseline migration requirement.
5. **Agent management via LLM tool** — `create/update/delete` is convenient but makes the core tool broad. If built-in, consider read/list/run first; keep authoring in `/agents` UI or explicit file edits.
6. **Clarify TUI in execution path** — complicates async semantics (`background requested, but clarify kept foreground`). Might be UI-only layer over a simpler run primitive.
7. **Custom rendering/widget stack** — useful UX, but migration can initially rely on core tool rendering plus simple progress messages, then re-add richer TUI.
8. **Recursive chain parallel steps + top-level parallel + async chain all sharing behavior** — three orchestration shapes create many edge cases. Core might keep single + parallel + simple sequential chain first.
9. **Multiple legacy locations** — supporting both `~/.pi/agent/agents` and `~/.agents`, `.agents` and `.pi/agents` helps compatibility but increases mental model. Migration should choose canonical `.pi/agents` and import legacy.

## 12. Migration risks

- **Existing package install config**: user settings currently includes `https://github.com/nicobailon/pi-subagents` and `pi-intercom`; ripping extension without equivalent built-in will remove `subagent` tool and skill/prompt workflows from Luke’s daily Pi (`~/.pi/agent/settings.json`).
- **Prompt behavior dependency**: parent agents currently learn orchestration from `SKILL.md`. Removing skill without replacing parent instructions will break natural-language “use reviewer/scout/oracle” behavior even if a built-in tool exists.
- **Child safety regression**: if built-in children receive the built-in subagent tool/skill or unfiltered fork history, they can recurse or follow stale parent orchestration instructions.
- **Forked context semantics**: packaged `planner`, `worker`, `oracle` default to forked context; users may rely on inherited session history. Fresh-only migration would change behavior.
- **Custom agents/chains compatibility**: no local custom agents found now, but code supports user/project agents and `.chain.md`; external users may depend on package namespacing and settings overrides.
- **Async artifacts/status paths**: async status/resume currently stored under temp `pi-subagents-*`; migration may orphan running async jobs and status commands.
- **Intercom coupling**: oracle/worker prompts and bridge assume intercom may be injected. Removing bridge without alternate escalation channel changes blocker handling.
- **Tool names/allowed tools**: agent frontmatter `tools` can include built-ins, extension paths, and `mcp:` direct tools. Built-in migration must preserve or intentionally narrow this.
- **Output files and `chain_dir`**: prompt templates and skill recipes expect relative chain outputs under temp dirs. Changing path semantics can write into repo unexpectedly or lose artifacts.
- **UI regression**: `/agents`, clarify overlay, async widget, custom status/control notices are user-visible features.
- **Process model differences**: current child runs are separate Pi processes; native sessions may differ in environment, settings reload, extension loading, auth/model selection, cwd, and signal handling.

## 13. Pi core integration points consumed

- Extension `ToolDefinition` supports schema, execute, executionMode, custom renderers, etc. (`packages/coding-agent/src/core/extensions/types.ts:434-480`).
- `ExtensionAPI.registerTool` and `registerMessageRenderer` are the key registration APIs (`types.ts:1149-1150`, `1187`).
- Extension API also provides `sendMessage`, `getSessionName`, shared `events` bus (`types.ts:1194-1196`, `1219`, `1326`).
- UI context provides custom overlays/widgets/status/editor access (`types.ts:80-240`), used for clarify, widgets, manager UI.
- Session manager exposes session file/id/branch/tree needed for fork/session roots (`types.ts:283-333`; session shapes in `session-manager.ts`).
- Core wraps registered ToolDefinitions into AgentTools via `wrapToolDefinition` (`packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:1-20`).
- `createAgentSession` supports custom tools/resource loader/session manager/models, but current subagents do not use it directly; they spawn CLI Pi (`packages/coding-agent/src/core/sdk.ts:39-86`, child spawn in extension `execution.ts:201-204`).

## 14. Commands & probes run

- `find /Users/luke/.pi/agent/git/github.com/nicobailon/pi-subagents -maxdepth 5 -type f | sort`
- `find /Users/luke/.pi/agent/git/github.com/nicobailon/pi-intercom -maxdepth 5 -type f | sort`
- `find /Users/luke/.pi/agent ...` scoped probes for settings/agents/config.
- `find /Users/luke/Projects/personal/pi-agent-tool/.pi -maxdepth 5 -type f | sort`
- `find /Users/luke/Projects/personal/pi-agent-tool/packages/coding-agent **/*` via tool find.
- Python tree listings excluding `.git`, `node_modules`, coverage, `.fallow` for `pi-subagents` and `pi-intercom`.
- Read key files listed above with `read`.
- Grep probes for `registerTool`, `SubagentParams`, `SUBAGENT_ACTIONS`, `runSinglePath`, `executeChain`, `buildPiArgs`, `spawn`, `resolveChainTemplates`, `createChainDir`, `discoverAgents`, `resolveIntercomBridge`, `executeAsyncChain`, `inspectSubagentStatus`, Pi core extension APIs.
- `find ~/.pi/agent/agents ~/.agents <project>/.pi/agents <project>/.agents -maxdepth 4 -type f` to check user/project agents/chains.
- `find ~/.pi/agent/extensions/subagent ~/.pi/agent/intercom -maxdepth 3 -type f` to check extension/intercom config.

No implementation, subagents, network, or writes outside `/Users/luke/Projects/personal/pi-agent-tool/handoff/` were performed.

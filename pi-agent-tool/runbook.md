# Runbook

## Prep

```bash
cd /Users/luke/Projects/personal/pi-mono-fork/pi-agent-tool
mkdir -p tmp captures
```

Use the same model and thinking level for both arms. Start each arm in a clean terminal session. If using Anthropic models through `claude-bridge`, record cache statistics for every scenario: cache creation input tokens, cache read input tokens, uncached input tokens, output tokens, and any bridge-visible cache hit/miss summary.

Before an interactive run, smoke-check helper launch commands without starting Pi:

```bash
PI_AGENT_EVAL_DRY_RUN=1 ./scripts/capture-startup.sh native
PI_AGENT_EVAL_DRY_RUN=1 ./scripts/run-tmux-scenario.sh native-ui '/agents'
```

## Native-only mode

Goal: exercise only built-in `/agents` and native `agent`.

1. Disable or ignore `pi-subagents`.
   - Preferred: launch Pi with the extension disabled if your local extension manager supports per-session disabling.
   - Fallback: do not invoke `/subagents`, `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, or activate `subagent`.
2. Capture startup:

```bash
./scripts/capture-startup.sh native
```

3. Verify:
   - `/agents` opens the native selector.
   - `agent` is available as a tool.
   - `subagent` is not activated.
   - Extension commands do not influence the run.
4. Run scenarios 1-9 from `eval-plan.md`.
5. Fill one Native row per scenario in `scorecard-template.md`.

## `pi-subagents` mode

Goal: exercise the extension surface.

1. Ensure extension is installed/enabled at:

```text
~/.pi/agent/git/github.com/nicobailon/pi-subagents
```

2. Capture startup:

```bash
./scripts/capture-startup.sh subagents
```

3. Verify:
   - `/subagents` opens the extension manager.
   - `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, and `/subagents-doctor` are available.
   - Activate `subagent` only if testing tool mode.
4. Run scenarios 1-9 from `eval-plan.md`.
5. Fill one `pi-subagents` row per scenario in `scorecard-template.md`.

## Scenario prompts

### 1. Single-agent code reconnaissance

Native:

```text
Use the scout agent to map native agent-tool implementation files and summarize integration points. Cite file paths. Do not modify files.
```

Extension:

```text
/run scout Map native agent-tool implementation files and summarize integration points. Cite file paths. Do not modify files.
```

### 2. Parallel review

Native: use three parallel `agent` tasks: correctness, validation, simplicity.

Extension:

```text
/parallel reviewer "Review eval-plan.md for correctness evidence gaps" -> reviewer "Review runbook.md for validation gaps" -> reviewer "Review README.md for simplicity and token efficiency"
```

### 3. Chain handoff

Native: scout -> plan -> reviewer on whether scenario 8 fairly tests context inheritance.

Extension:

```text
/chain scout "Find context controls in native and extension docs/source" -> plan "Design a fair context discipline test" -> reviewer "Critique fairness and missing controls"
```

### 4. Saved/reusable workflow

Native: record a reusable prompt snippet or JSON tool-call pattern in captures.

Extension: create or run the closest saved chain via `/subagents` or `/run-chain`.

### 5. Async/status/control

Native: mark unsupported unless current native UI exposes background/status controls.

Extension:

```text
/run scout --bg Wait briefly, then report the current working directory and list pi-agent-tool files.
/subagents-status
```

### 6. Doctor/diagnostics

Native: capture startup/tool availability and note absence of direct doctor if applicable.

Extension:

```text
/subagents-doctor
```

### 7. UI manager pass

Use tmux capture, not screenshots by default:

```bash
./scripts/run-tmux-scenario.sh native-ui '/agents'
./scripts/run-tmux-scenario.sh subagents-ui '/subagents'
```

### 8. Context discipline stress

Ask the child to answer using only `eval-design-prompt.md` and `eval-plan.md`. Penalize over-searching unless justified.

Native: test `context: "none"`, `"slim"`, and/or `"fork"` if accessible in tool call.

Extension: test `--fork` and default mode; note if no exact equivalent exists.

### 9. Updated task agent tool

Native: verify whether the updated non-spawn task action surface is available on the native `agent` tool:

```json
{"action":"create","subject":"Map task API","description":"Verify create/list/get/update semantics","activeForm":"Mapping task API"}
{"action":"list"}
{"action":"get","taskId":"1"}
{"action":"update","taskId":"1","status":"in_progress"}
{"action":"update","taskId":"1","metadata":{"evidence":"source-backed"}}
{"action":"update","taskId":"1","status":"completed"}
{"action":"update","taskId":"1","status":"deleted"}
```

Expected semantics: create/list/get/update task records without spawning a child agent; preserve existing single/parallel/chain delegation modes; support dependencies, metadata, and delete semantics where implemented.

Before scoring, record the source probes so the verdict is reproducible:

```bash
grep -E "action|taskId|create|list|get|update" packages/coding-agent/src/core/tools/agent.ts
grep -R -E "taskId|TaskList|TaskCreate|metadata|blockedBy|status.*completed" ~/.pi/agent/git/github.com/nicobailon/pi-subagents/src
```

Extension: record the closest `pi-subagents` equivalent, usually manager/status/saved-chain workflow controls. Mark as no equivalent if the extension lacks general task-list records.

## Evidence capture

Save terminal captures under `captures/` with names like:

```text
captures/native-s01-single-recon.txt
captures/subagents-s01-single-recon.txt
```

For each run, record token usage from Pi UI/logs if visible. For Anthropic models via `claude-bridge`, also record cache creation/read token counts and cache hit ratio when exposed by bridge logs. If unavailable, mark `token_source=unavailable` and estimate from prompt/output length.

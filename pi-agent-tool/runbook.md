# Runbook

## 0. Reset and source probes

```bash
cd /Users/luke/Projects/personal/pi-mono-fork/pi-agent-tool
rm -rf captures tmp
mkdir -p captures tmp
./scripts/capture-source-probes.sh
```

## 1. Native-only arm

Launch flags:

```bash
../pi-test.sh --no-session --no-extensions --tools agent,read,grep,find,ls --thinking off
```

Expected isolation:

- Built-in `agent` is available.
- `pi-subagents` extension is not loaded because of `--no-extensions`.
- `subagent` tool is not active.
- Extension commands `/subagents`, `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-status`, `/subagents-doctor` are not used.

Capture cheap startup/UI evidence:

```bash
./scripts/capture-startup.sh native
./scripts/run-tmux-scenario.sh native native-s06-doctor-live '/agents-doctor'
./scripts/run-tmux-scenario.sh native native-s05-status-live '/agents-status'
./scripts/run-tmux-scenario.sh native native-s07-ui-selector-live '/agents'
```

Do not run live child-agent prompts unless explicitly needed. Source-backed captures under `captures/native-s0*.txt` cover scenarios where live children would spend tokens.

## 2. `pi-subagents` arm

Launch flags:

```bash
../pi-test.sh --no-session --no-builtin-tools --no-extensions \
  -e ~/.pi/agent/git/github.com/nicobailon/pi-subagents/src/extension/index.ts \
  --thinking off
```

Expected isolation:

- Built-in native tools are disabled by `--no-builtin-tools`; native `agent` is not active.
- Only the explicit `pi-subagents` extension is loaded.
- Native `/agents` is not used.
- Extension command surface is current installed behavior: `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-doctor`; `/subagents` and `/subagents-status` are unavailable in `0.24.0`.

Capture cheap startup/UI evidence:

```bash
./scripts/capture-startup.sh subagents
./scripts/run-tmux-scenario.sh subagents subagents-s06-doctor-live '/subagents-doctor'
./scripts/run-tmux-scenario.sh subagents subagents-run-usage-live '/run'
./scripts/run-tmux-scenario.sh subagents subagents-chain-usage-live '/chain'
./scripts/run-tmux-scenario.sh subagents subagents-parallel-usage-live '/parallel'
./scripts/run-tmux-scenario.sh subagents subagents-run-chain-usage-live '/run-chain'
```

Removed-command probes are optional and can spend parent-model tokens because Pi treats an unregistered slash string as normal prompt text:

```bash
./scripts/run-tmux-scenario.sh subagents subagents-s05-status-removed-live '/subagents-status'
./scripts/run-tmux-scenario.sh subagents subagents-s07-manager-removed-live '/subagents'
```

Do not use native `agent` or `/agents` in this arm.

## 3. Task-agent lifecycle probe

Native expected request shape from the task brief:

```json
{"action":"create","subject":"Map task API","description":"Verify create/list/get/update semantics","activeForm":"Mapping task API"}
{"action":"list"}
{"action":"get","taskId":"1"}
{"action":"update","taskId":"1","status":"in_progress"}
{"action":"update","taskId":"1","metadata":{"evidence":"source-backed"}}
{"action":"update","taskId":"1","status":"completed"}
{"action":"update","taskId":"1","status":"deleted"}
```

Current checkout verdict is source-backed: `packages/coding-agent/src/core/tools/agent.ts` does not expose `action`, `taskId`, `activeForm`, lifecycle statuses, dependencies, or metadata fields. Mark native S09 as pending/absent, not failed runtime behavior.

`pi-subagents` has management actions for agent/chain definitions and async run control, but no general structured non-spawn task-list equivalent.

## 4. Score and log

```bash
./autoresearch.sh
```

Before any `keep`, verify:

- `isolation-proof.md` says `native_no_subagent_tool: true`.
- `isolation-proof.md` says `subagents_no_native_agent_tool: true`.
- `source-probes.md` includes removed `/subagents-status` and `/subagents` manager evidence for extension `0.24.0`.
- `evidence-manifest.md` maps every scorecard row to an existing evidence file and links live captures.
- `./autoresearch.sh` exits 0 and emits `METRIC actual_eval_score=...`.

Then use `run_experiment` and `log_experiment` with ASI including hypothesis, evidence, isolation proof, and next action hint.

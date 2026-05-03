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
- Only the explicit `pi-subagents` extension is attempted via `-e`.
- Native `/agents` is not used.
- Extension source command surface is current installed behavior: `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-doctor`; `/subagents` and `/subagents-status` are unavailable in `0.24.0`.
- Current runtime caveat: the fresh eval launch now fails to load `pi-subagents` with a module-format error, so runtime command availability is blocked until that loader issue is fixed.

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

## 2.5. Tiny live child-output probe

Only run this when source-backed evidence is no longer enough and the token spend is justified. It is intentionally one tiny S01 probe, not a broad live-child benchmark:

```bash
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh native native-s01-live-child-output '/agents run scout -- Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh subagents subagents-s01-live-child-output '/run scout Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
python3 scripts/check-live-child-output.py
```

Current verdict: native completed a real child scout run; `pi-subagents` failed before child execution because the extension did not load.

## 2.6. Extension load audit

When the extension fails to load, diagnose that from source and captures rather than rerunning paid prompts:

```bash
python3 scripts/check-extension-load-audit.py
```

Current verdict: `pi-subagents` 0.24.0 declares an ESM TypeScript entry, Pi loads it through `jiti.import(..., { default: true })`, and the fresh runtime fails with `Cannot determine intended module format because both 'exports' and top-level await are present` before commands register.

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
- `command-surface.md` exists and `scripts/check-command-surface.py` validates current native/extension command surfaces, launch flags, and the current extension runtime load failure.
- `live-child-output.md` exists and `scripts/check-live-child-output.py` validates the tiny S01 live probe.
- `extension-load-audit.md` exists and `scripts/check-extension-load-audit.py` validates the current module-format load-failure diagnosis without patching production source.
- `evidence-manifest.md` maps every scorecard row to an existing evidence file and links live captures.
- `token-evidence.md` records `$0.000` native registered-command captures and the removed-command extension fallthrough cost.
- `score-analysis.md` exists and `scripts/check-scorecard-consistency.py` validates scorecard summary averages.
- `findings-alignment.md` exists and `scripts/check-findings-alignment.py` validates prose/numeric winner alignment with documented exceptions.
- `task-lifecycle-audit.md` exists and `scripts/check-task-lifecycle.py` validates the S09 native absent/pending verdict and extension closest-equivalent non-equivalence.
- `./autoresearch.sh` exits 0 and emits `METRIC actual_eval_score=...`.

Then use `run_experiment` and `log_experiment` with ASI including hypothesis, evidence, isolation proof, and next action hint.

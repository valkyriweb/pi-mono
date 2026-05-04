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

## 2.5.1. Native background-control live probe

Only run this when source/test evidence is no longer enough for S05 and the token spend is justified. It is intentionally one tiny native background start/status probe; interrupt/resume and cancel are covered by separate stress probes below:

```bash
./scripts/capture-native-background-control.sh
python3 scripts/check-native-background-control-live.py
```

Current verdict: native started a background scout, returned `agent-1`, showed `/agents-status`/interrupt/cancel/resume control hints, `/agents-status agent-1` reported completed status detail with one README `read` tool, and appended child-session evidence records `BACKGROUND_PROBE_OK findings.md`, 3377 child tokens, and $0.0125 child cost.

## 2.5.2. Native background interrupt/resume live probe

Only run this when the token spend is justified. It starts a background worker with an intended long-running step, interrupts it, verifies resumable status, resumes with a short prompt, and captures final output. It paid-tests interrupt/resume only; cancel is covered by the separate stress probe below:

```bash
./scripts/capture-native-background-interrupt-resume.sh
python3 scripts/check-native-background-interrupt-resume-live.py
```

Current verdict: native interrupted `agent-1`, `/agents-status agent-1` showed `single background interrupted` plus `resumable: yes`, `/agents resume agent-1 -- ...` returned `Resumed agent-1`, the run completed after resume, and child-session evidence records `INTERRUPT_RESUME_PROBE_OK autoresearch.md`, 13139 child tokens, and $0.0200 child cost.

## 2.5.3. Native background cancel live probe

Only run this when the token spend is justified. It starts a background worker with an intended long-running step, cancels it, verifies cancelled status, and checks that the child produced no final output:

```bash
./scripts/capture-native-background-cancel.sh
python3 scripts/check-native-background-cancel-live.py
```

Current verdict: native cancelled `agent-1`, `/agents-status agent-1` showed `single background cancelled` and `error: Agent run cancelled`, child-session evidence records no final output or read tool, and status output records 12971 child tokens plus $0.0675 child cost.

## 2.6. Extension load audit

When the extension fails to load, diagnose that from source and captures rather than rerunning paid prompts:

```bash
python3 scripts/check-extension-load-audit.py
```

Current verdict: `pi-subagents` 0.24.0 declares an ESM TypeScript entry; its runtime import of `@mariozechner/pi-coding-agent` follows Pi's source-checkout alias through `src/index`/extension-loader re-exports during `jiti.import(..., { default: true })`; the fresh runtime then fails with `Cannot determine intended module format because both 'exports' and top-level await are present` before commands register.

## 2.7. Capture timeline audit

When current failure captures coexist with older successful extension captures, make the timing explicit:

```bash
python3 scripts/check-capture-timeline.py
```

Current verdict: seven older `pi-subagents` command/fallthrough captures predate the two current load-failure captures, so source/historical capability evidence and current-runtime availability are intentionally separated. If the loader issue is fixed, rerun S01 plus the cheap extension command probes before treating prior captures as current proof.

## 2.8. Stale evidence policy

Before review/finalization, check the current-vs-prior evidence policy:

```bash
python3 scripts/check-stale-evidence-policy.py
```

Current verdict: current runtime availability comes from the load-failure captures; older loaded-extension captures are historical/source-supported evidence only.

## 2.9. Scenario verdict audit

Before review/finalization, classify every scored row by evidence type:

```bash
python3 scripts/check-scenario-verdicts.py
```

Current verdict: 4 current-live rows, 1 current-load-failure row, 3 prior-live rows, and 10 source-backed rows.

## 2.10. Source/runtime boundary audit

Before review/finalization, verify source-backed `pi-subagents` rows do not read like current runtime proof while the extension loader is failing:

```bash
python3 scripts/check-source-runtime-boundary.py
```

Current verdict: five source-backed `pi-subagents` rows (S02, S03, S04, S08, S09) are caveated in scorecard, evidence manifest, and eval plan as source-only/current-runtime blocked.

## 2.10.1. Ideas backlog audit

Before review/finalization, verify deferred ideas are still current and actionable:

```bash
python3 scripts/check-ideas-backlog.py
```

Current verdict: the backlog preserves loader-rerun, loader-regression, task-lifecycle, and final-handoff ideas; native S05 background start/status, interrupt/resume, and cancel probes are completed rather than deferred. The final-handoff idea now points at `handoff-review.md`, `artifact-index.md` / `autoresearch.sh` required_files, and current audits instead of a stale hardcoded subset.

## 2.10.2. Markdown hygiene audit

Before review/finalization, verify generated Markdown artifacts do not hide warnings/checks through fused table rows or fused list bullets:

```bash
python3 scripts/check-markdown-hygiene.py
```

Current verdict: root Markdown artifacts are clean of known fused-row (`||`), fused-bullet (`.-`), and table-heading join symptoms; `source-probes.md` is excluded because it embeds source code containing `||`.

## 2.10.3. Capture integrity audit

Before review/finalization, verify every scorecard evidence capture contains the scenario-specific markers the scorecard relies on:

```bash
python3 scripts/check-capture-integrity.py
```

Current verdict: 18/18 scorecard evidence captures are covered, 18/18 files exist, and 78/78 expected markers are present across current-live, current-load-failure, prior-live, and source-backed captures.

## 2.11. Token accounting audit

After any live probe or token-evidence wording change, verify model-call/token language:

```bash
python3 scripts/check-token-accounting.py
```

Current verdict: native S01 child output and native S05 background start/status, interrupt/resume, and cancel have paid evidence, three native registered command probes are `$0.000`, two prior extension removed-command fallthroughs total $0.111, and current extension S01 has no child token accounting because loading fails.

## 2.12. Repro hygiene audit

After adding any `scripts/check-*.py` helper or changing the scorer, verify the runner does not dirty Python bytecode caches:

```bash
python3 scripts/check-repro-hygiene.py
```

Current verdict: `autoresearch.sh` syntax-checks `scripts/check-*.py` with in-memory `compile(...)` instead of `python -m py_compile`, and `scripts/__pycache__` stays clean.

## 2.13. Recommendation consistency audit

Before final handoff, verify the recommendation does not imply the currently failing `pi-subagents` runtime is usable:

```bash
python3 scripts/check-recommendation-consistency.py
```

Current verdict: native remains the default delegation recommendation; `pi-subagents` is source/tool-schema useful for async/control only after the module-format load failure is fixed and S01 plus cheap extension command probes are rerun.

## 2.14. Rerun command audit

After changing README/runbook commands or adding generated checks, verify reproduction coverage:

```bash
python3 scripts/check-rerun-commands.py
```

Current verdict: README and runbook include the preserved `/subagents` removed-command probe, S01 live-child checker, native S05 background-control live checker, generated-artifact checks, handoff review, and final scorer.

## 2.15. Artifact index audit

After adding/removing artifact files, keep README, evidence manifest, runbook final checklist, `autoresearch.md` file scope/descriptions/notes, and scorer-required files synchronized:

```bash
python3 scripts/check-artifact-index.py
```

Current verdict: README Fresh artifacts names every `autoresearch.sh` required file plus `captures/` and `scripts/`; evidence manifest and runbook checklist index every audited evidence artifact; `autoresearch.md` Files in scope/descriptions/notes stay current with scorer-required files; and the generated artifact-index table has markdown row-split plus capture-integrity note-scope guards.

## 2.16. Eval plan currentness audit

After live/failure evidence changes, keep the planning artifact from contradicting the current evidence class:

```bash
python3 scripts/check-eval-plan-currentness.py
```

Current verdict: `eval-plan.md` names the live native S01 child probe, current `pi-subagents` S01 load failure, S05-S07 prior extension tmux/current-runtime caveats, token/cost exceptions, and delegates the expanded secondary metric list to `autoresearch.md`.

## 2.17. Native control currentness audit

Native S05 now depends on source-backed background-run control, a rerun `/agents-status` capture, one paid live background start/status probe, one paid live interrupt/resume probe, and one paid live cancel probe; keep those artifacts aligned:

```bash
python3 scripts/check-native-control-currentness.py
```

Current verdict: native `agent` source exposes background plus status/detail/interrupt/cancel/resume control markers, `captures/native-s05-status-live.txt` says native background control is supported, `native-background-control-live.md` validates the paid start/status child probe, `native-background-interrupt-resume-live.md` validates paid interrupt/resume, `native-background-cancel-live.md` validates paid cancel, and S05 findings/scorecard make native the current-runtime/source winner.

## 2.18. Native control test audit

Native S05 should not rely only on paid probes to prove existing control wiring; audit the schema/executor/status unit-test evidence too:

```bash
python3 scripts/check-native-control-tests.py
```

Current verdict: native background/control schema, executor background-run wiring, status implementation, and unit tests for running status, interrupt/cancel, and resume are present while the scorecard/capture keep the paid start/status, interrupt/resume, and cancel probes scoped to S05 background-run control.

## 2.19. Eval design prompt audit

The tracked seed prompt is historical scaffolding only; ensure it carries current removed-surface and load-failure caveats instead of telling rerunners to treat removed extension commands as active:

```bash
python3 scripts/check-eval-design-prompt.py
```

Current verdict: `eval-design-prompt.md` has a historical/not-current-evidence warning, 12/12 current caveats, and no known obsolete seed-prompt command/action lines.

## 2.20. Scorecard template audit

The tracked template is scaffolding only; ensure it does not carry stale filled scores or obsolete source-only claims:

```bash
python3 scripts/check-scorecard-template.py
```

Current verdict: `scorecard-template.md` has 18 placeholder rows, current scorecard columns, a not-current-evidence warning, and no known stale source-only/runtime claims.

## 2.21. Findings template audit

The tracked findings template is scaffolding only; ensure it does not carry stale winners, command surfaces, extension versions, or token/cache claims:

```bash
python3 scripts/check-findings-template.py
```

Current verdict: `findings-template.md` has the full report structure, 128 placeholders, a not-current-evidence warning, and no known stale filled-report claims.

## 2.22. Handoff review

Before final handoff, consolidate the high-risk guardrails into one reviewer pass:

```bash
python3 scripts/check-handoff-review.py
```

Current verdict: `handoff-review.md` verifies the key audit artifacts, current/prior boundary, native S05 control boundary, pending-work backlog, summary references, latest artifact-index scope checks, and evidence-manifest scope summary all remain aligned.

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

Current checkout verdict is source-backed: `packages/coding-agent/src/core/tools/agent.ts` may expose generic background-run control (`action`/`runId`), but it does not expose task-record `taskId`, `activeForm`, lifecycle statuses, dependencies, metadata fields, or create/list/get/update/delete task lifecycle actions. Mark native S09 as pending/absent, not failed runtime behavior.

`pi-subagents` has management actions for agent/chain definitions and async run control, but no general structured non-spawn task-list equivalent.

## 4. Score and log

```bash
./autoresearch.sh
```

Before any `keep`, verify:

- `isolation-proof.md` says `native_no_subagent_tool: true`.
- `isolation-proof.md` says `subagents_no_native_agent_tool: true`.
- `source-probes.md` includes removed `/subagents-status` and `/subagents` manager evidence for extension `0.24.0`.
- `command-surface.md` exists and `scripts/check-command-surface.py` validates current native/extension command surfaces, launch flags, the current extension runtime load failure, and the markdown guardrail split for the extension-load audit warning.
- `live-child-output.md` exists and `scripts/check-live-child-output.py` validates the tiny S01 live probe.
- `native-background-control-live.md` exists and `scripts/check-native-background-control-live.py` validates the tiny paid native S05 background start/status probe.
- `native-background-interrupt-resume-live.md` exists and `scripts/check-native-background-interrupt-resume-live.py` validates the tiny paid native S05 interrupt/resume probe.
- `native-background-cancel-live.md` exists and `scripts/check-native-background-cancel-live.py` validates the tiny paid native S05 cancel probe.
- `extension-load-audit.md` exists and `scripts/check-extension-load-audit.py` validates the current module-format load-failure diagnosis without patching production source.
- `capture-timeline.md` exists and `scripts/check-capture-timeline.py` validates timestamp ordering between prior extension-loaded captures and current load-failure captures.
- `stale-evidence-policy.md` exists and `scripts/check-stale-evidence-policy.py` validates current-vs-prior evidence wording.
- `scenario-verdict-audit.md` exists and `scripts/check-scenario-verdicts.py` validates every scorecard row's evidence class.
- `source-runtime-boundary.md` exists and `scripts/check-source-runtime-boundary.py` validates source-backed `pi-subagents` rows are caveated as source-only/current-runtime blocked in scorecard, evidence manifest, and eval plan.
- `ideas-backlog-audit.md` exists and `scripts/check-ideas-backlog.py` validates deferred ideas remain current with the artifact set.
- `markdown-hygiene.md` exists and `scripts/check-markdown-hygiene.py` validates generated Markdown does not contain known fused row/list symptoms or table-heading joins.
- `capture-integrity.md` exists and `scripts/check-capture-integrity.py` validates every scorecard evidence capture contains its scenario-specific markers.
- `token-accounting-audit.md` exists and `scripts/check-token-accounting.py` validates model-call/token wording across scorecard, findings, token evidence, S01 live child output, and S05 background-control live output.
- `repro-hygiene.md` exists and `scripts/check-repro-hygiene.py` validates the scorer's Python syntax checks do not dirty `scripts/__pycache__`.
- `recommendation-consistency.md` exists and `scripts/check-recommendation-consistency.py` validates the final recommendation gates `pi-subagents` runtime use on fixing/rerunning the loader failure.
- `rerun-commands.md` exists and `scripts/check-rerun-commands.py` validates README/runbook command coverage for scored captures and generated checks.
- `artifact-index.md` exists and `scripts/check-artifact-index.py` validates README, evidence manifest, runbook final checklist, `autoresearch.md` file scope/descriptions/notes, scorer-required artifact indexes, and the artifact-index markdown row-split plus capture-integrity note-scope guards stay synchronized.
- `eval-plan-currentness.md` exists and `scripts/check-eval-plan-currentness.py` validates the eval plan no longer contains stale source-only S01, S05-S07 prior-extension/current-runtime ambiguity, or token-metric wording.
- `native-control-currentness.md` exists and `scripts/check-native-control-currentness.py` validates native S05 source/capture/live-probe/scorecard/findings alignment.
- `native-control-tests.md` exists and `scripts/check-native-control-tests.py` validates native S05 schema/executor/status unit-test evidence alongside the paid start/status, interrupt/resume, and cancel probes.
- `eval-design-prompt-audit.md` exists and `scripts/check-eval-design-prompt.py` validates the historical seed prompt carries current removed-surface/load-failure caveats.
- `scorecard-template-audit.md` exists and `scripts/check-scorecard-template.py` validates the reusable scorecard template is placeholder-only and not current evidence.
- `findings-template-audit.md` exists and `scripts/check-findings-template.py` validates the reusable findings template is placeholder-only and not current evidence.
- `evidence-manifest.md` maps every scorecard row to an existing evidence file and links live captures.
- `token-evidence.md` records `$0.000` native registered-command captures, native S01/S05 paid child probe costs, and the removed-command extension fallthrough cost.
- `score-analysis.md` exists and `scripts/check-scorecard-consistency.py` validates scorecard summary averages.
- `findings-alignment.md` exists and `scripts/check-findings-alignment.py` validates prose/numeric winner alignment with documented exceptions.
- `task-lifecycle-audit.md` exists and `scripts/check-task-lifecycle.py` validates the S09 native absent/pending verdict and extension closest-equivalent non-equivalence.
- `handoff-review.md` exists and `scripts/check-handoff-review.py` validates the final high-risk guardrail review, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope.
- `./autoresearch.sh` exits 0 and emits `METRIC actual_eval_score=...`.

Then use `run_experiment` and `log_experiment` with ASI including hypothesis, evidence, isolation proof, and next action hint.

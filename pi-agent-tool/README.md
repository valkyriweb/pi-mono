# Native Pi `agent` vs `pi-subagents` Autoresearch

Fresh A/B evaluation under `pi-agent-tool/` comparing:

1. Native Pi `/agents`, `/agents-doctor`, `/agents-status`, saved chains, background-run control, and the built-in `agent` tool.
2. `pi-subagents` extension `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-doctor`, and `subagent` tool actions.

Current source/runtime reality matters: installed `pi-subagents` is `0.24.0`, where `/subagents` manager UI and `/subagents-status` were removed, and the current fresh eval launch now fails to load the extension with a module-format error. The eval scores those requested or unavailable surfaces honestly rather than pretending parity.

## Fresh artifacts

- `README.md` — overview, artifact index, and quick rerun commands.
- `autoresearch.md` — session objective, constraints, and loop notes.
- `autoresearch.ideas.md` — deferred optimization backlog for work that should not be lost.
- `ideas-backlog-audit.md` — hygiene audit that keeps deferred ideas current with the artifact set.
- `autoresearch.sh` — scorer; emits `METRIC actual_eval_score=...` plus secondary metrics.
- `eval-design-prompt.md` — historical seed prompt/scaffold; not current evidence.
- `eval-design-prompt-audit.md` — audit that the seed prompt carries current removed-surface/load-failure caveats.
- `eval-plan.md` — scenarios, metrics, and fairness rules.
- `eval-plan-currentness.md` — audit that the eval plan reflects the current live/failure/prior evidence mix.
- `runbook.md` — exact native-only and extension-only launch/capture steps.
- `scorecard.md` — filled scorecard for all 9 scenarios × 2 arms.
- `scorecard-template.md` — blank reusable scorecard scaffolding; not current evidence.
- `scorecard-template-audit.md` — audit that the template contains no stale filled-score claims.
- `findings.md` — concise result report.
- `findings-template.md` — blank reusable findings report scaffolding; not current evidence.
- `findings-template-audit.md` — audit that the findings template contains no stale filled-report claims.
- `evidence-manifest.md` — scorecard-to-evidence map and file integrity guard.
- `capture-integrity.md` — marker audit that every scorecard evidence capture contains the scenario-specific claims it supports.
- `markdown-hygiene.md` — generated-Markdown hygiene audit for fused table rows, list bullets, and table-heading joins.
- `command-surface.md` — native vs extension command-surface verification and drift guard.
- `token-evidence.md` — live footer token/cost evidence for registered native commands, native S01/S05 paid child probes, and prior removed extension commands.
- `token-accounting-audit.md` — consistency check for model-call/token wording across findings, scorecard, and token evidence.
- `repro-hygiene.md` — runner hygiene check ensuring scorer syntax checks do not dirty Python bytecode caches.
- `recommendation-consistency.md` — final-recommendation check that current `pi-subagents` runtime failure is not glossed over.
- `native-control-currentness.md` — audit that native S05 background-control source/capture/live-probe/scorecard/findings stay aligned.
- `native-control-tests.md` — audit that native S05 background-control schema/executor/status tests are in place alongside the paid start/status, interrupt/resume, and cancel probes.
- `native-background-control-live.md` — paid live native S05 background start/status probe with run id, status detail, child output, and cost.
- `native-background-interrupt-resume-live.md` — paid live native S05 interrupt/resume probe with interrupted status, resumable state, resumed completion, child output, and cost.
- `native-background-cancel-live.md` — paid live native S05 cancel probe with cancelled status, no final child output, and cost.
- `rerun-commands.md` — audit that README/runbook reproduction commands cover the scored captures and generated checks.
- `artifact-index.md` — audit that README, evidence manifest, runbook checklist, `autoresearch.md` file scope/descriptions/notes, and scorer-required artifact indexes stay synchronized, including row-split and capture-integrity note-scope guards.
- `score-analysis.md` — computed scorecard averages and numeric scenario winners.
- `findings-alignment.md` — qualitative findings vs numeric scorecard alignment, including documented exceptions.
- `handoff-review.md` — final reviewer pass over high-risk guardrails, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope.
- `live-child-output.md` — one tiny S01 live child-output probe: native success vs current extension load failure.
- `extension-load-audit.md` — source/capture diagnosis for the current `pi-subagents` module-format load failure.
- `capture-timeline.md` — timestamp audit separating prior extension-loaded captures from current load-failure captures.
- `stale-evidence-policy.md` — reviewer checklist for current vs prior `pi-subagents` evidence.
- `scenario-verdict-audit.md` — per-row classification of current-live, current-load-failure, prior-live, and source-backed evidence.
- `source-runtime-boundary.md` — row-level guard that source-backed extension evidence is not current runtime proof.
- `task-lifecycle-audit.md` — S09 native task lifecycle acceptance probe and extension closest-equivalent audit.
- `isolation-proof.md` — proof of active surface isolation.
- `source-probes.md` — source-backed evidence snippets.
- `captures/` — tmux and source-backed scenario captures.
- `scripts/` — safe capture helpers.

## Run

```bash
cd /Users/luke/Projects/personal/pi-mono-fork/pi-agent-tool
./scripts/capture-source-probes.sh
./scripts/capture-startup.sh native
./scripts/capture-startup.sh subagents
./scripts/run-tmux-scenario.sh native native-s06-doctor-live '/agents-doctor'
./scripts/run-tmux-scenario.sh native native-s05-status-live '/agents-status'
./scripts/run-tmux-scenario.sh native native-s07-ui-selector-live '/agents'
./scripts/run-tmux-scenario.sh subagents subagents-s06-doctor-live '/subagents-doctor'
./scripts/run-tmux-scenario.sh subagents subagents-s05-status-removed-live '/subagents-status'
./scripts/run-tmux-scenario.sh subagents subagents-s07-manager-removed-live '/subagents'
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh native native-s01-live-child-output '/agents run scout -- Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
./scripts/capture-native-background-control.sh
./scripts/capture-native-background-interrupt-resume.sh
./scripts/capture-native-background-cancel.sh
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh subagents subagents-s01-live-child-output '/run scout Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
python3 scripts/check-command-surface.py --write
python3 scripts/check-live-child-output.py
python3 scripts/check-extension-load-audit.py
python3 scripts/check-capture-timeline.py
python3 scripts/check-stale-evidence-policy.py
python3 scripts/check-scenario-verdicts.py
python3 scripts/check-source-runtime-boundary.py
python3 scripts/check-ideas-backlog.py
python3 scripts/check-markdown-hygiene.py
python3 scripts/check-capture-integrity.py
python3 scripts/check-token-accounting.py
python3 scripts/check-repro-hygiene.py
python3 scripts/check-recommendation-consistency.py
python3 scripts/check-native-control-currentness.py
python3 scripts/check-native-control-tests.py
python3 scripts/check-native-background-control-live.py
python3 scripts/check-native-background-interrupt-resume-live.py
python3 scripts/check-native-background-cancel-live.py
python3 scripts/check-rerun-commands.py
python3 scripts/check-artifact-index.py
python3 scripts/check-eval-design-prompt.py
python3 scripts/check-eval-plan-currentness.py
python3 scripts/check-scorecard-template.py
python3 scripts/check-findings-template.py
python3 scripts/check-scorecard-consistency.py --write score-analysis.md
python3 scripts/check-findings-alignment.py
python3 scripts/check-task-lifecycle.py
python3 scripts/check-handoff-review.py
./autoresearch.sh
```

Broad live child-agent calls are intentionally not part of the baseline; source-backed evidence is used where running children would spend model tokens. Four tiny native paid probes were added where source-only evidence was exhausted: S01 child output completed, S05 background start/status completed with a run-id control hint, status detail, README read tool, output, and cost, S05 interrupt/resume interrupted a worker, showed resumable status, resumed, completed, and recorded child output/cost, and S05 cancel stopped a worker with cancelled status, no final child output, and cost. The extension failed to load before `/run scout`. `extension-load-audit.md` ties that failure to the current package manifest, ESM entry shape, runtime import of `@mariozechner/pi-coding-agent`, source-checkout alias/re-export self-import path, Pi jiti loader, and captured module-format error. `capture-timeline.md` makes clear that older extension-loaded captures predate the newer load-failure captures. Two earlier removed-command probes in the extension arm did fall through to parent model turns; `token-evidence.md` records the observed ↑22k/↓187 token, $0.111 cost. If the extension loader issue is fixed, rerun S01 plus the cheap extension command probes before treating older captures as current proof. `scenario-verdict-audit.md` classifies every scored row by evidence type, `source-runtime-boundary.md` keeps source-backed extension rows from being mistaken for current runtime proof, `ideas-backlog-audit.md` keeps deferred work current, `markdown-hygiene.md` catches fused generated Markdown rows/bullets, `capture-integrity.md` verifies scorecard capture files contain their scenario-specific evidence markers, `token-accounting-audit.md` keeps model-call/cost wording aligned, `repro-hygiene.md` keeps the scorer from dirtying Python bytecode caches, `recommendation-consistency.md` prevents the final recommendation from implying the extension is currently usable, `native-control-currentness.md` keeps native S05 background-control evidence from drifting back to the stale unsupported claim, `native-control-tests.md` records schema/executor/status unit-test coverage beside the paid probes, `native-background-control-live.md` verifies the S05 paid start/status probe, `native-background-interrupt-resume-live.md` verifies the S05 paid interrupt/resume probe, `native-background-cancel-live.md` verifies the S05 paid cancel probe, `rerun-commands.md` keeps reproduction commands aligned, `artifact-index.md` keeps README/evidence-manifest/runbook/autoresearch/scorer artifact indexes synchronized, including `autoresearch.md` scope descriptions/notes, markdown row-split guards, and capture-integrity note-scope summaries, `eval-design-prompt-audit.md` keeps the historical seed prompt from advertising removed command surfaces as active, `eval-plan-currentness.md` prevents stale planning prose from contradicting live/failure evidence, `scorecard-template-audit.md` and `findings-template-audit.md` prevent reusable templates from being mistaken for current evidence, `handoff-review.md` consolidates the final reviewer pass over the highest-risk guardrails, and `evidence-manifest.md` ties each row to an existing evidence file so stale paths fail the scorer.

# Native Pi `agent` vs `pi-subagents` Autoresearch

Fresh A/B evaluation under `pi-agent-tool/` comparing:

1. Native Pi `/agents`, `/agents-doctor`, `/agents-status`, saved chains, and the built-in `agent` tool.
2. `pi-subagents` extension `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-doctor`, and `subagent` tool actions.

Current source/runtime reality matters: installed `pi-subagents` is `0.24.0`, where `/subagents` manager UI and `/subagents-status` were removed, and the current fresh eval launch now fails to load the extension with a module-format error. The eval scores those requested or unavailable surfaces honestly rather than pretending parity.

## Fresh artifacts

- `autoresearch.md` — session objective, constraints, and loop notes.
- `autoresearch.sh` — scorer; emits `METRIC actual_eval_score=...` plus secondary metrics.
- `eval-plan.md` — scenarios, metrics, and fairness rules.
- `runbook.md` — exact native-only and extension-only launch/capture steps.
- `scorecard.md` — filled scorecard for all 9 scenarios × 2 arms.
- `findings.md` — concise result report.
- `evidence-manifest.md` — scorecard-to-evidence map and file integrity guard.
- `command-surface.md` — native vs extension command-surface verification and drift guard.
- `token-evidence.md` — live footer token/cost evidence for registered native commands, native S01 child output, and prior removed extension commands.
- `token-accounting-audit.md` — consistency check for model-call/token wording across findings, scorecard, and token evidence.
- `score-analysis.md` — computed scorecard averages and numeric scenario winners.
- `findings-alignment.md` — qualitative findings vs numeric scorecard alignment, including documented exceptions.
- `live-child-output.md` — one tiny S01 live child-output probe: native success vs current extension load failure.
- `extension-load-audit.md` — source/capture diagnosis for the current `pi-subagents` module-format load failure.
- `capture-timeline.md` — timestamp audit separating prior extension-loaded captures from current load-failure captures.
- `stale-evidence-policy.md` — reviewer checklist for current vs prior `pi-subagents` evidence.
- `scenario-verdict-audit.md` — per-row classification of current-live, current-load-failure, prior-live, and source-backed evidence.
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
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh native native-s01-live-child-output '/agents run scout -- Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh subagents subagents-s01-live-child-output '/run scout Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
python3 scripts/check-extension-load-audit.py
python3 scripts/check-capture-timeline.py
python3 scripts/check-stale-evidence-policy.py
python3 scripts/check-scenario-verdicts.py
python3 scripts/check-token-accounting.py
./autoresearch.sh
```

Broad live child-agent calls are intentionally not part of the baseline; source-backed evidence is used where running children would spend model tokens. One tiny S01 live probe was added because source-only evidence was exhausted: native completed, while the extension failed to load before `/run scout`. `extension-load-audit.md` ties that failure to the current package manifest, ESM entry shape, Pi jiti loader, and captured module-format error. `capture-timeline.md` makes clear that older extension-loaded captures predate the newer load-failure captures. Two earlier removed-command probes in the extension arm did fall through to parent model turns; `token-evidence.md` records the observed ↑22k/↓187 token, $0.111 cost. If the extension loader issue is fixed, rerun S01 plus the cheap extension command probes before treating older captures as current proof. `scenario-verdict-audit.md` classifies every scored row by evidence type, `token-accounting-audit.md` keeps model-call/cost wording aligned, and `evidence-manifest.md` ties each row to an existing evidence file so stale paths fail the scorer.

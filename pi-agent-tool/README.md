# Native Pi `agent` vs `pi-subagents` Autoresearch

Fresh A/B evaluation under `pi-agent-tool/` comparing:

1. Native Pi `/agents`, `/agents-doctor`, `/agents-status`, saved chains, and the built-in `agent` tool.
2. `pi-subagents` extension `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-doctor`, and `subagent` tool actions.

Current source reality matters: installed `pi-subagents` is `0.24.0`, where `/subagents` manager UI and `/subagents-status` were removed. The eval scores those requested surfaces as unavailable rather than pretending parity.

## Fresh artifacts

- `autoresearch.md` — session objective, constraints, and loop notes.
- `autoresearch.sh` — scorer; emits `METRIC actual_eval_score=...` plus secondary metrics.
- `eval-plan.md` — scenarios, metrics, and fairness rules.
- `runbook.md` — exact native-only and extension-only launch/capture steps.
- `scorecard.md` — filled scorecard for all 9 scenarios × 2 arms.
- `findings.md` — concise result report.
- `evidence-manifest.md` — scorecard-to-evidence map and file integrity guard.
- `command-surface.md` — native vs extension command-surface verification and drift guard.
- `token-evidence.md` — live footer token/cost evidence for registered native commands vs removed extension commands.
- `score-analysis.md` — computed scorecard averages and numeric scenario winners.
- `findings-alignment.md` — qualitative findings vs numeric scorecard alignment, including documented exceptions.
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
./autoresearch.sh
```

Live child-agent calls are intentionally not part of the baseline; source-backed evidence is used where running children would spend model tokens. Two removed-command probes in the extension arm did fall through to parent model turns; `token-evidence.md` records the observed ↑22k/↓187 token, $0.111 cost. `evidence-manifest.md` ties each scorecard row to an existing evidence file so stale paths fail the scorer.

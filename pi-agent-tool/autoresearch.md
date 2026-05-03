# Autoresearch: Native Pi `agent` vs `pi-subagents`

## Objective

Compare actual current behavior, UX, reliability, and token/value tradeoffs between native Pi delegation and the installed `pi-subagents` extension.

The eval must not overfit the scorer. It should prefer real tmux captures where cheap, source-backed evidence where live child runs would spend paid tokens, and honest `pending`/`unavailable` notes where a requested surface is absent.

## Primary metric

- **actual_eval_score** (unitless, higher is better): composite score for real captures, filled scorecard, findings, isolation proof, task-agent lifecycle coverage, source probes, and honest limitations.

## Secondary metrics

- `startup_captures`
- `scenario_captures`
- `isolation_verified`
- `scorecard_rows_touched`
- `findings_sections_touched`
- `task_agent_coverage`
- `source_probe_coverage`
- `honest_limitations`

## How to run

```bash
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

`./autoresearch.sh` emits `METRIC actual_eval_score=...` and all secondary metrics.

## Files in scope

- `README.md` — overview and quick run commands.
- `eval-plan.md` — scenario matrix and scoring rubric.
- `runbook.md` — exact isolation launches and capture commands.
- `scorecard.md` — filled 9×2 scenario scorecard.
- `findings.md` — final comparison summary.
- `isolation-proof.md` — proof that each arm avoided the other tool surface.
- `source-probes.md` — generated source evidence.
- `captures/` — tmux and source-backed capture files.
- `scripts/*.sh` — safe local capture helpers.
- `autoresearch.sh` — scoring harness.

## Off limits

- Do not modify production Pi source for this evaluation.
- Do not use native `agent` in the `pi-subagents` arm.
- Do not use `subagent` or extension commands in the native arm.
- Do not run paid live child-agent tasks unless source evidence is insufficient and the cost is justified.

## Constraints

- Same thinking level across arms: `--thinking off` for cheap capture baseline.
- No live child-agent baseline. Removed-command probes may spend parent-model tokens if intentionally measuring fallback UX.
- All artifacts stay under `pi-agent-tool/`.
- Mark removed/unavailable surfaces honestly.

## What's been tried

- Fresh state initialized after clearing previous autoresearch files and captures.
- Source probes show native Pi now includes `/agents-doctor`, `/agents-status`, saved chains, and `/agents run/parallel/run-chain` scaffolds.
- Source probes show installed `pi-subagents` is `0.24.0` and removed `/subagents-status` plus the old manager overlay.
- Current native `agent` schema lacks the requested non-spawn task lifecycle actions; S09 is scored absent/pending.
- Removed `/subagents` and `/subagents-status` probes fell through to parent model turns; this is useful UX/token evidence but should not be repeated unless intentionally measuring fallback behavior.

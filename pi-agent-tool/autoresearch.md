# Autoresearch: Native Pi `agent` vs `pi-subagents`

## Objective

Compare actual current behavior, UX, reliability, and token/value tradeoffs between native Pi delegation and the installed `pi-subagents` extension.

The eval must not overfit the scorer. It should prefer real tmux captures where cheap, source-backed evidence where live child runs would spend paid tokens, and honest `pending`/`unavailable` notes where a requested surface is absent.

## Primary metric

- **actual_eval_score** (unitless, higher is better): composite score for real captures, filled scorecard, findings, isolation proof, live child-output evidence, task-agent lifecycle coverage, source probes, and honest limitations.

## Secondary metrics

- `startup_captures`
- `scenario_captures`
- `isolation_verified`
- `scorecard_rows_touched`
- `findings_sections_touched`
- `task_agent_coverage`
- `source_probe_coverage`
- `honest_limitations`
- `scorecard_evidence_rows`
- `evidence_file_coverage`
- `evidence_manifest_rows`
- `live_capture_links`
- `version_guard_verified`
- `token_evidence_rows`
- `native_zero_cost_captures`
- `removed_command_token_captures`
- `fallthrough_cost_cents`
- `token_evidence_verified`
- `python_syntax_ok`
- `scorecard_numeric_rows`
- `scorecard_numeric_cells`
- `scorecard_average_consistency`
- `scorecard_numeric_native_wins`
- `scorecard_numeric_subagents_wins`
- `scorecard_numeric_ties`
- `scorecard_analysis_rows`
- `scorecard_analysis_verified`
- `findings_alignment_rows`
- `findings_alignment_aligned`
- `findings_alignment_exceptions`
- `findings_alignment_conflicts`
- `findings_alignment_verified`
- `command_surface_rows`
- `command_surface_native_expected_present`
- `command_surface_extension_expected_present`
- `command_surface_extension_removed_absent`
- `command_surface_launch_isolation`
- `command_surface_removed_changelog_verified`
- `command_surface_subagents_runtime_loaded`
- `command_surface_subagents_runtime_load_failed`
- `command_surface_verified`
- `live_child_rows`
- `live_native_child_completed`
- `live_native_child_read_tool`
- `live_native_child_exact_three`
- `live_native_child_tokens`
- `live_native_child_cost_cents`
- `live_subagents_load_error`
- `live_subagents_module_format_error`
- `live_subagents_shell_fallthrough`
- `live_subagents_no_child_started`
- `live_child_output_verified`
- `extension_load_audit_rows`
- `extension_load_runtime_error_files`
- `extension_load_module_format_error_files`
- `extension_load_manifest_verified`
- `extension_load_entry_default_export`
- `extension_load_entry_cjs_exports_absent`
- `extension_load_entry_top_level_await_absent`
- `extension_load_loader_jiti_verified`
- `extension_load_diagnosis_verified`
- `capture_timeline_rows`
- `capture_timeline_timestamped`
- `capture_timeline_prior_subagents_successes`
- `capture_timeline_current_subagents_failures`
- `capture_timeline_temporal_order_verified`
- `capture_timeline_mixed_state_documented`
- `capture_timeline_verified`
- `stale_policy_rows`
- `stale_policy_manifest_prior_rows`
- `stale_policy_scorecard_prior_rows`
- `stale_policy_current_failure_linked`
- `stale_policy_timeline_linked`
- `stale_policy_token_caveat`
- `stale_policy_rerun_trigger`
- `stale_policy_verified`
- `task_lifecycle_acceptance_rows`
- `task_lifecycle_native_fields_present`
- `task_lifecycle_native_actions_present`
- `task_lifecycle_native_statuses_present`
- `task_lifecycle_native_absent`
- `task_lifecycle_delegation_preserved`
- `task_lifecycle_extension_rows`
- `task_lifecycle_extension_management_actions`
- `task_lifecycle_extension_equivalent_absent`
- `task_lifecycle_audit_verified`

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
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh native native-s01-live-child-output '/agents run scout -- Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh subagents subagents-s01-live-child-output '/run scout Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
./autoresearch.sh
```

`./autoresearch.sh` emits `METRIC actual_eval_score=...` and all secondary metrics.

## Files in scope

- `README.md` — overview and quick run commands.
- `eval-plan.md` — scenario matrix and scoring rubric.
- `runbook.md` — exact isolation launches and capture commands.
- `scorecard.md` — filled 9×2 scenario scorecard.
- `findings.md` — final comparison summary.
- `evidence-manifest.md` — scorecard-to-evidence map and integrity guard.
- `command-surface.md` — native vs extension command-surface verification and drift guard.
- `token-evidence.md` — live footer token/cost evidence for native registered commands vs removed extension commands.
- `score-analysis.md` — computed scorecard averages and numeric scenario winners.
- `findings-alignment.md` — qualitative findings vs numeric scorecard alignment, including documented exceptions.
- `live-child-output.md` — one tiny S01 live child-output probe: native success vs current extension load failure.
- `extension-load-audit.md` — source/capture diagnosis for the current `pi-subagents` module-format load failure.
- `capture-timeline.md` — timestamp audit separating prior extension-loaded captures from current load-failure captures.
- `stale-evidence-policy.md` — reviewer checklist for current vs prior `pi-subagents` evidence.
- `task-lifecycle-audit.md` — S09 native task lifecycle acceptance probe and extension closest-equivalent audit.
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
- No broad live child-agent baseline. One tiny S01 live probe is allowed once source-backed evidence is exhausted. Removed-command probes may spend parent-model tokens if intentionally measuring fallback UX.
- All artifacts stay under `pi-agent-tool/`.
- Mark removed/unavailable surfaces honestly.

## What's been tried

- Fresh state initialized after clearing previous autoresearch files and captures.
- Source probes show native Pi now includes `/agents-doctor`, `/agents-status`, saved chains, and `/agents run/parallel/run-chain` scaffolds.
- Source probes show installed `pi-subagents` is `0.24.0` and removed `/subagents-status` plus the old manager overlay.
- Current native `agent` schema lacks the requested non-spawn task lifecycle actions; S09 is scored absent/pending.
- Removed `/subagents` and `/subagents-status` probes fell through to parent model turns; this is useful UX/token evidence but should not be repeated unless intentionally measuring fallback behavior.
- Next iteration added `evidence-manifest.md` plus scorer checks that every scorecard evidence path exists, every scenario has a manifest row, live captures are linked, and the `pi-subagents 0.24.0` removed-surface guard is preserved.
- Next iteration added `token-evidence.md` and scorer checks for native `$0.000` registered-command captures, two removed-command fallthrough token/cost captures, and aggregate $0.111 extension fallthrough cost.
- Next iteration added `scripts/check-scorecard-consistency.py`, `score-analysis.md`, and scorer checks that scorecard summary averages match computed values; this caught and fixed a stale `pi-subagents` UX average (3.2 -> 3.3).
- Next iteration added `scripts/check-findings-alignment.py`, `findings-alignment.md`, and scorer checks that prose winners align with numeric winners or have documented judgment-call exceptions (5 aligned, 4 intentional exceptions, 0 conflicts).
- Next iteration added `scripts/check-command-surface.py`, `command-surface.md`, and scorer checks that native `/agents*` commands, extension `/run`/`/chain`/`/parallel`/`/run-chain`/`/subagents-doctor`, removed extension surfaces, launch flags, and 0.24.0 changelog claims remain in sync.
- Next iteration added `scripts/check-task-lifecycle.py`, `task-lifecycle-audit.md`, and scorer checks that native S09 lifecycle fields/actions/status literals are absent, existing delegation modes remain present, and `pi-subagents` management/async controls are closest-equivalent only rather than a general task-list API.
- Next iteration ran one tiny symmetric S01 live child-output probe and added `scripts/check-live-child-output.py` plus `live-child-output.md`; native completed a live scout child with one read tool, while the current `pi-subagents` fresh launch failed before `/run scout` because the extension did not load.
- Next iteration added `scripts/check-extension-load-audit.py` plus `extension-load-audit.md` to diagnose the current `pi-subagents` module-format load failure from package manifest, extension entry, Pi jiti loader, and runtime captures without changing production source.
- Next iteration added `scripts/check-capture-timeline.py` plus `capture-timeline.md` to document that seven older extension-loaded captures predate the two current load-failure captures, preventing stale/live evidence from being treated as simultaneous.
- Next iteration added `scripts/check-stale-evidence-policy.py` plus `stale-evidence-policy.md` to enforce the reviewer rule that older loaded-extension captures are historical/source-supported only until rerun after the loader issue is fixed.

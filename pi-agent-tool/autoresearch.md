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
- `command_surface_markdown_guardrail_split`
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
- `token_accounting_rows`
- `token_accounting_native_zero_rows`
- `token_accounting_native_child_cost_present`
- `token_accounting_extension_removed_cost_present`
- `token_accounting_current_extension_no_child_present`
- `token_accounting_scorecard_intro_aligned`
- `token_accounting_findings_metadata_aligned`
- `token_accounting_token_conclusion_caveated`
- `token_accounting_observed_cost_cents`
- `token_accounting_verified`
- `repro_hygiene_rows`
- `repro_hygiene_python_glob`
- `repro_hygiene_no_py_compile`
- `repro_hygiene_compile_in_memory`
- `repro_hygiene_pycache_clean`
- `repro_hygiene_verified`
- `recommendation_consistency_rows`
- `recommendation_exec_runtime_caveat`
- `recommendation_s05_caveat`
- `recommendation_final_blocks_current_runtime`
- `recommendation_native_default`
- `recommendation_rerun_trigger`
- `recommendation_removed_slash_protection`
- `recommendation_consistency_verified`
- `rerun_readme_commands_expected`
- `rerun_readme_commands_present`
- `rerun_runbook_anchors_expected`
- `rerun_runbook_anchors_present`
- `rerun_readme_removed_manager_probe`
- `rerun_readme_live_child_checker`
- `rerun_readme_write_generators`
- `rerun_commands_verified`
- `artifact_index_required_files`
- `artifact_index_readme_required_present`
- `artifact_index_readme_directory_entries`
- `artifact_index_manifest_audited_expected`
- `artifact_index_manifest_audited_present`
- `artifact_index_required_files_exist`
- `artifact_index_verified`
- `eval_plan_currentness_rows`
- `eval_plan_s01_native_live_child`
- `eval_plan_s01_subagents_load_failure`
- `eval_plan_no_stale_no_live_child`
- `eval_plan_runtime_caveat`
- `eval_plan_token_caveat`
- `eval_plan_secondary_metrics_delegated`
- `eval_plan_currentness_verified`
- `scorecard_template_rows`
- `scorecard_template_warning`
- `scorecard_template_current_columns`
- `scorecard_template_placeholder_rows`
- `scorecard_template_no_stale_claims`
- `scorecard_template_verified`
- `scenario_verdict_rows`
- `scenario_verdict_current_live_rows`
- `scenario_verdict_current_failure_rows`
- `scenario_verdict_prior_live_rows`
- `scenario_verdict_source_backed_rows`
- `scenario_verdict_unknown_rows`
- `scenario_verdict_scorecard_prior_rows`
- `scenario_verdict_scorecard_current_failure`
- `scenario_verdict_scorecard_native_live_child`
- `scenario_verdict_findings_no_stale_false_claim`
- `scenario_verdict_findings_one_tiny_live_claim`
- `scenario_verdict_findings_current_failure_claim`
- `scenario_verdict_verified`
- `source_runtime_extension_source_rows`
- `source_runtime_scorecard_rows_caveated`
- `source_runtime_manifest_rows_caveated`
- `source_runtime_eval_plan_rows_caveated`
- `source_runtime_eval_plan_global_caveat`
- `source_runtime_scenario_rule_caveat`
- `source_runtime_boundary_verified`
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
- `eval-plan-currentness.md` — audit that the plan reflects current live/failure evidence instead of stale source-only baseline wording.
- `runbook.md` — exact isolation launches and capture commands.
- `scorecard.md` — filled 9×2 scenario scorecard.
- `scorecard-template.md` — blank reusable scorecard scaffolding; not current evidence.
- `scorecard-template-audit.md` — audit that the template contains no stale filled-score/source-only claims.
- `findings.md` — final comparison summary.
- `evidence-manifest.md` — scorecard-to-evidence map and integrity guard.
- `command-surface.md` — native vs extension command-surface verification and drift guard.
- `token-evidence.md` — live footer token/cost evidence for native registered commands, native S01 child output, and prior removed extension commands.
- `token-accounting-audit.md` — consistency check for model-call/token wording across findings, scorecard, and token evidence.
- `repro-hygiene.md` — runner hygiene check ensuring scorer syntax checks do not dirty Python bytecode caches.
- `recommendation-consistency.md` — final-recommendation check that current `pi-subagents` runtime failure is not glossed over.
- `rerun-commands.md` — audit that README/runbook reproduction commands cover the scored captures and generated checks.
- `artifact-index.md` — audit that README, evidence manifest, and scorer-required artifact indexes stay synchronized.
- `score-analysis.md` — computed scorecard averages and numeric scenario winners.
- `findings-alignment.md` — qualitative findings vs numeric scorecard alignment, including documented exceptions.
- `live-child-output.md` — one tiny S01 live child-output probe: native success vs current extension load failure.
- `extension-load-audit.md` — source/capture diagnosis for the current `pi-subagents` module-format load failure.
- `capture-timeline.md` — timestamp audit separating prior extension-loaded captures from current load-failure captures.
- `stale-evidence-policy.md` — reviewer checklist for current vs prior `pi-subagents` evidence.
- `scenario-verdict-audit.md` — per-row classification of current-live, current-load-failure, prior-live, and source-backed evidence.
- `source-runtime-boundary.md` — row-level guard that source-backed extension evidence is not current runtime proof.
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
- Next iteration added `scripts/check-scenario-verdicts.py` plus `scenario-verdict-audit.md` to classify all 18 scorecard rows by evidence type and catch stale claims like saying no live child output exists after the native S01 probe.
- Next iteration added `scripts/check-token-accounting.py` plus `token-accounting-audit.md` to align model-call/token wording after the native S01 live child probe and prior extension fallthrough token evidence.
- Next iteration replaced `python -m py_compile` in `autoresearch.sh` with in-memory `compile(...)` over `scripts/check-*.py` and added `scripts/check-repro-hygiene.py` plus `repro-hygiene.md` so repeated scorer runs do not dirty `scripts/__pycache__`.
- Next iteration added `scripts/check-recommendation-consistency.py` plus `recommendation-consistency.md` and revised findings so `pi-subagents` async/control is framed as source/tool-schema value only after the current module-format load failure is fixed and rerun.
- Next iteration added `scripts/check-rerun-commands.py` plus `rerun-commands.md`, and updated README's quick-run block to include the preserved `/subagents` removed-command probe, live-child checker, write-mode generators, and final audit checks.
- Next iteration added `scripts/check-artifact-index.py` plus `artifact-index.md` and updated README/evidence-manifest/runbook so artifact indexes stay synchronized with `autoresearch.sh` required files.
- Next iteration found stale `eval-plan.md` wording that still said S01 had no live child after the native live probe; it added `scripts/check-eval-plan-currentness.py` plus `eval-plan-currentness.md` and updated the plan's S01, runtime, token, and metric caveats.
- Next iteration fixed a generated `command-surface.md` bullet-join bug where the extension-load audit guardrail and `/subagents` reappearance warning rendered as one fused bullet, and added a command-surface markdown guardrail metric.
- Next iteration found tracked `scorecard-template.md` still contained stale filled baseline scores and obsolete source-only/runtime claims; it converted the file to placeholder-only scaffolding and added `scripts/check-scorecard-template.py` plus `scorecard-template-audit.md`.
- Next iteration found `pi-subagents` source-backed scorecard rows could still be read as current runtime proof despite the extension load failure; it added row-level blocked-runtime caveats plus `scripts/check-source-runtime-boundary.py` and `source-runtime-boundary.md`.
- Next iteration extended the source/runtime boundary audit to `eval-plan.md` scenario rows after a review found the plan still had source-backed `pi-subagents` rows without row-level blocked-runtime caveats.

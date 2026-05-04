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
- `extension_load_runtime_imports_pi_coding_agent`
- `extension_load_loader_jiti_verified`
- `extension_load_loader_alias_to_index`
- `extension_load_loader_source_index`
- `extension_load_index_reexports_loader`
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
- `native_control_source_markers_expected`
- `native_control_source_markers`
- `native_control_status_source`
- `native_control_status_capture`
- `native_control_source_capture`
- `native_control_source_probe_markers`
- `native_control_source_probe_disambiguation`
- `native_control_source_probe_tests_reference`
- `native_control_currentness_tests_interpretation`
- `native_control_scorecard_current`
- `native_control_findings_current`
- `native_control_readme_current`
- `native_control_no_stale_unsupported`
- `native_control_interpretation_bullets_split`
- `native_control_markdown_rows`
- `native_control_currentness_verified`
- `native_control_tool_schema_background_present`
- `native_control_executor_background_present`
- `native_control_status_implementation_present`
- `native_control_unit_running_status_test`
- `native_control_unit_interrupt_cancel_test`
- `native_control_unit_resume_test`
- `native_control_scorecard_unit_test_evidence`
- `native_control_findings_unit_test_evidence`
- `native_control_findings_audit_reference`
- `native_control_scorecard_paid_caveat`
- `native_control_capture_paid_caveat`
- `native_control_manifest_cancel_current`
- `native_control_evidence_count_current`
- `native_control_test_rows`
- `native_control_tests_verified`
- `native_background_live_capture_present`
- `native_background_live_started`
- `native_background_live_control_hint`
- `native_background_live_status_completed`
- `native_background_live_read_tool`
- `native_background_live_child_output`
- `native_background_live_child_tokens`
- `native_background_live_child_cost_cents`
- `native_background_live_parent_footer_cost_cents`
- `native_background_live_summaries_current`
- `native_background_live_rows`
- `native_background_live_verified`
- `native_background_interrupt_resume_capture_present`
- `native_background_interrupt_resume_started`
- `native_background_interrupt_resume_interrupted`
- `native_background_interrupt_resume_resumable`
- `native_background_interrupt_resume_resumed`
- `native_background_interrupt_resume_completed`
- `native_background_interrupt_resume_child_output`
- `native_background_interrupt_resume_child_tokens`
- `native_background_interrupt_resume_child_cost_cents`
- `native_background_interrupt_resume_parent_footer_cost_cents`
- `native_background_interrupt_resume_summaries_current`
- `native_background_interrupt_resume_rows`
- `native_background_interrupt_resume_verified`
- `native_background_cancel_capture_present`
- `native_background_cancel_started`
- `native_background_cancel_cancelled`
- `native_background_cancel_worker_cancelled`
- `native_background_cancel_no_final_output`
- `native_background_cancel_no_read_after_cancel`
- `native_background_cancel_child_tokens`
- `native_background_cancel_child_cost_cents`
- `native_background_cancel_parent_footer_cost_cents`
- `native_background_cancel_summaries_current`
- `native_background_cancel_rows`
- `native_background_cancel_verified`
- `rerun_readme_commands_expected`
- `rerun_readme_commands_present`
- `rerun_runbook_anchors_expected`
- `rerun_runbook_anchors_present`
- `rerun_readme_removed_manager_probe`
- `rerun_readme_live_child_checker`
- `rerun_readme_write_generators`
- `rerun_handoff_review_checker`
- `rerun_commands_verified`
- `artifact_index_required_files`
- `artifact_index_readme_required_present`
- `artifact_index_readme_directory_entries`
- `artifact_index_manifest_audited_expected`
- `artifact_index_manifest_audited_present`
- `artifact_index_runbook_audited_expected`
- `artifact_index_runbook_audited_present`
- `artifact_index_autoresearch_scope_expected`
- `artifact_index_autoresearch_scope_present`
- `artifact_index_required_files_exist`
- `artifact_index_markdown_rows`
- `artifact_index_markdown_guardrail_split`
- `artifact_index_autoresearch_scope_descriptions_current`
- `artifact_index_autoresearch_artifact_index_description_current`
- `artifact_index_autoresearch_capture_integrity_notes_current`
- `artifact_index_readme_scope_current`
- `artifact_index_readme_summary_current`
- `artifact_index_findings_scope_current`
- `artifact_index_runbook_section_current`
- `artifact_index_runbook_scope_current`
- `artifact_index_autoresearch_notes_scope_current`
- `artifact_index_autoresearch_notes_current`
- `artifact_index_autoresearch_readme_summary_note_current`
- `artifact_index_manifest_scope_current`
- `artifact_index_handoff_scope_current`
- `artifact_index_handoff_crossrefs_current`
- `artifact_index_verified`
- `eval_plan_currentness_rows`
- `eval_plan_s01_native_live_child`
- `eval_plan_s01_subagents_load_failure`
- `eval_plan_no_stale_no_live_child`
- `eval_plan_runtime_caveat`
- `eval_plan_token_caveat`
- `eval_plan_s05_native_background_live`
- `eval_plan_prior_extension_tmx_caveat`
- `eval_plan_summary_refs_current`
- `eval_plan_secondary_metrics_delegated`
- `eval_plan_currentness_verified`
- `scorecard_template_rows`
- `scorecard_template_warning`
- `scorecard_template_current_columns`
- `scorecard_template_placeholder_rows`
- `scorecard_template_no_stale_claims`
- `scorecard_template_verified`
- `findings_template_headings_expected`
- `findings_template_headings_present`
- `findings_template_warning`
- `findings_template_placeholder_count`
- `findings_template_no_stale_claims`
- `findings_template_verified`
- `eval_design_prompt_warning`
- `eval_design_prompt_current_caveats_expected`
- `eval_design_prompt_current_caveats`
- `eval_design_prompt_no_stale_lines`
- `eval_design_prompt_verified`
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
- `markdown_hygiene_files_checked`
- `markdown_hygiene_fused_table_rows`
- `markdown_hygiene_fused_bullets`
- `markdown_hygiene_table_heading_joins`
- `markdown_hygiene_runbook_current`
- `markdown_hygiene_scope_docs_current`
- `markdown_hygiene_verified`
- `ideas_backlog_rows`
- `ideas_backlog_required_classes_expected`
- `ideas_backlog_required_classes_present`
- `ideas_backlog_final_handoff_markers_expected`
- `ideas_backlog_final_handoff_markers_present`
- `ideas_backlog_stale_long_list_absent`
- `ideas_backlog_runbook_current`
- `ideas_backlog_verified`
- `capture_integrity_scorecard_rows`
- `capture_integrity_expected_files`
- `capture_integrity_scorecard_files_covered`
- `capture_integrity_files_present`
- `capture_integrity_markers_expected`
- `capture_integrity_markers_present`
- `capture_integrity_scope_current`
- `capture_integrity_runbook_current`
- `capture_integrity_verified`
- `task_lifecycle_acceptance_rows`
- `task_lifecycle_native_fields_present`
- `task_lifecycle_native_actions_present`
- `task_lifecycle_native_statuses_present`
- `task_lifecycle_native_control_fields_present`
- `task_lifecycle_native_control_actions_present`
- `task_lifecycle_native_control_not_task_lifecycle`
- `task_lifecycle_native_absent`
- `task_lifecycle_delegation_preserved`
- `task_lifecycle_extension_rows`
- `task_lifecycle_extension_management_actions`
- `task_lifecycle_extension_equivalent_absent`
- `task_lifecycle_audit_verified`
- `handoff_review_required_audits_expected`
- `handoff_review_required_audits_present`
- `handoff_review_current_prior_boundary`
- `handoff_review_native_s05_boundary`
- `handoff_review_pending_work_preserved`
- `handoff_review_summary_refs_current`
- `handoff_review_purpose_scope_current`
- `handoff_review_findings_scope_current`
- `handoff_review_latest_artifact_index_scope`
- `handoff_review_manifest_scope_current`
- `handoff_review_manifest_full_scope_current`
- `handoff_review_runbook_scope_current`
- `handoff_review_verified`

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
./scripts/capture-native-background-control.sh
./scripts/capture-native-background-interrupt-resume.sh
./scripts/capture-native-background-cancel.sh
PI_AGENT_EVAL_SCENARIO_WAIT=75 ./scripts/run-tmux-scenario.sh subagents subagents-s01-live-child-output '/run scout Read pi-agent-tool/README.md and list exactly three artifact filenames from Fresh artifacts with one phrase each. Keep under 60 words. Do not modify files.'
python3 scripts/check-native-control-currentness.py
python3 scripts/check-native-control-tests.py
python3 scripts/check-native-background-control-live.py
python3 scripts/check-native-background-interrupt-resume-live.py
python3 scripts/check-native-background-cancel-live.py
python3 scripts/check-ideas-backlog.py
python3 scripts/check-markdown-hygiene.py
python3 scripts/check-capture-integrity.py
python3 scripts/check-eval-design-prompt.py
python3 scripts/check-scorecard-template.py
python3 scripts/check-findings-template.py
python3 scripts/check-handoff-review.py
./autoresearch.sh
```

`./autoresearch.sh` emits `METRIC actual_eval_score=...` and all secondary metrics.

## Files in scope

- `README.md` — overview and quick run commands.
- `autoresearch.ideas.md` — deferred optimization backlog for work that should not be lost.
- `ideas-backlog-audit.md` — hygiene audit that keeps deferred ideas current with the artifact set.
- `eval-design-prompt.md` — historical seed prompt/scaffold; not current evidence.
- `eval-design-prompt-audit.md` — audit that the seed prompt carries current removed-surface/load-failure caveats.
- `eval-plan.md` — scenario matrix and scoring rubric.
- `eval-plan-currentness.md` — audit that the plan reflects current live/failure/prior evidence instead of stale source-only baseline wording.
- `runbook.md` — exact isolation launches and capture commands.
- `scorecard.md` — filled 9×2 scenario scorecard.
- `scorecard-template.md` — blank reusable scorecard scaffolding; not current evidence.
- `scorecard-template-audit.md` — audit that the scorecard template contains no stale filled-score/source-only claims.
- `findings.md` — final comparison summary.
- `findings-template.md` — blank reusable findings report scaffolding; not current evidence.
- `findings-template-audit.md` — audit that the findings template contains no stale filled-report claims.
- `evidence-manifest.md` — scorecard-to-evidence map and integrity guard.
- `capture-integrity.md` — marker audit that every scorecard evidence capture contains the scenario-specific claims it supports.
- `markdown-hygiene.md` — generated-Markdown hygiene audit for fused table rows, list bullets, and table-heading joins.
- `command-surface.md` — native vs extension command-surface verification and drift guard.
- `token-evidence.md` — live footer token/cost evidence for native registered commands, native S01 child output, and prior removed extension commands.
- `token-accounting-audit.md` — consistency check for model-call/token wording across findings, scorecard, and token evidence.
- `repro-hygiene.md` — runner hygiene check ensuring scorer syntax checks do not dirty Python bytecode caches.
- `recommendation-consistency.md` — final-recommendation check that current `pi-subagents` runtime failure is not glossed over.
- `native-control-currentness.md` — audit that native S05 background-control source/capture/live-probe/scorecard/findings stay aligned.
- `native-control-tests.md` — audit that native S05 background/control schema, executor wiring, status implementation, and unit-test evidence stay aligned alongside the paid start/status, interrupt/resume, and cancel probes.
- `native-background-control-live.md` — paid live native S05 background start/status probe with run id, status detail, child output, and cost.
- `native-background-interrupt-resume-live.md` — paid live native S05 interrupt/resume probe with interrupted status, resumable state, resumed completion, child output, and cost.
- `native-background-cancel-live.md` — paid live native S05 cancel probe with cancelled status, no final child output, and cost.
- `rerun-commands.md` — audit that README/runbook reproduction commands cover the scored captures and generated checks.
- `artifact-index.md` — audit that README, evidence manifest, runbook final checklist, `autoresearch.md` file scope/descriptions/notes, and scorer-required artifact indexes stay synchronized, including row-split and capture-integrity note-scope guards.
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
- No broad live child-agent baseline. Tiny targeted probes are allowed only when source-backed evidence is exhausted and the cost is justified: current paid probes are S01 native child output, S05 native background start/status, S05 native interrupt/resume, and S05 native cancel. Removed-command probes may spend parent-model tokens if intentionally measuring fallback UX.
- All artifacts stay under `pi-agent-tool/`.
- Mark removed/unavailable surfaces honestly.

## What's been tried

- Fresh state initialized after clearing previous autoresearch files and captures.
- Source probes show native Pi now includes `/agents-doctor`, `/agents-status`, saved chains, and `/agents run/parallel/run-chain` scaffolds.
- Source probes show installed `pi-subagents` is `0.24.0` and removed `/subagents-status` plus the old manager overlay.
- Current native `agent` schema includes generic background-run control, but lacks the requested non-spawn task-record lifecycle actions; S09 is scored absent/pending.
- Removed `/subagents` and `/subagents-status` probes fell through to parent model turns; this is useful UX/token evidence but should not be repeated unless intentionally measuring fallback behavior.
- Next iteration added `evidence-manifest.md` plus scorer checks that every scorecard evidence path exists, every scenario has a manifest row, live captures are linked, and the `pi-subagents 0.24.0` removed-surface guard is preserved.
- Next iteration added `token-evidence.md` and scorer checks for native `$0.000` registered-command captures, two removed-command fallthrough token/cost captures, and aggregate $0.111 extension fallthrough cost.
- Next iteration added `scripts/check-scorecard-consistency.py`, `score-analysis.md`, and scorer checks that scorecard summary averages match computed values; this caught and fixed a stale `pi-subagents` UX average (3.2 -> 3.3).
- Next iteration added `scripts/check-findings-alignment.py`, `findings-alignment.md`, and scorer checks that prose winners align with numeric winners or have documented judgment-call exceptions (5 aligned, 4 intentional exceptions, 0 conflicts).
- Next iteration added `scripts/check-command-surface.py`, `command-surface.md`, and scorer checks that native `/agents*` commands, extension `/run`/`/chain`/`/parallel`/`/run-chain`/`/subagents-doctor`, removed extension surfaces, launch flags, and 0.24.0 changelog claims remain in sync.
- Next iteration added `scripts/check-task-lifecycle.py`, `task-lifecycle-audit.md`, and scorer checks that native S09 lifecycle fields/actions/status literals are absent, existing delegation modes remain present, and `pi-subagents` management/async controls are closest-equivalent only rather than a general task-list API.
- Next iteration ran one tiny symmetric S01 live child-output probe and added `scripts/check-live-child-output.py` plus `live-child-output.md`; native completed a live scout child with one read tool, while the current `pi-subagents` fresh launch failed before `/run scout` because the extension did not load.
- Next iteration added `scripts/check-extension-load-audit.py` plus `extension-load-audit.md` to diagnose the current `pi-subagents` module-format load failure from package manifest, extension entry, Pi jiti loader, and runtime captures without changing production source.
- Next iteration refined `extension-load-audit.md` with the source-checkout self-import path: `pi-subagents` runtime imports `@mariozechner/pi-coding-agent`, Pi's loader aliases that package to `src/index`, and that index re-exports the loader during jiti extension loading.
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
- Next iteration found tracked `findings-template.md` was still a filled stale report from the early source-only baseline; it converted the file to placeholder-only scaffolding and added `scripts/check-findings-template.py` plus `findings-template-audit.md`.
- Next iteration found `eval-design-prompt.md` still told rerunners to treat removed `/subagents` and `/subagents-status` surfaces as active commands; it added current caveats and `scripts/check-eval-design-prompt.py` plus `eval-design-prompt-audit.md`.
- Next iteration found the S09 lifecycle audit was too broad: a generic native background-control `action` discriminator could be mistaken for task-record lifecycle. It now tracks generic control separately and keeps S09 absent unless create/list/get/update/delete task lifecycle fields/actions/statuses land.
- Next iteration reran source probes and the cheap native `/agents-status` capture after native background-run control landed and passed `npm run check`; S05 native now wins current runtime/source evidence, while `pi-subagents` async/control remains loader-blocked until rerun.
- Next iteration added `scripts/check-native-control-currentness.py` plus `native-control-currentness.md` so native S05 source markers, source-probe schema markers, source-probe control/lifecycle/test-audit disambiguation, native-control-tests interpretation, status capture, README summary, scorecard row, findings winner, no-stale-unsupported wording, interpretation bullet splitting, and native-control audit markdown rows stay aligned.
- Next iteration added `scripts/check-native-control-tests.py` plus `native-control-tests.md` to document S05 source/unit-test evidence from native background/control schema, executor wiring, status implementation, and unit tests for running status, interrupt/cancel, and resume; it also wired README/runbook commands, evidence manifest, artifact index, scorecard/findings unit-test evidence wording, findings audit-section reference, and scorer metrics.
- Next iteration extended the artifact index guard so the runbook final checklist is checked alongside README, evidence manifest, and `autoresearch.sh`; this caught the missing `native-control-tests.md` checklist bullet.
- Next iteration extended the artifact index guard to `autoresearch.md` Files in scope after finding `native-control-tests.md` was required/scored but absent from that source-of-truth list.
- Next iteration added `scripts/check-capture-integrity.py` plus `capture-integrity.md` to verify all 18 scorecard evidence captures contain 78 scenario-specific markers, catching stale/swapped/placeholder capture files beyond mere path existence.
- Next iteration fixed a generated `artifact-index.md` row-join bug where manifest and runbook audit rows rendered as one table row, added a markdown split guard, and later aligned findings/runbook checklist wording with the expanded artifact-index scope.
- Next iteration added `scripts/check-markdown-hygiene.py` plus `markdown-hygiene.md` after three generated Markdown join bugs, scanning root artifacts for fused table rows, fused bullets, and table-heading joins, and aligned runbook wording with all symptom classes.
- Next iteration updated the stale final-handoff idea in `autoresearch.ideas.md` to use canonical artifact indexes/current audit names and added `scripts/check-ideas-backlog.py` plus `ideas-backlog-audit.md` to keep deferred work actionable.
- Next iteration aligned findings, runbook checklist, and artifact-index runbook section wording with the expanded artifact-index audit scope, including the generated table row-split guard.
- Next iteration extended markdown-hygiene with canonical scope-doc wording checks after finding stale non-canonical table-heading phrasing in autoresearch notes.
- Next iteration currentized `eval-plan.md` S05-S07 so prior extension tmux/fallthrough captures are explicitly marked as prior evidence with current runtime blocked until loader fix/rerun, then aligned eval-plan currentness references in evidence manifest, findings, runbook, and this file.
- Next iteration added `scripts/check-handoff-review.py` plus `handoff-review.md` to consolidate the final reviewer pass over high-risk guardrails without running paid child agents, then surfaced that final review in findings, README, runbook, rerun-command summaries, and handoff summary checks.
- Next iteration ran the deferred tiny native S05 background-control live probe and added `scripts/capture-native-background-control.sh`, `scripts/check-native-background-control-live.py`, and `native-background-control-live.md`; the capture shows a background scout run id, control hints, `/agents-status <run-id>` completed detail, one README read tool, `BACKGROUND_PROBE_OK findings.md`, 3377 child tokens, and $0.0125 child cost.
- Next iteration ran a focused paid native S05 interrupt/resume probe and added `scripts/capture-native-background-interrupt-resume.sh`, `scripts/check-native-background-interrupt-resume-live.py`, and `native-background-interrupt-resume-live.md`; the capture shows interrupted background status, resumable state, `Resumed agent-1`, final child output `INTERRUPT_RESUME_PROBE_OK autoresearch.md`, 13139 child tokens, and $0.0200 child cost.
- Next iteration ran a focused paid native S05 cancel probe and added `scripts/capture-native-background-cancel.sh`, `scripts/check-native-background-cancel-live.py`, and `native-background-cancel-live.md`; the capture shows `agent-1` cancelled, status detail with `Agent run cancelled`, no final child output or read tool, 12971 child tokens, and $0.0675 child cost while keeping S05 separate from S09 task-record lifecycle.
- Next iteration fixed a stale evidence-manifest sentence that still described cancel as source/unit-test only after the paid cancel probe and added a native-control-tests guard so the manifest keeps the paid-cancel boundary current.
- Next iteration fixed a stale native-control-tests interpretation that said S05 had five evidence layers while listing six sources after the paid cancel probe, and added a guard for the evidence-source count wording.
- Next iteration fixed the `autoresearch.md` Files in scope description for `native-control-tests.md`, which still omitted the paid cancel probe, and added an artifact-index guard for current scope descriptions.
- Next iteration fixed `capture-integrity.md` interpretation wording that still summarized native S05 as paid start/status plus unit-test evidence only, and added a scope guard for start/status, interrupt/resume, and cancel probes.
- Next iteration fixed a stale `autoresearch.md` note that still said capture integrity covered 77 markers after the paid cancel marker raised the current count to 78, and added an artifact-index guard for that note.
- Next iteration fixed `artifact-index.md` summary wording that still described autoresearch notes as only covering artifact-index and markdown-hygiene currentness, and added a guard so capture-integrity marker-count note currentness stays included.
- Next iteration fixed `evidence-manifest.md` artifact-index summaries that still described only generic index sync plus row-split coverage, and added a guard for scope descriptions, notes, and capture-integrity note summaries.
- Next iteration fixed README, findings, and runbook artifact-index summaries that still described generic file-scope sync plus row-split coverage, and added a README scope guard for scope descriptions, notes, and capture-integrity note summaries.
- Next iteration fixed the `autoresearch.md` Files in scope description for `artifact-index.md`, which still described generic file-scope sync rather than scope descriptions, notes, row-split, and capture-integrity note-scope guards.
- Next iteration fixed `runbook.md` capture-integrity verdict wording that still said 77/77 markers after the current expected marker count reached 78/78, and added a capture-integrity runbook guard.
- Next iteration fixed `runbook.md` ideas-backlog verdict wording that still described native-control stress probes as deferred after start/status, interrupt/resume, and cancel probes were completed, and added an ideas-backlog runbook guard.
- Next iteration fixed the README long-form artifact-index summary that still described generic artifact-index synchronization without the newer scope descriptions/notes, row-split, and capture-integrity note-scope guards.
- Next iteration added an artifact-index guard that `autoresearch.md` notes include the README long-form artifact-index summary fix, so the persisted source-of-truth captures that final scope correction.
- Next iteration updated the final `handoff-review.md` guard so it includes the latest artifact-index scope checks for the README long-form summary and autoresearch note, preventing the final review from lagging the newest guardrail.
- Next iteration fixed `evidence-manifest.md` handoff-review summaries that still described only generic final guardrails, and added a handoff-review manifest-scope guard for the latest artifact-index scope checks.
- Next iteration fixed `runbook.md` handoff-review verdict wording that still listed the older generic guard set after summary-reference, latest artifact-index scope, and manifest-scope checks landed, and added a runbook-scope guard.
- Next iteration fixed README, runbook final checklist, and `autoresearch.md` handoff-review scope wording that still described only a generic final review after the final-review guard gained summary-reference, artifact-index, evidence-manifest, and runbook-scope checks.
- Next iteration fixed `findings.md` handoff-review wording that still omitted the newer summary-reference, artifact-index, evidence-manifest, and runbook-scope checks, and added a findings-scope guard to the final handoff review.
- Next iteration fixed the generated `handoff-review.md` purpose line, which still summarized only the older guard set while the table now includes summary-reference, findings-scope, artifact-index, evidence-manifest, and runbook-scope checks.
- Next iteration fixed `evidence-manifest.md` handoff-review summaries that still centered only on latest artifact-index scope after the final review gained purpose/findings, evidence-manifest, and runbook-scope guards.
- Next iteration fixed `artifact-index.md` handoff-scope wording that named only README/runbook/autoresearch cross-references while findings and evidence-manifest summaries are now also part of the guarded handoff-review scope.

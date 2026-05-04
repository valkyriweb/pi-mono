#!/usr/bin/env bash
set -euo pipefail

required_files=(README.md autoresearch.ideas.md ideas-backlog-audit.md eval-design-prompt.md eval-design-prompt-audit.md eval-plan.md eval-plan-currentness.md runbook.md scorecard.md scorecard-template.md scorecard-template-audit.md findings.md findings-template.md findings-template-audit.md evidence-manifest.md capture-integrity.md markdown-hygiene.md command-surface.md token-evidence.md token-accounting-audit.md repro-hygiene.md recommendation-consistency.md native-control-currentness.md native-control-tests.md native-background-control-live.md native-background-interrupt-resume-live.md native-background-cancel-live.md rerun-commands.md artifact-index.md score-analysis.md findings-alignment.md handoff-review.md live-child-output.md extension-load-audit.md capture-timeline.md stale-evidence-policy.md scenario-verdict-audit.md source-runtime-boundary.md task-lifecycle-audit.md isolation-proof.md source-probes.md)
required_file_count=0
for file in "${required_files[@]}"; do
  [[ -s "$file" ]] && ((required_file_count+=1))
done

bash_syntax_ok=1
for script in scripts/capture-startup.sh scripts/run-tmux-scenario.sh scripts/capture-source-probes.sh scripts/capture-native-background-control.sh scripts/capture-native-background-interrupt-resume.sh scripts/capture-native-background-cancel.sh autoresearch.sh; do
  bash -n "$script" || bash_syntax_ok=0
done
python_syntax_ok=1
python_scripts=(scripts/check-*.py)
python3 - "${python_scripts[@]}" <<'PY' || python_syntax_ok=0
from pathlib import Path
import sys

ok = True
for filename in sys.argv[1:]:
    try:
        compile(Path(filename).read_text(), filename, "exec")
    except SyntaxError as error:
        print(f"{filename}: {error}", file=sys.stderr)
        ok = False
sys.exit(0 if ok else 1)
PY

startup_captures=0
[[ -s captures/native-startup.txt ]] && ((startup_captures+=1))
[[ -s captures/subagents-startup.txt ]] && ((startup_captures+=1))

scenario_captures=$(find captures -maxdepth 1 -type f \( -name 'native-s[0-9][0-9]-*.txt' -o -name 'subagents-s[0-9][0-9]-*.txt' \) | wc -l | tr -d ' ')
scorecard_rows_touched=$(grep -Ec '^\| S[0-9][0-9] ' scorecard.md || true)
findings_sections_touched=$(grep -Ec '^## S[0-9][0-9] ' findings.md || true)

native_no_subagent=$(grep -Eq '^native_no_subagent_tool: true$' isolation-proof.md && echo 1 || echo 0)
subagents_no_native=$(grep -Eq '^subagents_no_native_agent_tool: true$' isolation-proof.md && echo 1 || echo 0)
same_model=$(grep -Eq '^same_model_and_thinking: true$' isolation-proof.md && echo 1 || echo 0)
isolation_verified=$(( native_no_subagent && subagents_no_native && same_model ? 1 : 0 ))

source_probe_coverage=0
probe_terms=(
  'Native CLI/resource isolation options'
  'Native built-in slash command surface'
  'Native agent tool schema/modes'
  'Native context discipline'
  'Native status diagnostics'
  'Native doctor diagnostics'
  'Native task lifecycle action probe'
  'pi-subagents package version'
  'pi-subagents slash commands actually registered'
  'pi-subagents removed surfaces in 0.24.0'
  'pi-subagents tool schema actions/control'
  'pi-subagents doctor implementation'
)
for term in "${probe_terms[@]}"; do
  grep -Fq "$term" source-probes.md && ((source_probe_coverage+=1))
done

task_agent_coverage=0
for term in action taskId activeForm metadata create list get update delete absent; do
  grep -Eiq "$term" findings.md scorecard.md captures/native-s09-task-agent-tool.txt captures/subagents-s09-task-agent-tool.txt && ((task_agent_coverage+=1))
done

honest_limitations=$(grep -Eio 'unavailable|pending|absent|removed|not run|n/a|no live|not equivalent|closest equivalent' findings.md scorecard.md isolation-proof.md | wc -l | tr -d ' ')

scorecard_evidence_rows=0
evidence_file_coverage=0
missing_evidence_paths=()
while IFS= read -r evidence_path; do
  [[ -n "$evidence_path" ]] || continue
  ((scorecard_evidence_rows+=1))
  if [[ -s "$evidence_path" ]]; then
    ((evidence_file_coverage+=1))
  else
    missing_evidence_paths+=("$evidence_path")
  fi
done < <(awk -F'|' '/^\| S[0-9][0-9] / { value=$17; gsub(/^[ \t`]+|[ \t`]+$/, "", value); print value }' scorecard.md)

evidence_manifest_rows=$(grep -Ec '^\| S[0-9][0-9] ' evidence-manifest.md || true)
live_capture_links=$(
  grep -Eho 'captures/[^` |)]*(live|startup)[^` |)]*\.txt' evidence-manifest.md findings.md runbook.md \
    | sort -u \
    | wc -l \
    | tr -d ' '
)
version_guard_verified=0
if grep -Eq 'pi-subagents 0\.24\.0' evidence-manifest.md source-probes.md findings.md \
  && grep -Eiq 'removed.*/subagents-status|/subagents-status.*removed' evidence-manifest.md source-probes.md findings.md \
  && grep -Eiq 'removed.*manager overlay|manager overlay.*removed' evidence-manifest.md source-probes.md findings.md; then
  version_guard_verified=1
fi

token_evidence_rows=$(grep -Ec '^\| S[0-9][0-9] .*\|' token-evidence.md || true)
native_zero_cost_captures=$(
  grep -El '\$0\.000' \
    captures/native-s05-status-live.txt \
    captures/native-s06-doctor-live.txt \
    captures/native-s07-ui-selector-live.txt \
    2>/dev/null \
    | wc -l \
    | tr -d ' '
)
removed_command_token_captures=$(
  grep -El '↑11k ↓(106|81) \$0\.(056|055).*gpt-5\.5.*thinking off' \
    captures/subagents-s05-status-removed-live.txt \
    captures/subagents-s07-manager-removed-live.txt \
    2>/dev/null \
    | wc -l \
    | tr -d ' '
)
fallthrough_cost_cents=$(
  python3 - <<'PY'
from pathlib import Path
import re
paths = [Path('captures/subagents-s05-status-removed-live.txt'), Path('captures/subagents-s07-manager-removed-live.txt')]
total = 0.0
for path in paths:
    text = path.read_text(errors='ignore') if path.exists() else ''
    matches = re.findall(r'\$(0\.\d+)', text)
    if matches:
        total += float(matches[-1])
print(round(total * 100, 1))
PY
)
token_evidence_verified=0
if (( token_evidence_rows >= 5 )) \
  && (( native_zero_cost_captures == 3 )) \
  && (( removed_command_token_captures == 2 )) \
  && grep -Fq '$0.111' token-evidence.md \
  && grep -Fq 'token-spend footgun' token-evidence.md; then
  token_evidence_verified=1
fi

scorecard_consistency_output=$(python3 scripts/check-scorecard-consistency.py)
get_consistency_metric() {
  local name="$1"
  printf '%s\n' "$scorecard_consistency_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
scorecard_numeric_rows=$(get_consistency_metric scorecard_numeric_rows)
scorecard_numeric_cells=$(get_consistency_metric scorecard_numeric_cells)
scorecard_average_consistency=$(get_consistency_metric scorecard_average_consistency)
scorecard_numeric_native_wins=$(get_consistency_metric scorecard_numeric_native_wins)
scorecard_numeric_subagents_wins=$(get_consistency_metric scorecard_numeric_subagents_wins)
scorecard_numeric_ties=$(get_consistency_metric scorecard_numeric_ties)
scorecard_analysis_rows=$(grep -Ec '^\| S[0-9][0-9] ' score-analysis.md || true)
scorecard_analysis_verified=0
if (( scorecard_numeric_rows == 18 )) \
  && (( scorecard_numeric_cells == 108 )) \
  && (( scorecard_average_consistency == 1 )) \
  && (( scorecard_numeric_native_wins == 8 )) \
  && (( scorecard_numeric_subagents_wins == 1 )) \
  && (( scorecard_numeric_ties == 0 )) \
  && (( scorecard_analysis_rows == 9 )) \
  && grep -Fq 'Numeric scenario wins: native=8, pi-subagents=1, tie=0.' score-analysis.md; then
  scorecard_analysis_verified=1
fi

findings_alignment_output=$(python3 scripts/check-findings-alignment.py)
get_alignment_metric() {
  local name="$1"
  printf '%s\n' "$findings_alignment_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
findings_alignment_rows=$(get_alignment_metric findings_alignment_rows)
findings_alignment_aligned=$(get_alignment_metric findings_alignment_aligned)
findings_alignment_exceptions=$(get_alignment_metric findings_alignment_exceptions)
findings_alignment_conflicts=$(get_alignment_metric findings_alignment_conflicts)
findings_alignment_verified=$(get_alignment_metric findings_alignment_verified)

command_surface_output=$(python3 scripts/check-command-surface.py)
get_command_surface_metric() {
  local name="$1"
  printf '%s\n' "$command_surface_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
command_surface_native_expected_present=$(get_command_surface_metric command_surface_native_expected_present)
command_surface_extension_expected_present=$(get_command_surface_metric command_surface_extension_expected_present)
command_surface_extension_removed_absent=$(get_command_surface_metric command_surface_extension_removed_absent)
command_surface_launch_isolation=$(get_command_surface_metric command_surface_launch_isolation)
command_surface_removed_changelog_verified=$(get_command_surface_metric command_surface_removed_changelog_verified)
command_surface_subagents_runtime_loaded=$(get_command_surface_metric command_surface_subagents_runtime_loaded)
command_surface_subagents_runtime_load_failed=$(get_command_surface_metric command_surface_subagents_runtime_load_failed)
command_surface_markdown_guardrail_split=$(get_command_surface_metric command_surface_markdown_guardrail_split)
command_surface_verified=$(get_command_surface_metric command_surface_verified)
command_surface_rows=$(grep -Ec '^\| `/[^`]+` \|' command-surface.md || true)

live_child_output=$(python3 scripts/check-live-child-output.py)
get_live_child_metric() {
  local name="$1"
  printf '%s\n' "$live_child_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
live_child_rows=$(get_live_child_metric live_child_rows)
live_native_child_completed=$(get_live_child_metric live_native_child_completed)
live_native_child_read_tool=$(get_live_child_metric live_native_child_read_tool)
live_native_child_exact_three=$(get_live_child_metric live_native_child_exact_three)
live_native_child_tokens=$(get_live_child_metric live_native_child_tokens)
live_native_child_cost_cents=$(get_live_child_metric live_native_child_cost_cents)
live_subagents_load_error=$(get_live_child_metric live_subagents_load_error)
live_subagents_module_format_error=$(get_live_child_metric live_subagents_module_format_error)
live_subagents_shell_fallthrough=$(get_live_child_metric live_subagents_shell_fallthrough)
live_subagents_no_child_started=$(get_live_child_metric live_subagents_no_child_started)
live_child_output_verified=$(get_live_child_metric live_child_output_verified)

extension_load_output=$(python3 scripts/check-extension-load-audit.py)
get_extension_load_metric() {
  local name="$1"
  printf '%s\n' "$extension_load_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
extension_load_audit_rows=$(get_extension_load_metric extension_load_audit_rows)
extension_load_runtime_error_files=$(get_extension_load_metric extension_load_runtime_error_files)
extension_load_module_format_error_files=$(get_extension_load_metric extension_load_module_format_error_files)
extension_load_manifest_verified=$(get_extension_load_metric extension_load_manifest_verified)
extension_load_entry_default_export=$(get_extension_load_metric extension_load_entry_default_export)
extension_load_entry_cjs_exports_absent=$(get_extension_load_metric extension_load_entry_cjs_exports_absent)
extension_load_entry_top_level_await_absent=$(get_extension_load_metric extension_load_entry_top_level_await_absent)
extension_load_runtime_imports_pi_coding_agent=$(get_extension_load_metric extension_load_runtime_imports_pi_coding_agent)
extension_load_loader_jiti_verified=$(get_extension_load_metric extension_load_loader_jiti_verified)
extension_load_loader_alias_to_index=$(get_extension_load_metric extension_load_loader_alias_to_index)
extension_load_loader_source_index=$(get_extension_load_metric extension_load_loader_source_index)
extension_load_index_reexports_loader=$(get_extension_load_metric extension_load_index_reexports_loader)
extension_load_diagnosis_verified=$(get_extension_load_metric extension_load_diagnosis_verified)

capture_timeline_output=$(python3 scripts/check-capture-timeline.py)
get_capture_timeline_metric() {
  local name="$1"
  printf '%s\n' "$capture_timeline_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
capture_timeline_rows=$(get_capture_timeline_metric capture_timeline_rows)
capture_timeline_timestamped=$(get_capture_timeline_metric capture_timeline_timestamped)
capture_timeline_prior_subagents_successes=$(get_capture_timeline_metric capture_timeline_prior_subagents_successes)
capture_timeline_current_subagents_failures=$(get_capture_timeline_metric capture_timeline_current_subagents_failures)
capture_timeline_temporal_order_verified=$(get_capture_timeline_metric capture_timeline_temporal_order_verified)
capture_timeline_mixed_state_documented=$(get_capture_timeline_metric capture_timeline_mixed_state_documented)
capture_timeline_verified=$(get_capture_timeline_metric capture_timeline_verified)

stale_policy_output=$(python3 scripts/check-stale-evidence-policy.py)
get_stale_policy_metric() {
  local name="$1"
  printf '%s\n' "$stale_policy_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
stale_policy_rows=$(get_stale_policy_metric stale_policy_rows)
stale_policy_manifest_prior_rows=$(get_stale_policy_metric stale_policy_manifest_prior_rows)
stale_policy_scorecard_prior_rows=$(get_stale_policy_metric stale_policy_scorecard_prior_rows)
stale_policy_current_failure_linked=$(get_stale_policy_metric stale_policy_current_failure_linked)
stale_policy_timeline_linked=$(get_stale_policy_metric stale_policy_timeline_linked)
stale_policy_token_caveat=$(get_stale_policy_metric stale_policy_token_caveat)
stale_policy_rerun_trigger=$(get_stale_policy_metric stale_policy_rerun_trigger)
stale_policy_verified=$(get_stale_policy_metric stale_policy_verified)

token_accounting_output=$(python3 scripts/check-token-accounting.py)
get_token_accounting_metric() {
  local name="$1"
  printf '%s\n' "$token_accounting_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
token_accounting_rows=$(get_token_accounting_metric token_accounting_rows)
token_accounting_native_zero_rows=$(get_token_accounting_metric token_accounting_native_zero_rows)
token_accounting_native_child_cost_present=$(get_token_accounting_metric token_accounting_native_child_cost_present)
token_accounting_extension_removed_cost_present=$(get_token_accounting_metric token_accounting_extension_removed_cost_present)
token_accounting_current_extension_no_child_present=$(get_token_accounting_metric token_accounting_current_extension_no_child_present)
token_accounting_scorecard_intro_aligned=$(get_token_accounting_metric token_accounting_scorecard_intro_aligned)
token_accounting_findings_metadata_aligned=$(get_token_accounting_metric token_accounting_findings_metadata_aligned)
token_accounting_token_conclusion_caveated=$(get_token_accounting_metric token_accounting_token_conclusion_caveated)
token_accounting_observed_cost_cents=$(get_token_accounting_metric token_accounting_observed_cost_cents)
token_accounting_verified=$(get_token_accounting_metric token_accounting_verified)

repro_hygiene_output=$(python3 scripts/check-repro-hygiene.py)
get_repro_hygiene_metric() {
  local name="$1"
  printf '%s\n' "$repro_hygiene_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
repro_hygiene_rows=$(get_repro_hygiene_metric repro_hygiene_rows)
repro_hygiene_python_glob=$(get_repro_hygiene_metric repro_hygiene_python_glob)
repro_hygiene_no_py_compile=$(get_repro_hygiene_metric repro_hygiene_no_py_compile)
repro_hygiene_compile_in_memory=$(get_repro_hygiene_metric repro_hygiene_compile_in_memory)
repro_hygiene_pycache_clean=$(get_repro_hygiene_metric repro_hygiene_pycache_clean)
repro_hygiene_verified=$(get_repro_hygiene_metric repro_hygiene_verified)

recommendation_output=$(python3 scripts/check-recommendation-consistency.py)
get_recommendation_metric() {
  local name="$1"
  printf '%s\n' "$recommendation_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
recommendation_consistency_rows=$(get_recommendation_metric recommendation_consistency_rows)
recommendation_exec_runtime_caveat=$(get_recommendation_metric recommendation_exec_runtime_caveat)
recommendation_s05_caveat=$(get_recommendation_metric recommendation_s05_caveat)
recommendation_final_blocks_current_runtime=$(get_recommendation_metric recommendation_final_blocks_current_runtime)
recommendation_native_default=$(get_recommendation_metric recommendation_native_default)
recommendation_rerun_trigger=$(get_recommendation_metric recommendation_rerun_trigger)
recommendation_removed_slash_protection=$(get_recommendation_metric recommendation_removed_slash_protection)
recommendation_consistency_verified=$(get_recommendation_metric recommendation_consistency_verified)

native_control_output=$(python3 scripts/check-native-control-currentness.py)
get_native_control_metric() {
  local name="$1"
  printf '%s\n' "$native_control_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
native_control_source_markers_expected=$(get_native_control_metric native_control_source_markers_expected)
native_control_source_markers=$(get_native_control_metric native_control_source_markers)
native_control_status_source=$(get_native_control_metric native_control_status_source)
native_control_status_capture=$(get_native_control_metric native_control_status_capture)
native_control_source_capture=$(get_native_control_metric native_control_source_capture)
native_control_source_probe_markers=$(get_native_control_metric native_control_source_probe_markers)
native_control_source_probe_disambiguation=$(get_native_control_metric native_control_source_probe_disambiguation)
native_control_source_probe_tests_reference=$(get_native_control_metric native_control_source_probe_tests_reference)
native_control_currentness_tests_interpretation=$(get_native_control_metric native_control_currentness_tests_interpretation)
native_control_scorecard_current=$(get_native_control_metric native_control_scorecard_current)
native_control_findings_current=$(get_native_control_metric native_control_findings_current)
native_control_readme_current=$(get_native_control_metric native_control_readme_current)
native_control_no_stale_unsupported=$(get_native_control_metric native_control_no_stale_unsupported)
native_control_interpretation_bullets_split=$(get_native_control_metric native_control_interpretation_bullets_split)
native_control_markdown_rows=$(get_native_control_metric native_control_markdown_rows)
native_control_currentness_verified=$(get_native_control_metric native_control_currentness_verified)

native_control_tests_output=$(python3 scripts/check-native-control-tests.py)
get_native_control_tests_metric() {
  local name="$1"
  printf '%s\n' "$native_control_tests_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
native_control_tool_schema_background_present=$(get_native_control_tests_metric native_control_tool_schema_background_present)
native_control_executor_background_present=$(get_native_control_tests_metric native_control_executor_background_present)
native_control_status_implementation_present=$(get_native_control_tests_metric native_control_status_implementation_present)
native_control_unit_running_status_test=$(get_native_control_tests_metric native_control_unit_running_status_test)
native_control_unit_interrupt_cancel_test=$(get_native_control_tests_metric native_control_unit_interrupt_cancel_test)
native_control_unit_resume_test=$(get_native_control_tests_metric native_control_unit_resume_test)
native_control_scorecard_unit_test_evidence=$(get_native_control_tests_metric native_control_scorecard_unit_test_evidence)
native_control_findings_unit_test_evidence=$(get_native_control_tests_metric native_control_findings_unit_test_evidence)
native_control_findings_audit_reference=$(get_native_control_tests_metric native_control_findings_audit_reference)
native_control_scorecard_paid_caveat=$(get_native_control_tests_metric native_control_scorecard_paid_caveat)
native_control_capture_paid_caveat=$(get_native_control_tests_metric native_control_capture_paid_caveat)
native_control_manifest_cancel_current=$(get_native_control_tests_metric native_control_manifest_cancel_current)
native_control_evidence_count_current=$(get_native_control_tests_metric native_control_evidence_count_current)
native_control_test_rows=$(get_native_control_tests_metric native_control_test_rows)
native_control_tests_verified=$(get_native_control_tests_metric native_control_tests_verified)

native_background_output=$(python3 scripts/check-native-background-control-live.py)
get_native_background_metric() {
  local name="$1"
  printf '%s\n' "$native_background_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
native_background_live_capture_present=$(get_native_background_metric native_background_live_capture_present)
native_background_live_started=$(get_native_background_metric native_background_live_started)
native_background_live_control_hint=$(get_native_background_metric native_background_live_control_hint)
native_background_live_status_completed=$(get_native_background_metric native_background_live_status_completed)
native_background_live_read_tool=$(get_native_background_metric native_background_live_read_tool)
native_background_live_child_output=$(get_native_background_metric native_background_live_child_output)
native_background_live_child_tokens=$(get_native_background_metric native_background_live_child_tokens)
native_background_live_child_cost_cents=$(get_native_background_metric native_background_live_child_cost_cents)
native_background_live_parent_footer_cost_cents=$(get_native_background_metric native_background_live_parent_footer_cost_cents)
native_background_live_summaries_current=$(get_native_background_metric native_background_live_summaries_current)
native_background_live_rows=$(get_native_background_metric native_background_live_rows)
native_background_live_verified=$(get_native_background_metric native_background_live_verified)

native_background_interrupt_resume_output=$(python3 scripts/check-native-background-interrupt-resume-live.py)
get_native_background_interrupt_resume_metric() {
  local name="$1"
  printf '%s\n' "$native_background_interrupt_resume_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
native_background_interrupt_resume_capture_present=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_capture_present)
native_background_interrupt_resume_started=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_started)
native_background_interrupt_resume_interrupted=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_interrupted)
native_background_interrupt_resume_resumable=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_resumable)
native_background_interrupt_resume_resumed=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_resumed)
native_background_interrupt_resume_completed=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_completed)
native_background_interrupt_resume_child_output=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_child_output)
native_background_interrupt_resume_child_tokens=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_child_tokens)
native_background_interrupt_resume_child_cost_cents=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_child_cost_cents)
native_background_interrupt_resume_parent_footer_cost_cents=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_parent_footer_cost_cents)
native_background_interrupt_resume_summaries_current=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_summaries_current)
native_background_interrupt_resume_rows=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_rows)
native_background_interrupt_resume_verified=$(get_native_background_interrupt_resume_metric native_background_interrupt_resume_verified)

native_background_cancel_output=$(python3 scripts/check-native-background-cancel-live.py)
get_native_background_cancel_metric() {
  local name="$1"
  printf '%s\n' "$native_background_cancel_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
native_background_cancel_capture_present=$(get_native_background_cancel_metric native_background_cancel_capture_present)
native_background_cancel_started=$(get_native_background_cancel_metric native_background_cancel_started)
native_background_cancel_cancelled=$(get_native_background_cancel_metric native_background_cancel_cancelled)
native_background_cancel_worker_cancelled=$(get_native_background_cancel_metric native_background_cancel_worker_cancelled)
native_background_cancel_no_final_output=$(get_native_background_cancel_metric native_background_cancel_no_final_output)
native_background_cancel_no_read_after_cancel=$(get_native_background_cancel_metric native_background_cancel_no_read_after_cancel)
native_background_cancel_child_tokens=$(get_native_background_cancel_metric native_background_cancel_child_tokens)
native_background_cancel_child_cost_cents=$(get_native_background_cancel_metric native_background_cancel_child_cost_cents)
native_background_cancel_parent_footer_cost_cents=$(get_native_background_cancel_metric native_background_cancel_parent_footer_cost_cents)
native_background_cancel_summaries_current=$(get_native_background_cancel_metric native_background_cancel_summaries_current)
native_background_cancel_rows=$(get_native_background_cancel_metric native_background_cancel_rows)
native_background_cancel_verified=$(get_native_background_cancel_metric native_background_cancel_verified)

rerun_commands_output=$(python3 scripts/check-rerun-commands.py)
get_rerun_metric() {
  local name="$1"
  printf '%s\n' "$rerun_commands_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
rerun_readme_commands_expected=$(get_rerun_metric rerun_readme_commands_expected)
rerun_readme_commands_present=$(get_rerun_metric rerun_readme_commands_present)
rerun_runbook_anchors_expected=$(get_rerun_metric rerun_runbook_anchors_expected)
rerun_runbook_anchors_present=$(get_rerun_metric rerun_runbook_anchors_present)
rerun_readme_removed_manager_probe=$(get_rerun_metric rerun_readme_removed_manager_probe)
rerun_readme_live_child_checker=$(get_rerun_metric rerun_readme_live_child_checker)
rerun_readme_write_generators=$(get_rerun_metric rerun_readme_write_generators)
rerun_handoff_review_checker=$(get_rerun_metric rerun_handoff_review_checker)
rerun_commands_verified=$(get_rerun_metric rerun_commands_verified)

eval_plan_currentness_output=$(python3 scripts/check-eval-plan-currentness.py)
get_eval_plan_currentness_metric() {
  local name="$1"
  printf '%s\n' "$eval_plan_currentness_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
eval_plan_currentness_rows=$(get_eval_plan_currentness_metric eval_plan_currentness_rows)
eval_plan_s01_native_live_child=$(get_eval_plan_currentness_metric eval_plan_s01_native_live_child)
eval_plan_s01_subagents_load_failure=$(get_eval_plan_currentness_metric eval_plan_s01_subagents_load_failure)
eval_plan_no_stale_no_live_child=$(get_eval_plan_currentness_metric eval_plan_no_stale_no_live_child)
eval_plan_runtime_caveat=$(get_eval_plan_currentness_metric eval_plan_runtime_caveat)
eval_plan_token_caveat=$(get_eval_plan_currentness_metric eval_plan_token_caveat)
eval_plan_s05_native_background_live=$(get_eval_plan_currentness_metric eval_plan_s05_native_background_live)
eval_plan_prior_extension_tmx_caveat=$(get_eval_plan_currentness_metric eval_plan_prior_extension_tmx_caveat)
eval_plan_summary_refs_current=$(get_eval_plan_currentness_metric eval_plan_summary_refs_current)
eval_plan_secondary_metrics_delegated=$(get_eval_plan_currentness_metric eval_plan_secondary_metrics_delegated)
eval_plan_currentness_verified=$(get_eval_plan_currentness_metric eval_plan_currentness_verified)

scorecard_template_output=$(python3 scripts/check-scorecard-template.py)
get_scorecard_template_metric() {
  local name="$1"
  printf '%s\n' "$scorecard_template_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
scorecard_template_rows=$(get_scorecard_template_metric scorecard_template_rows)
scorecard_template_warning=$(get_scorecard_template_metric scorecard_template_warning)
scorecard_template_current_columns=$(get_scorecard_template_metric scorecard_template_current_columns)
scorecard_template_placeholder_rows=$(get_scorecard_template_metric scorecard_template_placeholder_rows)
scorecard_template_no_stale_claims=$(get_scorecard_template_metric scorecard_template_no_stale_claims)
scorecard_template_verified=$(get_scorecard_template_metric scorecard_template_verified)

findings_template_output=$(python3 scripts/check-findings-template.py)
get_findings_template_metric() {
  local name="$1"
  printf '%s\n' "$findings_template_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
findings_template_headings_expected=$(get_findings_template_metric findings_template_headings_expected)
findings_template_headings_present=$(get_findings_template_metric findings_template_headings_present)
findings_template_warning=$(get_findings_template_metric findings_template_warning)
findings_template_placeholder_count=$(get_findings_template_metric findings_template_placeholder_count)
findings_template_no_stale_claims=$(get_findings_template_metric findings_template_no_stale_claims)
findings_template_verified=$(get_findings_template_metric findings_template_verified)

eval_design_prompt_output=$(python3 scripts/check-eval-design-prompt.py)
get_eval_design_prompt_metric() {
  local name="$1"
  printf '%s\n' "$eval_design_prompt_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
eval_design_prompt_warning=$(get_eval_design_prompt_metric eval_design_prompt_warning)
eval_design_prompt_current_caveats_expected=$(get_eval_design_prompt_metric eval_design_prompt_current_caveats_expected)
eval_design_prompt_current_caveats=$(get_eval_design_prompt_metric eval_design_prompt_current_caveats)
eval_design_prompt_no_stale_lines=$(get_eval_design_prompt_metric eval_design_prompt_no_stale_lines)
eval_design_prompt_verified=$(get_eval_design_prompt_metric eval_design_prompt_verified)

artifact_index_output=$(python3 scripts/check-artifact-index.py)
get_artifact_index_metric() {
  local name="$1"
  printf '%s\n' "$artifact_index_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
artifact_index_required_files=$(get_artifact_index_metric artifact_index_required_files)
artifact_index_readme_required_present=$(get_artifact_index_metric artifact_index_readme_required_present)
artifact_index_readme_directory_entries=$(get_artifact_index_metric artifact_index_readme_directory_entries)
artifact_index_manifest_audited_expected=$(get_artifact_index_metric artifact_index_manifest_audited_expected)
artifact_index_manifest_audited_present=$(get_artifact_index_metric artifact_index_manifest_audited_present)
artifact_index_runbook_audited_expected=$(get_artifact_index_metric artifact_index_runbook_audited_expected)
artifact_index_runbook_audited_present=$(get_artifact_index_metric artifact_index_runbook_audited_present)
artifact_index_autoresearch_scope_expected=$(get_artifact_index_metric artifact_index_autoresearch_scope_expected)
artifact_index_autoresearch_scope_present=$(get_artifact_index_metric artifact_index_autoresearch_scope_present)
artifact_index_required_files_exist=$(get_artifact_index_metric artifact_index_required_files_exist)
artifact_index_markdown_rows=$(get_artifact_index_metric artifact_index_markdown_rows)
artifact_index_markdown_guardrail_split=$(get_artifact_index_metric artifact_index_markdown_guardrail_split)
artifact_index_autoresearch_scope_descriptions_current=$(get_artifact_index_metric artifact_index_autoresearch_scope_descriptions_current)
artifact_index_autoresearch_artifact_index_description_current=$(get_artifact_index_metric artifact_index_autoresearch_artifact_index_description_current)
artifact_index_autoresearch_capture_integrity_notes_current=$(get_artifact_index_metric artifact_index_autoresearch_capture_integrity_notes_current)
artifact_index_readme_scope_current=$(get_artifact_index_metric artifact_index_readme_scope_current)
artifact_index_readme_summary_current=$(get_artifact_index_metric artifact_index_readme_summary_current)
artifact_index_findings_scope_current=$(get_artifact_index_metric artifact_index_findings_scope_current)
artifact_index_runbook_section_current=$(get_artifact_index_metric artifact_index_runbook_section_current)
artifact_index_runbook_scope_current=$(get_artifact_index_metric artifact_index_runbook_scope_current)
artifact_index_autoresearch_notes_scope_current=$(get_artifact_index_metric artifact_index_autoresearch_notes_scope_current)
artifact_index_autoresearch_notes_current=$(get_artifact_index_metric artifact_index_autoresearch_notes_current)
artifact_index_autoresearch_readme_summary_note_current=$(get_artifact_index_metric artifact_index_autoresearch_readme_summary_note_current)
artifact_index_manifest_scope_current=$(get_artifact_index_metric artifact_index_manifest_scope_current)
artifact_index_handoff_scope_current=$(get_artifact_index_metric artifact_index_handoff_scope_current)
artifact_index_handoff_crossrefs_current=$(get_artifact_index_metric artifact_index_handoff_crossrefs_current)
artifact_index_verified=$(get_artifact_index_metric artifact_index_verified)

scenario_verdict_output=$(python3 scripts/check-scenario-verdicts.py)
get_scenario_verdict_metric() {
  local name="$1"
  printf '%s\n' "$scenario_verdict_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
scenario_verdict_rows=$(get_scenario_verdict_metric scenario_verdict_rows)
scenario_verdict_current_live_rows=$(get_scenario_verdict_metric scenario_verdict_current_live_rows)
scenario_verdict_current_failure_rows=$(get_scenario_verdict_metric scenario_verdict_current_failure_rows)
scenario_verdict_prior_live_rows=$(get_scenario_verdict_metric scenario_verdict_prior_live_rows)
scenario_verdict_source_backed_rows=$(get_scenario_verdict_metric scenario_verdict_source_backed_rows)
scenario_verdict_unknown_rows=$(get_scenario_verdict_metric scenario_verdict_unknown_rows)
scenario_verdict_scorecard_prior_rows=$(get_scenario_verdict_metric scenario_verdict_scorecard_prior_rows)
scenario_verdict_scorecard_current_failure=$(get_scenario_verdict_metric scenario_verdict_scorecard_current_failure)
scenario_verdict_scorecard_native_live_child=$(get_scenario_verdict_metric scenario_verdict_scorecard_native_live_child)
scenario_verdict_findings_no_stale_false_claim=$(get_scenario_verdict_metric scenario_verdict_findings_no_stale_false_claim)
scenario_verdict_findings_one_tiny_live_claim=$(get_scenario_verdict_metric scenario_verdict_findings_one_tiny_live_claim)
scenario_verdict_findings_current_failure_claim=$(get_scenario_verdict_metric scenario_verdict_findings_current_failure_claim)
scenario_verdict_verified=$(get_scenario_verdict_metric scenario_verdict_verified)

source_runtime_output=$(python3 scripts/check-source-runtime-boundary.py)
get_source_runtime_metric() {
  local name="$1"
  printf '%s\n' "$source_runtime_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
source_runtime_extension_source_rows=$(get_source_runtime_metric source_runtime_extension_source_rows)
source_runtime_scorecard_rows_caveated=$(get_source_runtime_metric source_runtime_scorecard_rows_caveated)
source_runtime_manifest_rows_caveated=$(get_source_runtime_metric source_runtime_manifest_rows_caveated)
source_runtime_eval_plan_rows_caveated=$(get_source_runtime_metric source_runtime_eval_plan_rows_caveated)
source_runtime_eval_plan_global_caveat=$(get_source_runtime_metric source_runtime_eval_plan_global_caveat)
source_runtime_scenario_rule_caveat=$(get_source_runtime_metric source_runtime_scenario_rule_caveat)
source_runtime_boundary_verified=$(get_source_runtime_metric source_runtime_boundary_verified)

ideas_backlog_output=$(python3 scripts/check-ideas-backlog.py)
get_ideas_backlog_metric() {
  local name="$1"
  printf '%s\n' "$ideas_backlog_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
ideas_backlog_rows=$(get_ideas_backlog_metric ideas_backlog_rows)
ideas_backlog_required_classes_expected=$(get_ideas_backlog_metric ideas_backlog_required_classes_expected)
ideas_backlog_required_classes_present=$(get_ideas_backlog_metric ideas_backlog_required_classes_present)
ideas_backlog_final_handoff_markers_expected=$(get_ideas_backlog_metric ideas_backlog_final_handoff_markers_expected)
ideas_backlog_final_handoff_markers_present=$(get_ideas_backlog_metric ideas_backlog_final_handoff_markers_present)
ideas_backlog_stale_long_list_absent=$(get_ideas_backlog_metric ideas_backlog_stale_long_list_absent)
ideas_backlog_runbook_current=$(get_ideas_backlog_metric ideas_backlog_runbook_current)
ideas_backlog_verified=$(get_ideas_backlog_metric ideas_backlog_verified)

markdown_hygiene_output=$(python3 scripts/check-markdown-hygiene.py)
get_markdown_hygiene_metric() {
  local name="$1"
  printf '%s\n' "$markdown_hygiene_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
markdown_hygiene_files_checked=$(get_markdown_hygiene_metric markdown_hygiene_files_checked)
markdown_hygiene_fused_table_rows=$(get_markdown_hygiene_metric markdown_hygiene_fused_table_rows)
markdown_hygiene_fused_bullets=$(get_markdown_hygiene_metric markdown_hygiene_fused_bullets)
markdown_hygiene_table_heading_joins=$(get_markdown_hygiene_metric markdown_hygiene_table_heading_joins)
markdown_hygiene_runbook_current=$(get_markdown_hygiene_metric markdown_hygiene_runbook_current)
markdown_hygiene_scope_docs_current=$(get_markdown_hygiene_metric markdown_hygiene_scope_docs_current)
markdown_hygiene_verified=$(get_markdown_hygiene_metric markdown_hygiene_verified)

capture_integrity_output=$(python3 scripts/check-capture-integrity.py)
get_capture_integrity_metric() {
  local name="$1"
  printf '%s\n' "$capture_integrity_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
capture_integrity_scorecard_rows=$(get_capture_integrity_metric capture_integrity_scorecard_rows)
capture_integrity_expected_files=$(get_capture_integrity_metric capture_integrity_expected_files)
capture_integrity_scorecard_files_covered=$(get_capture_integrity_metric capture_integrity_scorecard_files_covered)
capture_integrity_files_present=$(get_capture_integrity_metric capture_integrity_files_present)
capture_integrity_markers_expected=$(get_capture_integrity_metric capture_integrity_markers_expected)
capture_integrity_markers_present=$(get_capture_integrity_metric capture_integrity_markers_present)
capture_integrity_scope_current=$(get_capture_integrity_metric capture_integrity_scope_current)
capture_integrity_runbook_current=$(get_capture_integrity_metric capture_integrity_runbook_current)
capture_integrity_verified=$(get_capture_integrity_metric capture_integrity_verified)

task_lifecycle_output=$(python3 scripts/check-task-lifecycle.py)
get_task_lifecycle_metric() {
  local name="$1"
  printf '%s\n' "$task_lifecycle_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
task_lifecycle_acceptance_rows=$(get_task_lifecycle_metric task_lifecycle_acceptance_rows)
task_lifecycle_native_fields_present=$(get_task_lifecycle_metric task_lifecycle_native_fields_present)
task_lifecycle_native_actions_present=$(get_task_lifecycle_metric task_lifecycle_native_actions_present)
task_lifecycle_native_statuses_present=$(get_task_lifecycle_metric task_lifecycle_native_statuses_present)
task_lifecycle_native_control_fields_present=$(get_task_lifecycle_metric task_lifecycle_native_control_fields_present)
task_lifecycle_native_control_actions_present=$(get_task_lifecycle_metric task_lifecycle_native_control_actions_present)
task_lifecycle_native_control_not_task_lifecycle=$(get_task_lifecycle_metric task_lifecycle_native_control_not_task_lifecycle)
task_lifecycle_native_absent=$(get_task_lifecycle_metric task_lifecycle_native_absent)
task_lifecycle_delegation_preserved=$(get_task_lifecycle_metric task_lifecycle_delegation_preserved)
task_lifecycle_extension_rows=$(get_task_lifecycle_metric task_lifecycle_extension_rows)
task_lifecycle_extension_management_actions=$(get_task_lifecycle_metric task_lifecycle_extension_management_actions)
task_lifecycle_extension_equivalent_absent=$(get_task_lifecycle_metric task_lifecycle_extension_equivalent_absent)
task_lifecycle_audit_verified=$(get_task_lifecycle_metric task_lifecycle_audit_verified)

handoff_review_output=$(python3 scripts/check-handoff-review.py)
get_handoff_review_metric() {
  local name="$1"
  printf '%s\n' "$handoff_review_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
handoff_review_required_audits_expected=$(get_handoff_review_metric handoff_review_required_audits_expected)
handoff_review_required_audits_present=$(get_handoff_review_metric handoff_review_required_audits_present)
handoff_review_current_prior_boundary=$(get_handoff_review_metric handoff_review_current_prior_boundary)
handoff_review_native_s05_boundary=$(get_handoff_review_metric handoff_review_native_s05_boundary)
handoff_review_pending_work_preserved=$(get_handoff_review_metric handoff_review_pending_work_preserved)
handoff_review_summary_refs_current=$(get_handoff_review_metric handoff_review_summary_refs_current)
handoff_review_purpose_scope_current=$(get_handoff_review_metric handoff_review_purpose_scope_current)
handoff_review_findings_scope_current=$(get_handoff_review_metric handoff_review_findings_scope_current)
handoff_review_latest_artifact_index_scope=$(get_handoff_review_metric handoff_review_latest_artifact_index_scope)
handoff_review_manifest_scope_current=$(get_handoff_review_metric handoff_review_manifest_scope_current)
handoff_review_manifest_full_scope_current=$(get_handoff_review_metric handoff_review_manifest_full_scope_current)
handoff_review_runbook_scope_current=$(get_handoff_review_metric handoff_review_runbook_scope_current)
handoff_review_verified=$(get_handoff_review_metric handoff_review_verified)

aggregate_gate_drift_guard=$(python3 - <<'PY'
from pathlib import Path
text = Path('autoresearch.sh').read_text()
markers = [
    '(( command_surface_subagents_runtime_loaded == 0 )) || missing=1',
    '(( command_surface_subagents_runtime_load_failed == 1 )) || missing=1',
    '(( live_subagents_load_error == 1 )) || missing=1',
    '(( live_subagents_module_format_error == 1 )) || missing=1',
    '(( live_subagents_shell_fallthrough == 1 )) || missing=1',
    '(( live_subagents_no_child_started == 1 )) || missing=1',
    '(( extension_load_runtime_error_files == 2 )) || missing=1',
    '(( extension_load_module_format_error_files == 2 )) || missing=1',
    '(( capture_timeline_current_subagents_failures == 2 )) || missing=1',
    '(( scenario_verdict_current_live_rows == 4 )) || missing=1',
    '(( scenario_verdict_current_failure_rows == 1 )) || missing=1',
    '(( capture_integrity_markers_expected == 78 )) || missing=1',
]
print(int(all(marker in text for marker in markers)))
PY
)

# Composite score rewards evidence completeness and isolation, capped to avoid padding.
cap() {
  local value="$1"
  local max="$2"
  if (( value > max )); then echo "$max"; else echo "$value"; fi
}

score=0
score=$((score + required_file_count * 4))
score=$((score + bash_syntax_ok * 8))
score=$((score + python_syntax_ok * 4))
score=$((score + startup_captures * 6))
score=$((score + $(cap "$scenario_captures" 18) * 3))
score=$((score + isolation_verified * 30))
score=$((score + $(cap "$scorecard_rows_touched" 18) * 2))
score=$((score + $(cap "$findings_sections_touched" 9) * 3))
score=$((score + $(cap "$task_agent_coverage" 10) * 2))
score=$((score + $(cap "$source_probe_coverage" 12) * 2))
score=$((score + $(cap "$honest_limitations" 12)))
score=$((score + $(cap "$evidence_file_coverage" 18)))
score=$((score + $(cap "$evidence_manifest_rows" 18)))
score=$((score + $(cap "$live_capture_links" 10)))
score=$((score + version_guard_verified * 8))
score=$((score + $(cap "$token_evidence_rows" 5) * 2))
score=$((score + native_zero_cost_captures * 2))
score=$((score + removed_command_token_captures * 4))
score=$((score + token_evidence_verified * 10))
score=$((score + $(cap "$scorecard_numeric_rows" 18)))
score=$((score + $(cap "$scorecard_analysis_rows" 9) * 2))
score=$((score + scorecard_average_consistency * 10))
score=$((score + scorecard_analysis_verified * 10))
score=$((score + $(cap "$findings_alignment_rows" 9) * 2))
score=$((score + findings_alignment_aligned * 2))
score=$((score + findings_alignment_exceptions))
score=$((score + findings_alignment_verified * 10))
score=$((score + $(cap "$command_surface_rows" 11) * 2))
score=$((score + command_surface_native_expected_present * 2))
score=$((score + command_surface_extension_expected_present * 2))
score=$((score + command_surface_extension_removed_absent * 3))
score=$((score + command_surface_launch_isolation * 3))
score=$((score + command_surface_removed_changelog_verified * 6))
score=$((score + command_surface_subagents_runtime_load_failed * 8))
score=$((score + command_surface_markdown_guardrail_split * 6))
score=$((score + command_surface_verified * 10))
score=$((score + live_child_rows * 4))
score=$((score + live_native_child_completed * 8))
score=$((score + live_native_child_read_tool * 4))
score=$((score + live_native_child_exact_three * 4))
score=$((score + live_subagents_load_error * 6))
score=$((score + live_subagents_module_format_error * 4))
score=$((score + live_subagents_shell_fallthrough * 4))
score=$((score + live_subagents_no_child_started * 4))
score=$((score + live_child_output_verified * 10))
score=$((score + extension_load_audit_rows * 3))
score=$((score + extension_load_runtime_error_files * 3))
score=$((score + extension_load_module_format_error_files * 3))
score=$((score + extension_load_manifest_verified * 5))
score=$((score + extension_load_entry_default_export * 4))
score=$((score + extension_load_entry_cjs_exports_absent * 4))
score=$((score + extension_load_entry_top_level_await_absent * 4))
score=$((score + extension_load_runtime_imports_pi_coding_agent * 5))
score=$((score + extension_load_loader_jiti_verified * 5))
score=$((score + extension_load_loader_alias_to_index * 5))
score=$((score + extension_load_loader_source_index * 5))
score=$((score + extension_load_index_reexports_loader * 5))
score=$((score + extension_load_diagnosis_verified * 10))
score=$((score + $(cap "$capture_timeline_rows" 14) * 2))
score=$((score + $(cap "$capture_timeline_timestamped" 14)))
score=$((score + capture_timeline_prior_subagents_successes * 2))
score=$((score + capture_timeline_current_subagents_failures * 4))
score=$((score + capture_timeline_temporal_order_verified * 8))
score=$((score + capture_timeline_mixed_state_documented * 8))
score=$((score + capture_timeline_verified * 10))
score=$((score + stale_policy_rows * 3))
score=$((score + stale_policy_manifest_prior_rows * 3))
score=$((score + stale_policy_scorecard_prior_rows * 3))
score=$((score + stale_policy_current_failure_linked * 8))
score=$((score + stale_policy_timeline_linked * 6))
score=$((score + stale_policy_token_caveat * 5))
score=$((score + stale_policy_rerun_trigger * 5))
score=$((score + stale_policy_verified * 10))
score=$((score + token_accounting_rows * 2))
score=$((score + token_accounting_native_zero_rows * 3))
score=$((score + token_accounting_native_child_cost_present * 6))
score=$((score + token_accounting_extension_removed_cost_present * 6))
score=$((score + token_accounting_current_extension_no_child_present * 5))
score=$((score + token_accounting_scorecard_intro_aligned * 5))
score=$((score + token_accounting_findings_metadata_aligned * 8))
score=$((score + token_accounting_token_conclusion_caveated * 5))
score=$((score + token_accounting_verified * 10))
score=$((score + repro_hygiene_rows * 3))
score=$((score + repro_hygiene_python_glob * 5))
score=$((score + repro_hygiene_no_py_compile * 8))
score=$((score + repro_hygiene_compile_in_memory * 8))
score=$((score + repro_hygiene_pycache_clean * 8))
score=$((score + repro_hygiene_verified * 10))
score=$((score + recommendation_consistency_rows * 3))
score=$((score + recommendation_exec_runtime_caveat * 6))
score=$((score + recommendation_s05_caveat * 6))
score=$((score + recommendation_final_blocks_current_runtime * 8))
score=$((score + recommendation_native_default * 5))
score=$((score + recommendation_rerun_trigger * 5))
score=$((score + recommendation_removed_slash_protection * 5))
score=$((score + recommendation_consistency_verified * 10))
score=$((score + $(cap "$native_control_source_markers" 8)))
score=$((score + native_control_status_source * 4))
score=$((score + native_control_status_capture * 5))
score=$((score + native_control_source_capture * 4))
score=$((score + native_control_source_probe_markers * 5))
score=$((score + native_control_source_probe_disambiguation * 5))
score=$((score + native_control_source_probe_tests_reference * 5))
score=$((score + native_control_currentness_tests_interpretation * 5))
score=$((score + native_control_scorecard_current * 5))
score=$((score + native_control_findings_current * 5))
score=$((score + native_control_readme_current * 5))
score=$((score + native_control_no_stale_unsupported * 5))
score=$((score + native_control_interpretation_bullets_split * 5))
score=$((score + $(cap "$native_control_markdown_rows" 13)))
score=$((score + native_control_currentness_verified * 10))
score=$((score + native_control_tool_schema_background_present * 5))
score=$((score + native_control_executor_background_present * 5))
score=$((score + native_control_status_implementation_present * 5))
score=$((score + native_control_unit_running_status_test * 5))
score=$((score + native_control_unit_interrupt_cancel_test * 5))
score=$((score + native_control_unit_resume_test * 5))
score=$((score + native_control_scorecard_unit_test_evidence * 5))
score=$((score + native_control_findings_unit_test_evidence * 5))
score=$((score + native_control_findings_audit_reference * 5))
score=$((score + native_control_scorecard_paid_caveat * 4))
score=$((score + native_control_capture_paid_caveat * 4))
score=$((score + native_control_manifest_cancel_current * 5))
score=$((score + native_control_evidence_count_current * 5))
score=$((score + $(cap "$native_control_test_rows" 15)))
score=$((score + native_control_tests_verified * 10))
score=$((score + native_background_live_capture_present * 5))
score=$((score + native_background_live_started * 6))
score=$((score + native_background_live_control_hint * 6))
score=$((score + native_background_live_status_completed * 8))
score=$((score + native_background_live_read_tool * 5))
score=$((score + native_background_live_child_output * 5))
score=$((score + $(cap "$native_background_live_child_tokens" 4000) / 1000))
score=$((score + native_background_live_summaries_current * 8))
score=$((score + $(cap "$native_background_live_rows" 12)))
score=$((score + native_background_live_verified * 12))
score=$((score + native_background_interrupt_resume_capture_present * 5))
score=$((score + native_background_interrupt_resume_started * 5))
score=$((score + native_background_interrupt_resume_interrupted * 8))
score=$((score + native_background_interrupt_resume_resumable * 6))
score=$((score + native_background_interrupt_resume_resumed * 8))
score=$((score + native_background_interrupt_resume_completed * 8))
score=$((score + native_background_interrupt_resume_child_output * 5))
score=$((score + $(cap "$native_background_interrupt_resume_child_tokens" 14000) / 1000))
score=$((score + native_background_interrupt_resume_summaries_current * 8))
score=$((score + $(cap "$native_background_interrupt_resume_rows" 13)))
score=$((score + native_background_interrupt_resume_verified * 12))
score=$((score + native_background_cancel_capture_present * 5))
score=$((score + native_background_cancel_started * 5))
score=$((score + native_background_cancel_cancelled * 8))
score=$((score + native_background_cancel_worker_cancelled * 6))
score=$((score + native_background_cancel_no_final_output * 8))
score=$((score + native_background_cancel_no_read_after_cancel * 5))
score=$((score + $(cap "$native_background_cancel_child_tokens" 13000) / 1000))
score=$((score + native_background_cancel_summaries_current * 8))
score=$((score + $(cap "$native_background_cancel_rows" 12)))
score=$((score + native_background_cancel_verified * 12))
score=$((score + $(cap "$rerun_readme_commands_present" 43)))
score=$((score + $(cap "$rerun_runbook_anchors_present" 32)))
score=$((score + rerun_readme_removed_manager_probe * 8))
score=$((score + rerun_readme_live_child_checker * 5))
score=$((score + rerun_readme_write_generators * 5))
score=$((score + rerun_handoff_review_checker * 5))
score=$((score + rerun_commands_verified * 10))
score=$((score + eval_plan_currentness_rows * 3))
score=$((score + eval_plan_s01_native_live_child * 6))
score=$((score + eval_plan_s01_subagents_load_failure * 6))
score=$((score + eval_plan_no_stale_no_live_child * 8))
score=$((score + eval_plan_runtime_caveat * 6))
score=$((score + eval_plan_token_caveat * 6))
score=$((score + eval_plan_s05_native_background_live * 5))
score=$((score + eval_plan_prior_extension_tmx_caveat * 5))
score=$((score + eval_plan_summary_refs_current * 5))
score=$((score + eval_plan_secondary_metrics_delegated * 4))
score=$((score + eval_plan_currentness_verified * 10))
score=$((score + $(cap "$scorecard_template_rows" 18)))
score=$((score + scorecard_template_warning * 5))
score=$((score + scorecard_template_current_columns * 5))
score=$((score + $(cap "$scorecard_template_placeholder_rows" 18)))
score=$((score + scorecard_template_no_stale_claims * 8))
score=$((score + scorecard_template_verified * 10))
score=$((score + $(cap "$findings_template_headings_present" 18)))
score=$((score + findings_template_warning * 5))
score=$((score + $(cap "$findings_template_placeholder_count" 20)))
score=$((score + findings_template_no_stale_claims * 8))
score=$((score + findings_template_verified * 10))
score=$((score + eval_design_prompt_warning * 5))
score=$((score + $(cap "$eval_design_prompt_current_caveats" 12)))
score=$((score + eval_design_prompt_no_stale_lines * 8))
score=$((score + eval_design_prompt_verified * 10))
score=$((score + $(cap "$artifact_index_required_files" 39)))
score=$((score + $(cap "$artifact_index_readme_required_present" 39)))
score=$((score + artifact_index_readme_directory_entries * 4))
score=$((score + $(cap "$artifact_index_manifest_audited_present" 29)))
score=$((score + $(cap "$artifact_index_runbook_audited_present" 29)))
score=$((score + $(cap "$artifact_index_autoresearch_scope_present" 39)))
score=$((score + $(cap "$artifact_index_required_files_exist" 39)))
score=$((score + $(cap "$artifact_index_markdown_rows" 22)))
score=$((score + artifact_index_markdown_guardrail_split * 5))
score=$((score + artifact_index_autoresearch_scope_descriptions_current * 5))
score=$((score + artifact_index_autoresearch_artifact_index_description_current * 5))
score=$((score + artifact_index_autoresearch_capture_integrity_notes_current * 5))
score=$((score + artifact_index_readme_scope_current * 5))
score=$((score + artifact_index_readme_summary_current * 5))
score=$((score + artifact_index_findings_scope_current * 5))
score=$((score + artifact_index_runbook_section_current * 5))
score=$((score + artifact_index_runbook_scope_current * 5))
score=$((score + artifact_index_autoresearch_notes_scope_current * 5))
score=$((score + artifact_index_autoresearch_notes_current * 5))
score=$((score + artifact_index_autoresearch_readme_summary_note_current * 5))
score=$((score + artifact_index_manifest_scope_current * 5))
score=$((score + artifact_index_handoff_scope_current * 5))
score=$((score + artifact_index_handoff_crossrefs_current * 5))
score=$((score + artifact_index_verified * 10))
score=$((score + $(cap "$scenario_verdict_rows" 18)))
score=$((score + scenario_verdict_current_live_rows * 3))
score=$((score + scenario_verdict_current_failure_rows * 5))
score=$((score + scenario_verdict_prior_live_rows * 4))
score=$((score + $(cap "$scenario_verdict_source_backed_rows" 10) * 2))
score=$((score + scenario_verdict_scorecard_prior_rows * 3))
score=$((score + scenario_verdict_scorecard_current_failure * 5))
score=$((score + scenario_verdict_scorecard_native_live_child * 5))
score=$((score + scenario_verdict_findings_no_stale_false_claim * 8))
score=$((score + scenario_verdict_findings_one_tiny_live_claim * 5))
score=$((score + scenario_verdict_findings_current_failure_claim * 5))
score=$((score + scenario_verdict_verified * 12))
score=$((score + source_runtime_extension_source_rows * 3))
score=$((score + source_runtime_scorecard_rows_caveated * 3))
score=$((score + source_runtime_manifest_rows_caveated * 3))
score=$((score + source_runtime_eval_plan_rows_caveated * 3))
score=$((score + source_runtime_eval_plan_global_caveat * 5))
score=$((score + source_runtime_scenario_rule_caveat * 5))
score=$((score + source_runtime_boundary_verified * 10))
score=$((score + $(cap "$ideas_backlog_rows" 5)))
score=$((score + $(cap "$ideas_backlog_required_classes_present" 5)))
score=$((score + $(cap "$ideas_backlog_final_handoff_markers_present" 13)))
score=$((score + ideas_backlog_stale_long_list_absent * 5))
score=$((score + ideas_backlog_runbook_current * 5))
score=$((score + ideas_backlog_verified * 10))
score=$((score + $(cap "$markdown_hygiene_files_checked" 39)))
score=$((score + markdown_hygiene_verified * 10))
score=$((score + (markdown_hygiene_table_heading_joins == 0 ? 5 : 0)))
score=$((score + markdown_hygiene_runbook_current * 5))
score=$((score + markdown_hygiene_scope_docs_current * 5))
score=$((score + $(cap "$capture_integrity_scorecard_files_covered" 18)))
score=$((score + $(cap "$capture_integrity_files_present" 18)))
score=$((score + $(cap "$capture_integrity_markers_present" 78)))
score=$((score + capture_integrity_scope_current * 5))
score=$((score + capture_integrity_runbook_current * 5))
score=$((score + capture_integrity_verified * 10))
score=$((score + $(cap "$task_lifecycle_acceptance_rows" 16)))
score=$((score + $(cap "$task_lifecycle_extension_rows" 12)))
score=$((score + task_lifecycle_native_absent * 10))
score=$((score + task_lifecycle_native_control_not_task_lifecycle * 6))
score=$((score + task_lifecycle_delegation_preserved * 8))
score=$((score + $(cap "$task_lifecycle_extension_management_actions" 9)))
score=$((score + task_lifecycle_extension_equivalent_absent * 10))
score=$((score + task_lifecycle_audit_verified * 12))
score=$((score + handoff_review_required_audits_present * 2))
score=$((score + handoff_review_current_prior_boundary * 8))
score=$((score + handoff_review_native_s05_boundary * 8))
score=$((score + handoff_review_pending_work_preserved * 5))
score=$((score + handoff_review_summary_refs_current * 5))
score=$((score + handoff_review_purpose_scope_current * 5))
score=$((score + handoff_review_findings_scope_current * 5))
score=$((score + handoff_review_latest_artifact_index_scope * 5))
score=$((score + handoff_review_manifest_scope_current * 5))
score=$((score + handoff_review_manifest_full_scope_current * 5))
score=$((score + handoff_review_runbook_scope_current * 5))
score=$((score + handoff_review_verified * 12))
score=$((score + aggregate_gate_drift_guard * 8))

missing=0
(( required_file_count == ${#required_files[@]} )) || missing=1
(( bash_syntax_ok == 1 )) || missing=1
(( python_syntax_ok == 1 )) || missing=1
(( startup_captures == 2 )) || missing=1
(( scenario_captures >= 18 )) || missing=1
(( isolation_verified == 1 )) || missing=1
(( scorecard_rows_touched >= 18 )) || missing=1
(( findings_sections_touched >= 9 )) || missing=1
(( source_probe_coverage >= 10 )) || missing=1
(( scorecard_evidence_rows >= 18 )) || missing=1
(( evidence_file_coverage == scorecard_evidence_rows )) || missing=1
(( evidence_manifest_rows >= 18 )) || missing=1
(( live_capture_links >= 8 )) || missing=1
(( version_guard_verified == 1 )) || missing=1
(( token_evidence_rows >= 5 )) || missing=1
(( native_zero_cost_captures == 3 )) || missing=1
(( removed_command_token_captures == 2 )) || missing=1
(( token_evidence_verified == 1 )) || missing=1
(( scorecard_numeric_rows == 18 )) || missing=1
(( scorecard_numeric_cells == 108 )) || missing=1
(( scorecard_average_consistency == 1 )) || missing=1
(( scorecard_numeric_native_wins == 8 )) || missing=1
(( scorecard_numeric_subagents_wins == 1 )) || missing=1
(( scorecard_analysis_rows == 9 )) || missing=1
(( scorecard_analysis_verified == 1 )) || missing=1
(( findings_alignment_rows == 9 )) || missing=1
(( findings_alignment_aligned == 5 )) || missing=1
(( findings_alignment_exceptions == 4 )) || missing=1
(( findings_alignment_conflicts == 0 )) || missing=1
(( findings_alignment_verified == 1 )) || missing=1
(( command_surface_rows == 11 )) || missing=1
(( command_surface_native_expected_present == 3 )) || missing=1
(( command_surface_extension_expected_present == 5 )) || missing=1
(( command_surface_extension_removed_absent == 3 )) || missing=1
(( command_surface_launch_isolation == 2 )) || missing=1
(( command_surface_removed_changelog_verified == 1 )) || missing=1
(( command_surface_subagents_runtime_loaded == 0 )) || missing=1
(( command_surface_subagents_runtime_load_failed == 1 )) || missing=1
(( command_surface_markdown_guardrail_split == 1 )) || missing=1
(( command_surface_verified == 1 )) || missing=1
(( live_child_rows == 2 )) || missing=1
(( live_native_child_completed == 1 )) || missing=1
(( live_native_child_read_tool == 1 )) || missing=1
(( live_native_child_exact_three == 1 )) || missing=1
(( live_subagents_load_error == 1 )) || missing=1
(( live_subagents_module_format_error == 1 )) || missing=1
(( live_subagents_shell_fallthrough == 1 )) || missing=1
(( live_subagents_no_child_started == 1 )) || missing=1
(( live_child_output_verified == 1 )) || missing=1
(( extension_load_audit_rows == 9 )) || missing=1
(( extension_load_runtime_error_files == 2 )) || missing=1
(( extension_load_module_format_error_files == 2 )) || missing=1
(( extension_load_manifest_verified == 1 )) || missing=1
(( extension_load_entry_default_export == 1 )) || missing=1
(( extension_load_entry_cjs_exports_absent == 1 )) || missing=1
(( extension_load_entry_top_level_await_absent == 1 )) || missing=1
(( extension_load_runtime_imports_pi_coding_agent == 1 )) || missing=1
(( extension_load_loader_jiti_verified == 1 )) || missing=1
(( extension_load_loader_alias_to_index == 1 )) || missing=1
(( extension_load_loader_source_index == 1 )) || missing=1
(( extension_load_index_reexports_loader == 1 )) || missing=1
(( extension_load_diagnosis_verified == 1 )) || missing=1
(( capture_timeline_rows == 14 )) || missing=1
(( capture_timeline_timestamped == 14 )) || missing=1
(( capture_timeline_prior_subagents_successes == 7 )) || missing=1
(( capture_timeline_current_subagents_failures == 2 )) || missing=1
(( capture_timeline_temporal_order_verified == 1 )) || missing=1
(( capture_timeline_mixed_state_documented == 1 )) || missing=1
(( capture_timeline_verified == 1 )) || missing=1
(( stale_policy_rows == 6 )) || missing=1
(( stale_policy_manifest_prior_rows == 3 )) || missing=1
(( stale_policy_scorecard_prior_rows == 3 )) || missing=1
(( stale_policy_current_failure_linked == 1 )) || missing=1
(( stale_policy_timeline_linked == 1 )) || missing=1
(( stale_policy_token_caveat == 1 )) || missing=1
(( stale_policy_rerun_trigger == 1 )) || missing=1
(( stale_policy_verified == 1 )) || missing=1
(( token_accounting_rows == 10 )) || missing=1
(( token_accounting_native_zero_rows == 3 )) || missing=1
(( token_accounting_native_child_cost_present == 1 )) || missing=1
(( token_accounting_extension_removed_cost_present == 1 )) || missing=1
(( token_accounting_current_extension_no_child_present == 1 )) || missing=1
(( token_accounting_scorecard_intro_aligned == 1 )) || missing=1
(( token_accounting_findings_metadata_aligned == 1 )) || missing=1
(( token_accounting_token_conclusion_caveated == 1 )) || missing=1
(( token_accounting_verified == 1 )) || missing=1
(( repro_hygiene_rows == 5 )) || missing=1
(( repro_hygiene_python_glob == 1 )) || missing=1
(( repro_hygiene_no_py_compile == 1 )) || missing=1
(( repro_hygiene_compile_in_memory == 1 )) || missing=1
(( repro_hygiene_pycache_clean == 1 )) || missing=1
(( repro_hygiene_verified == 1 )) || missing=1
(( recommendation_consistency_rows == 6 )) || missing=1
(( recommendation_exec_runtime_caveat == 1 )) || missing=1
(( recommendation_s05_caveat == 1 )) || missing=1
(( recommendation_final_blocks_current_runtime == 1 )) || missing=1
(( recommendation_native_default == 1 )) || missing=1
(( recommendation_rerun_trigger == 1 )) || missing=1
(( recommendation_removed_slash_protection == 1 )) || missing=1
(( recommendation_consistency_verified == 1 )) || missing=1
(( native_control_source_markers_expected == 8 )) || missing=1
(( native_control_source_markers == native_control_source_markers_expected )) || missing=1
(( native_control_status_source == 1 )) || missing=1
(( native_control_status_capture == 1 )) || missing=1
(( native_control_source_capture == 1 )) || missing=1
(( native_control_source_probe_markers == 1 )) || missing=1
(( native_control_source_probe_disambiguation == 1 )) || missing=1
(( native_control_source_probe_tests_reference == 1 )) || missing=1
(( native_control_currentness_tests_interpretation == 1 )) || missing=1
(( native_control_scorecard_current == 1 )) || missing=1
(( native_control_findings_current == 1 )) || missing=1
(( native_control_readme_current == 1 )) || missing=1
(( native_control_no_stale_unsupported == 1 )) || missing=1
(( native_control_interpretation_bullets_split == 1 )) || missing=1
(( native_control_markdown_rows == 13 )) || missing=1
(( native_control_currentness_verified == 1 )) || missing=1
(( native_control_tool_schema_background_present == 1 )) || missing=1
(( native_control_executor_background_present == 1 )) || missing=1
(( native_control_status_implementation_present == 1 )) || missing=1
(( native_control_unit_running_status_test == 1 )) || missing=1
(( native_control_unit_interrupt_cancel_test == 1 )) || missing=1
(( native_control_unit_resume_test == 1 )) || missing=1
(( native_control_scorecard_unit_test_evidence == 1 )) || missing=1
(( native_control_findings_unit_test_evidence == 1 )) || missing=1
(( native_control_findings_audit_reference == 1 )) || missing=1
(( native_control_scorecard_paid_caveat == 1 )) || missing=1
(( native_control_capture_paid_caveat == 1 )) || missing=1
(( native_control_manifest_cancel_current == 1 )) || missing=1
(( native_control_evidence_count_current == 1 )) || missing=1
(( native_control_test_rows == 15 )) || missing=1
(( native_control_tests_verified == 1 )) || missing=1
(( native_background_live_capture_present == 1 )) || missing=1
(( native_background_live_started == 1 )) || missing=1
(( native_background_live_control_hint == 1 )) || missing=1
(( native_background_live_status_completed == 1 )) || missing=1
(( native_background_live_read_tool == 1 )) || missing=1
(( native_background_live_child_output == 1 )) || missing=1
(( native_background_live_child_tokens > 0 )) || missing=1
awk "BEGIN { exit !($native_background_live_child_cost_cents > 0) }" || missing=1
awk "BEGIN { exit !($native_background_live_parent_footer_cost_cents > 0) }" || missing=1
(( native_background_live_summaries_current == 1 )) || missing=1
(( native_background_live_rows == 12 )) || missing=1
(( native_background_live_verified == 1 )) || missing=1
(( native_background_interrupt_resume_capture_present == 1 )) || missing=1
(( native_background_interrupt_resume_started == 1 )) || missing=1
(( native_background_interrupt_resume_interrupted == 1 )) || missing=1
(( native_background_interrupt_resume_resumable == 1 )) || missing=1
(( native_background_interrupt_resume_resumed == 1 )) || missing=1
(( native_background_interrupt_resume_completed == 1 )) || missing=1
(( native_background_interrupt_resume_child_output == 1 )) || missing=1
(( native_background_interrupt_resume_child_tokens > 0 )) || missing=1
awk "BEGIN { exit !($native_background_interrupt_resume_child_cost_cents > 0) }" || missing=1
awk "BEGIN { exit !($native_background_interrupt_resume_parent_footer_cost_cents > 0) }" || missing=1
(( native_background_interrupt_resume_summaries_current == 1 )) || missing=1
(( native_background_interrupt_resume_rows == 13 )) || missing=1
(( native_background_interrupt_resume_verified == 1 )) || missing=1
(( native_background_cancel_capture_present == 1 )) || missing=1
(( native_background_cancel_started == 1 )) || missing=1
(( native_background_cancel_cancelled == 1 )) || missing=1
(( native_background_cancel_worker_cancelled == 1 )) || missing=1
(( native_background_cancel_no_final_output == 1 )) || missing=1
(( native_background_cancel_no_read_after_cancel == 1 )) || missing=1
(( native_background_cancel_child_tokens > 0 )) || missing=1
awk "BEGIN { exit !($native_background_cancel_child_cost_cents > 0) }" || missing=1
awk "BEGIN { exit !($native_background_cancel_parent_footer_cost_cents > 0) }" || missing=1
(( native_background_cancel_summaries_current == 1 )) || missing=1
(( native_background_cancel_rows == 12 )) || missing=1
(( native_background_cancel_verified == 1 )) || missing=1
(( rerun_readme_commands_expected == 43 )) || missing=1
(( rerun_readme_commands_present == rerun_readme_commands_expected )) || missing=1
(( rerun_runbook_anchors_expected == 32 )) || missing=1
(( rerun_runbook_anchors_present == rerun_runbook_anchors_expected )) || missing=1
(( rerun_readme_removed_manager_probe == 1 )) || missing=1
(( rerun_readme_live_child_checker == 1 )) || missing=1
(( rerun_readme_write_generators == 1 )) || missing=1
(( rerun_handoff_review_checker == 1 )) || missing=1
(( rerun_commands_verified == 1 )) || missing=1
(( eval_plan_currentness_rows == 9 )) || missing=1
(( eval_plan_s01_native_live_child == 1 )) || missing=1
(( eval_plan_s01_subagents_load_failure == 1 )) || missing=1
(( eval_plan_no_stale_no_live_child == 1 )) || missing=1
(( eval_plan_runtime_caveat == 1 )) || missing=1
(( eval_plan_token_caveat == 1 )) || missing=1
(( eval_plan_s05_native_background_live == 1 )) || missing=1
(( eval_plan_prior_extension_tmx_caveat == 1 )) || missing=1
(( eval_plan_summary_refs_current == 1 )) || missing=1
(( eval_plan_secondary_metrics_delegated == 1 )) || missing=1
(( eval_plan_currentness_verified == 1 )) || missing=1
(( scorecard_template_rows == 18 )) || missing=1
(( scorecard_template_warning == 1 )) || missing=1
(( scorecard_template_current_columns == 1 )) || missing=1
(( scorecard_template_placeholder_rows == 18 )) || missing=1
(( scorecard_template_no_stale_claims == 1 )) || missing=1
(( scorecard_template_verified == 1 )) || missing=1
(( findings_template_headings_expected == 18 )) || missing=1
(( findings_template_headings_present == findings_template_headings_expected )) || missing=1
(( findings_template_warning == 1 )) || missing=1
(( findings_template_placeholder_count >= 80 )) || missing=1
(( findings_template_no_stale_claims == 1 )) || missing=1
(( findings_template_verified == 1 )) || missing=1
(( eval_design_prompt_warning == 1 )) || missing=1
(( eval_design_prompt_current_caveats_expected == 12 )) || missing=1
(( eval_design_prompt_current_caveats == eval_design_prompt_current_caveats_expected )) || missing=1
(( eval_design_prompt_no_stale_lines == 1 )) || missing=1
(( eval_design_prompt_verified == 1 )) || missing=1
(( artifact_index_required_files == ${#required_files[@]} )) || missing=1
(( artifact_index_readme_required_present == artifact_index_required_files )) || missing=1
(( artifact_index_readme_directory_entries == 2 )) || missing=1
(( artifact_index_manifest_audited_expected == 31 )) || missing=1
(( artifact_index_manifest_audited_present == artifact_index_manifest_audited_expected )) || missing=1
(( artifact_index_runbook_audited_expected == 31 )) || missing=1
(( artifact_index_runbook_audited_present == artifact_index_runbook_audited_expected )) || missing=1
(( artifact_index_autoresearch_scope_expected == artifact_index_required_files )) || missing=1
(( artifact_index_autoresearch_scope_present == artifact_index_autoresearch_scope_expected )) || missing=1
(( artifact_index_required_files_exist == artifact_index_required_files )) || missing=1
(( artifact_index_markdown_rows == 22 )) || missing=1
(( artifact_index_markdown_guardrail_split == 1 )) || missing=1
(( artifact_index_autoresearch_scope_descriptions_current == 1 )) || missing=1
(( artifact_index_autoresearch_artifact_index_description_current == 1 )) || missing=1
(( artifact_index_autoresearch_capture_integrity_notes_current == 1 )) || missing=1
(( artifact_index_readme_scope_current == 1 )) || missing=1
(( artifact_index_readme_summary_current == 1 )) || missing=1
(( artifact_index_findings_scope_current == 1 )) || missing=1
(( artifact_index_runbook_section_current == 1 )) || missing=1
(( artifact_index_runbook_scope_current == 1 )) || missing=1
(( artifact_index_autoresearch_notes_scope_current == 1 )) || missing=1
(( artifact_index_autoresearch_notes_current == 1 )) || missing=1
(( artifact_index_autoresearch_readme_summary_note_current == 1 )) || missing=1
(( artifact_index_manifest_scope_current == 1 )) || missing=1
(( artifact_index_handoff_scope_current == 1 )) || missing=1
(( artifact_index_handoff_crossrefs_current == 1 )) || missing=1
(( artifact_index_verified == 1 )) || missing=1
(( scenario_verdict_rows == 18 )) || missing=1
(( scenario_verdict_current_live_rows == 4 )) || missing=1
(( scenario_verdict_current_failure_rows == 1 )) || missing=1
(( scenario_verdict_prior_live_rows == 3 )) || missing=1
(( scenario_verdict_source_backed_rows == 10 )) || missing=1
(( scenario_verdict_unknown_rows == 0 )) || missing=1
(( scenario_verdict_scorecard_prior_rows == 3 )) || missing=1
(( scenario_verdict_scorecard_current_failure == 1 )) || missing=1
(( scenario_verdict_scorecard_native_live_child == 1 )) || missing=1
(( scenario_verdict_findings_no_stale_false_claim == 1 )) || missing=1
(( scenario_verdict_findings_one_tiny_live_claim == 1 )) || missing=1
(( scenario_verdict_findings_current_failure_claim == 1 )) || missing=1
(( scenario_verdict_verified == 1 )) || missing=1
(( source_runtime_extension_source_rows == 5 )) || missing=1
(( source_runtime_scorecard_rows_caveated == 5 )) || missing=1
(( source_runtime_manifest_rows_caveated == 5 )) || missing=1
(( source_runtime_eval_plan_rows_caveated == 5 )) || missing=1
(( source_runtime_eval_plan_global_caveat == 1 )) || missing=1
(( source_runtime_scenario_rule_caveat == 1 )) || missing=1
(( source_runtime_boundary_verified == 1 )) || missing=1
(( ideas_backlog_rows >= 4 )) || missing=1
(( ideas_backlog_required_classes_expected == 4 )) || missing=1
(( ideas_backlog_required_classes_present == ideas_backlog_required_classes_expected )) || missing=1
(( ideas_backlog_final_handoff_markers_expected == 13 )) || missing=1
(( ideas_backlog_final_handoff_markers_present == ideas_backlog_final_handoff_markers_expected )) || missing=1
(( ideas_backlog_stale_long_list_absent == 1 )) || missing=1
(( ideas_backlog_runbook_current == 1 )) || missing=1
(( ideas_backlog_verified == 1 )) || missing=1
(( markdown_hygiene_files_checked >= 39 )) || missing=1
(( markdown_hygiene_fused_table_rows == 0 )) || missing=1
(( markdown_hygiene_fused_bullets == 0 )) || missing=1
(( markdown_hygiene_table_heading_joins == 0 )) || missing=1
(( markdown_hygiene_runbook_current == 1 )) || missing=1
(( markdown_hygiene_scope_docs_current == 1 )) || missing=1
(( markdown_hygiene_verified == 1 )) || missing=1
(( capture_integrity_scorecard_rows == 18 )) || missing=1
(( capture_integrity_expected_files == 18 )) || missing=1
(( capture_integrity_scorecard_files_covered == 18 )) || missing=1
(( capture_integrity_files_present == 18 )) || missing=1
(( capture_integrity_markers_expected == 78 )) || missing=1
(( capture_integrity_markers_present == capture_integrity_markers_expected )) || missing=1
(( capture_integrity_scope_current == 1 )) || missing=1
(( capture_integrity_runbook_current == 1 )) || missing=1
(( capture_integrity_verified == 1 )) || missing=1
(( task_lifecycle_acceptance_rows == 16 )) || missing=1
(( task_lifecycle_native_fields_present == 0 )) || missing=1
(( task_lifecycle_native_actions_present == 0 )) || missing=1
(( task_lifecycle_native_statuses_present == 0 )) || missing=1
(( task_lifecycle_native_control_not_task_lifecycle == 1 )) || missing=1
(( task_lifecycle_native_absent == 1 )) || missing=1
(( task_lifecycle_delegation_preserved == 1 )) || missing=1
(( task_lifecycle_extension_rows == 12 )) || missing=1
(( task_lifecycle_extension_management_actions >= 8 )) || missing=1
(( task_lifecycle_extension_equivalent_absent == 1 )) || missing=1
(( task_lifecycle_audit_verified == 1 )) || missing=1
(( handoff_review_required_audits_expected == 13 )) || missing=1
(( handoff_review_required_audits_present == handoff_review_required_audits_expected )) || missing=1
(( handoff_review_current_prior_boundary == 1 )) || missing=1
(( handoff_review_native_s05_boundary == 1 )) || missing=1
(( handoff_review_pending_work_preserved == 1 )) || missing=1
(( handoff_review_summary_refs_current == 1 )) || missing=1
(( handoff_review_purpose_scope_current == 1 )) || missing=1
(( handoff_review_findings_scope_current == 1 )) || missing=1
(( handoff_review_latest_artifact_index_scope == 1 )) || missing=1
(( handoff_review_manifest_scope_current == 1 )) || missing=1
(( handoff_review_manifest_full_scope_current == 1 )) || missing=1
(( handoff_review_runbook_scope_current == 1 )) || missing=1
(( handoff_review_verified == 1 )) || missing=1
(( aggregate_gate_drift_guard == 1 )) || missing=1

if (( missing != 0 )); then
  echo "ERROR: required evidence incomplete" >&2
  echo "required_file_count=$required_file_count startup_captures=$startup_captures scenario_captures=$scenario_captures isolation_verified=$isolation_verified scorecard_rows_touched=$scorecard_rows_touched findings_sections_touched=$findings_sections_touched source_probe_coverage=$source_probe_coverage scorecard_evidence_rows=$scorecard_evidence_rows evidence_file_coverage=$evidence_file_coverage evidence_manifest_rows=$evidence_manifest_rows live_capture_links=$live_capture_links version_guard_verified=$version_guard_verified token_evidence_rows=$token_evidence_rows native_zero_cost_captures=$native_zero_cost_captures removed_command_token_captures=$removed_command_token_captures token_evidence_verified=$token_evidence_verified scorecard_numeric_rows=$scorecard_numeric_rows scorecard_numeric_cells=$scorecard_numeric_cells scorecard_average_consistency=$scorecard_average_consistency scorecard_numeric_native_wins=$scorecard_numeric_native_wins scorecard_numeric_subagents_wins=$scorecard_numeric_subagents_wins scorecard_analysis_rows=$scorecard_analysis_rows scorecard_analysis_verified=$scorecard_analysis_verified findings_alignment_rows=$findings_alignment_rows findings_alignment_aligned=$findings_alignment_aligned findings_alignment_exceptions=$findings_alignment_exceptions findings_alignment_conflicts=$findings_alignment_conflicts findings_alignment_verified=$findings_alignment_verified command_surface_rows=$command_surface_rows command_surface_verified=$command_surface_verified command_surface_subagents_runtime_loaded=$command_surface_subagents_runtime_loaded command_surface_subagents_runtime_load_failed=$command_surface_subagents_runtime_load_failed live_child_output_verified=$live_child_output_verified extension_load_diagnosis_verified=$extension_load_diagnosis_verified capture_timeline_verified=$capture_timeline_verified stale_policy_verified=$stale_policy_verified token_accounting_verified=$token_accounting_verified repro_hygiene_verified=$repro_hygiene_verified recommendation_consistency_verified=$recommendation_consistency_verified rerun_commands_verified=$rerun_commands_verified eval_plan_currentness_verified=$eval_plan_currentness_verified scorecard_template_verified=$scorecard_template_verified artifact_index_verified=$artifact_index_verified scenario_verdict_verified=$scenario_verdict_verified source_runtime_boundary_verified=$source_runtime_boundary_verified task_lifecycle_audit_verified=$task_lifecycle_audit_verified missing_evidence_paths=${missing_evidence_paths[*]-}" >&2
  exit 1
fi

echo "METRIC actual_eval_score=$score"
echo "METRIC startup_captures=$startup_captures"
echo "METRIC scenario_captures=$scenario_captures"
echo "METRIC isolation_verified=$isolation_verified"
echo "METRIC scorecard_rows_touched=$scorecard_rows_touched"
echo "METRIC findings_sections_touched=$findings_sections_touched"
echo "METRIC task_agent_coverage=$task_agent_coverage"
echo "METRIC source_probe_coverage=$source_probe_coverage"
echo "METRIC honest_limitations=$honest_limitations"
echo "METRIC required_file_count=$required_file_count"
echo "METRIC bash_syntax_ok=$bash_syntax_ok"
echo "METRIC python_syntax_ok=$python_syntax_ok"
echo "METRIC scorecard_evidence_rows=$scorecard_evidence_rows"
echo "METRIC evidence_file_coverage=$evidence_file_coverage"
echo "METRIC evidence_manifest_rows=$evidence_manifest_rows"
echo "METRIC live_capture_links=$live_capture_links"
echo "METRIC version_guard_verified=$version_guard_verified"
echo "METRIC token_evidence_rows=$token_evidence_rows"
echo "METRIC native_zero_cost_captures=$native_zero_cost_captures"
echo "METRIC removed_command_token_captures=$removed_command_token_captures"
echo "METRIC fallthrough_cost_cents=$fallthrough_cost_cents"
echo "METRIC token_evidence_verified=$token_evidence_verified"
echo "METRIC scorecard_numeric_rows=$scorecard_numeric_rows"
echo "METRIC scorecard_numeric_cells=$scorecard_numeric_cells"
echo "METRIC scorecard_average_consistency=$scorecard_average_consistency"
echo "METRIC scorecard_numeric_native_wins=$scorecard_numeric_native_wins"
echo "METRIC scorecard_numeric_subagents_wins=$scorecard_numeric_subagents_wins"
echo "METRIC scorecard_numeric_ties=$scorecard_numeric_ties"
echo "METRIC scorecard_analysis_rows=$scorecard_analysis_rows"
echo "METRIC scorecard_analysis_verified=$scorecard_analysis_verified"
echo "METRIC findings_alignment_rows=$findings_alignment_rows"
echo "METRIC findings_alignment_aligned=$findings_alignment_aligned"
echo "METRIC findings_alignment_exceptions=$findings_alignment_exceptions"
echo "METRIC findings_alignment_conflicts=$findings_alignment_conflicts"
echo "METRIC findings_alignment_verified=$findings_alignment_verified"
echo "METRIC command_surface_rows=$command_surface_rows"
echo "METRIC command_surface_native_expected_present=$command_surface_native_expected_present"
echo "METRIC command_surface_extension_expected_present=$command_surface_extension_expected_present"
echo "METRIC command_surface_extension_removed_absent=$command_surface_extension_removed_absent"
echo "METRIC command_surface_launch_isolation=$command_surface_launch_isolation"
echo "METRIC command_surface_removed_changelog_verified=$command_surface_removed_changelog_verified"
echo "METRIC command_surface_subagents_runtime_loaded=$command_surface_subagents_runtime_loaded"
echo "METRIC command_surface_subagents_runtime_load_failed=$command_surface_subagents_runtime_load_failed"
echo "METRIC command_surface_markdown_guardrail_split=$command_surface_markdown_guardrail_split"
echo "METRIC command_surface_verified=$command_surface_verified"
echo "METRIC live_child_rows=$live_child_rows"
echo "METRIC live_native_child_completed=$live_native_child_completed"
echo "METRIC live_native_child_read_tool=$live_native_child_read_tool"
echo "METRIC live_native_child_exact_three=$live_native_child_exact_three"
echo "METRIC live_native_child_tokens=$live_native_child_tokens"
echo "METRIC live_native_child_cost_cents=$live_native_child_cost_cents"
echo "METRIC live_subagents_load_error=$live_subagents_load_error"
echo "METRIC live_subagents_module_format_error=$live_subagents_module_format_error"
echo "METRIC live_subagents_shell_fallthrough=$live_subagents_shell_fallthrough"
echo "METRIC live_subagents_no_child_started=$live_subagents_no_child_started"
echo "METRIC live_child_output_verified=$live_child_output_verified"
echo "METRIC extension_load_audit_rows=$extension_load_audit_rows"
echo "METRIC extension_load_runtime_error_files=$extension_load_runtime_error_files"
echo "METRIC extension_load_module_format_error_files=$extension_load_module_format_error_files"
echo "METRIC extension_load_manifest_verified=$extension_load_manifest_verified"
echo "METRIC extension_load_entry_default_export=$extension_load_entry_default_export"
echo "METRIC extension_load_entry_cjs_exports_absent=$extension_load_entry_cjs_exports_absent"
echo "METRIC extension_load_entry_top_level_await_absent=$extension_load_entry_top_level_await_absent"
echo "METRIC extension_load_runtime_imports_pi_coding_agent=$extension_load_runtime_imports_pi_coding_agent"
echo "METRIC extension_load_loader_jiti_verified=$extension_load_loader_jiti_verified"
echo "METRIC extension_load_loader_alias_to_index=$extension_load_loader_alias_to_index"
echo "METRIC extension_load_loader_source_index=$extension_load_loader_source_index"
echo "METRIC extension_load_index_reexports_loader=$extension_load_index_reexports_loader"
echo "METRIC extension_load_diagnosis_verified=$extension_load_diagnosis_verified"
echo "METRIC capture_timeline_rows=$capture_timeline_rows"
echo "METRIC capture_timeline_timestamped=$capture_timeline_timestamped"
echo "METRIC capture_timeline_prior_subagents_successes=$capture_timeline_prior_subagents_successes"
echo "METRIC capture_timeline_current_subagents_failures=$capture_timeline_current_subagents_failures"
echo "METRIC capture_timeline_temporal_order_verified=$capture_timeline_temporal_order_verified"
echo "METRIC capture_timeline_mixed_state_documented=$capture_timeline_mixed_state_documented"
echo "METRIC capture_timeline_verified=$capture_timeline_verified"
echo "METRIC stale_policy_rows=$stale_policy_rows"
echo "METRIC stale_policy_manifest_prior_rows=$stale_policy_manifest_prior_rows"
echo "METRIC stale_policy_scorecard_prior_rows=$stale_policy_scorecard_prior_rows"
echo "METRIC stale_policy_current_failure_linked=$stale_policy_current_failure_linked"
echo "METRIC stale_policy_timeline_linked=$stale_policy_timeline_linked"
echo "METRIC stale_policy_token_caveat=$stale_policy_token_caveat"
echo "METRIC stale_policy_rerun_trigger=$stale_policy_rerun_trigger"
echo "METRIC stale_policy_verified=$stale_policy_verified"
echo "METRIC token_accounting_rows=$token_accounting_rows"
echo "METRIC token_accounting_native_zero_rows=$token_accounting_native_zero_rows"
echo "METRIC token_accounting_native_child_cost_present=$token_accounting_native_child_cost_present"
echo "METRIC token_accounting_extension_removed_cost_present=$token_accounting_extension_removed_cost_present"
echo "METRIC token_accounting_current_extension_no_child_present=$token_accounting_current_extension_no_child_present"
echo "METRIC token_accounting_scorecard_intro_aligned=$token_accounting_scorecard_intro_aligned"
echo "METRIC token_accounting_findings_metadata_aligned=$token_accounting_findings_metadata_aligned"
echo "METRIC token_accounting_token_conclusion_caveated=$token_accounting_token_conclusion_caveated"
echo "METRIC token_accounting_observed_cost_cents=$token_accounting_observed_cost_cents"
echo "METRIC token_accounting_verified=$token_accounting_verified"
echo "METRIC repro_hygiene_rows=$repro_hygiene_rows"
echo "METRIC repro_hygiene_python_glob=$repro_hygiene_python_glob"
echo "METRIC repro_hygiene_no_py_compile=$repro_hygiene_no_py_compile"
echo "METRIC repro_hygiene_compile_in_memory=$repro_hygiene_compile_in_memory"
echo "METRIC repro_hygiene_pycache_clean=$repro_hygiene_pycache_clean"
echo "METRIC repro_hygiene_verified=$repro_hygiene_verified"
echo "METRIC recommendation_consistency_rows=$recommendation_consistency_rows"
echo "METRIC recommendation_exec_runtime_caveat=$recommendation_exec_runtime_caveat"
echo "METRIC recommendation_s05_caveat=$recommendation_s05_caveat"
echo "METRIC recommendation_final_blocks_current_runtime=$recommendation_final_blocks_current_runtime"
echo "METRIC recommendation_native_default=$recommendation_native_default"
echo "METRIC recommendation_rerun_trigger=$recommendation_rerun_trigger"
echo "METRIC recommendation_removed_slash_protection=$recommendation_removed_slash_protection"
echo "METRIC recommendation_consistency_verified=$recommendation_consistency_verified"
echo "METRIC native_control_source_markers_expected=$native_control_source_markers_expected"
echo "METRIC native_control_source_markers=$native_control_source_markers"
echo "METRIC native_control_status_source=$native_control_status_source"
echo "METRIC native_control_status_capture=$native_control_status_capture"
echo "METRIC native_control_source_capture=$native_control_source_capture"
echo "METRIC native_control_source_probe_markers=$native_control_source_probe_markers"
echo "METRIC native_control_source_probe_disambiguation=$native_control_source_probe_disambiguation"
echo "METRIC native_control_source_probe_tests_reference=$native_control_source_probe_tests_reference"
echo "METRIC native_control_currentness_tests_interpretation=$native_control_currentness_tests_interpretation"
echo "METRIC native_control_scorecard_current=$native_control_scorecard_current"
echo "METRIC native_control_findings_current=$native_control_findings_current"
echo "METRIC native_control_readme_current=$native_control_readme_current"
echo "METRIC native_control_no_stale_unsupported=$native_control_no_stale_unsupported"
echo "METRIC native_control_interpretation_bullets_split=$native_control_interpretation_bullets_split"
echo "METRIC native_control_markdown_rows=$native_control_markdown_rows"
echo "METRIC native_control_currentness_verified=$native_control_currentness_verified"
echo "METRIC native_control_tool_schema_background_present=$native_control_tool_schema_background_present"
echo "METRIC native_control_executor_background_present=$native_control_executor_background_present"
echo "METRIC native_control_status_implementation_present=$native_control_status_implementation_present"
echo "METRIC native_control_unit_running_status_test=$native_control_unit_running_status_test"
echo "METRIC native_control_unit_interrupt_cancel_test=$native_control_unit_interrupt_cancel_test"
echo "METRIC native_control_unit_resume_test=$native_control_unit_resume_test"
echo "METRIC native_control_scorecard_unit_test_evidence=$native_control_scorecard_unit_test_evidence"
echo "METRIC native_control_findings_unit_test_evidence=$native_control_findings_unit_test_evidence"
echo "METRIC native_control_findings_audit_reference=$native_control_findings_audit_reference"
echo "METRIC native_control_scorecard_paid_caveat=$native_control_scorecard_paid_caveat"
echo "METRIC native_control_capture_paid_caveat=$native_control_capture_paid_caveat"
echo "METRIC native_control_manifest_cancel_current=$native_control_manifest_cancel_current"
echo "METRIC native_control_evidence_count_current=$native_control_evidence_count_current"
echo "METRIC native_control_test_rows=$native_control_test_rows"
echo "METRIC native_control_tests_verified=$native_control_tests_verified"
echo "METRIC native_background_live_capture_present=$native_background_live_capture_present"
echo "METRIC native_background_live_started=$native_background_live_started"
echo "METRIC native_background_live_control_hint=$native_background_live_control_hint"
echo "METRIC native_background_live_status_completed=$native_background_live_status_completed"
echo "METRIC native_background_live_read_tool=$native_background_live_read_tool"
echo "METRIC native_background_live_child_output=$native_background_live_child_output"
echo "METRIC native_background_live_child_tokens=$native_background_live_child_tokens"
echo "METRIC native_background_live_child_cost_cents=$native_background_live_child_cost_cents"
echo "METRIC native_background_live_parent_footer_cost_cents=$native_background_live_parent_footer_cost_cents"
echo "METRIC native_background_live_summaries_current=$native_background_live_summaries_current"
echo "METRIC native_background_live_rows=$native_background_live_rows"
echo "METRIC native_background_live_verified=$native_background_live_verified"
echo "METRIC native_background_interrupt_resume_capture_present=$native_background_interrupt_resume_capture_present"
echo "METRIC native_background_interrupt_resume_started=$native_background_interrupt_resume_started"
echo "METRIC native_background_interrupt_resume_interrupted=$native_background_interrupt_resume_interrupted"
echo "METRIC native_background_interrupt_resume_resumable=$native_background_interrupt_resume_resumable"
echo "METRIC native_background_interrupt_resume_resumed=$native_background_interrupt_resume_resumed"
echo "METRIC native_background_interrupt_resume_completed=$native_background_interrupt_resume_completed"
echo "METRIC native_background_interrupt_resume_child_output=$native_background_interrupt_resume_child_output"
echo "METRIC native_background_interrupt_resume_child_tokens=$native_background_interrupt_resume_child_tokens"
echo "METRIC native_background_interrupt_resume_child_cost_cents=$native_background_interrupt_resume_child_cost_cents"
echo "METRIC native_background_interrupt_resume_parent_footer_cost_cents=$native_background_interrupt_resume_parent_footer_cost_cents"
echo "METRIC native_background_interrupt_resume_summaries_current=$native_background_interrupt_resume_summaries_current"
echo "METRIC native_background_interrupt_resume_rows=$native_background_interrupt_resume_rows"
echo "METRIC native_background_interrupt_resume_verified=$native_background_interrupt_resume_verified"
echo "METRIC native_background_cancel_capture_present=$native_background_cancel_capture_present"
echo "METRIC native_background_cancel_started=$native_background_cancel_started"
echo "METRIC native_background_cancel_cancelled=$native_background_cancel_cancelled"
echo "METRIC native_background_cancel_worker_cancelled=$native_background_cancel_worker_cancelled"
echo "METRIC native_background_cancel_no_final_output=$native_background_cancel_no_final_output"
echo "METRIC native_background_cancel_no_read_after_cancel=$native_background_cancel_no_read_after_cancel"
echo "METRIC native_background_cancel_child_tokens=$native_background_cancel_child_tokens"
echo "METRIC native_background_cancel_child_cost_cents=$native_background_cancel_child_cost_cents"
echo "METRIC native_background_cancel_parent_footer_cost_cents=$native_background_cancel_parent_footer_cost_cents"
echo "METRIC native_background_cancel_summaries_current=$native_background_cancel_summaries_current"
echo "METRIC native_background_cancel_rows=$native_background_cancel_rows"
echo "METRIC native_background_cancel_verified=$native_background_cancel_verified"
echo "METRIC rerun_readme_commands_expected=$rerun_readme_commands_expected"
echo "METRIC rerun_readme_commands_present=$rerun_readme_commands_present"
echo "METRIC rerun_runbook_anchors_expected=$rerun_runbook_anchors_expected"
echo "METRIC rerun_runbook_anchors_present=$rerun_runbook_anchors_present"
echo "METRIC rerun_readme_removed_manager_probe=$rerun_readme_removed_manager_probe"
echo "METRIC rerun_readme_live_child_checker=$rerun_readme_live_child_checker"
echo "METRIC rerun_readme_write_generators=$rerun_readme_write_generators"
echo "METRIC rerun_handoff_review_checker=$rerun_handoff_review_checker"
echo "METRIC rerun_commands_verified=$rerun_commands_verified"
echo "METRIC eval_plan_currentness_rows=$eval_plan_currentness_rows"
echo "METRIC eval_plan_s01_native_live_child=$eval_plan_s01_native_live_child"
echo "METRIC eval_plan_s01_subagents_load_failure=$eval_plan_s01_subagents_load_failure"
echo "METRIC eval_plan_no_stale_no_live_child=$eval_plan_no_stale_no_live_child"
echo "METRIC eval_plan_runtime_caveat=$eval_plan_runtime_caveat"
echo "METRIC eval_plan_token_caveat=$eval_plan_token_caveat"
echo "METRIC eval_plan_s05_native_background_live=$eval_plan_s05_native_background_live"
echo "METRIC eval_plan_prior_extension_tmx_caveat=$eval_plan_prior_extension_tmx_caveat"
echo "METRIC eval_plan_summary_refs_current=$eval_plan_summary_refs_current"
echo "METRIC eval_plan_secondary_metrics_delegated=$eval_plan_secondary_metrics_delegated"
echo "METRIC eval_plan_currentness_verified=$eval_plan_currentness_verified"
echo "METRIC scorecard_template_rows=$scorecard_template_rows"
echo "METRIC scorecard_template_warning=$scorecard_template_warning"
echo "METRIC scorecard_template_current_columns=$scorecard_template_current_columns"
echo "METRIC scorecard_template_placeholder_rows=$scorecard_template_placeholder_rows"
echo "METRIC scorecard_template_no_stale_claims=$scorecard_template_no_stale_claims"
echo "METRIC scorecard_template_verified=$scorecard_template_verified"
echo "METRIC findings_template_headings_expected=$findings_template_headings_expected"
echo "METRIC findings_template_headings_present=$findings_template_headings_present"
echo "METRIC findings_template_warning=$findings_template_warning"
echo "METRIC findings_template_placeholder_count=$findings_template_placeholder_count"
echo "METRIC findings_template_no_stale_claims=$findings_template_no_stale_claims"
echo "METRIC findings_template_verified=$findings_template_verified"
echo "METRIC eval_design_prompt_warning=$eval_design_prompt_warning"
echo "METRIC eval_design_prompt_current_caveats_expected=$eval_design_prompt_current_caveats_expected"
echo "METRIC eval_design_prompt_current_caveats=$eval_design_prompt_current_caveats"
echo "METRIC eval_design_prompt_no_stale_lines=$eval_design_prompt_no_stale_lines"
echo "METRIC eval_design_prompt_verified=$eval_design_prompt_verified"
echo "METRIC artifact_index_required_files=$artifact_index_required_files"
echo "METRIC artifact_index_readme_required_present=$artifact_index_readme_required_present"
echo "METRIC artifact_index_readme_directory_entries=$artifact_index_readme_directory_entries"
echo "METRIC artifact_index_manifest_audited_expected=$artifact_index_manifest_audited_expected"
echo "METRIC artifact_index_manifest_audited_present=$artifact_index_manifest_audited_present"
echo "METRIC artifact_index_runbook_audited_expected=$artifact_index_runbook_audited_expected"
echo "METRIC artifact_index_runbook_audited_present=$artifact_index_runbook_audited_present"
echo "METRIC artifact_index_autoresearch_scope_expected=$artifact_index_autoresearch_scope_expected"
echo "METRIC artifact_index_autoresearch_scope_present=$artifact_index_autoresearch_scope_present"
echo "METRIC artifact_index_required_files_exist=$artifact_index_required_files_exist"
echo "METRIC artifact_index_markdown_rows=$artifact_index_markdown_rows"
echo "METRIC artifact_index_markdown_guardrail_split=$artifact_index_markdown_guardrail_split"
echo "METRIC artifact_index_autoresearch_scope_descriptions_current=$artifact_index_autoresearch_scope_descriptions_current"
echo "METRIC artifact_index_autoresearch_artifact_index_description_current=$artifact_index_autoresearch_artifact_index_description_current"
echo "METRIC artifact_index_autoresearch_capture_integrity_notes_current=$artifact_index_autoresearch_capture_integrity_notes_current"
echo "METRIC artifact_index_readme_scope_current=$artifact_index_readme_scope_current"
echo "METRIC artifact_index_readme_summary_current=$artifact_index_readme_summary_current"
echo "METRIC artifact_index_findings_scope_current=$artifact_index_findings_scope_current"
echo "METRIC artifact_index_runbook_section_current=$artifact_index_runbook_section_current"
echo "METRIC artifact_index_runbook_scope_current=$artifact_index_runbook_scope_current"
echo "METRIC artifact_index_autoresearch_notes_scope_current=$artifact_index_autoresearch_notes_scope_current"
echo "METRIC artifact_index_autoresearch_notes_current=$artifact_index_autoresearch_notes_current"
echo "METRIC artifact_index_autoresearch_readme_summary_note_current=$artifact_index_autoresearch_readme_summary_note_current"
echo "METRIC artifact_index_manifest_scope_current=$artifact_index_manifest_scope_current"
echo "METRIC artifact_index_handoff_scope_current=$artifact_index_handoff_scope_current"
echo "METRIC artifact_index_handoff_crossrefs_current=$artifact_index_handoff_crossrefs_current"
echo "METRIC artifact_index_verified=$artifact_index_verified"
echo "METRIC scenario_verdict_rows=$scenario_verdict_rows"
echo "METRIC scenario_verdict_current_live_rows=$scenario_verdict_current_live_rows"
echo "METRIC scenario_verdict_current_failure_rows=$scenario_verdict_current_failure_rows"
echo "METRIC scenario_verdict_prior_live_rows=$scenario_verdict_prior_live_rows"
echo "METRIC scenario_verdict_source_backed_rows=$scenario_verdict_source_backed_rows"
echo "METRIC scenario_verdict_unknown_rows=$scenario_verdict_unknown_rows"
echo "METRIC scenario_verdict_scorecard_prior_rows=$scenario_verdict_scorecard_prior_rows"
echo "METRIC scenario_verdict_scorecard_current_failure=$scenario_verdict_scorecard_current_failure"
echo "METRIC scenario_verdict_scorecard_native_live_child=$scenario_verdict_scorecard_native_live_child"
echo "METRIC scenario_verdict_findings_no_stale_false_claim=$scenario_verdict_findings_no_stale_false_claim"
echo "METRIC scenario_verdict_findings_one_tiny_live_claim=$scenario_verdict_findings_one_tiny_live_claim"
echo "METRIC scenario_verdict_findings_current_failure_claim=$scenario_verdict_findings_current_failure_claim"
echo "METRIC scenario_verdict_verified=$scenario_verdict_verified"
echo "METRIC source_runtime_extension_source_rows=$source_runtime_extension_source_rows"
echo "METRIC source_runtime_scorecard_rows_caveated=$source_runtime_scorecard_rows_caveated"
echo "METRIC source_runtime_manifest_rows_caveated=$source_runtime_manifest_rows_caveated"
echo "METRIC source_runtime_eval_plan_rows_caveated=$source_runtime_eval_plan_rows_caveated"
echo "METRIC source_runtime_eval_plan_global_caveat=$source_runtime_eval_plan_global_caveat"
echo "METRIC source_runtime_scenario_rule_caveat=$source_runtime_scenario_rule_caveat"
echo "METRIC source_runtime_boundary_verified=$source_runtime_boundary_verified"
echo "METRIC ideas_backlog_rows=$ideas_backlog_rows"
echo "METRIC ideas_backlog_required_classes_expected=$ideas_backlog_required_classes_expected"
echo "METRIC ideas_backlog_required_classes_present=$ideas_backlog_required_classes_present"
echo "METRIC ideas_backlog_final_handoff_markers_expected=$ideas_backlog_final_handoff_markers_expected"
echo "METRIC ideas_backlog_final_handoff_markers_present=$ideas_backlog_final_handoff_markers_present"
echo "METRIC ideas_backlog_stale_long_list_absent=$ideas_backlog_stale_long_list_absent"
echo "METRIC ideas_backlog_runbook_current=$ideas_backlog_runbook_current"
echo "METRIC ideas_backlog_verified=$ideas_backlog_verified"
echo "METRIC markdown_hygiene_files_checked=$markdown_hygiene_files_checked"
echo "METRIC markdown_hygiene_fused_table_rows=$markdown_hygiene_fused_table_rows"
echo "METRIC markdown_hygiene_fused_bullets=$markdown_hygiene_fused_bullets"
echo "METRIC markdown_hygiene_table_heading_joins=$markdown_hygiene_table_heading_joins"
echo "METRIC markdown_hygiene_runbook_current=$markdown_hygiene_runbook_current"
echo "METRIC markdown_hygiene_scope_docs_current=$markdown_hygiene_scope_docs_current"
echo "METRIC markdown_hygiene_verified=$markdown_hygiene_verified"
echo "METRIC capture_integrity_scorecard_rows=$capture_integrity_scorecard_rows"
echo "METRIC capture_integrity_expected_files=$capture_integrity_expected_files"
echo "METRIC capture_integrity_scorecard_files_covered=$capture_integrity_scorecard_files_covered"
echo "METRIC capture_integrity_files_present=$capture_integrity_files_present"
echo "METRIC capture_integrity_markers_expected=$capture_integrity_markers_expected"
echo "METRIC capture_integrity_markers_present=$capture_integrity_markers_present"
echo "METRIC capture_integrity_scope_current=$capture_integrity_scope_current"
echo "METRIC capture_integrity_runbook_current=$capture_integrity_runbook_current"
echo "METRIC capture_integrity_verified=$capture_integrity_verified"
echo "METRIC task_lifecycle_acceptance_rows=$task_lifecycle_acceptance_rows"
echo "METRIC task_lifecycle_native_fields_present=$task_lifecycle_native_fields_present"
echo "METRIC task_lifecycle_native_actions_present=$task_lifecycle_native_actions_present"
echo "METRIC task_lifecycle_native_statuses_present=$task_lifecycle_native_statuses_present"
echo "METRIC task_lifecycle_native_control_fields_present=$task_lifecycle_native_control_fields_present"
echo "METRIC task_lifecycle_native_control_actions_present=$task_lifecycle_native_control_actions_present"
echo "METRIC task_lifecycle_native_control_not_task_lifecycle=$task_lifecycle_native_control_not_task_lifecycle"
echo "METRIC task_lifecycle_native_absent=$task_lifecycle_native_absent"
echo "METRIC task_lifecycle_delegation_preserved=$task_lifecycle_delegation_preserved"
echo "METRIC task_lifecycle_extension_rows=$task_lifecycle_extension_rows"
echo "METRIC task_lifecycle_extension_management_actions=$task_lifecycle_extension_management_actions"
echo "METRIC task_lifecycle_extension_equivalent_absent=$task_lifecycle_extension_equivalent_absent"
echo "METRIC task_lifecycle_audit_verified=$task_lifecycle_audit_verified"
echo "METRIC handoff_review_required_audits_expected=$handoff_review_required_audits_expected"
echo "METRIC handoff_review_required_audits_present=$handoff_review_required_audits_present"
echo "METRIC handoff_review_current_prior_boundary=$handoff_review_current_prior_boundary"
echo "METRIC handoff_review_native_s05_boundary=$handoff_review_native_s05_boundary"
echo "METRIC handoff_review_pending_work_preserved=$handoff_review_pending_work_preserved"
echo "METRIC handoff_review_summary_refs_current=$handoff_review_summary_refs_current"
echo "METRIC handoff_review_purpose_scope_current=$handoff_review_purpose_scope_current"
echo "METRIC handoff_review_findings_scope_current=$handoff_review_findings_scope_current"
echo "METRIC handoff_review_latest_artifact_index_scope=$handoff_review_latest_artifact_index_scope"
echo "METRIC handoff_review_manifest_scope_current=$handoff_review_manifest_scope_current"
echo "METRIC handoff_review_manifest_full_scope_current=$handoff_review_manifest_full_scope_current"
echo "METRIC handoff_review_runbook_scope_current=$handoff_review_runbook_scope_current"
echo "METRIC handoff_review_verified=$handoff_review_verified"
echo "METRIC aggregate_gate_drift_guard=$aggregate_gate_drift_guard"

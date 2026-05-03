#!/usr/bin/env bash
set -euo pipefail

required_files=(README.md eval-plan.md runbook.md scorecard.md findings.md evidence-manifest.md command-surface.md token-evidence.md score-analysis.md findings-alignment.md live-child-output.md extension-load-audit.md task-lifecycle-audit.md isolation-proof.md source-probes.md)
required_file_count=0
for file in "${required_files[@]}"; do
  [[ -s "$file" ]] && ((required_file_count+=1))
done

bash_syntax_ok=1
for script in scripts/capture-startup.sh scripts/run-tmux-scenario.sh scripts/capture-source-probes.sh autoresearch.sh; do
  bash -n "$script" || bash_syntax_ok=0
done
python_syntax_ok=1
python3 -m py_compile scripts/check-scorecard-consistency.py scripts/check-findings-alignment.py scripts/check-command-surface.py scripts/check-live-child-output.py scripts/check-extension-load-audit.py scripts/check-task-lifecycle.py || python_syntax_ok=0

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
  && (( scorecard_numeric_native_wins == 7 )) \
  && (( scorecard_numeric_subagents_wins == 2 )) \
  && (( scorecard_numeric_ties == 0 )) \
  && (( scorecard_analysis_rows == 9 )) \
  && grep -Fq 'Numeric scenario wins: native=7, pi-subagents=2, tie=0.' score-analysis.md; then
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
extension_load_loader_jiti_verified=$(get_extension_load_metric extension_load_loader_jiti_verified)
extension_load_diagnosis_verified=$(get_extension_load_metric extension_load_diagnosis_verified)

task_lifecycle_output=$(python3 scripts/check-task-lifecycle.py)
get_task_lifecycle_metric() {
  local name="$1"
  printf '%s\n' "$task_lifecycle_output" | awk -F= -v key="$name" '$1 == key { print $2 }'
}
task_lifecycle_acceptance_rows=$(get_task_lifecycle_metric task_lifecycle_acceptance_rows)
task_lifecycle_native_fields_present=$(get_task_lifecycle_metric task_lifecycle_native_fields_present)
task_lifecycle_native_actions_present=$(get_task_lifecycle_metric task_lifecycle_native_actions_present)
task_lifecycle_native_statuses_present=$(get_task_lifecycle_metric task_lifecycle_native_statuses_present)
task_lifecycle_native_absent=$(get_task_lifecycle_metric task_lifecycle_native_absent)
task_lifecycle_delegation_preserved=$(get_task_lifecycle_metric task_lifecycle_delegation_preserved)
task_lifecycle_extension_rows=$(get_task_lifecycle_metric task_lifecycle_extension_rows)
task_lifecycle_extension_management_actions=$(get_task_lifecycle_metric task_lifecycle_extension_management_actions)
task_lifecycle_extension_equivalent_absent=$(get_task_lifecycle_metric task_lifecycle_extension_equivalent_absent)
task_lifecycle_audit_verified=$(get_task_lifecycle_metric task_lifecycle_audit_verified)

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
score=$((score + extension_load_loader_jiti_verified * 5))
score=$((score + extension_load_diagnosis_verified * 10))
score=$((score + $(cap "$task_lifecycle_acceptance_rows" 16)))
score=$((score + $(cap "$task_lifecycle_extension_rows" 12)))
score=$((score + task_lifecycle_native_absent * 10))
score=$((score + task_lifecycle_delegation_preserved * 8))
score=$((score + $(cap "$task_lifecycle_extension_management_actions" 9)))
score=$((score + task_lifecycle_extension_equivalent_absent * 10))
score=$((score + task_lifecycle_audit_verified * 12))

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
(( scorecard_numeric_native_wins == 7 )) || missing=1
(( scorecard_numeric_subagents_wins == 2 )) || missing=1
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
(( extension_load_audit_rows == 6 )) || missing=1
(( extension_load_runtime_error_files == 2 )) || missing=1
(( extension_load_module_format_error_files == 2 )) || missing=1
(( extension_load_manifest_verified == 1 )) || missing=1
(( extension_load_entry_default_export == 1 )) || missing=1
(( extension_load_entry_cjs_exports_absent == 1 )) || missing=1
(( extension_load_entry_top_level_await_absent == 1 )) || missing=1
(( extension_load_loader_jiti_verified == 1 )) || missing=1
(( extension_load_diagnosis_verified == 1 )) || missing=1
(( task_lifecycle_acceptance_rows == 16 )) || missing=1
(( task_lifecycle_native_fields_present == 0 )) || missing=1
(( task_lifecycle_native_actions_present == 0 )) || missing=1
(( task_lifecycle_native_statuses_present == 0 )) || missing=1
(( task_lifecycle_native_absent == 1 )) || missing=1
(( task_lifecycle_delegation_preserved == 1 )) || missing=1
(( task_lifecycle_extension_rows == 12 )) || missing=1
(( task_lifecycle_extension_management_actions >= 8 )) || missing=1
(( task_lifecycle_extension_equivalent_absent == 1 )) || missing=1
(( task_lifecycle_audit_verified == 1 )) || missing=1

if (( missing != 0 )); then
  echo "ERROR: required evidence incomplete" >&2
  echo "required_file_count=$required_file_count startup_captures=$startup_captures scenario_captures=$scenario_captures isolation_verified=$isolation_verified scorecard_rows_touched=$scorecard_rows_touched findings_sections_touched=$findings_sections_touched source_probe_coverage=$source_probe_coverage scorecard_evidence_rows=$scorecard_evidence_rows evidence_file_coverage=$evidence_file_coverage evidence_manifest_rows=$evidence_manifest_rows live_capture_links=$live_capture_links version_guard_verified=$version_guard_verified token_evidence_rows=$token_evidence_rows native_zero_cost_captures=$native_zero_cost_captures removed_command_token_captures=$removed_command_token_captures token_evidence_verified=$token_evidence_verified scorecard_numeric_rows=$scorecard_numeric_rows scorecard_numeric_cells=$scorecard_numeric_cells scorecard_average_consistency=$scorecard_average_consistency scorecard_numeric_native_wins=$scorecard_numeric_native_wins scorecard_numeric_subagents_wins=$scorecard_numeric_subagents_wins scorecard_analysis_rows=$scorecard_analysis_rows scorecard_analysis_verified=$scorecard_analysis_verified findings_alignment_rows=$findings_alignment_rows findings_alignment_aligned=$findings_alignment_aligned findings_alignment_exceptions=$findings_alignment_exceptions findings_alignment_conflicts=$findings_alignment_conflicts findings_alignment_verified=$findings_alignment_verified command_surface_rows=$command_surface_rows command_surface_verified=$command_surface_verified command_surface_subagents_runtime_loaded=$command_surface_subagents_runtime_loaded command_surface_subagents_runtime_load_failed=$command_surface_subagents_runtime_load_failed live_child_output_verified=$live_child_output_verified extension_load_diagnosis_verified=$extension_load_diagnosis_verified task_lifecycle_audit_verified=$task_lifecycle_audit_verified missing_evidence_paths=${missing_evidence_paths[*]-}" >&2
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
echo "METRIC extension_load_loader_jiti_verified=$extension_load_loader_jiti_verified"
echo "METRIC extension_load_diagnosis_verified=$extension_load_diagnosis_verified"
echo "METRIC task_lifecycle_acceptance_rows=$task_lifecycle_acceptance_rows"
echo "METRIC task_lifecycle_native_fields_present=$task_lifecycle_native_fields_present"
echo "METRIC task_lifecycle_native_actions_present=$task_lifecycle_native_actions_present"
echo "METRIC task_lifecycle_native_statuses_present=$task_lifecycle_native_statuses_present"
echo "METRIC task_lifecycle_native_absent=$task_lifecycle_native_absent"
echo "METRIC task_lifecycle_delegation_preserved=$task_lifecycle_delegation_preserved"
echo "METRIC task_lifecycle_extension_rows=$task_lifecycle_extension_rows"
echo "METRIC task_lifecycle_extension_management_actions=$task_lifecycle_extension_management_actions"
echo "METRIC task_lifecycle_extension_equivalent_absent=$task_lifecycle_extension_equivalent_absent"
echo "METRIC task_lifecycle_audit_verified=$task_lifecycle_audit_verified"

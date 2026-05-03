#!/usr/bin/env bash
set -euo pipefail

required_files=(README.md eval-plan.md runbook.md scorecard.md findings.md isolation-proof.md source-probes.md)
required_file_count=0
for file in "${required_files[@]}"; do
  [[ -s "$file" ]] && ((required_file_count+=1))
done

bash_syntax_ok=1
for script in scripts/capture-startup.sh scripts/run-tmux-scenario.sh scripts/capture-source-probes.sh autoresearch.sh; do
  bash -n "$script" || bash_syntax_ok=0
done

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

# Composite score rewards evidence completeness and isolation, capped to avoid padding.
cap() {
  local value="$1"
  local max="$2"
  if (( value > max )); then echo "$max"; else echo "$value"; fi
}

score=0
score=$((score + required_file_count * 4))
score=$((score + bash_syntax_ok * 8))
score=$((score + startup_captures * 6))
score=$((score + $(cap "$scenario_captures" 18) * 3))
score=$((score + isolation_verified * 30))
score=$((score + $(cap "$scorecard_rows_touched" 18) * 2))
score=$((score + $(cap "$findings_sections_touched" 9) * 3))
score=$((score + $(cap "$task_agent_coverage" 10) * 2))
score=$((score + $(cap "$source_probe_coverage" 12) * 2))
score=$((score + $(cap "$honest_limitations" 12)))

missing=0
(( required_file_count == ${#required_files[@]} )) || missing=1
(( bash_syntax_ok == 1 )) || missing=1
(( startup_captures == 2 )) || missing=1
(( scenario_captures >= 18 )) || missing=1
(( isolation_verified == 1 )) || missing=1
(( scorecard_rows_touched >= 18 )) || missing=1
(( findings_sections_touched >= 9 )) || missing=1
(( source_probe_coverage >= 10 )) || missing=1

if (( missing != 0 )); then
  echo "ERROR: required evidence incomplete" >&2
  echo "required_file_count=$required_file_count startup_captures=$startup_captures scenario_captures=$scenario_captures isolation_verified=$isolation_verified scorecard_rows_touched=$scorecard_rows_touched findings_sections_touched=$findings_sections_touched source_probe_coverage=$source_probe_coverage" >&2
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

#!/usr/bin/env bash
set -euo pipefail

required=(README.md eval-plan.md runbook.md scorecard-template.md findings-template.md)
required_files=0
for f in "${required[@]}"; do
  [[ -s "$f" ]] && required_files=$((required_files + 1))
done

scenario_count=$(grep -Ec '^\| [1-8] \|' eval-plan.md 2>/dev/null || true)
citation_count=$(grep -Eoc 'packages/coding-agent/|~/.pi/agent/|~/Projects/oss/|src/extension/|src/slash/|CHANGELOG.md|README.md' eval-plan.md 2>/dev/null || true)
script_count=0
for f in scripts/capture-startup.sh scripts/run-tmux-scenario.sh; do
  if [[ -s "$f" ]] && grep -q 'tmux' "$f" && grep -q 'set -euo pipefail' "$f"; then
    script_count=$((script_count + 1))
  fi
done

# 100-point completeness metric.
eval_score=0
eval_score=$((eval_score + required_files * 10))
if [[ "$scenario_count" -ge 8 ]]; then eval_score=$((eval_score + 20)); else eval_score=$((eval_score + scenario_count * 2)); fi
if [[ "$citation_count" -ge 20 ]]; then eval_score=$((eval_score + 20)); else eval_score=$((eval_score + citation_count)); fi
eval_score=$((eval_score + script_count * 5))

printf 'METRIC eval_score=%s\n' "$eval_score"
printf 'METRIC required_files=%s\n' "$required_files"
printf 'METRIC scenario_count=%s\n' "$scenario_count"
printf 'METRIC citation_count=%s\n' "$citation_count"
printf 'METRIC script_count=%s\n' "$script_count"

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

cache_field_count=$(grep -Eoh 'cache creation|cache read|uncached input|output tokens|cache hit' scorecard-template.md findings-template.md runbook.md 2>/dev/null | wc -l | tr -d ' ')
runbook_cache_mentions=$(grep -Eoh 'claude-bridge|Claude Bridge|Anthropic|cache' runbook.md 2>/dev/null | wc -l | tr -d ' ')

executable_scripts=0
for f in scripts/capture-startup.sh scripts/run-tmux-scenario.sh; do
  [[ -x "$f" ]] && executable_scripts=$((executable_scripts + 1))
done

table_header_count=$(grep -Eh '^\| .*\|$' scorecard-template.md findings-template.md 2>/dev/null | wc -l | tr -d ' ')

# 130-point validation metric. Completeness plus runnable/consistent artifacts.
validation_score=0
validation_score=$((validation_score + required_files * 10))
if [[ "$scenario_count" -ge 8 ]]; then validation_score=$((validation_score + 20)); else validation_score=$((validation_score + scenario_count * 2)); fi
if [[ "$citation_count" -ge 20 ]]; then validation_score=$((validation_score + 20)); else validation_score=$((validation_score + citation_count)); fi
validation_score=$((validation_score + script_count * 5))
if [[ "$cache_field_count" -ge 10 ]]; then validation_score=$((validation_score + 15)); else validation_score=$((validation_score + cache_field_count)); fi
if [[ "$runbook_cache_mentions" -ge 4 ]]; then validation_score=$((validation_score + 5)); else validation_score=$((validation_score + runbook_cache_mentions)); fi
validation_score=$((validation_score + executable_scripts * 5))
if [[ "$table_header_count" -ge 6 ]]; then validation_score=$((validation_score + 10)); else validation_score=$((validation_score + table_header_count)); fi

printf 'METRIC validation_score=%s\n' "$validation_score"
printf 'METRIC required_files=%s\n' "$required_files"
printf 'METRIC scenario_count=%s\n' "$scenario_count"
printf 'METRIC citation_count=%s\n' "$citation_count"
printf 'METRIC script_count=%s\n' "$script_count"
printf 'METRIC cache_field_count=%s\n' "$cache_field_count"
printf 'METRIC runbook_cache_mentions=%s\n' "$runbook_cache_mentions"
printf 'METRIC executable_scripts=%s\n' "$executable_scripts"
printf 'METRIC table_header_count=%s\n' "$table_header_count"

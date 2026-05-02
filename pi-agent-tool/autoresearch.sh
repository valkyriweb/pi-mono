#!/usr/bin/env bash
set -euo pipefail

required=(README.md eval-plan.md runbook.md scorecard-template.md findings-template.md)
required_files=0
for f in "${required[@]}"; do
  [[ -s "$f" ]] && required_files=$((required_files + 1))
done

scenario_count=$(grep -Ec '^\| [1-8] \|' eval-plan.md 2>/dev/null || true)
citation_count=$(grep -Eoh 'packages/coding-agent/|~/.pi/agent/|~/Projects/oss/|src/extension/|src/slash/|CHANGELOG.md|README.md' eval-plan.md 2>/dev/null | wc -l | tr -d ' ')
cache_field_count=$(grep -Eoh 'cache creation|cache read|uncached input|output tokens|cache hit' scorecard-template.md findings-template.md runbook.md 2>/dev/null | wc -l | tr -d ' ')

executable_scripts=0
bash_syntax_ok=1
for f in scripts/capture-startup.sh scripts/run-tmux-scenario.sh; do
  [[ -x "$f" ]] && executable_scripts=$((executable_scripts + 1))
  bash -n "$f" >/dev/null 2>&1 || bash_syntax_ok=0
done
bash -n autoresearch.sh >/dev/null 2>&1 || bash_syntax_ok=0

table_consistency_ok=1
while IFS= read -r table_file; do
  awk '
    /^\|/ {
      cols=gsub(/\|/, "&")
      if (!in_table) { expected = cols; in_table = 1 }
      if (cols != expected) bad = 1
      next
    }
    { in_table = 0; expected = 0 }
    END { exit bad ? 1 : 0 }
  ' "$table_file" || table_consistency_ok=0
done <<'FILES'
scorecard-template.md
findings-template.md
FILES

tmux_available=0
command -v tmux >/dev/null 2>&1 && tmux_available=1
launcher_available=0
if [[ -x ../pi-test.sh ]] || command -v pi >/dev/null 2>&1; then
  launcher_available=1
fi

local_launcher_refs=$(grep -Eoh 'pi-test\.sh|launcher=' scripts/capture-startup.sh scripts/run-tmux-scenario.sh 2>/dev/null | wc -l | tr -d ' ')

launcher_score=0
launcher_score=$((launcher_score + required_files * 10))
if [[ "$scenario_count" -ge 8 ]]; then launcher_score=$((launcher_score + 15)); else launcher_score=$((launcher_score + scenario_count)); fi
if [[ "$citation_count" -ge 20 ]]; then launcher_score=$((launcher_score + 15)); else launcher_score=$((launcher_score + citation_count / 2)); fi
if [[ "$cache_field_count" -ge 10 ]]; then launcher_score=$((launcher_score + 10)); else launcher_score=$((launcher_score + cache_field_count)); fi
launcher_score=$((launcher_score + executable_scripts * 5))
[[ "$bash_syntax_ok" -eq 1 ]] && launcher_score=$((launcher_score + 10))
[[ "$table_consistency_ok" -eq 1 ]] && launcher_score=$((launcher_score + 10))
[[ "$tmux_available" -eq 1 ]] && launcher_score=$((launcher_score + 5))
[[ "$launcher_available" -eq 1 ]] && launcher_score=$((launcher_score + 5))
if [[ "$local_launcher_refs" -ge 4 ]]; then launcher_score=$((launcher_score + 10)); else launcher_score=$((launcher_score + local_launcher_refs * 2)); fi

printf 'METRIC launcher_score=%s\n' "$launcher_score"
printf 'METRIC required_files=%s\n' "$required_files"
printf 'METRIC scenario_count=%s\n' "$scenario_count"
printf 'METRIC citation_count=%s\n' "$citation_count"
printf 'METRIC cache_field_count=%s\n' "$cache_field_count"
printf 'METRIC executable_scripts=%s\n' "$executable_scripts"
printf 'METRIC bash_syntax_ok=%s\n' "$bash_syntax_ok"
printf 'METRIC table_consistency_ok=%s\n' "$table_consistency_ok"
printf 'METRIC tmux_available=%s\n' "$tmux_available"
printf 'METRIC launcher_available=%s\n' "$launcher_available"
printf 'METRIC local_launcher_refs=%s\n' "$local_launcher_refs"

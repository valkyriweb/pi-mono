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

smoke_score=0
smoke_score=$((smoke_score + required_files * 10))
if [[ "$scenario_count" -ge 8 ]]; then smoke_score=$((smoke_score + 15)); else smoke_score=$((smoke_score + scenario_count)); fi
if [[ "$citation_count" -ge 20 ]]; then smoke_score=$((smoke_score + 15)); else smoke_score=$((smoke_score + citation_count / 2)); fi
if [[ "$cache_field_count" -ge 10 ]]; then smoke_score=$((smoke_score + 10)); else smoke_score=$((smoke_score + cache_field_count)); fi
smoke_score=$((smoke_score + executable_scripts * 5))
[[ "$bash_syntax_ok" -eq 1 ]] && smoke_score=$((smoke_score + 10))
[[ "$table_consistency_ok" -eq 1 ]] && smoke_score=$((smoke_score + 10))
[[ "$tmux_available" -eq 1 ]] && smoke_score=$((smoke_score + 5))
[[ "$launcher_available" -eq 1 ]] && smoke_score=$((smoke_score + 5))

printf 'METRIC smoke_score=%s\n' "$smoke_score"
printf 'METRIC required_files=%s\n' "$required_files"
printf 'METRIC scenario_count=%s\n' "$scenario_count"
printf 'METRIC citation_count=%s\n' "$citation_count"
printf 'METRIC cache_field_count=%s\n' "$cache_field_count"
printf 'METRIC executable_scripts=%s\n' "$executable_scripts"
printf 'METRIC bash_syntax_ok=%s\n' "$bash_syntax_ok"
printf 'METRIC table_consistency_ok=%s\n' "$table_consistency_ok"
printf 'METRIC tmux_available=%s\n' "$tmux_available"
printf 'METRIC launcher_available=%s\n' "$launcher_available"

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

before_sessions=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -c '^pi-agent-eval-' || true)
dry_run_ok=0
if PI_AGENT_EVAL_DRY_RUN=1 scripts/capture-startup.sh native 2>/dev/null | grep -q '^DRY_RUN cd '; then
  if PI_AGENT_EVAL_DRY_RUN=1 scripts/run-tmux-scenario.sh dry-run-test '/agents' 2>/dev/null | grep -q '^DRY_RUN prompt=/agents'; then
    dry_run_ok=1
  fi
fi
after_sessions=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -c '^pi-agent-eval-' || true)
dry_run_no_leak=0
if [[ "$before_sessions" -eq "$after_sessions" ]]; then
  dry_run_no_leak=1
fi

base_score=0
base_score=$((base_score + required_files * 10))
if [[ "$scenario_count" -ge 8 ]]; then base_score=$((base_score + 15)); else base_score=$((base_score + scenario_count)); fi
if [[ "$citation_count" -ge 20 ]]; then base_score=$((base_score + 15)); else base_score=$((base_score + citation_count / 2)); fi
if [[ "$cache_field_count" -ge 10 ]]; then base_score=$((base_score + 10)); else base_score=$((base_score + cache_field_count)); fi
base_score=$((base_score + executable_scripts * 5))
[[ "$bash_syntax_ok" -eq 1 ]] && base_score=$((base_score + 10))
[[ "$table_consistency_ok" -eq 1 ]] && base_score=$((base_score + 10))
[[ "$tmux_available" -eq 1 ]] && base_score=$((base_score + 5))
[[ "$launcher_available" -eq 1 ]] && base_score=$((base_score + 5))
if [[ "$local_launcher_refs" -ge 4 ]]; then base_score=$((base_score + 10)); else base_score=$((base_score + local_launcher_refs * 2)); fi

dry_run_doc_refs=$(grep -Eoh 'PI_AGENT_EVAL_DRY_RUN|smoke-check|dry-run' README.md runbook.md 2>/dev/null | wc -l | tr -d ' ')

dry_run_leak_score=$base_score
[[ "$dry_run_ok" -eq 1 ]] && dry_run_leak_score=$((dry_run_leak_score + 10))
if [[ "$dry_run_doc_refs" -ge 4 ]]; then dry_run_leak_score=$((dry_run_leak_score + 10)); else dry_run_leak_score=$((dry_run_leak_score + dry_run_doc_refs * 2)); fi
[[ "$dry_run_no_leak" -eq 1 ]] && dry_run_leak_score=$((dry_run_leak_score + 10))

printf 'METRIC dry_run_leak_score=%s\n' "$dry_run_leak_score"
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
printf 'METRIC dry_run_ok=%s\n' "$dry_run_ok"
printf 'METRIC dry_run_doc_refs=%s\n' "$dry_run_doc_refs"
printf 'METRIC dry_run_no_leak=%s\n' "$dry_run_no_leak"

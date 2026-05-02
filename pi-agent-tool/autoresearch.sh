#!/usr/bin/env bash
set -euo pipefail

max_iterations=0
if [[ -s autoresearch.config.json ]]; then
  max_iterations=$(python3 - <<'PY'
import json
try:
    with open('autoresearch.config.json') as f:
        print(int(json.load(f).get('maxIterations', 0)))
except Exception:
    print(0)
PY
)
fi

mkdir -p captures
if [[ ! -s captures/native-startup.txt ]]; then
  ./scripts/capture-startup.sh native >/dev/null
fi
if [[ ! -s captures/subagents-startup.txt ]]; then
  ./scripts/capture-startup.sh subagents >/dev/null
fi

startup_captures=0
for f in captures/native-startup.txt captures/subagents-startup.txt; do
  if [[ -s "$f" ]] && grep -q 'Startup capture:' "$f"; then
    startup_captures=$((startup_captures + 1))
  fi
done

scenario_captures=$(find captures -maxdepth 1 -type f \( -name 'native-s*.txt' -o -name 'subagents-s*.txt' \) 2>/dev/null | wc -l | tr -d ' ')
scorecard_rows_touched=$(grep -Ec '\| S[0-9][0-9] .*\| (native|pi-subagents) \| [^ ]' scorecard-template.md 2>/dev/null || true)
findings_sections_touched=$(grep -Ec '^- (Native|`pi-subagents`|Winner|Evidence): .+' findings-template.md 2>/dev/null || true)
timestamp_syntax_ok=0
if grep -q "date -u '+%Y-%m-%dT%H:%M:%SZ'" scripts/capture-startup.sh scripts/run-tmux-scenario.sh; then
  if ! grep -q 'date -Is' scripts/capture-startup.sh scripts/run-tmux-scenario.sh; then
    timestamp_syntax_ok=1
  fi
fi

actual_eval_score=0
actual_eval_score=$((actual_eval_score + startup_captures * 20))
if [[ "$scenario_captures" -ge 16 ]]; then actual_eval_score=$((actual_eval_score + 80)); else actual_eval_score=$((actual_eval_score + scenario_captures * 5)); fi
if [[ "$scorecard_rows_touched" -ge 16 ]]; then actual_eval_score=$((actual_eval_score + 40)); else actual_eval_score=$((actual_eval_score + scorecard_rows_touched * 2)); fi
if [[ "$findings_sections_touched" -ge 32 ]]; then actual_eval_score=$((actual_eval_score + 40)); else actual_eval_score=$((actual_eval_score + findings_sections_touched)); fi
if [[ "$max_iterations" -ge 60 ]]; then actual_eval_score=$((actual_eval_score + 10)); fi
[[ "$timestamp_syntax_ok" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))

printf 'METRIC actual_eval_score=%s\n' "$actual_eval_score"
printf 'METRIC startup_captures=%s\n' "$startup_captures"
printf 'METRIC scenario_captures=%s\n' "$scenario_captures"
printf 'METRIC scorecard_rows_touched=%s\n' "$scorecard_rows_touched"
printf 'METRIC findings_sections_touched=%s\n' "$findings_sections_touched"
printf 'METRIC timestamp_syntax_ok=%s\n' "$timestamp_syntax_ok"
printf 'METRIC max_iterations=%s\n' "$max_iterations"

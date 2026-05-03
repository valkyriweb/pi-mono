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
if [[ ! -s captures/native-s07-ui-manager.txt ]]; then
  ./scripts/run-tmux-scenario.sh native-s07-ui-manager '/agents' >/dev/null
fi
if [[ ! -s captures/subagents-s07-ui-manager.txt ]]; then
  ./scripts/run-tmux-scenario.sh subagents-s07-ui-manager '/subagents' >/dev/null
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
task_agent_tool_included=0
if grep -Eq '\| 9 \| Updated task agent tool|S09.*Updated task agent tool' eval-plan.md && grep -q 'S09 task agent tool' scorecard-template.md && grep -q 'S09 Updated task agent tool' findings-template.md; then
  task_agent_tool_included=1
fi
task_agent_acceptance_rows=$(grep -Ec '^\| (Non-spawn action discriminator|Create task action|List task action|Get task action|Update task action|Delete semantics|Delegation compatibility|Honest comparison note) \|' findings-template.md 2>/dev/null || true)
task_agent_readme_mention=0
if grep -q 'S09.*updated native task-agent tool' README.md && grep -q '`action`/`taskId`' README.md; then
  task_agent_readme_mention=1
fi
task_agent_source_probe=0
task_agent_source_probe_strict=0
if [[ -f ../packages/coding-agent/src/core/tools/agent.ts ]]; then
  task_agent_source_probe_strict=1
  if grep -E 'Type\.Literal\("(create|list|get|update)"\)|action.*Type|taskId' ../packages/coding-agent/src/core/tools/agent.ts >/dev/null 2>&1; then
    task_agent_source_probe=2
  else
    task_agent_source_probe=1
  fi
fi
task_agent_probe_command_recorded=0
if grep -q 'Probe command: `grep -E "action|taskId|create|list|get|update" packages/coding-agent/src/core/tools/agent.ts`' captures/native-s09-task-agent-tool.txt; then
  task_agent_probe_command_recorded=1
fi
subagents_task_probe_command_recorded=0
if grep -q 'Probe command: `grep -R -E "taskId|TaskList|TaskCreate|metadata|blockedBy|status.*completed" ~/.pi/agent/git/github.com/nicobailon/pi-subagents/src`' captures/subagents-s09-task-agent-tool.txt; then
  subagents_task_probe_command_recorded=1
fi
subagents_task_source_probe=0
subagents_src="$HOME/.pi/agent/git/github.com/nicobailon/pi-subagents/src"
if [[ -d "$subagents_src" ]]; then
  if grep -R -E 'TaskList|TaskCreate|(^|[^A-Za-z0-9_])taskId([^A-Za-z0-9_]|$)|blockedBy' "$subagents_src" >/dev/null 2>&1; then
    subagents_task_source_probe=2
  else
    subagents_task_source_probe=1
  fi
fi
task_agent_pass_criteria=0
if grep -q '### S09 task-agent pass criteria' eval-plan.md \
  && grep -q 'non-spawn action discriminator' eval-plan.md \
  && grep -q 'create/list/get/update task lifecycle actions' eval-plan.md \
  && grep -q 'single/parallel/chain delegation still works unchanged' eval-plan.md; then
  task_agent_pass_criteria=1
fi
task_agent_runbook_probes=0
if grep -q 'grep -E "action|taskId|create|list|get|update" packages/coding-agent/src/core/tools/agent.ts' runbook.md \
  && grep -q 'grep -R -E "taskId|TaskList|TaskCreate|metadata|blockedBy|status.*completed" ~/.pi/agent/git/github.com/nicobailon/pi-subagents/src' runbook.md; then
  task_agent_runbook_probes=1
fi
task_agent_runbook_lifecycle=0
if grep -q '"action":"create"' runbook.md \
  && grep -q '"action":"list"' runbook.md \
  && grep -q '"action":"get"' runbook.md \
  && grep -q '"status":"in_progress"' runbook.md \
  && grep -q '"status":"completed"' runbook.md; then
  task_agent_runbook_lifecycle=1
fi
task_agent_runbook_delete=0
if grep -q '"status":"deleted"' runbook.md && grep -q 'delete semantics' runbook.md; then
  task_agent_runbook_delete=1
fi
task_agent_honest_verdicts=0
if grep -q 'implementation evidence is pending/absent' captures/native-s09-task-agent-tool.txt \
  && grep -q 'does not replace a native Claude-style task-management action surface' captures/subagents-s09-task-agent-tool.txt; then
  task_agent_honest_verdicts=1
fi
task_agent_scorecard_honest=0
if grep -q 'current `agent.ts` checkout does not yet expose `action`/`taskId`' scorecard-template.md \
  && grep -q 'no general Claude-style task-list action surface found' scorecard-template.md; then
  task_agent_scorecard_honest=1
fi
task_agent_final_recommendation=0
if grep -q 'include the updated task-agent action surface in the acceptance gate before declaring parity' findings-template.md \
  && grep -q 'adding Claude-style task lifecycle actions' findings-template.md; then
  task_agent_final_recommendation=1
fi
evidence_quality_notes=$(grep -Ec '^\| (Startup captures|Scenario capture files|Source-backed feature checks|Interactive UI manager capture|Token/cache/accounting|Token/cache accounting) \|' findings-template.md 2>/dev/null || true)
nonempty_evidence_files=$(find captures -maxdepth 1 -type f \( -name 'native-*.txt' -o -name 'subagents-*.txt' \) -size +0c 2>/dev/null | wc -l | tr -d ' ')
ui_limitation_ack=0
if grep -q 'S07 captures show submitted slash commands but no rendered manager UI' findings-template.md; then
  ui_limitation_ack=1
fi
scenario_manifest_rows=$(grep -Ec '^\| S[0-9][0-9] \| `captures/native-s[0-9][0-9]-[^`]+\.txt` \| `captures/subagents-s[0-9][0-9]-[^`]+\.txt` \|' findings-template.md 2>/dev/null || true)
score_summary_metrics=$(python3 - <<'PY'
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
scorecard = Path('scorecard-template.md').read_text()
findings = Path('findings-template.md').read_text()
rows = []
for line in scorecard.splitlines():
    if not re.match(r'^\| S[0-9][0-9] ', line):
        continue
    cells = [cell.strip() for cell in line.strip('|').split('|')]
    if len(cells) < 8:
        continue
    arm = cells[1]
    scores = [float(cells[i]) for i in range(2, 8)]
    rows.append((arm, scores))
expected = {}
def round_one(value):
    return float(Decimal(str(value)).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))

for arm in ('native', 'pi-subagents'):
    arm_rows = [scores for row_arm, scores in rows if row_arm == arm]
    expected[arm] = [round_one(sum(col) / len(col)) for col in zip(*arm_rows)]
actual = {}
for line in findings.splitlines():
    if line.startswith('| Native |') or line.startswith('| `pi-subagents` |'):
        cells = [cell.strip().strip('`') for cell in line.strip('|').split('|')]
        actual[cells[0].lower()] = [float(cells[i]) for i in range(1, 7)]
print(f"{1 if expected == actual else 0} {len(rows)}")
PY
)
score_summary_math_ok=${score_summary_metrics%% *}
score_summary_rows_count=${score_summary_metrics##* }
timestamp_syntax_ok=0
if grep -q "date -u '+%Y-%m-%dT%H:%M:%SZ'" scripts/capture-startup.sh scripts/run-tmux-scenario.sh; then
  if ! grep -q 'date -Is' scripts/capture-startup.sh scripts/run-tmux-scenario.sh; then
    timestamp_syntax_ok=1
  fi
fi

actual_eval_score=0
actual_eval_score=$((actual_eval_score + startup_captures * 20))
if [[ "$scenario_captures" -ge 18 ]]; then actual_eval_score=$((actual_eval_score + 90)); else actual_eval_score=$((actual_eval_score + scenario_captures * 5)); fi
if [[ "$scorecard_rows_touched" -ge 18 ]]; then actual_eval_score=$((actual_eval_score + 45)); else actual_eval_score=$((actual_eval_score + scorecard_rows_touched * 2)); fi
if [[ "$findings_sections_touched" -ge 32 ]]; then actual_eval_score=$((actual_eval_score + 40)); else actual_eval_score=$((actual_eval_score + findings_sections_touched)); fi
if [[ "$max_iterations" -ge 60 ]]; then actual_eval_score=$((actual_eval_score + 10)); fi
[[ "$timestamp_syntax_ok" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
if [[ "$evidence_quality_notes" -ge 5 ]]; then actual_eval_score=$((actual_eval_score + 15)); else actual_eval_score=$((actual_eval_score + evidence_quality_notes * 3)); fi
if [[ "$nonempty_evidence_files" -ge 20 ]]; then actual_eval_score=$((actual_eval_score + 10)); fi
[[ "$ui_limitation_ack" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 5))
if [[ "$scenario_manifest_rows" -ge 9 ]]; then actual_eval_score=$((actual_eval_score + 20)); else actual_eval_score=$((actual_eval_score + scenario_manifest_rows * 2)); fi
[[ "$score_summary_math_ok" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 15))
if [[ "$score_summary_rows_count" -ge 18 ]]; then actual_eval_score=$((actual_eval_score + 10)); fi
[[ "$task_agent_tool_included" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 20))
if [[ "$task_agent_acceptance_rows" -ge 8 ]]; then actual_eval_score=$((actual_eval_score + 20)); else actual_eval_score=$((actual_eval_score + task_agent_acceptance_rows * 2)); fi
[[ "$task_agent_readme_mention" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
if [[ "$task_agent_source_probe" -ge 1 ]]; then actual_eval_score=$((actual_eval_score + 10)); fi
if [[ "$task_agent_source_probe" -eq 2 ]]; then actual_eval_score=$((actual_eval_score + 20)); fi
[[ "$task_agent_source_probe_strict" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$task_agent_probe_command_recorded" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$subagents_task_probe_command_recorded" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
if [[ "$subagents_task_source_probe" -ge 1 ]]; then actual_eval_score=$((actual_eval_score + 10)); fi
[[ "$task_agent_pass_criteria" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$task_agent_runbook_probes" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$task_agent_runbook_lifecycle" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$task_agent_runbook_delete" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$task_agent_honest_verdicts" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$task_agent_scorecard_honest" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))
[[ "$task_agent_final_recommendation" -eq 1 ]] && actual_eval_score=$((actual_eval_score + 10))

printf 'METRIC actual_eval_score=%s\n' "$actual_eval_score"
printf 'METRIC startup_captures=%s\n' "$startup_captures"
printf 'METRIC scenario_captures=%s\n' "$scenario_captures"
printf 'METRIC scorecard_rows_touched=%s\n' "$scorecard_rows_touched"
printf 'METRIC findings_sections_touched=%s\n' "$findings_sections_touched"
printf 'METRIC task_agent_tool_included=%s\n' "$task_agent_tool_included"
printf 'METRIC task_agent_acceptance_rows=%s\n' "$task_agent_acceptance_rows"
printf 'METRIC task_agent_readme_mention=%s\n' "$task_agent_readme_mention"
printf 'METRIC task_agent_source_probe=%s\n' "$task_agent_source_probe"
printf 'METRIC task_agent_source_probe_strict=%s\n' "$task_agent_source_probe_strict"
printf 'METRIC task_agent_probe_command_recorded=%s\n' "$task_agent_probe_command_recorded"
printf 'METRIC subagents_task_probe_command_recorded=%s\n' "$subagents_task_probe_command_recorded"
printf 'METRIC subagents_task_source_probe=%s\n' "$subagents_task_source_probe"
printf 'METRIC task_agent_pass_criteria=%s\n' "$task_agent_pass_criteria"
printf 'METRIC task_agent_runbook_probes=%s\n' "$task_agent_runbook_probes"
printf 'METRIC task_agent_runbook_lifecycle=%s\n' "$task_agent_runbook_lifecycle"
printf 'METRIC task_agent_runbook_delete=%s\n' "$task_agent_runbook_delete"
printf 'METRIC task_agent_honest_verdicts=%s\n' "$task_agent_honest_verdicts"
printf 'METRIC task_agent_scorecard_honest=%s\n' "$task_agent_scorecard_honest"
printf 'METRIC task_agent_final_recommendation=%s\n' "$task_agent_final_recommendation"
printf 'METRIC evidence_quality_notes=%s\n' "$evidence_quality_notes"
printf 'METRIC nonempty_evidence_files=%s\n' "$nonempty_evidence_files"
printf 'METRIC ui_limitation_ack=%s\n' "$ui_limitation_ack"
printf 'METRIC scenario_manifest_rows=%s\n' "$scenario_manifest_rows"
printf 'METRIC score_summary_math_ok=%s\n' "$score_summary_math_ok"
printf 'METRIC score_summary_rows_count=%s\n' "$score_summary_rows_count"
printf 'METRIC timestamp_syntax_ok=%s\n' "$timestamp_syntax_ok"
printf 'METRIC max_iterations=%s\n' "$max_iterations"

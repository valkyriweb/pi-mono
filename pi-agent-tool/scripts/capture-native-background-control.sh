#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$root/.." && pwd)"
out_dir="$root/captures"
mkdir -p "$out_dir"

name="native-s05-background-control-live"
out="$out_dir/${name}.txt"
prompt='Use the native agent tool directly with background:true to run scout. Task: Read pi-agent-tool/README.md and reply BACKGROUND_PROBE_OK plus exactly one artifact filename from Fresh artifacts. Keep under 25 words. Do not modify files.'
launch_command="cd $(printf '%q' "$repo") && PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0 $(printf '%q ' "$repo/pi-test.sh" --no-session --no-extensions --tools agent,read,grep,find,ls --thinking off)"
session="pi-agent-eval-${name}-$$"

if [[ "${PI_AGENT_EVAL_DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN $launch_command"
  echo "DRY_RUN prompt=$prompt"
  exit 0
fi

cleanup() {
  tmux kill-session -t "$session" 2>/dev/null || true
}
trap cleanup EXIT

tmux new-session -d -s "$session" -x 120 -y 40
tmux set-option -t "$session" history-limit 5000 >/dev/null
tmux send-keys -t "$session" "$launch_command" Enter
sleep "${PI_AGENT_EVAL_STARTUP_WAIT:-7}"
tmux send-keys -t "$session" "$prompt" Enter
sleep "${PI_AGENT_EVAL_BACKGROUND_START_WAIT:-30}"

start_capture="$(tmux capture-pane -t "$session" -p -S -260)"
run_id="$(printf '%s\n' "$start_capture" | grep -Eo 'agent-[0-9]+' | tail -1 || true)"
if [[ -n "$run_id" ]]; then
  tmux send-keys -t "$session" "/agents-status $run_id" Enter
  sleep "${PI_AGENT_EVAL_STATUS_WAIT:-8}"
fi

{
  echo "# Scenario capture: $name"
  echo "# mode: native"
  echo "# prompt: $prompt"
  echo "# $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "# launch: $launch_command"
  echo "# parsed_run_id: ${run_id:-missing}"
  echo
  tmux capture-pane -t "$session" -p -S -320
} > "$out"

if [[ -z "$run_id" ]]; then
  echo "missing background run id; wrote $out" >&2
  exit 1
fi

session_root="$HOME/.pi/agent/sessions/--Users-luke-Projects-personal-pi-mono-fork--"
session_path=""
if [[ -d "$session_root" ]]; then
  session_path="$(
    find "$session_root" -type f -name '*.jsonl' -mmin -15 -print0 \
      | while IFS= read -r -d '' file; do
          if grep -q 'BACKGROUND_PROBE_OK' "$file" 2>/dev/null; then
            stat -f '%m %N' "$file"
          fi
        done \
      | sort -nr \
      | head -1 \
      | cut -d ' ' -f2-
  )"
fi
if [[ -n "$session_path" && -s "$session_path" ]]; then
  python3 - <<'PY' "$session_path" "$out"
from __future__ import annotations

import json
import sys
from pathlib import Path

session = Path(sys.argv[1])
capture = Path(sys.argv[2])
assistant_text = ""
tool_call = ""
usage_line = ""
for line in session.read_text(errors="ignore").splitlines():
    data = json.loads(line)
    msg = data.get("message", {})
    if msg.get("role") != "assistant":
        continue
    for part in msg.get("content", []):
        if part.get("type") == "toolCall" and part.get("name") == "read":
            tool_call = f"read {part.get('arguments')}"
        if part.get("type") == "text" and "BACKGROUND_PROBE_OK" in part.get("text", ""):
            assistant_text = part["text"]
    usage = msg.get("usage") or {}
    cost = usage.get("cost") or {}
    if usage.get("totalTokens") and cost.get("total") is not None:
        usage_line = f"usage: {usage['totalTokens']} tok cache r/w {usage.get('cacheRead', 0)}/{usage.get('cacheWrite', 0)} ${cost['total']:.4f}"
append = f"""

# Child session evidence
# child_session_path: {session}
{tool_call}
assistant_output: {assistant_text}
{usage_line}
"""
capture.write_text(capture.read_text(errors="ignore").rstrip() + append)
PY
fi

echo "Wrote $out ($run_id)"

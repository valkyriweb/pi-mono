#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$root/.." && pwd)"
out_dir="$root/captures"
mkdir -p "$out_dir"

name="native-s05-background-cancel-live"
out="$out_dir/${name}.txt"
prompt="Use the native agent tool directly with background:true to run worker. Task for worker: first call the bash tool with command 'sleep 45', then read pi-agent-tool/README.md and reply CANCEL_PROBE_SHOULD_NOT_APPEAR. After the background tool returns the run id, reply only STARTED <run-id>; do not wait, poll, or check status."
launch_command="cd $(printf '%q' "$repo") && PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0 $(printf '%q ' "$repo/pi-test.sh" --no-session --no-extensions --tools agent,bash,read,grep,find,ls --thinking off)"
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

capture_epoch="$(date +%s)"

tmux new-session -d -s "$session" -x 120 -y 40
tmux set-option -t "$session" history-limit 8000 >/dev/null
tmux send-keys -t "$session" "$launch_command" Enter
sleep "${PI_AGENT_EVAL_STARTUP_WAIT:-7}"
tmux send-keys -t "$session" "$prompt" Enter

run_id=""
start_capture=""
for _ in $(seq 1 "${PI_AGENT_EVAL_START_POLL_SECONDS:-35}"); do
  sleep 1
  start_capture="$(tmux capture-pane -t "$session" -p -S -360)"
  run_id="$(printf '%s\n' "$start_capture" | grep -Eo 'agent-[0-9]+' | tail -1 || true)"
  if [[ -n "$run_id" ]] && printf '%s\n' "$start_capture" | grep -Eq "STARTED $run_id|Started .*background: $run_id"; then
    break
  fi
  run_id=""
done
sleep "${PI_AGENT_EVAL_CANCEL_WAIT:-1}"
if [[ -z "$run_id" ]]; then
  {
    echo "# Scenario capture: $name"
    echo "# mode: native"
    echo "# prompt: $prompt"
    echo "# $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "# launch: $launch_command"
    echo "# parsed_run_id: missing"
    echo
    tmux capture-pane -t "$session" -p -S -420
  } > "$out"
  echo "missing background run id; wrote $out" >&2
  exit 1
fi

tmux send-keys -t "$session" "/agents cancel $run_id" Enter
sleep "${PI_AGENT_EVAL_CANCEL_STATUS_WAIT:-6}"
tmux send-keys -t "$session" "/agents-status $run_id" Enter
sleep "${PI_AGENT_EVAL_STATUS_WAIT:-6}"
cancel_capture="$(tmux capture-pane -t "$session" -p -S -300)"
sleep "${PI_AGENT_EVAL_POST_CANCEL_WAIT:-8}"
tmux send-keys -t "$session" "/agents-status $run_id" Enter
sleep "${PI_AGENT_EVAL_STATUS_WAIT:-6}"

{
  echo "# Scenario capture: $name"
  echo "# mode: native"
  echo "# prompt: $prompt"
  echo "# $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "# launch: $launch_command"
  echo "# parsed_run_id: $run_id"
  echo
  tmux capture-pane -t "$session" -p -S -520
  echo
  echo "# Cancel checkpoint"
  printf '%s\n' "$cancel_capture"
} > "$out"

session_root="$HOME/.pi/agent/sessions/--Users-luke-Projects-personal-pi-mono-fork--"
session_path=""
if [[ -d "$session_root" ]]; then
  session_path="$(
    find "$session_root" -type f -name '*.jsonl' -mmin -15 -print0 \
      | while IFS= read -r -d '' file; do
          mtime="$(stat -f '%m' "$file")"
          if [[ "$mtime" -ge "$capture_epoch" ]] && grep -q 'CANCEL_PROBE_SHOULD_NOT_APPEAR\|sleep 45' "$file" 2>/dev/null; then
            printf '%s %s\n' "$mtime" "$file"
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
bash_tool = ""
read_tool = ""
assistant_texts: list[str] = []
usage_lines: list[str] = []
for line in session.read_text(errors="ignore").splitlines():
    data = json.loads(line)
    msg = data.get("message", {})
    if msg.get("role") != "assistant":
        continue
    for part in msg.get("content", []):
        if part.get("type") == "toolCall" and part.get("name") == "bash":
            bash_tool = f"bash {part.get('arguments')}"
        if part.get("type") == "toolCall" and part.get("name") == "read":
            read_tool = f"read {part.get('arguments')}"
        if part.get("type") == "text" and part.get("text"):
            assistant_texts.append(part["text"])
    usage = msg.get("usage") or {}
    cost = usage.get("cost") or {}
    if usage.get("totalTokens") and cost.get("total") is not None:
        usage_lines.append(f"usage: {usage['totalTokens']} tok cache r/w {usage.get('cacheRead', 0)}/{usage.get('cacheWrite', 0)} ${cost['total']:.4f}")
append = f"""

# Child session evidence
# child_session_path: {session}
{bash_tool}
{read_tool}
assistant_texts: {' | '.join(assistant_texts[-3:])}
""" + "\n".join(usage_lines[-2:]) + "\n"
capture.write_text(capture.read_text(errors="ignore").rstrip() + append)
PY
fi

if ! grep -Eq "Cancelled $run_id|cancelled|Cancelled by operator" "$out"; then
  echo "missing cancel evidence; wrote $out" >&2
  exit 1
fi
if ! grep -Eq "$run_id .*cancelled|$run_id .* canceled|status: cancelled|Cancelled by operator" "$out"; then
  echo "missing cancelled status evidence; wrote $out" >&2
  exit 1
fi
if grep -Eq '^assistant_(output|texts): .*CANCEL_PROBE_SHOULD_NOT_APPEAR' "$out"; then
  echo "cancelled child produced forbidden final output; wrote $out" >&2
  exit 1
fi

# The child should have started work, but cancellation should prevent the follow-up read/final output.
grep -q 'sleep 45' "$out" || echo "warning: child sleep tool evidence not found in capture/session append" >&2

echo "Wrote $out ($run_id)"

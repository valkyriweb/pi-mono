#!/usr/bin/env bash
set -euo pipefail

mode="${1:-native}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="$root/captures"
mkdir -p "$out_dir"

session="pi-agent-eval-${mode}-$$"
out="$out_dir/${mode}-startup.txt"

cleanup() {
  tmux kill-session -t "$session" 2>/dev/null || true
}
trap cleanup EXIT

tmux new-session -d -s "$session" -x 100 -y 32
repo="/Users/luke/Projects/personal/pi-mono-fork"
launcher="pi"
if [[ -x "$repo/pi-test.sh" ]]; then
  launcher="./pi-test.sh"
fi
launch_command="cd $repo && $launcher"
if [[ "${PI_AGENT_EVAL_DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN $launch_command"
  exit 0
fi
tmux send-keys -t "$session" "$launch_command" Enter
sleep 5
{
  echo "# Startup capture: $mode"
  echo "# $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo
  tmux capture-pane -t "$session" -p
} > "$out"

echo "Wrote $out"

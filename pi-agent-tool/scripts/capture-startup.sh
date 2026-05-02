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
# Use installed pi from current repo context if available; fall back to pi on PATH.
tmux send-keys -t "$session" "cd /Users/luke/Projects/personal/pi-mono-fork && pi" Enter
sleep 5
{
  echo "# Startup capture: $mode"
  echo "# $(date -Is)"
  echo
  tmux capture-pane -t "$session" -p
} > "$out"

echo "Wrote $out"

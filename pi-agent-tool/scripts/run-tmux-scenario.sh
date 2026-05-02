#!/usr/bin/env bash
set -euo pipefail

name="${1:?usage: run-tmux-scenario.sh <name> <prompt-or-command>}"
prompt="${2:?usage: run-tmux-scenario.sh <name> <prompt-or-command>}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="$root/captures"
mkdir -p "$out_dir"

session="pi-agent-eval-${name}-$$"
out="$out_dir/${name}.txt"

cleanup() {
  tmux kill-session -t "$session" 2>/dev/null || true
}
trap cleanup EXIT

tmux new-session -d -s "$session" -x 100 -y 32
# Use installed pi from current repo context if available; fall back to pi on PATH.
tmux send-keys -t "$session" "cd /Users/luke/Projects/personal/pi-mono-fork && pi" Enter
sleep 5
tmux send-keys -t "$session" "$prompt" Enter
sleep 5
{
  echo "# Scenario capture: $name"
  echo "# Prompt: $prompt"
  echo "# $(date -Is)"
  echo
  tmux capture-pane -t "$session" -p
} > "$out"

echo "Wrote $out"

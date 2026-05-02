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
repo="/Users/luke/Projects/personal/pi-mono-fork"
launcher="pi"
if [[ -x "$repo/pi-test.sh" ]]; then
  launcher="./pi-test.sh"
fi
launch_command="cd $repo && $launcher"
if [[ "${PI_AGENT_EVAL_DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN $launch_command"
  echo "DRY_RUN prompt=$prompt"
  exit 0
fi
tmux send-keys -t "$session" "$launch_command" Enter
sleep 5
tmux send-keys -t "$session" "$prompt" Enter
sleep 5
{
  echo "# Scenario capture: $name"
  echo "# Prompt: $prompt"
  echo "# $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo
  tmux capture-pane -t "$session" -p
} > "$out"

echo "Wrote $out"

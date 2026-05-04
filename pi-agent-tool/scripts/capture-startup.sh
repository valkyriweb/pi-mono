#!/usr/bin/env bash
set -euo pipefail

mode="${1:-native}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$root/.." && pwd)"
out_dir="$root/captures"
mkdir -p "$out_dir"

subagents_ext="${PI_SUBAGENTS_EXT:-$HOME/.pi/agent/git/github.com/nicobailon/pi-subagents/src/extension/index.ts}"

launch_args() {
  case "$mode" in
    native)
      printf '%q ' "$repo/pi-test.sh" --no-session --no-extensions --tools agent,read,grep,find,ls --thinking off
      ;;
    subagents)
      printf '%q ' "$repo/pi-test.sh" --no-session --no-builtin-tools --no-extensions -e "$subagents_ext" --thinking off
      ;;
    *)
      echo "usage: capture-startup.sh <native|subagents>" >&2
      exit 2
      ;;
  esac
}

session="pi-agent-eval-${mode}-startup-$$"
out="$out_dir/${mode}-startup.txt"
launch_command="cd $(printf '%q' "$repo") && PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0 $(launch_args)"

if [[ "${PI_AGENT_EVAL_DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN $launch_command"
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
{
  echo "# Startup capture: $mode"
  echo "# $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "# launch: $launch_command"
  echo
  tmux capture-pane -t "$session" -p -S -200
} > "$out"

echo "Wrote $out"

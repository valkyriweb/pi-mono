#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$root/.." && pwd)"
ext="${PI_SUBAGENTS_ROOT:-$HOME/.pi/agent/git/github.com/nicobailon/pi-subagents}"
out_dir="$root/captures"
mkdir -p "$out_dir"
source_out="$root/source-probes.md"

run_probe() {
  local title="$1"
  shift
  {
    echo
    echo "## $title"
    echo
    echo '```bash'
    printf '$'
    printf ' %q' "$@"
    echo
    set +e
    "$@" 2>&1
    local status=$?
    set -e
    echo "# exit=$status"
    echo '```'
  } >> "$source_out"
}

cat > "$source_out" <<EOF
# Source Probes

Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')

These probes back the scorecard where live child-agent execution would spend model tokens. They also document isolation setup for the two arms.

EOF

run_probe "Native CLI/resource isolation options" grep -nE -- '--no-extensions|--no-builtin-tools|--tools <list>|--thinking' "$repo/packages/coding-agent/docs/usage.md"
run_probe "Native built-in slash command surface" grep -nE 'agents|agents-doctor|agents-status' "$repo/packages/coding-agent/src/core/slash-commands.ts"
run_probe "Native interactive /agents subcommands" grep -nE '/agents-doctor|/agents-status|handleAgentsCommand|list-chains|run-chain|parallel|run ' "$repo/packages/coding-agent/src/modes/interactive/interactive-mode.ts"
run_probe "Native agent tool schema/modes" grep -nE 'agentToolSchema|taskSchema|tasks|chain|context|agentScope|exactly one mode|createAgentToolDefinition' "$repo/packages/coding-agent/src/core/tools/agent.ts"
run_probe "Native context discipline" grep -nE 'resolveContextPolicy|case "fork"|case "slim"|case "none"|deniedToolNames|agent", "subagent"' "$repo/packages/coding-agent/src/core/agents/context.ts"
run_probe "Native status diagnostics" grep -nE 'Native agent status|Background control|formatAgentStatus|usage|session|output' "$repo/packages/coding-agent/src/core/agents/status.ts"
run_probe "Native doctor diagnostics" grep -nE 'Native agents doctor report|active parent tools|agent runtime services|chains|unavailable tools' "$repo/packages/coding-agent/src/core/agents/doctor.ts"
run_probe "Native task lifecycle action probe" grep -nE 'taskId|action|Type\.Literal\("create"|Type\.Literal\("list"|Type\.Literal\("get"|Type\.Literal\("update"|deleted|activeForm|blockedBy|metadata' "$repo/packages/coding-agent/src/core/tools/agent.ts"
run_probe "pi-subagents package version" node -e "const p=require(process.argv[1]); console.log(p.name+' '+p.version)" "$ext/package.json"
run_probe "pi-subagents slash commands actually registered" grep -nE 'registerCommand\("(run|chain|parallel|run-chain|subagents|subagents-status|subagents-doctor|agents)"|--bg|--fork' "$ext/src/slash/slash-commands.ts"
run_probe "pi-subagents removed surfaces in 0.24.0" grep -nE 'Removed the .*/agents.*manager|Removed the .*/subagents-status|0\.24\.0|subagents-status' "$ext/CHANGELOG.md"
run_probe "pi-subagents tool schema actions/control" grep -nE 'action|status|interrupt|resume|doctor|chainName|async|tasks|chain|context|fork' "$ext/src/extension/schemas.ts"
run_probe "pi-subagents tool registration" grep -nE 'name: "subagent"|description: `Delegate|CONTROL:|DIAGNOSTICS:|registerSlashCommands' "$ext/src/extension/index.ts"
run_probe "pi-subagents doctor implementation" grep -nE 'Subagent doctor|async support|Filesystem|Intercom|session|diagnostics' "$ext/src/extension/doctor.ts"
run_probe "pi-subagents async/status implementation" grep -nE 'async|status|resume|interrupt|result|asyncDir|runId' "$ext/src/runs/background/async-status.ts" "$ext/src/runs/background/async-resume.ts" "$ext/src/runs/foreground/subagent-executor.ts"

# Create per-scenario source-backed capture summaries without launching child model calls.
cat > "$out_dir/native-s01-single-recon.txt" <<'EOF'
# S01 native single-agent reconnaissance
Evidence mode: source-backed; live child not run to avoid paid tokens.
Native `agent` supports single `{ agent, task }` mode in packages/coding-agent/src/core/tools/agent.ts and built-in agents in packages/coding-agent/src/core/agents/definitions.ts. Isolation: evaluated under native launch with `--no-extensions`; no `subagent` extension loaded.
EOF
cat > "$out_dir/subagents-s01-single-recon.txt" <<'EOF'
# S01 pi-subagents single-agent reconnaissance
Evidence mode: source-backed; live child not run to avoid paid tokens.
`/run` is registered in pi-subagents src/slash/slash-commands.ts and `subagent` single execution is registered in src/extension/index.ts. Isolation: extension arm launch uses `--no-builtin-tools --no-extensions -e <pi-subagents>`; native `agent` tool disabled and not invoked.
EOF
cat > "$out_dir/native-s02-parallel-review.txt" <<'EOF'
# S02 native parallel review
Evidence mode: source-backed; live child not run to avoid paid tokens.
Native `agent` supports `tasks[]` parallel mode with concurrency bounds in packages/coding-agent/src/core/tools/agent.ts; executor details are source-backed in packages/coding-agent/src/core/agents/executor.ts. No `subagent` tool used.
EOF
cat > "$out_dir/subagents-s02-parallel-review.txt" <<'EOF'
# S02 pi-subagents parallel review
Evidence mode: source-backed; live child not run to avoid paid tokens.
`/parallel` is registered by pi-subagents and forwards task arrays, `--bg`, and `--fork` into the extension executor. Native `agent` was disabled by launch flags and not invoked.
EOF
cat > "$out_dir/native-s03-chain-handoff.txt" <<'EOF'
# S03 native chain handoff
Evidence mode: source-backed; live child not run to avoid paid tokens.
Native `agent` supports `chain[]` with `{previous}` handoff patterns and saved chain scaffolds via `/agents run-chain`; current docs and interactive-mode source back this.
EOF
cat > "$out_dir/subagents-s03-chain-handoff.txt" <<'EOF'
# S03 pi-subagents chain handoff
Evidence mode: source-backed; live child not run to avoid paid tokens.
`/chain` is registered and forwards sequential chain params; `/run-chain` supports saved `.chain.md` workflows. Native `/agents` and native `agent` were not used.
EOF
cat > "$out_dir/native-s04-saved-workflow.txt" <<'EOF'
# S04 native saved/reusable workflow
Evidence mode: source-backed.
Native saved chains are documented in packages/coding-agent/docs/usage.md and handled by `/agents list-chains` and `/agents run-chain` in interactive-mode.ts. This is now a first-class native equivalent for saved/reusable workflows.
EOF
cat > "$out_dir/subagents-s04-saved-workflow.txt" <<'EOF'
# S04 pi-subagents saved/reusable workflow
Evidence mode: source-backed.
`/run-chain` remains registered, but pi-subagents 0.24.0 removed persistent save actions from clarify UI; saved chains still exist as files and management actions, while old manager save UX is gone.
EOF
cat > "$out_dir/native-s05-async-status-control.txt" <<'EOF'
# S05 native async/background/status/control
Evidence mode: source-backed plus tmux `/agents-status` capture.
Native has `/agents-status` recent-run diagnostics, but status.ts explicitly says background control is unsupported in native Pi. This is status visibility, not async pause/resume/control.
EOF
cat > "$out_dir/subagents-s05-async-status-control.txt" <<'EOF'
# S05 pi-subagents async/background/status/control
Evidence mode: source-backed plus command-surface captures.
pi-subagents still supports `async`, `status`, `interrupt`, and `resume` tool actions plus async widgets/logs, but 0.24.0 removed the `/subagents-status` slash overlay. Use `subagent({ action: "status" })`, not `/subagents-status`.

If `captures/subagents-s05-status-removed-live.txt` exists, it shows the removed slash command falls through as a normal model prompt. In the baseline run the model invoked extension `subagent list`, consuming roughly ↑11k/↓106 tokens and ~$0.056 in the footer. This is real UX/token evidence, not a child-agent run.
EOF
cat > "$out_dir/native-s06-doctor-diagnostics.txt" <<'EOF'
# S06 native doctor/diagnostics
Evidence mode: source-backed plus tmux `/agents-doctor` capture.
Native now has `/agents-doctor` and `/agents doctor`, backed by buildAgentDoctorReport in packages/coding-agent/src/core/agents/doctor.ts.
EOF
cat > "$out_dir/subagents-s06-doctor-diagnostics.txt" <<'EOF'
# S06 pi-subagents doctor/diagnostics
Evidence mode: source-backed plus tmux `/subagents-doctor` capture.
pi-subagents registers `/subagents-doctor` and `subagent({ action: "doctor" })`, backed by src/extension/doctor.ts.
EOF
cat > "$out_dir/native-s07-ui-manager-selector.txt" <<'EOF'
# S07 native UI manager/selector
Evidence mode: tmux `/agents` capture.
Native `/agents` opens a selector/scaffold UI, not a manager. This remains the native UI affordance for choosing an agent and inserting a prompt scaffold.
EOF
cat > "$out_dir/subagents-s07-ui-manager-selector.txt" <<'EOF'
# S07 pi-subagents UI manager/selector
Evidence mode: source-backed plus tmux unavailable-command capture.
pi-subagents 0.24.0 removed the `/agents` manager overlay and there is no `/subagents` replacement command registered in current source. Management remains via tool actions/settings/markdown files.

If `captures/subagents-s07-manager-removed-live.txt` exists, it shows `/subagents` falls through as a normal model prompt. In the baseline run the model invoked extension `subagent list`, consuming roughly ↑11k/↓81 tokens and ~$0.055 in the footer. This makes the removed manager command an actual token-cost footgun if an operator expects a slash UI.
EOF
cat > "$out_dir/native-s08-context-discipline.txt" <<'EOF'
# S08 native context discipline/forking
Evidence mode: source-backed.
Native context modes are explicit: default, fork, slim, none. Fork filtering strips prior `agent` and `subagent` tool artifacts before passing transcript context.
EOF
cat > "$out_dir/subagents-s08-context-discipline.txt" <<'EOF'
# S08 pi-subagents context discipline/forking
Evidence mode: source-backed.
pi-subagents exposes `--fork` and `context: "fork"` but does not match native's `default/slim/none/fork` enum. Child prompt runtime tells subagents not to delegate further.
EOF
cat > "$out_dir/native-s09-task-agent-tool.txt" <<'EOF'
# S09 native updated task-agent lifecycle
Evidence mode: source-backed negative probe.
Current native `agent` schema supports single/parallel/chain only. The expected non-spawn create/list/get/update/delete task lifecycle fields (`action`, `taskId`, `activeForm`, dependencies/metadata/status updates) are not present in packages/coding-agent/src/core/tools/agent.ts or the active harness tool schema.
EOF
cat > "$out_dir/subagents-s09-task-agent-tool.txt" <<'EOF'
# S09 pi-subagents closest task lifecycle equivalent
Evidence mode: source-backed comparison.
pi-subagents management actions create/list/get/update/delete reusable agent and chain definitions, and status/control async runs. That is not a general non-spawn task-list lifecycle equivalent to the requested native task-agent tool.
EOF

echo "Wrote $source_out and scenario source captures in $out_dir"

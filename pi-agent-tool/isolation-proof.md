# Isolation Proof

native_no_subagent_tool: true
subagents_no_native_agent_tool: true
same_model_and_thinking: true
paid_child_runs_avoided: true
removed_command_parent_model_fallback_recorded: true

## Native arm

Launch command used by scripts:

```bash
PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0 \
  ../pi-test.sh --no-session --no-extensions --tools agent,read,grep,find,ls --thinking off
```

Proof:

- `--no-extensions` disables extension discovery, so installed `pi-subagents` is not loaded.
- `--tools agent,read,grep,find,ls` makes the active native tool surface explicit.
- Native captures use only `/agents`, `/agents-doctor`, and `/agents-status`.
- No `/subagents`, `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-status`, or `/subagents-doctor` commands are used in native captures.
- This parent session did not invoke the harness `subagent` tool for the native arm.

## `pi-subagents` arm

Launch command used by scripts:

```bash
PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0 \
  ../pi-test.sh --no-session --no-builtin-tools --no-extensions \
  -e ~/.pi/agent/git/github.com/nicobailon/pi-subagents/src/extension/index.ts \
  --thinking off
```

Proof:

- `--no-builtin-tools` disables native built-in tools, including native `agent`.
- `--no-extensions -e <pi-subagents>` loads only the explicit `pi-subagents` extension.
- Extension captures use only extension commands or removed-command probes: `/subagents-doctor`, `/subagents-status`, `/subagents`, `/run`, `/parallel`, `/chain`, `/run-chain`.
- Removed-command probes for `/subagents-status` and `/subagents` fell through to parent model turns because those slash commands are not registered in 0.24.0; they invoked extension `subagent list`, not native `agent`.
- Native `/agents` is not used in extension captures.
- This parent session did not invoke the harness native `agent` tool for the extension arm.

## Source-backed command surface

- Native command list: `packages/coding-agent/src/core/slash-commands.ts` includes `/agents`, `/agents-doctor`, and `/agents-status`.
- Native interactive handler: `packages/coding-agent/src/modes/interactive/interactive-mode.ts` handles `/agents` subcommands for run/parallel/run-chain/list-chains/doctor/status.
- Extension command list: `~/.pi/agent/git/github.com/nicobailon/pi-subagents/src/slash/slash-commands.ts` registers `/run`, `/parallel`, `/chain`, `/run-chain`, and `/subagents-doctor`.
- Extension removed-surface proof: `~/.pi/agent/git/github.com/nicobailon/pi-subagents/CHANGELOG.md` `0.24.0` removes `/agents` manager overlay and `/subagents-status` slash command.

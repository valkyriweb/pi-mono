# Eval Plan: Native `agent` vs `pi-subagents`

## Objective

Measure practical return on token spend for Pi's native delegation against the installed `pi-subagents` extension: correctness, feature coverage, context footprint, UX, robustness, and flexibility per token.

## Evidence summary

### Native Pi delegation

- Native tool schema lives in `packages/coding-agent/src/core/tools/agent.ts`; it supports single `{agent, task}`, `tasks[]`, `chain[]`, `concurrency`, `context`, `model`, `tools`, `thinking`, `output`, `outputMode`, `chainDir`, and `agentScope`.
- Execution lives in `packages/coding-agent/src/core/agents/executor.ts`; it implements single, parallel, and chain modes, child `AgentSession` creation, model/thinking overrides, max parallel/concurrency of 8, and parent-bounded tools.
- Context policies live in `packages/coding-agent/src/core/agents/context.ts`; supported modes are `default`, `fork`, `slim`, and `none`; fork filtering strips native `agent` and legacy `subagent` artifacts.
- Built-ins live in `packages/coding-agent/src/core/agents/definitions.ts`: `general-purpose`, `worker`, `explore`, `plan`, `scout`, `reviewer`; read-only agents restrict tools and recursive `agent` is denied.
- Native `/agents` is registered in `packages/coding-agent/src/core/slash-commands.ts` and handled in `packages/coding-agent/src/modes/interactive/interactive-mode.ts`; it opens a selector and inserts `Use the <agent-id> agent to: ` scaffolding rather than executing directly.
- Tests cover validation, outputs, permissions, context inheritance, model selection, and selector behavior in `packages/coding-agent/test/agent-tool.test.ts`, `agent-context-inheritance.test.ts`, `agent-permissions.test.ts`, `agent-model-selection.test.ts`, and `interactive-mode-agents-command.test.ts`.
- Docs: `packages/coding-agent/docs/usage.md`, `docs/tui.md`, and `README.md` document native modes, bounded tools, context modes, project-agent confirmation, and TUI rendering.

### `pi-subagents` extension

- Installed extension source: `~/.pi/agent/git/github.com/nicobailon/pi-subagents`.
- `package.json` version is `0.22.0` and registers extension entry `./src/extension/index.ts`.
- Tool registration lives in `src/extension/index.ts`: tool name `subagent`, `pi.registerTool(tool)`, and `registerSlashCommands(...)`.
- Slash commands are registered in `src/slash/slash-commands.ts`: `/subagents`, `/run`, `/chain`, `/run-chain`, `/parallel`, `/subagents-status`, `/subagents-doctor`, and `ctrl+shift+a` manager shortcut. `/run`, `/chain`, `/parallel`, and `/run-chain` parse `--bg` and `--fork`.
- Schema lives in `src/extension/schemas.ts`; it supports single, parallel `tasks`, chain `chain`, and management `action`/`chainName`/`config`.
- Router lives in `src/runs/foreground/subagent-executor.ts`; it dispatches doctor/status/management, parallel tasks, chains, and single-agent runs.
- Manager/status/doctor evidence: `src/manager-ui/agent-manager.ts`, `src/tui/subagents-status.ts`, `src/extension/doctor.ts`.
- `CHANGELOG.md`: `0.19.0` added launch toggles and `/subagents-status`; `0.19.1` added `subagent({ action: "doctor" })`, `/subagents-doctor`, and `/run-chain`; tags include `v0.19.0`, `v0.19.1`, `v0.20.0`, `v0.20.1`.
- Local alias note: repo AGENTS says the extension manager command is locally aliased from `/agents` to `/subagents` in `src/slash/slash-commands.ts`; `pi update` may overwrite it.

### Claude/Codex lineage

- `~/Projects/agent-scripts/REFERENCES.md` lists a likely Claude Code CLI source leak at `~/Projects/testing/claude-code-cli-src-code/`, but it was not inspected in this pass.
- Local Codex evidence in `~/Projects/oss/codex/codex-rs/tools/src/agent_tool.rs`: tools include `spawn_agent`, `send_input`, `send_message`, `followup_task`, `resume_agent`, `wait_agent`, `list_agents`, and `close_agent`; prompt framing says spawned agents inherit tools, work on bounded tasks, can message/follow up, and final answers return to parent.
- `~/Projects/oss/codex/codex-rs/core/tests/suite/subagent_notifications.rs` shows forked prior conversation history and final-channel child output delivered back to parent.
- Older Pi extension lineage appears in `~/Projects/oss/pi-mono/packages/coding-agent/examples/extensions/subagent/`: separate `pi` process per subagent, isolated context windows, single/parallel/chain schema, streaming output, abort propagation, usage stats, and project-agent confirmation.
- Gap: exact Claude Code release/migration history is unavailable without inspecting the local source leak or external release data.

## Fair A/B configurations

### A. Native-only

- Launch Pi with `pi-subagents` disabled or ignored.
- Verify active slash command `/agents` is native and no `/subagents`, `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, or `/subagents-doctor` commands appear.
- Exercise native `/agents` and the native `agent` tool in single, parallel, and chain modes.
- Do not activate `subagent` with `tool_search`.

### B. `pi-subagents`

- Launch Pi with the extension enabled.
- Verify `/subagents`, `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, and optionally `subagent` are active.
- Exercise the extension commands and tool.
- Avoid native `agent` except for explicit interference checks.

## Metrics

For every scenario record:

- Correctness (1-5)
- Feature coverage (1-5)
- Token cost: prompt, completion, total if available; otherwise log-derived estimate
- Context footprint: startup context, added context, child inheritance/freshness, compaction pressure
- Latency: wall clock where easy
- Reliability: errors, hangs, ambiguous states, failed child startup
- UX: discoverability, preview/edit affordances, status visibility, interrupt/resume, readability
- Flexibility: model overrides, context modes, saved chains, async/background, isolation/worktree support
- Evidence quality: cited files/results and parent-reusable output
- `value_per_1k_tokens`: low / medium / high, one-sentence justification

## Scoring rubric

- 5: excellent, clear evidence, reusable output, low friction/token cost
- 4: good, minor friction or missing affordance
- 3: works, but limited evidence, token cost, or UX tradeoff
- 2: partially works or requires workaround
- 1: fails, unavailable, or too costly for the result

## Scenario matrix

| # | Scenario | Native arm | `pi-subagents` arm | Evidence to capture |
|---|---|---|---|---|
| 1 | Single-agent code reconnaissance | `agent({ agent: "scout", task: ... })` | `/run scout ...` or `subagent({ agent: "scout", task: ... })` | file map, integration points, token/latency |
| 2 | Parallel review | `agent({ tasks: [...] })` with correctness/validation/simplicity reviewers | `/parallel ...` or `subagent({ tasks: [...] })` | aggregation clarity, isolation, cost |
| 3 | Chain handoff | `agent({ chain: scout -> plan -> reviewer })` | `/chain ...` or saved chain | handoff quality, context passing |
| 4 | Saved/reusable workflow | closest native equivalent: prompt snippet or shell/runbook entry | `/subagents` saved chain or `/run-chain` | reproducibility and ergonomics |
| 5 | Async/status/control | mark native gap unless supported by current TUI | `/run --bg`, `/subagents-status`, recovery/control | status clarity and interrupt/resume |
| 6 | Doctor/diagnostics | native startup/tool visibility checks; mark no direct doctor if absent | `/subagents-doctor` | actionable diagnostics |
| 7 | UI manager pass | `/agents` selector via tmux capture | `/subagents` manager via tmux capture | discoverability, preview/edit affordances |
| 8 | Context discipline stress | child answers using only named files with `context: "none"/"slim"/"fork"` | `/run --fork` or tool context controls if available | over-inheritance, over-search, token footprint |

## Constraints

- Same model and thinking level for both arms unless testing override flexibility.
- Fresh session per arm.
- Read-only repo tasks except harmless temp files under `pi-agent-tool/tmp/`.
- Avoid full builds/tests/network research.
- Prefer 6-10 narrow scenarios; do not expand beyond this matrix unless a result is ambiguous.

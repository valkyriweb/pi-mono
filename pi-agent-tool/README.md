# Pi Agent Tool A/B Eval

Compact A/B evaluation for native Pi delegation (`/agents` + `agent`) versus the `pi-subagents` extension (`/subagents`, `/run`, `/chain`, `/parallel`, `/run-chain`, status/doctor, and `subagent`).

## Files

- `eval-plan.md` — scenarios, metrics, rubric, and research evidence.
- `runbook.md` — exact native-only and pi-subagents mode setup/run steps.
- `scorecard-template.md` — per-scenario scoring table.
- `findings-template.md` — final report skeleton.
- `scripts/capture-startup.sh` — tmux startup capture helper.
- `scripts/run-tmux-scenario.sh` — tmux scenario capture helper.

## Start the eval

From repo root:

```bash
cd /Users/luke/Projects/personal/pi-mono-fork/pi-agent-tool
./scripts/capture-startup.sh native
./scripts/capture-startup.sh subagents
```

Optionally smoke-check helpers without launching Pi:

```bash
PI_AGENT_EVAL_DRY_RUN=1 ./scripts/capture-startup.sh native
PI_AGENT_EVAL_DRY_RUN=1 ./scripts/run-tmux-scenario.sh native-ui '/agents'
```

Then follow `runbook.md` and fill `scorecard-template.md` for each arm.

## Scope

The eval is intentionally manual-light rather than fully automated: interactive slash commands and child-agent UX need terminal evidence, while full automation would burn more tokens than the comparison is worth.

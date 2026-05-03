# Eval Plan: Native Pi `agent` vs `pi-subagents`

## Objective

Evaluate actual behavior, UX, reliability, and token/value tradeoffs between native Pi delegation and the installed `pi-subagents` extension, without cross-contaminating command/tool surfaces.

Primary metric: `actual_eval_score` — higher is better, based on captures, filled scorecard, findings, isolation proof, live child-output evidence, task-agent coverage, source probes, audit checks, and honest limitations.

Secondary metrics: see `autoresearch.md` for the live metric list. The scorer has expanded beyond the initial baseline to include evidence integrity, token accounting, current-vs-prior runtime classification, artifact indexes, and recommendation consistency.

## Isolation rules

### Native arm

Launch:

```bash
PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0 \
  ../pi-test.sh --no-session --no-extensions --tools agent,read,grep,find,ls --thinking off
```

Rules:

- Use native `/agents`, `/agents-doctor`, `/agents-status`, and source evidence for `agent`.
- Do not activate or invoke `subagent`.
- Do not use `/subagents`, `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-status`, or `/subagents-doctor`.
- Verify surface via `--no-extensions`, startup capture, `source-probes.md`, and `isolation-proof.md`.

### `pi-subagents` arm

Launch:

```bash
PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0 \
  ../pi-test.sh --no-session --no-builtin-tools --no-extensions \
  -e ~/.pi/agent/git/github.com/nicobailon/pi-subagents/src/extension/index.ts \
  --thinking off
```

Rules:

- Use extension commands/tooling only: `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-doctor`, and `subagent` source/schema evidence.
- Do not use native `/agents`.
- Do not invoke native `agent`; launch disables built-in tools.
- Verify surface via `--no-builtin-tools`, explicit extension loading, startup capture, `source-probes.md`, and `isolation-proof.md`.

## Current command/tool surface evidence

Native Pi source currently exposes:

- `/agents`, `/agents-doctor`, `/agents-status` in `packages/coding-agent/src/core/slash-commands.ts`.
- `/agents run`, `/agents parallel`, `/agents run-chain`, `/agents list-chains`, `/agents doctor`, `/agents status` in `packages/coding-agent/src/modes/interactive/interactive-mode.ts`.
- Built-in `agent` single/parallel/chain schema in `packages/coding-agent/src/core/tools/agent.ts`.
- Context modes `default`, `fork`, `slim`, `none` in `packages/coding-agent/src/core/agents/context.ts`.

Installed `pi-subagents` source currently exposes:

- package version `0.24.0` in `~/.pi/agent/git/github.com/nicobailon/pi-subagents/package.json`.
- `/run`, `/parallel`, `/chain`, `/run-chain`, and `/subagents-doctor` in `src/slash/slash-commands.ts`.
- `subagent` tool actions for management, status, interrupt, resume, and doctor in `src/extension/index.ts` and `src/extension/schemas.ts`.
- `/subagents` manager UI and `/subagents-status` slash overlay are removed in `CHANGELOG.md` `0.24.0`.
- Current fresh eval launch fails to load the installed extension with a module-format error before slash commands register; source-declared commands are not treated as current runtime availability until the loader issue is fixed and the extension probes are rerun.

## Scenarios

| # | Scenario | Native arm | `pi-subagents` arm | Evidence mode |
|---|---|---|---|---|
| S01 | Single-agent reconnaissance | live `/agents run scout` child completed, read `README.md`, and returned exactly three artifact filenames; `agent({agent, task})` source/schema remains the underlying surface | current fresh launch failed before `/run scout`; source declares `/run` and `subagent({agent, task})`, but runtime unavailable until loader fix/rerun | live child + current runtime failure |
| S02 | Parallel review | `agent({tasks})` source/schema | `/parallel` and `subagent({tasks})` source/schema; source-only because current extension load is blocked until loader fix/rerun | source-backed only |
| S03 | Sequential chain handoff | `agent({chain})`; `/agents run-chain` scaffold | `/chain`; `/run-chain` in source; source-only because current extension load is blocked until loader fix/rerun | source-backed only |
| S04 | Saved/reusable workflow | native saved chains JSON + `/agents run-chain` | saved `.chain.md` + `/run-chain` in source; save UI removed; current extension load is blocked until loader fix/rerun | source-backed only |
| S05 | Async/background/status/control | `/agents-status` foreground recent-run status; no native background control | `async`, status/interrupt/resume tool actions; `/subagents-status` removed | source + tmux |
| S06 | Doctor/diagnostics | `/agents-doctor` | `/subagents-doctor` | source + tmux |
| S07 | UI manager/selector pass | `/agents` selector/scaffold | requested `/subagents` manager unavailable in 0.24.0 | source + tmux |
| S08 | Context discipline/forking | `context: default/fork/slim/none`; filters `agent`/`subagent` artifacts | `--fork`/`context: fork` in source; less granular; current extension load is blocked until loader fix/rerun | source-backed only |
| S09 | Updated native task-agent lifecycle | probe for non-spawn `action`/`taskId` create/list/get/update/delete | closest extension management/status actions in source; not equivalent; current extension load is blocked until loader fix/rerun | source-backed negative/closest-equivalent only |

## Scoring rubric

Each arm/scenario gets 1-5 for correctness, coverage, UX, robustness, flexibility, and evidence:

- 5: works cleanly with direct evidence and low friction.
- 4: works with minor limitations.
- 3: usable but partial, indirect, or ergonomically weaker.
- 2: workaround/closest equivalent only.
- 1: unavailable, failed, or unsupported.

Token/value is qualitative because broad paid child-agent runs are avoided. Exceptions: one tiny native S01 live child and two prior `pi-subagents` removed-command fallthrough probes have visible token/cost evidence; current extension S01 has no child token accounting because loading fails before `/run scout`. Exact prompt/completion/cache tokens are `n/a` unless visible in live model logs.

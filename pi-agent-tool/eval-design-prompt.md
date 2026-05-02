# Prompt: Design a Token-Efficient Native `agent` vs `pi-subagents` A/B Eval

You are designing a compact but evidence-backed evaluation for Pi's native `agent` tool and native `/agents` implementation versus the `pi-subagents` extension.

## Goal

Create an eval plan and runnable evaluation harness that compares:

- Native Pi delegation:
  - built-in `/agents`
  - built-in `agent` tool with single, parallel, and chain modes
- `pi-subagents` extension:
  - `/subagents` manager UI (local alias for the extension's former `/agents` command)
  - `/run`
  - `/chain`
  - `/parallel`
  - `/run-chain`
  - `/subagents-status`
  - `/subagents-doctor`
  - `subagent` tool, if available/activated

The eval must measure practical return on token spend: accuracy, flexibility, context-window usage, UI/UX, robustness, and feature coverage per token.

Keep it small enough to run repeatedly without burning a large model budget. Prefer 6-10 focused scenarios over a giant benchmark.

## Required background research

Before designing the eval, gather evidence from these sources:

1. Current Pi repo implementation
   - Native `agent` tool source, tests, docs, and system prompt/tool schema integration.
   - Native `/agents` implementation and UX behavior.
   - Existing tests under `packages/coding-agent/test/suite/agent-tool-*` and related docs.

2. Installed `pi-subagents` extension
   - Source under `~/.pi/agent/git/github.com/nicobailon/pi-subagents`.
   - Command handlers for `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, and `/subagents`.
   - Tool registration and activation behavior for `subagent`.
   - Release notes, changelog, commit history, or tags. Summarize how the extension evolved and which features might be missing from native Pi.

3. Claude Code CLI agent-tool lineage
   - Inspect local Claude/Codex/agent-tool reference repos if available via `~/Projects/agent-scripts/REFERENCES.md` or `~/Projects/oss`.
   - Review the Claude Code CLI agent tool source/system prompt if present locally.
   - Summarize the migration path from earlier subagent-style delegation toward the current Agent tool model: tool schema, prompt framing, context behavior, isolation, output contract, and UX.
   - If exact release history is unavailable locally, mark it as a gap and rely only on concrete source evidence.

Use citations as file paths, commit/tag names, or command output snippets. Do not rely on memory.

## Eval design requirements

Design two comparable configurations:

### A. Native-only mode

- Disable or ignore `pi-subagents` for the run.
- Exercise native `/agents` and native `agent` tool.
- Ensure no `subagent` tool or extension slash commands influence results.

### B. `pi-subagents` mode

- Enable `pi-subagents`.
- Use `/subagents`, `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, and `subagent` if available.
- Avoid native `agent` tool unless explicitly checking interference.

Document exactly how to launch each mode, including settings/env/extension changes and how to verify active tools and slash commands at startup.

## Metrics

For every scenario, capture:

- Correctness: did it complete the task accurately?
- Tool/command coverage: which feature was exercised?
- Token cost: prompt tokens, completion tokens, total tokens where available; otherwise approximate from logs.
- Context footprint: startup context, added context, child context inheritance/freshness, and compaction pressure.
- Latency: wall-clock if easy to capture.
- Reliability: errors, hangs, ambiguous states, command conflicts, failed child startup.
- UX: discoverability, preview/edit affordances, status visibility, interrupt/resume, output readability.
- Flexibility: model overrides, context modes, saved chains, async/background behavior, worktree or isolation support.
- Evidence quality: whether outputs cite files/results and are reusable by the parent.

Create a scorecard with 1-5 scores plus short evidence notes. Also compute a rough `value_per_1k_tokens` judgment per scenario: low / medium / high, with one sentence explaining why.

## Scenario set

Use scenarios that are realistic, cheap, and symmetrical between tools.

Include at least these:

1. Single-agent code reconnaissance
   - Task: map native agent-tool implementation files and summarize integration points.
   - Native: one `agent` call.
   - pi-subagents: `/run scout` or `subagent({ agent: "scout" })`.

2. Parallel review
   - Task: review current diff or a small known file from three angles: correctness, validation, simplicity.
   - Native: parallel `agent` tasks.
   - pi-subagents: `/parallel` or `subagent({ tasks: [...] })`.

3. Chain handoff
   - Task: scout -> planner -> reviewer for a small implementation question.
   - Native: `agent` chain.
   - pi-subagents: `/chain` or saved chain.

4. Saved/reusable workflow
   - Task: define and run a tiny saved chain or closest native equivalent.
   - Compare ergonomics and reproducibility.

5. Async/status/control
   - Task: launch a deliberately slow but harmless child, inspect status, and recover.
   - Native: native behavior if supported; otherwise mark gap.
   - pi-subagents: `/subagents-status` and control behavior.

6. Doctor/diagnostics
   - Task: diagnose setup and report actionable issues.
   - Native: equivalent startup diagnostics or mark gap.
   - pi-subagents: `/subagents-doctor`.

7. UI manager pass
   - Task: inspect manager UI affordances.
   - Native: `/agents`.
   - pi-subagents: `/subagents`.
   - Use tmux capture, not screenshots, unless screenshots are necessary.

8. Context discipline stress test
   - Task: ask a child to answer using only specific provided files, then check whether it over-inherits or over-searches.
   - Compare fresh/fork/default context behavior and token footprint.

Keep each task narrow. Prefer repo-local read-only tasks. Avoid full test suites, builds, network-heavy research, or paid external calls unless necessary.

## Harness/output requirements

Produce these files under `pi-agent-tool/`:

- `README.md` — concise overview and how to run the eval.
- `eval-plan.md` — final scenario matrix, metrics, and scoring rubric.
- `runbook.md` — exact steps to run native-only and pi-subagents modes, including how to disable/enable each.
- `scorecard-template.md` — table ready to fill after runs.
- `findings-template.md` — final comparison report structure.
- Optional scripts only if they are simple and safe:
  - `scripts/capture-startup.sh`
  - `scripts/run-tmux-scenario.sh`

Do not implement expensive automation unless it clearly reduces repeated manual work.

## Constraints

- Keep the eval token-efficient.
- Prefer fresh-context children for fair review scenarios.
- Use the same model and thinking level for both arms unless testing override flexibility.
- Run each arm in a clean session.
- Record startup resources and extension issues for each arm.
- Avoid changing production source during eval runs.
- If modifying local extension command aliases, document the exact patch and whether `pi update` may overwrite it.
- Keep commands read-only unless a scenario explicitly needs a harmless temp file under `pi-agent-tool/tmp/`.

## Expected final answer

Return:

1. A concise research summary with cited evidence.
2. The recommended A/B design and why it is fair.
3. The files created under `pi-agent-tool/`.
4. Any blockers/gaps, especially unavailable Claude Code release/source history.
5. The next command Luke should run to start the eval.

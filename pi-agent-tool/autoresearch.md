# Autoresearch: Pi Agent Tool A/B Eval Design

## Objective

Optimize the eval artifacts under `pi-agent-tool/` for a compact, evidence-backed, repeatable comparison of native Pi delegation (`/agents` + `agent`) against the `pi-subagents` extension.

## Metrics

- **Primary**: `smoke_score` (unitless, higher is better) — execution-smoke readiness: artifact gate plus local runtime prerequisites for tmux capture helpers.
- **Secondary**: `required_files`, `scenario_count`, `citation_count`, `cache_field_count`, `executable_scripts`, `bash_syntax_ok`, `table_consistency_ok`, `tmux_available`, `launcher_available`.

## How to Run

`./autoresearch.sh` outputs `METRIC name=value` lines.

## Files in Scope

- `README.md` — concise overview and start command.
- `eval-plan.md` — evidence, fair A/B design, metrics, scenarios, rubric.
- `runbook.md` — exact run steps for both arms.
- `scorecard-template.md` — fillable score table.
- `findings-template.md` — final report structure.
- `scripts/capture-startup.sh` — safe tmux startup capture.
- `scripts/run-tmux-scenario.sh` — safe tmux scenario capture.
- `autoresearch.md`, `autoresearch.sh` — loop docs and scorer.

## Off Limits

- Production source outside `pi-agent-tool/`.
- Extension source under `~/.pi/agent/git/...` except read-only inspection.
- Expensive automated eval runs, full builds, paid external calls, network research.

## Constraints

- Keep the eval token-efficient.
- Prefer fresh-context children and symmetrical tasks.
- Same model/thinking level across arms.
- Commands should be read-only except temp files/captures under `pi-agent-tool/`.
- Cite evidence with local file paths or command snippets, not memory.

## What's Been Tried

- Initial artifact set created from repo-local evidence: native source/tests/docs, installed `pi-subagents` source/changelog, local Codex/Pi lineage references.
- Scoring script initially checked artifact completeness rather than running expensive interactive evals.
- The first metric saturated at 100 after enough required files/scenarios/citations/scripts were present.
- The second metric saturated at 120 after adding Claude Bridge cache-stat accounting.
- The third metric saturated after validating executability and table consistency. Next loop uses `smoke_score` to include local runtime prerequisites: `tmux` availability and a Pi launcher (`../pi-test.sh` or `pi` on PATH).

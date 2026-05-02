# Autoresearch: Pi Agent Tool A/B Eval Design

## Objective

Optimize the eval artifacts under `pi-agent-tool/` for a compact, evidence-backed, repeatable comparison of native Pi delegation (`/agents` + `agent`) against the `pi-subagents` extension.

## Metrics

- **Primary**: `dry_run_clean_score` (unitless, higher is better) — local-launch readiness plus proof that dry-run smoke checks do not leave tmux sessions or capture files behind.
- **Secondary**: `required_files`, `scenario_count`, `citation_count`, `cache_field_count`, `executable_scripts`, `bash_syntax_ok`, `table_consistency_ok`, `tmux_available`, `launcher_available`, `local_launcher_refs`, `dry_run_ok`, `dry_run_doc_refs`, `dry_run_no_leak`, `max_iterations`, `dry_run_uses_local_launcher`, `dry_run_no_capture_files`.

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
- The third metric saturated after validating executability and table consistency.
- Smoke readiness confirmed `tmux` and a Pi launcher exist.
- Launcher readiness confirmed helpers prefer repo-local `pi-test.sh`.
- Dry-run support confirmed helpers can be smoke-checked without opening interactive Pi.
- Dry-run docs confirmed README/runbook make the cheap check discoverable.
- Dry-run leak check confirmed cheap helper smoke tests do not leave tmux sessions behind.
- Resume-limit check confirmed `autoresearch.config.json` has `maxIterations: 60`.
- Local-launch proof confirmed dry-run output selects `./pi-test.sh` when that source-checkout launcher exists. Next loop uses `dry_run_clean_score` to ensure dry-run smoke checks also avoid writing capture files.

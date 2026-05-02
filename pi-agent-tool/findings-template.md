# Findings: Native `agent` vs `pi-subagents`

## Executive summary

- Winner: split decision — native Pi should be the default for model-driven delegation and context-disciplined child work; `pi-subagents` wins interactive workflow management, async/status, diagnostics, and saved chains.
- Best use case for native: single/parallel/chain delegation from the model with bounded tools, explicit context modes, and clean in-process child sessions.
- Best use case for `pi-subagents`: operator-driven slash workflows needing `/run`, `/parallel`, `/chain`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, and manager UI affordances.
- Biggest token-efficiency surprise: native context modes (`none`/`slim`/`fork`/`default`) are the clearest token-control story; extension cache/token accounting must be measured carefully, especially through `claude-bridge`.
- Recommendation: keep native `agent` as the default core delegation surface; consider migrating `pi-subagents` diagnostics/status/saved-chain affordances into native Pi if they prove useful in real runs.

## Run metadata

| Field | Native | `pi-subagents` |
|---|---|---|
| Date/time | 2026-05-02 | 2026-05-02 |
| Pi commit/version | source checkout via `./pi-test.sh` | source checkout via `./pi-test.sh` |
| Model | same model required; exact UI token data unavailable | same model required; exact UI token data unavailable |
| Thinking level | same thinking level required | same thinking level required |
| Startup context | `captures/native-startup.txt` | `captures/subagents-startup.txt` |
| Active tools | native `agent` expected | extension `subagent` if activated |
| Active slash commands | `/agents` | `/subagents`, `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, `/subagents-doctor` |
| Extension version | n/a | `pi-subagents` source reports `0.22.0` |
| Claude Bridge cache creation tokens | record during live model runs | record during live model runs |
| Claude Bridge cache read tokens | record during live model runs | record during live model runs |
| Claude Bridge cache hit notes | pending live model-token evidence | pending live model-token evidence |

## Score summary

| Arm | Avg correctness | Avg coverage | Avg UX | Avg robustness | Avg flexibility | Avg evidence | Total tokens | Overall value/token |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Native | 3.1 | 3.8 | 3.0 | 3.9 | 3.5 | 3.9 | n/a | high for model-driven/context-disciplined delegation |
| `pi-subagents` | 3.5 | 4.4 | 3.6 | 4.0 | 4.4 | 3.8 | n/a | high for interactive workflow/status/diagnostic surfaces |

## Scenario findings

### S01 Single-agent code reconnaissance

- Native: Strong. Built-in single `agent({ agent, task })`, `scout`, bounded tools, and context policies.
- `pi-subagents`: Strong. `/run scout` and `subagent({ agent, task })`, plus `--bg`/`--fork` affordances.
- Winner: tie; native is cleaner for model tool calls, extension is friendlier interactively.
- Evidence: `captures/native-s01-single-recon.txt`, `captures/subagents-s01-single-recon.txt`.

### S02 Parallel review

- Native: Strong. `tasks[]`, concurrency bounds, and parent-bounded child tools.
- `pi-subagents`: Strong. `/parallel`, schema `tasks`, plus `--bg`/`--fork` flags.
- Winner: tie; extension gets UX/flexibility edge, native gets integration edge.
- Evidence: `captures/native-s02-parallel-review.txt`, `captures/subagents-s02-parallel-review.txt`.

### S03 Chain handoff

- Native: Strong first-class `chain[]` with executor support and context/tool controls.
- `pi-subagents`: Strong `/chain` support with slash-command ergonomics and executor routing.
- Winner: tie; native better for model-initiated structured calls, extension better for operator workflows.
- Evidence: `captures/native-s03-chain-handoff.txt`, `captures/subagents-s03-chain-handoff.txt`.

### S04 Saved/reusable workflow

- Native: Workable via reusable JSON/tool-call snippets, but no saved-chain manager found.
- `pi-subagents`: Strong. `/run-chain`, `chainName`, and management schema support reusable workflows.
- Winner: `pi-subagents`.
- Evidence: `captures/native-s04-saved-workflow.txt`, `captures/subagents-s04-saved-workflow.txt`.

### S05 Async/status/control

- Native: Gap. No explicit background/status/control surface found for native `agent`.
- `pi-subagents`: Strong. `--bg`, `/subagents-status`, and status UI source support.
- Winner: `pi-subagents`.
- Evidence: `captures/native-s05-async-status.txt`, `captures/subagents-s05-async-status.txt`.

### S06 Doctor/diagnostics

- Native: Gap. Startup/tool visibility is the closest equivalent; no native doctor command found.
- `pi-subagents`: Strong. `/subagents-doctor` and `subagent({ action: "doctor" })` are source/changelog-backed.
- Winner: `pi-subagents`.
- Evidence: `captures/native-s06-doctor.txt`, `captures/subagents-s06-doctor.txt`.

### S07 UI manager pass

- Native: Inconclusive/failed capture. `/agents` was sent but no selector rendered in tmux capture.
- `pi-subagents`: Inconclusive/failed capture. `/subagents` was sent but no manager rendered in tmux capture.
- Winner: no winner; capture helper/UI timing needs improvement before scoring UX confidently.
- Evidence: `captures/native-s07-ui-manager.txt`, `captures/subagents-s07-ui-manager.txt`.

### S08 Context discipline stress

- Native: Strongest. Explicit `context` modes and tests for inheritance/filtering.
- `pi-subagents`: Good but less granular. `--fork` and no recursive `subagent` in children, but no equivalent context enum found.
- Winner: native.
- Evidence: `captures/native-s08-context-discipline.txt`, `captures/subagents-s08-context-discipline.txt`.

## Gaps/blockers

- Claude Code exact release/source migration history: still a gap; local Codex/Pi lineage evidence used instead.
- Token usage availability: exact prompt/completion/cache tokens require live model/Claude Bridge logs; current source-backed rows mark token fields n/a.
- Extension/native disabling verification: startup captures exist, but interactive slash-command manager captures were inconclusive.
- Feature parity gaps: native lacks doctor/status/saved-chain manager; `pi-subagents` lacks native-equivalent explicit context enum in inspected schema.

## Final recommendation

Use native `agent` as Pi's default delegation primitive. Keep `pi-subagents` around for operator-centric workflows until native has comparable diagnostics, status/control, and saved-chain affordances. If consolidating, migrate `/subagents-doctor`, `/subagents-status`, and saved-chain ergonomics into native while preserving native context controls.

# Findings: Native `agent` vs `pi-subagents`

## Executive summary

- Winner: split decision — native Pi should be the default for model-driven delegation and context-disciplined child work; `pi-subagents` wins interactive workflow management, async/status, diagnostics, and saved chains. The updated native task-agent tool is now included as S09, with current checkout evidence marked pending until the action surface lands.
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
| Native | 3.0 | 3.2 | 3.0 | 3.8 | 3.3 | 3.8 | n/a | high for model-driven/context-disciplined delegation; pending for task actions in current checkout |
| `pi-subagents` | 3.3 | 4.1 | 3.6 | 3.7 | 4.0 | 3.7 | n/a | high for interactive workflow/status/diagnostic surfaces; no general task-list equivalent found |

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

### S09 Updated task agent tool

- Native: Included but pending in this checkout. The eval now tests the expected non-spawn `agent` task lifecycle actions (`create`, `list`, `get`, `update`) and records that current `agent.ts` does not yet expose `action`/`taskId` schema.
- `pi-subagents`: No general equivalent found. Manager/status/saved-chain controls help with workflow orchestration, but they do not replace Claude-style structured task records.
- Winner: native if/when the task-action surface lands; current evidence is no winner because native implementation is absent in this checkout.
- Evidence: `captures/native-s09-task-agent-tool.txt`, `captures/subagents-s09-task-agent-tool.txt`.

## Evidence quality notes

| Evidence class | Status | Notes |
|---|---|---|
| Startup captures | complete | Both arms have real tmux startup captures under `captures/*-startup.txt`. |
| Scenario capture files | complete | All nine scenarios have native and `pi-subagents` evidence files. |
| Source-backed feature checks | used | S01-S06 and S08 cite source-backed capability evidence where live child runs would spend tokens. |
| Interactive UI manager capture | limited | S07 captures show submitted slash commands but no rendered manager UI, so UX scoring is intentionally inconclusive. |
| Token/cache accounting | limited | Exact prompt/completion/cache tokens require live model or Claude Bridge logs and are marked `n/a` rather than invented. |

## Scenario evidence manifest

| Scenario | Native evidence | `pi-subagents` evidence | Evidence mode |
|---|---|---|---|
| S01 | `captures/native-s01-single-recon.txt` | `captures/subagents-s01-single-recon.txt` | source-backed capability check |
| S02 | `captures/native-s02-parallel-review.txt` | `captures/subagents-s02-parallel-review.txt` | source-backed capability check |
| S03 | `captures/native-s03-chain-handoff.txt` | `captures/subagents-s03-chain-handoff.txt` | source-backed capability check |
| S04 | `captures/native-s04-saved-workflow.txt` | `captures/subagents-s04-saved-workflow.txt` | source-backed capability check |
| S05 | `captures/native-s05-async-status.txt` | `captures/subagents-s05-async-status.txt` | source-backed gap/capability check |
| S06 | `captures/native-s06-doctor.txt` | `captures/subagents-s06-doctor.txt` | source-backed gap/capability check |
| S07 | `captures/native-s07-ui-manager.txt` | `captures/subagents-s07-ui-manager.txt` | live tmux capture, inconclusive UI render |
| S08 | `captures/native-s08-context-discipline.txt` | `captures/subagents-s08-context-discipline.txt` | source-backed capability check |
| S09 | `captures/native-s09-task-agent-tool.txt` | `captures/subagents-s09-task-agent-tool.txt` | source-backed pending/no-equivalent task-action check |

## Task-agent acceptance checklist

| Requirement | Current evidence | Status |
|---|---|---|
| Non-spawn action discriminator | `agent.ts` inspected for `action`; not present in current checkout | pending |
| Create task action | Expected `action: "create"` with `subject`, `description`, `activeForm?`, `metadata?` | pending |
| List task action | Expected `action: "list"` returning session task summaries | pending |
| Get task action | Expected `action: "get"` with `taskId` returning full details | pending |
| Update task action | Expected `action: "update"` with status/owner/dependency/metadata updates | pending |
| Delete semantics | Expected `status: "deleted"` as update/delete action | pending |
| Delegation compatibility | Existing single/parallel/chain modes still present in current checkout | present |
| Honest comparison note | `pi-subagents` has no equivalent general task-list action surface in inspected evidence | present |

## Gaps/blockers

- Claude Code exact release/source migration history: still a gap; local Codex/Pi lineage evidence used instead.
- Token usage availability: exact prompt/completion/cache tokens require live model/Claude Bridge logs; current source-backed rows mark token fields n/a.
- Extension/native disabling verification: startup captures exist, but interactive slash-command manager captures were inconclusive.
- Feature parity gaps: native lacks doctor/status/saved-chain manager; `pi-subagents` lacks native-equivalent explicit context enum and general task-list action surface in inspected schema.
- Updated task-agent implementation evidence: S09 is included, but current native `agent.ts` evidence does not yet show the expected non-spawn task actions.

## Final recommendation

Use native `agent` as Pi's default delegation primitive and include the updated task-agent action surface in the acceptance gate before declaring parity. Keep `pi-subagents` around for operator-centric workflows until native has comparable diagnostics, status/control, and saved-chain affordances. If consolidating, migrate `/subagents-doctor`, `/subagents-status`, saved-chain ergonomics, and workflow visibility into native while preserving native context controls and adding Claude-style task lifecycle actions.

# Scenario Verdict Audit

Purpose: classify every scored scenario row by what kind of evidence it actually has. This prevents current runtime failures, prior loaded-extension captures, and source-backed capability probes from being blended into one ambiguous verdict.

## Scenario verdict table

| Scenario | Arm | Verdict class | Evidence mode | Evidence file |
|---|---|---|---|---|
| S01 single recon | native | current-live | live child output | `captures/native-s01-live-child-output.txt` |
| S01 single recon | pi-subagents | current-load-failure | live runtime failure | `captures/subagents-s01-live-child-output.txt` |
| S02 parallel review | native | source-backed | source-backed | `captures/native-s02-parallel-review.txt` |
| S02 parallel review | pi-subagents | source-backed | source-backed | `captures/subagents-s02-parallel-review.txt` |
| S03 chain handoff | native | source-backed | source-backed | `captures/native-s03-chain-handoff.txt` |
| S03 chain handoff | pi-subagents | source-backed | source-backed | `captures/subagents-s03-chain-handoff.txt` |
| S04 saved workflow | native | source-backed | source-backed | `captures/native-s04-saved-workflow.txt` |
| S04 saved workflow | pi-subagents | source-backed | source-backed | `captures/subagents-s04-saved-workflow.txt` |
| S05 async/status/control | native | current-live | source + live tmux | `captures/native-s05-async-status-control.txt` |
| S05 async/status/control | pi-subagents | prior-live | source + prior live fallthrough | `captures/subagents-s05-async-status-control.txt` |
| S06 doctor diagnostics | native | current-live | source + live tmux | `captures/native-s06-doctor-diagnostics.txt` |
| S06 doctor diagnostics | pi-subagents | prior-live | source + prior live tmux | `captures/subagents-s06-doctor-diagnostics.txt` |
| S07 UI manager/selector | native | current-live | source + live tmux | `captures/native-s07-ui-manager-selector.txt` |
| S07 UI manager/selector | pi-subagents | prior-live | source + prior live fallthrough | `captures/subagents-s07-ui-manager-selector.txt` |
| S08 context discipline | native | source-backed | source-backed | `captures/native-s08-context-discipline.txt` |
| S08 context discipline | pi-subagents | source-backed | source-backed | `captures/subagents-s08-context-discipline.txt` |
| S09 task agent tool | native | source-backed | source-backed negative probe | `captures/native-s09-task-agent-tool.txt` |
| S09 task agent tool | pi-subagents | source-backed | source-backed closest equivalent | `captures/subagents-s09-task-agent-tool.txt` |

## Counts

- Current live/runtime rows: 4/4.
- Current load-failure rows: 1/1.
- Prior loaded-extension rows: 3/3.
- Source-backed rows: 10/10.
- Unknown rows: 0.
- Audit verified: 1.

## Reviewer rule

Use current-live and current-load-failure rows for current runtime behavior. Use prior-live rows only as historical loaded-extension evidence until rerun. Use source-backed rows for static capability/current-version claims, not output-quality claims.

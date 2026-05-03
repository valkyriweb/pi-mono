# Scorecard Template

Copy one row per arm per scenario.

| Scenario | Arm | Correctness 1-5 | Coverage 1-5 | UX 1-5 | Robustness 1-5 | Flexibility 1-5 | Evidence 1-5 | Prompt tokens | Completion tokens | Total tokens | Claude Bridge cache creation | Claude Bridge cache read | Context notes | Latency | Reliability notes | `value_per_1k_tokens` | Evidence file |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|
| S01 single recon | native | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | Native single mode plus built-in `scout`, bounded child tools, and explicit context policies. | n/a | source-backed, execution not replayed | high | captures/native-s01-single-recon.txt |
| S01 single recon | pi-subagents | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | `/run scout` and `subagent({ agent, task })` supported; extra `--bg`/`--fork` affordances. | n/a | source-backed, execution not replayed | high | captures/subagents-s01-single-recon.txt |
| S02 parallel review | native | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | Native `tasks[]` parallel mode with concurrency bounds and parent-bounded child tools. | n/a | source-backed, execution not replayed | high | captures/native-s02-parallel-review.txt |
| S02 parallel review | pi-subagents | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | `/parallel` plus schema `tasks`; supports `--bg` and `--fork` flags for extra flexibility. | n/a | source-backed, execution not replayed | high | captures/subagents-s02-parallel-review.txt |
| S03 chain handoff | native | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | First-class `chain[]` in native `agent`; in-process child sessions, bounded tools, context modes. | n/a | source-backed, execution not replayed | high | captures/native-s03-chain-handoff.txt |
| S03 chain handoff | pi-subagents | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | `/chain` plus schema `chain` arrays and executor routing; interactive ergonomics strong. | n/a | source-backed, execution not replayed | high | captures/subagents-s03-chain-handoff.txt |
| S04 saved workflow | native | 3 | 3 | 3 | 4 | 3 | 4 | n/a | n/a | n/a | n/a | n/a | Native chain JSON is reusable via snippets/runbook, but no saved-chain manager found. | n/a | source-backed closest equivalent | medium | captures/native-s04-saved-workflow.txt |
| S04 saved workflow | pi-subagents | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | `/run-chain`, `chainName`, and management schema support saved/reusable workflows. | n/a | source-backed, interactive run pending | high | captures/subagents-s04-saved-workflow.txt |
| S05 async status | native | 2 | 1 | 2 | 4 | 1 | 4 | n/a | n/a | n/a | n/a | n/a | No explicit native background/status/control surface found; native agent runs are single/parallel/chain in-process. | n/a | supported gap, not runtime failure | low | captures/native-s05-async-status.txt |
| S05 async status | pi-subagents | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | n/a | n/a | Source confirms `--bg` parsing and `/subagents-status` UI; interactive run capture pending. | n/a | source-backed, command capture pending | high | captures/subagents-s05-async-status.txt |
| S06 doctor diagnostics | native | 2 | 1 | 2 | 4 | 1 | 4 | n/a | n/a | n/a | n/a | n/a | No native doctor equivalent found; startup/tool visibility is the closest diagnostic path. | n/a | supported gap, not runtime failure | low | captures/native-s06-doctor.txt |
| S06 doctor diagnostics | pi-subagents | 4 | 5 | 4 | 4 | 4 | 4 | n/a | n/a | n/a | n/a | n/a | Source confirms `/subagents-doctor` and `subagent({ action: "doctor" })`; interactive output pending. | n/a | source-backed, command capture pending | high | captures/subagents-s06-doctor.txt |
| S07 UI manager | native | 1 | 2 | 1 | 2 | 1 | 1 | n/a | n/a | n/a | n/a | n/a | Capture shows `/agents` sent but no selector rendered; likely captured before UI response or command not submitted in ready state. | ~10s | inconclusive/failed capture | low | captures/native-s07-ui-manager.txt |
| S07 UI manager | pi-subagents | 1 | 2 | 1 | 2 | 1 | 1 | n/a | n/a | n/a | n/a | n/a | Capture shows `/subagents` sent but no manager rendered; likely captured before UI response or command not submitted in ready state. | ~10s | inconclusive/failed capture | low | captures/subagents-s07-ui-manager.txt |
| S08 context discipline | native | 5 | 5 | 4 | 5 | 5 | 5 | n/a | n/a | n/a | n/a | n/a | Explicit `context` modes (`default`/`fork`/`slim`/`none`) plus tests for inheritance/filtering. | n/a | source-backed, strongest controls | high | captures/native-s08-context-discipline.txt |
| S08 context discipline | pi-subagents | 3 | 3 | 4 | 4 | 3 | 4 | n/a | n/a | n/a | n/a | n/a | `--fork` and no recursive `subagent` in children, but less granular than native context enum. | n/a | source-backed, less granular | medium | captures/subagents-s08-context-discipline.txt |
| S09 task agent tool | native | 2 | 2 | 3 | 3 | 4 | 4 | n/a | n/a | n/a | n/a | n/a | Scenario added for updated non-spawn task actions; current `agent.ts` checkout does not yet expose `action`/`taskId` task lifecycle schema. | n/a | source-backed pending implementation evidence | medium | captures/native-s09-task-agent-tool.txt |
| S09 task agent tool | pi-subagents | 2 | 2 | 3 | 3 | 3 | 4 | n/a | n/a | n/a | n/a | n/a | Extension has manager/status/saved-chain controls, but no general Claude-style task-list action surface found. | n/a | source-backed no-equivalent comparison | medium | captures/subagents-s09-task-agent-tool.txt |

## Summary math

- Average each 1-5 score by arm.
- Report total tokens and average score per 1k tokens.
- Use `value_per_1k_tokens` as judgment, not exact science: high means strong evidence or useful work at low token cost; low means expensive output, missing evidence, or weak UX.

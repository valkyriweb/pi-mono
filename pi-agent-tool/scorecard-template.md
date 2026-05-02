# Scorecard Template

Copy one row per arm per scenario.

| Scenario | Arm | Correctness 1-5 | Coverage 1-5 | UX 1-5 | Robustness 1-5 | Flexibility 1-5 | Evidence 1-5 | Prompt tokens | Completion tokens | Total tokens | Claude Bridge cache creation | Claude Bridge cache read | Context notes | Latency | Reliability notes | `value_per_1k_tokens` | Evidence file |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|
| S01 single recon | native |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/native-s01-single-recon.txt |
| S01 single recon | pi-subagents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/subagents-s01-single-recon.txt |
| S02 parallel review | native |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/native-s02-parallel-review.txt |
| S02 parallel review | pi-subagents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/subagents-s02-parallel-review.txt |
| S03 chain handoff | native |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/native-s03-chain-handoff.txt |
| S03 chain handoff | pi-subagents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/subagents-s03-chain-handoff.txt |
| S04 saved workflow | native |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/native-s04-saved-workflow.txt |
| S04 saved workflow | pi-subagents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/subagents-s04-saved-workflow.txt |
| S05 async status | native |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/native-s05-async-status.txt |
| S05 async status | pi-subagents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/subagents-s05-async-status.txt |
| S06 doctor diagnostics | native |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/native-s06-doctor.txt |
| S06 doctor diagnostics | pi-subagents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/subagents-s06-doctor.txt |
| S07 UI manager | native | 1 | 2 | 1 | 2 | 1 | 1 | n/a | n/a | n/a | n/a | n/a | Capture shows `/agents` sent but no selector rendered; likely captured before UI response or command not submitted in ready state. | ~10s | inconclusive/failed capture | low | captures/native-s07-ui-manager.txt |
| S07 UI manager | pi-subagents | 1 | 2 | 1 | 2 | 1 | 1 | n/a | n/a | n/a | n/a | n/a | Capture shows `/subagents` sent but no manager rendered; likely captured before UI response or command not submitted in ready state. | ~10s | inconclusive/failed capture | low | captures/subagents-s07-ui-manager.txt |
| S08 context discipline | native |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/native-s08-context-discipline.txt |
| S08 context discipline | pi-subagents |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | captures/subagents-s08-context-discipline.txt |

## Summary math

- Average each 1-5 score by arm.
- Report total tokens and average score per 1k tokens.
- Use `value_per_1k_tokens` as judgment, not exact science: high means strong evidence or useful work at low token cost; low means expensive output, missing evidence, or weak UX.

# Scorecard Template

Template only — not current evidence. Use `scorecard.md` for the filled current evaluation and `scenario-verdict-audit.md` for evidence classes. Do not cite this file for scores, token/cost claims, runtime availability, or winners.

Copy one row per arm per scenario, then replace every `tbd` cell with evidence-backed values.

| Scenario | Arm | Correctness 1-5 | Coverage 1-5 | UX 1-5 | Robustness 1-5 | Flexibility 1-5 | Evidence 1-5 | Prompt tokens | Completion tokens | Total tokens | Context notes | Latency | Reliability notes | `value_per_1k_tokens` | Evidence file |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|
| S01 single recon | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s01-*.txt |
| S01 single recon | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s01-*.txt |
| S02 parallel review | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s02-*.txt |
| S02 parallel review | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s02-*.txt |
| S03 chain handoff | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s03-*.txt |
| S03 chain handoff | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s03-*.txt |
| S04 saved workflow | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s04-*.txt |
| S04 saved workflow | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s04-*.txt |
| S05 async/status/control | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s05-*.txt |
| S05 async/status/control | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s05-*.txt |
| S06 doctor diagnostics | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s06-*.txt |
| S06 doctor diagnostics | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s06-*.txt |
| S07 UI manager/selector | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s07-*.txt |
| S07 UI manager/selector | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s07-*.txt |
| S08 context discipline | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s08-*.txt |
| S08 context discipline | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s08-*.txt |
| S09 task agent tool | native | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/native-s09-*.txt |
| S09 task agent tool | pi-subagents | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | tbd | captures/subagents-s09-*.txt |

## Summary math

- Average each 1-5 score by arm.
- Report token/cost values only when visible in live footer evidence; otherwise use `n/a`.
- Use `value_per_1k_tokens` as judgment, not exact science: high means strong evidence or useful work at low token cost; low means expensive output, missing evidence, or weak UX.

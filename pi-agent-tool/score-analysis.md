# Score Analysis

Generated from `scorecard.md` by `scripts/check-scorecard-consistency.py`. This file makes the numeric scorecard conclusions reproducible and guards against stale summary averages.

## Computed averages

| Arm | Avg correctness | Avg coverage | Avg UX | Avg robustness | Avg flexibility | Avg evidence |
|---|---:|---:|---:|---:|---:|---:|
| native | 4.3 | 4.4 | 3.8 | 4.6 | 4.1 | 4.7 |
| pi-subagents | 2.9 | 3.3 | 3.0 | 3.3 | 3.6 | 4.7 |

## Scenario numeric winners

| Scenario | Native total | `pi-subagents` total | Numeric winner |
|---|---:|---:|---|
| S01 single recon | 29 | 10 | native |
| S02 parallel review | 28 | 26 | native |
| S03 chain handoff | 28 | 26 | native |
| S04 saved workflow | 26 | 23 | native |
| S05 async/status/control | 28 | 24 | native |
| S06 doctor diagnostics | 28 | 26 | native |
| S07 UI manager/selector | 23 | 12 | native |
| S08 context discipline | 29 | 21 | native |
| S09 task agent tool | 14 | 19 | pi-subagents |

## Summary

- Numeric scenario wins: native=8, pi-subagents=1, tie=0.
- S02 and S03 are capability-near-ties in the prose, but native has a small numeric edge because the scorecard rewards tighter core integration/robustness.
- S05 moved to native after native background-run control landed in source/status evidence; S09 is now the only numeric win for `pi-subagents`, and only as a closest-equivalent management/status surface.
- The scorecard summary averages must match the computed averages above to one decimal place.

# Findings Alignment

Generated from `score-analysis.md` and `findings.md` by `scripts/check-findings-alignment.py`. This file guards against the prose conclusion drifting away from the numeric scorecard while preserving documented judgment calls.

## Scenario alignment

| Scenario | Numeric winner | Findings winner | Status | Reason |
|---|---|---|---|---|
| S01 single recon | native | native | aligned | Findings winner matches numeric winner. |
| S02 parallel review | native | tie | intentional-exception | Capability is effectively tied; prose records the extension async/fork flexibility edge while numeric score rewards native core integration. |
| S03 chain handoff | native | tie | intentional-exception | Capability is effectively tied; prose records operator-vs-core tradeoff while numeric score rewards native robustness/integration. |
| S04 saved workflow | native | native | aligned | Findings winner matches numeric winner. |
| S05 async/status/control | pi-subagents | pi-subagents | aligned | Findings winner matches numeric winner. |
| S06 doctor diagnostics | native | tie | intentional-exception | Both arms have real diagnostics; numeric score gives native a small edge, prose treats the feature as a practical tie. |
| S07 UI manager/selector | native | native | aligned | Findings winner matches numeric winner. |
| S08 context discipline | native | native | aligned | Findings winner matches numeric winner. |
| S09 task agent tool | pi-subagents | no current winner | intentional-exception | Numeric score favors pi-subagents closest-equivalent management/status controls, but prose correctly says no current winner because the requested native lifecycle surface is absent and extension controls are not equivalent. |

## Summary

- Aligned findings: 5.
- Intentional qualitative exceptions: 4.
- Conflicts: 0.
- Any non-zero conflict count fails the autoresearch scorer.

# Scorecard Template Audit

Purpose: keep `scorecard-template.md` from looking like current evidence. The tracked template had stale filled scores and obsolete claims after the eval moved from source-only baseline to live/current-failure evidence.

## Template checks

| Check | Value | Meaning |
|---|---:|---|
| template rows | 18 | Expected 9 scenarios × 2 arms. |
| warning present | 1 | Template says it is not current evidence and points to `scorecard.md`. |
| current columns | 1 | Header matches the current scorecard column set and drops obsolete Claude Bridge cache columns. |
| placeholder rows | 18 | Scenario rows use placeholder `tbd` score/token cells instead of stale filled scores. |
| no stale claims | 1 | Known obsolete source-only/runtime claims are absent. |
| verified | 1 | All checks passed. |

## Stale fragments

- Present stale fragments: none.

## Interpretation

- `scorecard-template.md` is now reusable scaffolding only. Current scores, current-vs-prior runtime status, and token/cost claims live in `scorecard.md` plus the audit artifacts.
- This avoids a reviewer accidentally citing the old seed template where `pi-subagents` S01/S05/S06 looked source-backed or pending rather than currently blocked by extension loading.

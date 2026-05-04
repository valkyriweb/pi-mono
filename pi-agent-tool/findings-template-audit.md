# Findings Template Audit

Purpose: keep `findings-template.md` as reusable scaffolding only. The tracked template previously contained stale filled-report claims from an early source-only baseline, including obsolete extension version, command surfaces, and winner guidance.

## Template checks

| Check | Value | Meaning |
|---|---:|---|
| required headings present | 18/18 | Template still has the expected report structure. |
| warning present | 1 | Template says it is not current evidence and points to filled artifacts. |
| placeholder count | 128 | Template uses `tbd` placeholders instead of filled findings. |
| no stale claims | 1 | Known obsolete filled-report fragments are absent. |
| verified | 1 | All checks passed. |

## Stale fragments

- Present stale fragments: none.

## Interpretation

- `findings-template.md` is now structure only. Current winners, runtime status, token/cost evidence, and recommendations live in `findings.md` and the audit artifacts.
- This prevents reviewers from citing the old seed report where `pi-subagents` appeared to win status/doctor/manager flows without the current load-failure caveat.

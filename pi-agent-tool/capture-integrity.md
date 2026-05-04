# Capture Integrity Audit

Purpose: verify that every scorecard evidence capture is not just present, but contains the scenario-specific markers the scorecard relies on. This is a lightweight guard against stale, swapped, or placeholder capture files.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| scorecard capture rows | 18 | Scorecard rows with evidence capture files. |
| expected capture files | 18 | Capture files with marker expectations. |
| scorecard files covered | 18/18 | Every scorecard evidence file has an integrity expectation. |
| files present | 18/18 | Expected capture files exist on disk. |
| markers expected | 78 | Scenario-specific marker checks. |
| markers present | 78/78 | Expected markers found in capture files. |
| scope current | 1 | Interpretation names native S05 paid start/status, interrupt/resume, and cancel probes. |
| runbook current | 1 | Runbook verdict names the current 78/78 marker count. |
| verified | 1 | All capture integrity checks passed. |

## Missing

- Missing files: none.
- Missing markers:
  - none

## Interpretation

- This does not replace live reruns; it checks that the captured/source-backed artifacts still contain the evidence claims cited by `scorecard.md`.
- The guard covers both current live captures and source-backed captures, including the current `pi-subagents` load failure and the native S05 paid start/status, interrupt/resume, and cancel probes plus unit-test caveat.

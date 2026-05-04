# Native Control Currentness Audit

Purpose: keep S05 aligned after native background-run control landed in source/status output and after paid live start/status, interrupt/resume, and cancel probes were captured. Earlier artifacts said native background control was unsupported or untested; this audit prevents those stale claims from returning.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| source markers | 8/8 | `agent.ts` exposes background and status/detail/interrupt/cancel/resume control markers. |
| status source text | 1 | `status.ts` reports supported native background control. |
| live status capture | 1 | `captures/native-s05-status-live.txt` was rerun and no longer says unsupported. |
| source capture summary | 1 | `captures/native-s05-async-status-control.txt` describes current native control and links all paid live S05 probes. |
| source-probe schema markers | 1 | Main native schema probe includes background/control markers. |
| source-probe disambiguation | 1 | `source-probes.md` separates generic control `action` hits from task lifecycle. |
| source-probe tests reference | 1 | `source-probes.md` links native control test evidence and paid live S05 probes. |
| tests interpretation | 1 | Interpretation names the native-control test and live probe evidence layers. |
| scorecard row current | 1 | Native S05 scorecard row names background status/detail/interrupt/cancel/resume. |
| findings current | 1 | Findings make native the current-runtime/source S05 winner. |
| README current | 1 | README's arm summary names native background-run control. |
| no stale unsupported claims | 1 | Key current artifacts no longer say native background control is unsupported. |
| markdown rows | 13 | Generated check table rows remain split. |
| verified | 1 | All checks passed. |

## Interpretation

- Native S05 is now scored from source, `native-control-tests.md`, a cheap `/agents-status` capture, one paid live start/status child probe, one paid live interrupt/resume probe, and one paid live cancel probe showing background control support.
- This does not satisfy S09 task-record lifecycle: `task-lifecycle-audit.md` separately verifies generic control is not create/list/get/update/delete task lifecycle.
- The paid cancel probe verifies operator-stop behavior without turning S05 into a broad child-output quality benchmark.

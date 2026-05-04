# Native Background Control Live Probe

Purpose: document the one tiny paid native S05 background-control start/status runtime probe. Earlier S05 evidence proved source/schema, local `/agents-status`, and unit-test coverage; this capture adds a real background child start, run-id control hint, `/agents-status <run-id>` detail, child read tool, output, and cost. Separate `native-background-interrupt-resume-live.md` and `native-background-cancel-live.md` probes paid-test interrupt/resume and cancel.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| capture present | 1 | `captures/native-s05-background-control-live.txt` exists. |
| background started | 1 | Parent returned `background running` with a native `agent-*` run id. |
| control hint | 1 | Capture shows `/agents-status`, `interrupt`, `cancel`, and `resume` hints for the run id. |
| status completed | 1 | `/agents-status <run-id>` detail shows the run completed and includes child session metadata. |
| read tool | 1 | Child used exactly the intended README `read` tool path. |
| child output | 1 | Appended child-session evidence contains `BACKGROUND_PROBE_OK findings.md`. |
| child tokens | 3377 | Child session usage tokens from captured session evidence. |
| child cost cents | 1.25 | Child session cost in cents. |
| parent footer cost cents | 7.4 | Parent tmux footer cost for the live probe session. |
| summaries current | 1 | Scorecard, findings, token evidence, runbook, and native-control audits all mention the S05 paid live probes. |
| rows | 12 | Generated check table rows remain split. |
| verified | 1 | All native background live checks passed. |

## Interpretation

- Native S05 has this paid live start/status child probe in addition to source, local status capture, unit-test evidence, and the separate paid interrupt/resume and cancel probes.
- This capture verifies the run-id control surface and completed status detail; the cancel probe separately verifies operator-stop behavior.
- This remains separate from S09 task-record lifecycle: generic background-run control is not create/list/get/update/delete task lifecycle.

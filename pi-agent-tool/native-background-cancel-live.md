# Native Background Cancel Live Probe

Purpose: document the paid native S05 background-control stress probe for cancel. Earlier evidence covered source/unit tests for cancel plus paid start/status and interrupt/resume probes; this capture starts a long-running background worker, cancels it, verifies the cancelled status, and confirms no final child output was produced.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| capture present | 1 | `captures/native-s05-background-cancel-live.txt` exists. |
| background started | 1 | Parent returned a native background run id. |
| cancel status | 1 | Status output shows `single background cancelled`. |
| worker cancelled | 1 | Child row shows worker cancellation and operator cancellation error. |
| no final output | 1 | Child session evidence has no forbidden final marker. |
| no read after cancel | 1 | Child session evidence has no `read` tool after cancellation. |
| child tokens | 12971 | Status usage tokens recorded for the cancelled child. |
| child cost cents | 6.75 | Status usage cost in cents for the cancelled child. |
| parent footer cost cents | 7.5 | Parent tmux footer cost for the cancel probe session. |
| summaries current | 1 | Scorecard, findings, token evidence, runbook, and audits mention cancel live evidence. |
| rows | 12 | Generated check table rows remain split. |
| verified | 1 | All cancel live checks passed. |

## Interpretation

- Native S05 now has paid live evidence for start/status, interrupt/resume, and cancel on background worker runs.
- This still does not satisfy S09 task-record lifecycle; it controls a background run id, not create/list/get/update/delete task records.
- The cancelled child spent tokens before producing tool output, which is useful cost evidence for operator-stop behavior.

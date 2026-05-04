# Native Background Interrupt/Resume Live Probe

Purpose: document the paid native S05 background-control stress probe for interrupt and resume. The earlier paid probe covered start/status; this one starts a long-running worker, interrupts it, verifies the resumable interrupted status, resumes with a new prompt, and captures final child output and cost. A separate cancel probe covers operator-stop behavior.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| capture present | 1 | `captures/native-s05-background-interrupt-resume-live.txt` exists. |
| background started | 1 | Parent returned a native background run id. |
| interrupt status | 1 | Checkpoint shows `single background interrupted`. |
| resumable | 1 | Interrupted run advertises `/agents resume`. |
| resume command | 1 | Checkpoint shows `Resumed agent-*`. |
| completed after resume | 1 | Final status shows the run completed after resume. |
| child output | 1 | Child session evidence contains `INTERRUPT_RESUME_PROBE_OK`. |
| child tokens | 13139 | Last child-session usage tokens. |
| child cost cents | 2.0 | Last child-session usage cost in cents. |
| parent footer cost cents | 7.7 | Parent tmux footer cost for the stress probe session. |
| summaries current | 1 | Scorecard, findings, token evidence, runbook, and audits mention interrupt/resume and cancel live evidence. |
| rows | 13 | Generated check table rows remain split. |
| verified | 1 | All interrupt/resume live checks passed. |

## Interpretation

- Native S05 now has paid live evidence for start/status plus interrupt/resume on a background worker run, with cancel covered by a separate paid probe.
- The run is still separate from S09 task-record lifecycle; it controls a background run id, not create/list/get/update/delete task records.
- The cancel probe verifies operator-stop behavior without broadening S05 into a child-output quality benchmark.

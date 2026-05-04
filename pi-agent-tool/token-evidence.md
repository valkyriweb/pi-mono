# Token Evidence

Purpose: record the token/value evidence that is visible in live tmux captures, especially the `pi-subagents` removed-command fallthrough cost and the intentionally tiny native paid child probes. Values are UI footer readings from captured terminal output where available; child-session usage in the native S05 background probes is copied into the captures so the status/control evidence is self-contained.

## Live capture token table

| Scenario | Arm | Capture | Prompt/input tokens | Completion/output tokens | Cost | Interpretation |
|---|---|---|---:|---:|---:|---|
| S05 async/status/control | native | `captures/native-s05-status-live.txt` | 0 | 0 | $0.000 | Registered native `/agents-status` handled locally; no model turn. |
| S06 doctor diagnostics | native | `captures/native-s06-doctor-live.txt` | 0 | 0 | $0.000 | Registered native `/agents-doctor` handled locally; no model turn. |
| S07 UI manager/selector | native | `captures/native-s07-ui-selector-live.txt` | 0 | 0 | $0.000 | Registered native `/agents` selector handled locally; no model turn. |
| S01 single recon | native | `captures/native-s01-live-child-output.txt` | ~13k | ~159 | $0.076 | Live native child scout completed; child details show 1958 tokens and one `read` tool use. |
| S05 async/status/control | native | `captures/native-s05-background-control-live.txt` | ~13k parent / 3377 child | ~90 parent / 10 child | $0.074 footer / $0.0125 child | Paid native background child start/status probe completed; status detail shows one `read` tool and child-session evidence records `BACKGROUND_PROBE_OK findings.md`. |
| S05 async/status/control | native | `captures/native-s05-background-interrupt-resume-live.txt` | ~13k parent / 13139 child | ~126 parent / n/a child | $0.077 footer / $0.0200 child | Paid native background interrupt/resume probe interrupted a worker, showed resumable status, resumed, completed, and records `INTERRUPT_RESUME_PROBE_OK autoresearch.md`. |
| S05 async/status/control | native | `captures/native-s05-background-cancel-live.txt` | ~13k parent / 12971 child | ~115 parent / n/a child | $0.075 footer / $0.0675 child | Paid native background cancel probe stopped a worker, showed cancelled status, and records no final child output or read tool. |
| S01 single recon | pi-subagents | `captures/subagents-s01-live-child-output.txt` | n/a | n/a | n/a | Current fresh extension launch failed before `/run scout`; no child output/token accounting available. |
| S05 async/status/control | pi-subagents | `captures/subagents-s05-status-removed-live.txt` | ~11k | 106 | $0.056 | Removed `/subagents-status` was not registered, fell through to parent model, and invoked `subagent list` in an earlier successful extension load. |
| S07 UI manager/selector | pi-subagents | `captures/subagents-s07-manager-removed-live.txt` | ~11k | 81 | $0.055 | Removed `/subagents` was not registered, fell through to parent model, and invoked `subagent list` in an earlier successful extension load. |

## Aggregate observed removed-command cost

| Group | Prompt/input tokens | Completion/output tokens | Cost | Notes |
|---|---:|---:|---:|---|
| Native registered command probes | 0 | 0 | $0.000 | `/agents-status`, `/agents-doctor`, `/agents` were local UI/command paths. |
| Native intentional paid child probes | ~52k parent / 31445 child | ~490 parent / n/a child | $0.302 footer / $0.1760 child | S01 live child output plus S05 background start/status, interrupt/resume, and cancel probes. |
| `pi-subagents` removed-command probes | ~22k | 187 | $0.111 | `/subagents-status` + `/subagents` were unregistered in 0.24.0 and fell through to model turns. |

## Evidence excerpts

```text
captures/native-s05-status-live.txt: $0.000 (sub) ... gpt-5.5 • thinking off
captures/native-s06-doctor-live.txt: $0.000 (sub) ... gpt-5.5 • thinking off
captures/native-s07-ui-selector-live.txt: $0.000 (sub) ... gpt-5.5 • thinking off
captures/native-s05-background-control-live.txt: ↑13k ↓90 $0.074 (sub) ... child usage 3377 tok $0.0125
captures/native-s05-background-interrupt-resume-live.txt: ↑13k ↓126 $0.077 (sub) ... child usage 13139 tok $0.0200
captures/native-s05-background-cancel-live.txt: ↑13k ↓115 $0.075 (sub) ... child usage 12971 tok $0.0675
captures/subagents-s05-status-removed-live.txt: ↑11k ↓106 $0.056 (sub) ... gpt-5.5 • thinking off
captures/subagents-s07-manager-removed-live.txt: ↑11k ↓81 $0.055 (sub) ... gpt-5.5 • thinking off
```

## Conclusion

For the earlier loaded-extension `pi-subagents` 0.24.0 captures, the removed `/subagents` and `/subagents-status` surfaces were not just unavailable; they were a token-spend footgun because unregistered slash strings entered the normal model path. The current fresh extension launch now fails before `/run`, so S01 has no `pi-subagents` child token accounting. Native registered `/agents*` commands avoid model cost in the comparable UI/status/doctor probes, while the intentional native S01 child-output and S05 background-control paid probes, including interrupt/resume and cancel, are recorded separately.

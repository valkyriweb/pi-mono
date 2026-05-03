# Token Evidence

Purpose: record the token/value evidence that is visible in live tmux captures, especially the `pi-subagents` removed-command fallthrough cost. Values are UI footer readings from captured terminal output; `↑11k` is rounded by Pi's footer, so totals are approximate.

## Live capture token table

| Scenario | Arm | Capture | Prompt/input tokens | Completion/output tokens | Cost | Interpretation |
|---|---|---|---:|---:|---:|---|
| S05 async/status/control | native | `captures/native-s05-status-live.txt` | 0 | 0 | $0.000 | Registered native `/agents-status` handled locally; no model turn. |
| S06 doctor diagnostics | native | `captures/native-s06-doctor-live.txt` | 0 | 0 | $0.000 | Registered native `/agents-doctor` handled locally; no model turn. |
| S07 UI manager/selector | native | `captures/native-s07-ui-selector-live.txt` | 0 | 0 | $0.000 | Registered native `/agents` selector handled locally; no model turn. |
| S01 single recon | native | `captures/native-s01-live-child-output.txt` | ~13k | ~159 | $0.076 | Live native child scout completed; child details show 1958 tokens and one `read` tool use. |
| S01 single recon | pi-subagents | `captures/subagents-s01-live-child-output.txt` | n/a | n/a | n/a | Current fresh extension launch failed before `/run scout`; no child output/token accounting available. |
| S05 async/status/control | pi-subagents | `captures/subagents-s05-status-removed-live.txt` | ~11k | 106 | $0.056 | Removed `/subagents-status` was not registered, fell through to parent model, and invoked `subagent list` in an earlier successful extension load. |
| S07 UI manager/selector | pi-subagents | `captures/subagents-s07-manager-removed-live.txt` | ~11k | 81 | $0.055 | Removed `/subagents` was not registered, fell through to parent model, and invoked `subagent list` in an earlier successful extension load. |

## Aggregate observed removed-command cost

| Group | Prompt/input tokens | Completion/output tokens | Cost | Notes |
|---|---:|---:|---:|---|
| Native registered command probes | 0 | 0 | $0.000 | `/agents-status`, `/agents-doctor`, `/agents` were local UI/command paths. |
| `pi-subagents` removed-command probes | ~22k | 187 | $0.111 | `/subagents-status` + `/subagents` were unregistered in 0.24.0 and fell through to model turns. |

## Evidence excerpts

```text
captures/native-s05-status-live.txt: $0.000 (sub) ... gpt-5.5 • thinking off
captures/native-s06-doctor-live.txt: $0.000 (sub) ... gpt-5.5 • thinking off
captures/native-s07-ui-selector-live.txt: $0.000 (sub) ... gpt-5.5 • thinking off
captures/subagents-s05-status-removed-live.txt: ↑11k ↓106 $0.056 (sub) ... gpt-5.5 • thinking off
captures/subagents-s07-manager-removed-live.txt: ↑11k ↓81 $0.055 (sub) ... gpt-5.5 • thinking off
```

## Conclusion

For current `pi-subagents` 0.24.0, the removed `/subagents` and `/subagents-status` surfaces are not just unavailable; they are a token-spend footgun because unregistered slash strings enter the normal model path. Native registered `/agents*` commands avoid that cost in the comparable UI/status/doctor probes.

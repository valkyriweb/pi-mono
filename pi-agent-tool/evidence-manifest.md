# Evidence Manifest

Purpose: make the scorecard reproducible by tying each scored row to an existing evidence file, evidence mode, and any live tmux/source probe that supports the claim. This prevents the eval from scoring rows whose evidence paths are stale or missing.

## Global evidence

| Evidence | Path | Status | Notes |
|---|---|---|---|
| Native startup capture | `captures/native-startup.txt` | present | Launch includes `--no-extensions --tools agent,read,grep,find,ls --thinking off`. |
| `pi-subagents` startup capture | `captures/subagents-startup.txt` | present | Launch includes `--no-builtin-tools --no-extensions -e <pi-subagents> --thinking off`. |
| Source probes | `source-probes.md` | present | Includes native command/tool probes, extension command/tool probes, removed-surface proof, and S09 negative task lifecycle probe. |
| Token evidence | `token-evidence.md` | present | Records native `$0.000` registered command captures and `pi-subagents` removed-command fallthrough token/cost readings. |
| Isolation proof | `isolation-proof.md` | present | Records native/no-subagent and extension/no-native-agent booleans. |

## Scenario evidence map

| Scenario | Arm | Scorecard evidence file | Evidence mode | Supporting live/source evidence | Status |
|---|---|---|---|---|---|
| S01 single recon | native | `captures/native-s01-single-recon.txt` | source-backed | `source-probes.md` native single `agent` schema | present |
| S01 single recon | pi-subagents | `captures/subagents-s01-single-recon.txt` | source-backed | `source-probes.md` `/run` and `subagent` schema | present |
| S02 parallel review | native | `captures/native-s02-parallel-review.txt` | source-backed | `source-probes.md` native `tasks[]` schema | present |
| S02 parallel review | pi-subagents | `captures/subagents-s02-parallel-review.txt` | source-backed | `source-probes.md` `/parallel`, `tasks[]`, `--bg`, `--fork` | present |
| S03 chain handoff | native | `captures/native-s03-chain-handoff.txt` | source-backed | `source-probes.md` native `chain[]` and `/agents run-chain` | present |
| S03 chain handoff | pi-subagents | `captures/subagents-s03-chain-handoff.txt` | source-backed | `source-probes.md` `/chain` and `/run-chain` | present |
| S04 saved workflow | native | `captures/native-s04-saved-workflow.txt` | source-backed | `source-probes.md` native saved chain handler/docs | present |
| S04 saved workflow | pi-subagents | `captures/subagents-s04-saved-workflow.txt` | source-backed | `source-probes.md` `/run-chain`; `CHANGELOG.md` 0.24.0 removed save UI | present |
| S05 async/status/control | native | `captures/native-s05-async-status-control.txt` | source + live tmux | `captures/native-s05-status-live.txt`; native status source says background control unsupported | present |
| S05 async/status/control | pi-subagents | `captures/subagents-s05-async-status-control.txt` | source + live fallthrough | `captures/subagents-s05-status-removed-live.txt`; tool schema has status/interrupt/resume, `/subagents-status` removed | present |
| S06 doctor diagnostics | native | `captures/native-s06-doctor-diagnostics.txt` | source + live tmux | `captures/native-s06-doctor-live.txt`; native doctor source | present |
| S06 doctor diagnostics | pi-subagents | `captures/subagents-s06-doctor-diagnostics.txt` | source + live tmux | `captures/subagents-s06-doctor-live.txt`; extension doctor source | present |
| S07 UI manager/selector | native | `captures/native-s07-ui-manager-selector.txt` | source + live tmux | `captures/native-s07-ui-selector-live.txt`; `/agents` selector source | present |
| S07 UI manager/selector | pi-subagents | `captures/subagents-s07-ui-manager-selector.txt` | source + live fallthrough | `captures/subagents-s07-manager-removed-live.txt`; `pi-subagents` 0.24.0 removed manager overlay | present |
| S08 context discipline | native | `captures/native-s08-context-discipline.txt` | source-backed | `source-probes.md` native `default/fork/slim/none` and filtered fork context | present |
| S08 context discipline | pi-subagents | `captures/subagents-s08-context-discipline.txt` | source-backed | `source-probes.md` `--fork` only; prompt runtime blocks recursive delegation | present |
| S09 task agent tool | native | `captures/native-s09-task-agent-tool.txt` | source-backed negative probe | `source-probes.md` native task lifecycle grep exits 1 for `action/taskId/create/list/get/update` | present |
| S09 task agent tool | pi-subagents | `captures/subagents-s09-task-agent-tool.txt` | source-backed closest equivalent | `source-probes.md` extension management/status actions; no general task-list equivalent | present |

## Version and removed-surface guardrails

- Current extension version is source-probed as `pi-subagents 0.24.0`.
- `0.24.0` removed the old `/agents` manager overlay; no `/subagents` replacement is registered in current `src/slash/slash-commands.ts`.
- `0.24.0` removed `/subagents-status`; async runs remain inspectable through `subagent({ action: "status" })`, notifications, logs, and widgets.
- The two removed-command probes are preserved because they reveal a real UX/token tradeoff: unregistered slash strings fell through into parent model turns and invoked `subagent list` rather than opening slash UIs.
- `token-evidence.md` aggregates those footer readings as roughly ↑22k prompt, ↓187 completion tokens, and $0.111 total cost, while comparable native registered command probes remained `$0.000`.

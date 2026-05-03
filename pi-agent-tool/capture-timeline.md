# Capture Timeline

Purpose: make temporal drift explicit. The eval contains older `pi-subagents` captures where the extension loaded, plus newer captures where the same fresh launch now fails before slash-command registration. This file prevents those states from being silently merged as if they were simultaneous.

## Timeline rows

| Capture | Timestamp | Classification | Note |
|---|---:|---|---|
| `captures/native-startup.txt` | 2026-05-03T16:08:24Z | native-reference | native capture in the same eval session |
| `captures/native-s06-doctor-live.txt` | 2026-05-03T16:08:43Z | native-reference | native capture in the same eval session |
| `captures/native-s05-status-live.txt` | 2026-05-03T16:08:55Z | native-reference | native capture in the same eval session |
| `captures/native-s07-ui-selector-live.txt` | 2026-05-03T16:09:07Z | native-reference | native capture in the same eval session |
| `captures/subagents-s06-doctor-live.txt` | 2026-05-03T16:09:19Z | prior-extension-loaded | older `pi-subagents` command/fallthrough capture from before load regression was observed |
| `captures/subagents-s05-status-removed-live.txt` | 2026-05-03T16:09:31Z | prior-extension-loaded | older `pi-subagents` command/fallthrough capture from before load regression was observed |
| `captures/subagents-s07-manager-removed-live.txt` | 2026-05-03T16:09:44Z | prior-extension-loaded | older `pi-subagents` command/fallthrough capture from before load regression was observed |
| `captures/subagents-run-usage-live.txt` | 2026-05-03T16:09:56Z | prior-extension-loaded | older `pi-subagents` command/fallthrough capture from before load regression was observed |
| `captures/subagents-chain-usage-live.txt` | 2026-05-03T16:10:08Z | prior-extension-loaded | older `pi-subagents` command/fallthrough capture from before load regression was observed |
| `captures/subagents-parallel-usage-live.txt` | 2026-05-03T16:10:20Z | prior-extension-loaded | older `pi-subagents` command/fallthrough capture from before load regression was observed |
| `captures/subagents-run-chain-usage-live.txt` | 2026-05-03T16:10:32Z | prior-extension-loaded | older `pi-subagents` command/fallthrough capture from before load regression was observed |
| `captures/native-s01-live-child-output.txt` | 2026-05-03T16:45:37Z | native-reference | native capture in the same eval session |
| `captures/subagents-s01-live-child-output.txt` | 2026-05-03T16:46:59Z | current-load-failure | extension failed before slash commands registered |
| `captures/subagents-startup.txt` | 2026-05-03T16:49:19Z | current-load-failure | extension failed before slash commands registered |

## Drift interpretation

- Timestamped important captures: 14/14.
- Prior `pi-subagents` loaded/command captures: 7.
- Current `pi-subagents` load-failure captures: 2.
- Prior-success captures all predate current-failure captures: true.
- Use source-backed extension capability rows as historical/source evidence, but use the current load-failure captures for current-runtime availability until the extension loader issue is fixed and rerun.

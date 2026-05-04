# Live Child Output

Purpose: capture one tiny symmetric S01 live run rather than relying only on source-backed capability. The native arm completed a real child scout run. The `pi-subagents` arm currently failed during fresh extension loading before `/run scout` could execute, which is scored as runtime reliability evidence rather than ignored.

## Live S01 result table

| Arm | Capture | Runtime outcome | Tool/use evidence | Token/cost evidence | Verdict |
|---|---|---|---|---|---|
| native | `captures/native-s01-live-child-output.txt` | completed=1 | read_tool=1; exact_three_files=1 | child_tokens=1958; child_seconds_x10=69; footer_cost_cents=7.6 | live child output verified |
| pi-subagents | `captures/subagents-s01-live-child-output.txt` | load_error=1 | module_format_error=1; shell_fallthrough=1; no_child_started=1 | n/a | extension runtime failed before child output |

## Interpretation

- Native `/agents run scout` produced a real child-agent result for the cheap README artifact-list task.
- The extension source still declares `/run`, but the current fresh eval launch fails to load `pi-subagents` with a module-format error before the slash command can run.
- This supersedes purely source-backed S01 extension scoring for current-runtime reliability. If the extension loader issue is fixed, rerun this probe and rescore S01 instead of preserving the failure verdict.

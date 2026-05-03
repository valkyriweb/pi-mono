# Findings: Native Pi `agent` vs `pi-subagents`

## Executive summary

- Winner: native for core delegation, context discipline, saved-chain parity, native diagnostics, and recent-run visibility.
- Winner: `pi-subagents` only where background async/status/control/resume matters.
- Current installed `pi-subagents` is `0.24.0`; it removed the requested `/subagents` manager UI and `/subagents-status` slash overlay. Those are scored as unavailable, not pending captures.
- Native Pi now has `/agents-doctor`, `/agents-status`, `/agents run`, `/agents parallel`, `/agents run-chain`, and saved chains. That narrows the older extension advantage substantially.
- S09 task-agent lifecycle is not implemented in the current native `agent` schema: no `action`, `taskId`, `activeForm`, dependency, metadata, or create/list/get/update/delete task record surface found.

## Run metadata

| Field | Native | `pi-subagents` |
|---|---|---|
| Launch isolation | `--no-extensions --tools agent,read,grep,find,ls` | `--no-builtin-tools --no-extensions -e <pi-subagents>` |
| Thinking | `off` | `off` |
| Model calls in baseline | none | two removed-command fallthrough probes (`/subagents`, `/subagents-status`), no child-agent runs |
| Startup capture | `captures/native-startup.txt` | `captures/subagents-startup.txt` |
| Live cheap captures | `/agents-doctor`, `/agents-status`, `/agents` | `/subagents-doctor`, removed `/subagents-status`, removed `/subagents` |
| Source probes | `source-probes.md` | `source-probes.md` |
| Token accounting | unavailable / no model calls | fallthrough captures show about ↑22k prompt and ↓187 completion tokens total |

## S01 Single-agent reconnaissance

- Native: strong. Built-in `agent({agent, task})` is first-class and keeps child tools bounded by parent active tools.
- `pi-subagents`: good. `/run` and `subagent({agent, task})` are available, but extension setup is more moving parts.
- Winner: native by integration simplicity.

## S02 Parallel review

- Native: strong. `tasks[]` parallel mode and concurrency are part of the built-in tool schema.
- `pi-subagents`: strong. `/parallel` and `tasks[]` support remain, with `--bg`/`--fork` extras.
- Winner: tie on capability; extension wins async flexibility, native wins core integration.

## S03 Sequential chain handoff

- Native: strong. `chain[]` and `/agents run-chain` cover sequential handoff and saved-chain scaffolding.
- `pi-subagents`: strong. `/chain` and `/run-chain` remain good operator-facing commands.
- Winner: tie; native no longer lacks a saved-chain story.

## S04 Saved/reusable workflow

- Native: good. Saved JSON chains and `/agents run-chain` are documented and implemented.
- `pi-subagents`: mixed. `/run-chain` exists, but 0.24.0 removed manager overlay and persistent clarify save actions.
- Winner: native for current installed behavior.

## S05 Async/background/status/control

- Native: partial. `/agents-status` shows recent foreground child runs and details, but native status explicitly says background control is unsupported.
- `pi-subagents`: strongest. Tool actions support async/background status, interrupt, and resume. Caveat: `/subagents-status` slash overlay was removed; the live probe fell through to a normal model turn that invoked `subagent list` and cost roughly ↑11k/↓106 tokens. Use `subagent({action:"status"})`, widgets, logs, or completion notifications.
- Winner: `pi-subagents`.

## S06 Doctor/diagnostics

- Native: strong. `/agents-doctor` reports runtime services, active tools, agents/chains, model availability, and definition diagnostics.
- `pi-subagents`: strong. `/subagents-doctor` and `subagent({action:"doctor"})` report extension runtime/filesystem/session/intercom diagnostics.
- Winner: tie, with native now having a real equivalent.

## S07 UI manager/selector pass

- Native: available. `/agents` opens a selector/scaffold UI.
- `pi-subagents`: unavailable for the requested manager command. `/subagents` is not registered in current source; 0.24.0 removed the old `/agents` manager overlay. The live probe fell through to a normal model turn that invoked `subagent list` and cost roughly ↑11k/↓81 tokens.
- Winner: native by default; extension has no current manager UI surface for this scenario.

## S08 Context discipline/forking

- Native: strongest. It exposes `default`, `fork`, `slim`, and `none`; forked transcripts filter both `agent` and `subagent` artifacts.
- `pi-subagents`: partial. `--fork` exists, but there is no equivalent context enum breadth.
- Winner: native.

## S09 Updated native task-agent lifecycle actions

- Native: absent in current checkout. The tool schema still requires exactly one delegation mode: `{agent, task}`, `{tasks}`, or `{chain}`.
- `pi-subagents`: closest equivalent only. It can create/list/get/update/delete agent and chain definitions and control async runs, but that is not a general non-spawn task-list lifecycle API.
- Winner: no current winner. Native should win if the requested lifecycle surface lands; right now the eval marks it pending/absent honestly.

## Evidence quality notes

- `score-analysis.md` computes scorecard averages and numeric winners from the filled rows; it corrected a stale `pi-subagents` UX average from 3.2 to 3.3.
- `findings-alignment.md` checks that prose winners align with numeric winners, with documented exceptions for capability ties and non-equivalent closest matches.
- `command-surface.md` verifies the current native and extension slash-command surfaces, launch isolation flags, and removed `pi-subagents` 0.24.0 surfaces so command drift cannot silently invalidate the eval.
- `evidence-manifest.md` maps every scorecard row to a concrete evidence file, links live/source supporting captures, and protects against stale scorecard paths.
- Startup captures are real tmux captures where cheap.
- Scenario captures for S01-S04, S08, and S09 are source-backed to avoid paid child-agent runs.
- S05-S07 include cheap command/UI captures plus source evidence.
- Two extension removed-command probes (`/subagents`, `/subagents-status`) were not recognized as commands and fell through to model turns; this is real UX/token evidence and is recorded instead of hidden.
- `token-evidence.md` records footer token/cost readings: native registered command probes show `$0.000`, while removed `/subagents-status` + `/subagents` fallthrough probes show about ↑22k prompt, ↓187 completion tokens, and $0.111 total cost.
- Token/cache fields are mostly `n/a`; exact cache details are unavailable, but the fallthrough captures show footer token/cost summaries.
- `/subagents` and `/subagents-status` are not pending evidence; current extension source/changelog says they were removed.

## Honest limitations

- No live child-agent outputs were generated, so correctness of model-generated child reports is source-inferred, not runtime-measured.
- Two removed-command probes did spend parent-model tokens; they did not spawn child agents, and the cost is recorded as part of UX/token evidence.
- Exact cache creation/cache read values are unavailable in this baseline.
- tmux UI captures can show startup/command surfaces, but not semantic selector internals as richly as a dedicated TUI test.
- Native S09 is scored as absent because current schema lacks lifecycle fields; if another branch has the update, rerun the source probe against that branch.

## Recommendation

Use native `agent` as Pi's default delegation layer. Keep `pi-subagents` only for background async/control/resume workflows that native intentionally does not cover. If consolidating or continuing to ship `pi-subagents`, protect removed slash surfaces from falling through to expensive model turns. Prioritize native task lifecycle actions (S09) and decide whether background control belongs in core or should stay extension-owned.

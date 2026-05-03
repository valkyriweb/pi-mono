# Findings: Native Pi `agent` vs `pi-subagents`

## Executive summary

- Winner: native for core delegation, context discipline, saved-chain parity, native diagnostics, and recent-run visibility.
- Source/tool-schema winner: `pi-subagents` only where background async/status/control/resume matters; current runtime use is blocked until the module-format load failure is fixed and rerun.
- Current installed `pi-subagents` is `0.24.0`; it removed the requested `/subagents` manager UI and `/subagents-status` slash overlay. Those are scored as unavailable, not pending captures.
- Native Pi now has `/agents-doctor`, `/agents-status`, `/agents run`, `/agents parallel`, `/agents run-chain`, and saved chains. That narrows the older extension advantage substantially.
- S09 task-agent lifecycle is not implemented in the current native `agent` schema: no `action`, `taskId`, `activeForm`, dependency, metadata, or create/list/get/update/delete task record surface found.

## Run metadata

| Field | Native | `pi-subagents` |
|---|---|---|
| Launch isolation | `--no-extensions --tools agent,read,grep,find,ls` | `--no-builtin-tools --no-extensions -e <pi-subagents>` |
| Thinking | `off` | `off` |
| Model calls in baseline | one tiny S01 native child run; registered native command probes are local | two prior removed-command fallthrough parent turns (`/subagents`, `/subagents-status`); current S01 `/run` fails before child execution |
| Startup capture | `captures/native-startup.txt` | `captures/subagents-startup.txt` (current fresh launch fails to load extension) |
| Live cheap captures | `/agents-doctor`, `/agents-status`, `/agents`, S01 native child output | prior `/subagents-doctor`, removed `/subagents-status`, removed `/subagents`; current S01 `/run scout` fails before extension loads |
| Source probes | `source-probes.md` | `source-probes.md` |
| Token accounting | native S01 footer shows ~13k prompt, ~159 completion, ~$0.076; registered command probes show `$0.000` | prior fallthrough captures show about ↑22k prompt, ↓187 completion, and $0.111 total; current S01 has no child token accounting |

## S01 Single-agent reconnaissance

- Native: strong. Live `/agents run scout` completed, used one `read` tool on `pi-agent-tool/README.md`, and returned exactly three artifact filenames within the requested scope.
- `pi-subagents`: source declares `/run` and `subagent({agent, task})`, but the current fresh extension launch fails with a module-format load error before `/run scout` can execute.
- Winner: native by integration simplicity and current runtime reliability.

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
- `pi-subagents`: strongest source/tool-schema surface for async/background status, interrupt, and resume. Caveat: current fresh extension loading is blocked; in the earlier loaded-extension probe, removed `/subagents-status` fell through to a normal model turn that invoked `subagent list` and cost roughly ↑11k/↓106 tokens. Once loading is fixed and rerun, use `subagent({action:"status"})`, widgets, logs, or completion notifications.
- Winner: `pi-subagents` for source-level background-control capability; current-runtime availability is blocked until the loader issue is fixed.

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
- `live-child-output.md` records one tiny symmetric S01 run: native child output verified; current `pi-subagents` fresh runtime fails before child output.
- `extension-load-audit.md` explains that failure from captures plus source: `pi-subagents` 0.24.0 declares an ESM TypeScript entry, Pi loads it through jiti, and the module-format error happens before slash commands register.
- `capture-timeline.md` makes the mixed capture state explicit: seven older extension-loaded captures predate the two current load-failure captures, so historical/source capability and current runtime availability are not conflated.
- `stale-evidence-policy.md` gives reviewers the rule of use: cite load-failure captures for current runtime, cite older loaded-extension captures only as historical/source-supported behavior unless they are rerun.
- `scenario-verdict-audit.md` classifies all 18 scored rows as current-live, current-load-failure, prior-live, or source-backed so the final verdict cannot quietly mix evidence classes.
- `token-accounting-audit.md` keeps the model-call/token accounting honest: one native S01 child probe, three zero-cost native registered commands, two prior extension fallthroughs, and no current extension child token accounting.
- `repro-hygiene.md` keeps repeated scorer runs from generating Python bytecode-cache noise, so eval artifacts remain reproducible.
- `recommendation-consistency.md` gates any `pi-subagents` async/control recommendation on fixing the current load failure and rerunning the relevant probes.
- `rerun-commands.md` verifies the README/runbook reproduction commands include the preserved `/subagents` removed-command probe, live-child checker, generated-artifact checks, and final scorer.
- `task-lifecycle-audit.md` makes S09 reproducible: native lifecycle fields/actions/status literals are absent in current `agent.ts`, existing delegation modes remain present, and `pi-subagents` management/status controls are closest-equivalent only.
- `evidence-manifest.md` maps every scorecard row to a concrete evidence file, links live/source supporting captures, and protects against stale scorecard paths.
- Startup captures are real tmux captures where cheap.
- Scenario captures for S02-S04, S08, and S09 are source-backed to avoid paid child-agent runs.
- S01 now includes one tiny live child-output probe plus an extension load audit.
- `pi-subagents` live-command captures are timestamp-audited and governed by `stale-evidence-policy.md` because older loaded-extension captures coexist with newer load-failure captures.
- S05-S07 include cheap command/UI captures plus source evidence, marked as prior where the extension arm is affected by the current load failure.
- Two extension removed-command probes (`/subagents`, `/subagents-status`) were not recognized as commands and fell through to model turns; this is real UX/token evidence and is recorded instead of hidden.
- `token-evidence.md` records footer token/cost readings: native registered command probes show `$0.000`, while removed `/subagents-status` + `/subagents` fallthrough probes show about ↑22k prompt, ↓187 completion tokens, and $0.111 total cost.
- Token/cache fields are mostly `n/a`; exact cache details are unavailable, but the fallthrough captures show footer token/cost summaries.
- `/subagents` and `/subagents-status` are not pending evidence; current extension source/changelog says they were removed.

## Honest limitations

- Only one tiny live child-agent output was generated (native S01); broad child-output quality for the remaining scenarios is source-inferred, not runtime-measured.
- Two removed-command probes did spend parent-model tokens; they did not spawn child agents, and the cost is recorded as part of UX/token evidence.
- Exact cache creation/cache read values are unavailable in this baseline.
- tmux UI captures can show startup/command surfaces, but not semantic selector internals as richly as a dedicated TUI test.
- Native S09 is scored as absent because current schema lacks lifecycle fields; if another branch has the update, rerun the source probe against that branch.

## Recommendation

Use native `agent` as Pi's default delegation layer. Do not rely on the current installed `pi-subagents` runtime until the module-format load failure is fixed and S01 plus cheap command probes are rerun. After that, keep `pi-subagents` only for background async/control/resume workflows that native intentionally does not cover. If consolidating or continuing to ship `pi-subagents`, protect removed slash surfaces from falling through to expensive model turns. Prioritize native task lifecycle actions (S09) and decide whether background control belongs in core or should stay extension-owned.

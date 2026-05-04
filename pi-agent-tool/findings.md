# Findings: Native Pi `agent` vs `pi-subagents`

## Executive summary

- Winner: native for core delegation, context discipline, saved-chain parity, native diagnostics, background-run control, and recent-run visibility.
- Source/tool-schema caveat: `pi-subagents` still has async widgets/logs and management controls, but current runtime use is blocked until the module-format load failure is fixed and rerun.
- Current installed `pi-subagents` is `0.24.0`; it removed the requested `/subagents` manager UI and `/subagents-status` slash overlay. Those are scored as unavailable, not pending captures.
- Native Pi now has `/agents-doctor`, `/agents-status`, `/agents run`, `/agents parallel`, `/agents run-chain`, saved chains, and source-backed background-run control actions. That narrows the older extension advantage substantially.
- S09 task-agent lifecycle is not implemented in the current native `agent` schema: generic background-run control may expose `action`/`runId`, but no task-record `taskId`, `activeForm`, dependency, metadata, or create/list/get/update/delete lifecycle surface is present.

## Run metadata

| Field | Native | `pi-subagents` |
|---|---|---|
| Launch isolation | `--no-extensions --tools agent,read,grep,find,ls` | `--no-builtin-tools --no-extensions -e <pi-subagents>` |
| Thinking | `off` | `off` |
| Model calls in baseline | one tiny S01 native child run plus native S05 paid background-control probes for start/status, interrupt/resume, and cancel; registered native command probes are local | two prior removed-command fallthrough parent turns (`/subagents`, `/subagents-status`); current S01 `/run` fails before child execution |
| Startup capture | `captures/native-startup.txt` | `captures/subagents-startup.txt` (current fresh launch fails to load extension) |
| Live cheap/paid captures | `/agents-doctor`, `/agents-status`, `/agents`, S01 native child output, S05 paid background start/status probe, S05 paid interrupt/resume probe, S05 paid cancel probe | prior `/subagents-doctor`, removed `/subagents-status`, removed `/subagents`; current S01 `/run scout` fails before extension loads |
| Source probes | `source-probes.md` | `source-probes.md` |
| Token accounting | native S01 footer shows ~13k prompt, ~159 completion, ~$0.076; native S05 background start/status child shows 3377 child tokens and $0.0125 child cost; native S05 interrupt/resume child shows 13139 child tokens and $0.0200 child cost; native S05 cancel child shows 12971 child tokens and $0.0675 child cost; registered command probes show `$0.000` | prior fallthrough captures show about ↑22k prompt, ↓187 completion, and $0.111 total; current S01 has no child token accounting |

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

- Native: now strong for current installed source. `/agents-status` reports native background-run support, the `agent` tool exposes `background: true` plus status/detail/interrupt/cancel/resume control actions, `native-control-tests.md` verifies unit-test coverage for running status, interrupt/cancel, and resume, `native-background-control-live.md` records a paid live start/status child probe, `native-background-interrupt-resume-live.md` records a paid live interrupt/resume probe with interrupted status, resumable state, resumed command, completed output, and cost, and `native-background-cancel-live.md` records a paid live cancel probe with cancelled status, no final child output, and cost.
- `pi-subagents`: still has source/tool-schema async/background status, interrupt, resume, widgets, logs, and notifications. Caveat: current fresh extension loading is blocked; in the earlier loaded-extension probe, removed `/subagents-status` fell through to a normal model turn that invoked `subagent list` and cost roughly ↑11k/↓106 tokens.
- Winner: native for current runtime/source evidence.
- Rerun the extension arm after the loader issue is fixed before restoring any extension runtime claim.

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

- Native: absent for task-record lifecycle. The tool schema may expose generic background-run control (`action`/`runId`), but still has no create/list/get/update/delete task-record lifecycle surface.
- `pi-subagents`: closest equivalent only. It can create/list/get/update/delete agent and chain definitions and control async runs, but that is not a general non-spawn task-list lifecycle API.
- Winner: no current winner. Native should win if the requested lifecycle surface lands; right now the eval marks it pending/absent honestly.

## Evidence quality notes

- `score-analysis.md` computes scorecard averages and numeric winners from the filled rows; it corrected a stale `pi-subagents` UX average from 3.2 to 3.3.
- `findings-alignment.md` checks that prose winners align with numeric winners, with documented exceptions for capability ties and non-equivalent closest matches.
- `command-surface.md` verifies the current native and extension slash-command surfaces, launch isolation flags, and removed `pi-subagents` 0.24.0 surfaces so command drift cannot silently invalidate the eval.
- `live-child-output.md` records one tiny symmetric S01 run: native child output verified; current `pi-subagents` fresh runtime fails before child output.
- `extension-load-audit.md` explains that failure from captures plus source: `pi-subagents` 0.24.0 declares an ESM TypeScript entry, then a runtime import of `@mariozechner/pi-coding-agent` follows Pi's source-checkout alias back through `src/index`/extension-loader re-exports while jiti is loading the extension, and the module-format error happens before slash commands register.
- `capture-timeline.md` makes the mixed capture state explicit: seven older extension-loaded captures predate the two current load-failure captures, so historical/source capability and current runtime availability are not conflated.
- `stale-evidence-policy.md` gives reviewers the rule of use: cite load-failure captures for current runtime, cite older loaded-extension captures only as historical/source-supported behavior unless they are rerun.
- `scenario-verdict-audit.md` classifies all 18 scored rows as current-live, current-load-failure, prior-live, or source-backed so the final verdict cannot quietly mix evidence classes.
- `source-runtime-boundary.md` caveats source-backed `pi-subagents` rows in scorecard, evidence manifest, and eval plan so installed-source capability is not mistaken for current runtime availability while the extension loader fails.
- `token-accounting-audit.md` keeps the model-call/token accounting honest: one native S01 child probe, three paid native S05 background-control probes (start/status, interrupt/resume, and cancel), three zero-cost native registered commands, two prior extension fallthroughs, and no current extension child token accounting.
- `repro-hygiene.md` keeps repeated scorer runs from generating Python bytecode-cache noise, so eval artifacts remain reproducible.
- `recommendation-consistency.md` gates any `pi-subagents` async/control recommendation on fixing the current load failure and rerunning the relevant probes, and keeps native as the S05 current-runtime winner while background control is present in native source.
- `native-control-currentness.md` keeps S05 aligned after native background-run control landed: source markers, rerun `/agents-status` capture, paid live start/status child probe, paid live interrupt/resume probe, paid live cancel probe, scorecard row, and findings winner all agree.
- `native-control-tests.md` documents native S05 evidence from schema, executor wiring, status implementation, and unit tests alongside paid start/status, interrupt/resume, and cancel probes.
- `rerun-commands.md` verifies the README/runbook reproduction commands include the preserved `/subagents` removed-command probe, live-child checker, generated-artifact checks, handoff review, and final scorer.
- `artifact-index.md` keeps README, evidence manifest, runbook, `autoresearch.md` file scope/descriptions/notes, and scorer-required artifact lists synchronized as the eval grows, including markdown row-split and capture-integrity note-scope guards for generated summaries.
- `eval-plan-currentness.md` keeps the original plan from drifting behind the current evidence mix: native S01 live child, extension S01 load failure, S05-S07 prior extension tmux/fallthrough caveats, token/cost exceptions, and expanded metrics.
- `handoff-review.md` consolidates the final reviewer pass over artifact indexes, Markdown hygiene, capture integrity, current/prior boundaries, native S05 control evidence, pending work, recommendation consistency, summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope.
- `scorecard-template-audit.md` keeps the reusable scorecard template from preserving obsolete filled-score or source-only claims.
- `findings-template-audit.md` keeps the reusable findings template from preserving obsolete winners, command surfaces, extension versions, or token/cache claims.
- `eval-design-prompt-audit.md` keeps the historical seed prompt from treating removed `/subagents` and `/subagents-status` surfaces as active commands.
- `task-lifecycle-audit.md` makes S09 reproducible: native lifecycle fields/actions/status literals are absent in current `agent.ts`, existing delegation modes remain present, and `pi-subagents` management/status controls are closest-equivalent only.
- `evidence-manifest.md` maps every scorecard row to a concrete evidence file, links live/source supporting captures, and protects against stale scorecard paths.
- Startup captures are real tmux captures where cheap.
- Scenario captures for S02-S04, S08, and S09 are source-backed to avoid paid child-agent runs; `pi-subagents` rows in that set are caveated as source-only/current-runtime blocked until the loader is fixed and rerun.
- S01 now includes one tiny live child-output probe plus an extension load audit.
- `pi-subagents` live-command captures are timestamp-audited and governed by `stale-evidence-policy.md` because older loaded-extension captures coexist with newer load-failure captures.
- S05-S07 include cheap command/UI captures plus source evidence; S05 native also includes paid background start/status, interrupt/resume, and cancel probes, while extension captures are marked as prior where the current load failure applies.
- Two extension removed-command probes (`/subagents`, `/subagents-status`) were not recognized as commands and fell through to model turns; this is real UX/token evidence and is recorded instead of hidden.
- `token-evidence.md` records footer token/cost readings: native registered command probes show `$0.000`, the native S01/S05 paid probes are recorded separately including interrupt/resume and cancel, and removed `/subagents-status` + `/subagents` fallthrough probes show about ↑22k prompt, ↓187 completion tokens, and $0.111 total cost.
- Token/cache fields are mostly `n/a`; exact cache details are unavailable, but the fallthrough captures show footer token/cost summaries.
- `/subagents` and `/subagents-status` are not pending evidence; current extension source/changelog says they were removed.

## Honest limitations

- Four tiny native live child probes were generated (S01 output, S05 background start/status, S05 background interrupt/resume, and S05 background cancel); broad child-output quality remains intentionally narrow, not a full quality benchmark.
- Two removed-command probes did spend parent-model tokens; they did not spawn child agents, and the cost is recorded as part of UX/token evidence.
- Exact cache creation/cache read values are unavailable in this baseline.
- tmux UI captures can show startup/command surfaces, but not semantic selector internals as richly as a dedicated TUI test.
- Native S09 is scored as absent because current schema lacks task-record lifecycle fields/actions/statuses; generic background-run control is tracked separately and does not satisfy S09.

## Recommendation

Use native `agent` as Pi's default delegation layer. Do not rely on the current installed `pi-subagents` runtime until the module-format load failure is fixed and S01 plus cheap command probes are rerun. After that, keep `pi-subagents` only for extension-specific async widgets/logs or management workflows that native intentionally does not cover. If consolidating or continuing to ship `pi-subagents`, protect removed slash surfaces from falling through to expensive model turns. Prioritize native task lifecycle actions (S09) separately from the now-present generic background-run control.

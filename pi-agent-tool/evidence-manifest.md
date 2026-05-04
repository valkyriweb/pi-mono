# Evidence Manifest

Purpose: make the scorecard reproducible by tying each scored row to an existing evidence file, evidence mode, and any live tmux/source probe that supports the claim. This prevents the eval from scoring rows whose evidence paths are stale or missing.

## Global evidence

| Evidence | Path | Status | Notes |
|---|---|---|---|
| Native startup capture | `captures/native-startup.txt` | present | Launch includes `--no-extensions --tools agent,read,grep,find,ls --thinking off`. |
| `pi-subagents` startup capture | `captures/subagents-startup.txt` | present | Launch includes `--no-builtin-tools --no-extensions -e <pi-subagents> --thinking off`. |
| Source probes | `source-probes.md` | present | Includes native command/tool probes, extension command/tool probes, removed-surface proof, and S09 negative task lifecycle probe. |
| Command surface | `command-surface.md` | present | Verifies native command presence, extension command presence, removed extension surfaces, launch flags, current extension load failure, markdown guardrail split, and 0.24.0 changelog guard. |
| Eval plan currentness | `eval-plan-currentness.md` | present | Ensures `eval-plan.md` no longer claims S01 is source-only, names the S05 native paid start/status, interrupt/resume, and cancel probes, and marks S05-S07 extension tmux/fallthrough captures as prior evidence with current runtime blocked. |
| Scorecard template audit | `scorecard-template-audit.md` | present | Ensures `scorecard-template.md` is blank scaffolding rather than stale filled evidence. |
| Findings template audit | `findings-template-audit.md` | present | Ensures `findings-template.md` is blank scaffolding rather than stale filled report evidence. |
| Eval design prompt audit | `eval-design-prompt-audit.md` | present | Ensures `eval-design-prompt.md` is historical scaffolding with current removed-surface/load-failure caveats. |
| Live child output | `live-child-output.md` | present | One tiny S01 live run: native child success vs current `pi-subagents` extension load failure. |
| Extension load audit | `extension-load-audit.md` | present | Source/capture diagnosis for the current `pi-subagents` module-format load failure, including the source-checkout alias/re-export self-import path before slash-command registration. |
| Capture timeline | `capture-timeline.md` | present | Timestamp audit showing older extension-loaded captures predate newer current load-failure captures. |
| Stale evidence policy | `stale-evidence-policy.md` | present | Reviewer checklist preventing prior loaded-extension captures from being cited as current runtime proof. |
| Scenario verdict audit | `scenario-verdict-audit.md` | present | Classifies every scored row as current-live, current-load-failure, prior-live, or source-backed. |
| Source/runtime boundary audit | `source-runtime-boundary.md` | present | Ensures `pi-subagents` source-backed rows are not worded as current runtime proof while the extension load is blocked. |
| Capture integrity audit | `capture-integrity.md` | present | Verifies every scorecard evidence capture contains the scenario-specific markers its row relies on. |
| Ideas backlog audit | `ideas-backlog-audit.md` | present | Keeps deferred ideas current with the artifact set and removes stale final-handoff lists. |
| Markdown hygiene audit | `markdown-hygiene.md` | present | Scans root Markdown for known fused table-row, fused-bullet, and table-heading join symptoms in generated artifacts. |
| Token evidence | `token-evidence.md` | present | Records native `$0.000` registered command captures, native S01/S05 paid child probe costs including interrupt/resume and cancel, and `pi-subagents` prior removed-command fallthrough token/cost readings. |
| Token accounting audit | `token-accounting-audit.md` | present | Checks model-call/token wording across findings, scorecard, token evidence, S01 live child output, and S05 background live outputs. |
| Repro hygiene audit | `repro-hygiene.md` | present | Ensures `autoresearch.sh` syntax-checks Python helpers without dirtying `scripts/__pycache__`. |
| Recommendation consistency | `recommendation-consistency.md` | present | Ensures final guidance does not imply current `pi-subagents` runtime is usable before the loader failure is fixed/rerun. |
| Native control currentness | `native-control-currentness.md` | present | Ensures native S05 background-control source/capture/live-probe/scorecard/findings stay current after control landed. |
| Native control tests | `native-control-tests.md` | present | Verifies native S05 background/control schema, executor, status implementation, and unit tests alongside paid start/status, interrupt/resume, and cancel probes. |
| Native background control live | `native-background-control-live.md` | present | One tiny paid native S05 background start/status probe with run id, control hint, completed status detail, child output, and cost. |
| Native background interrupt/resume live | `native-background-interrupt-resume-live.md` | present | One tiny paid native S05 interrupt/resume probe with interrupted status, resumable state, resumed completion, child output, and cost. |
| Native background cancel live | `native-background-cancel-live.md` | present | One tiny paid native S05 cancel probe with cancelled status, no final child output, and cost. |
| Rerun command audit | `rerun-commands.md` | present | Ensures README/runbook reproduction commands cover scored captures and generated checks. |
| Artifact index audit | `artifact-index.md` | present | Ensures README, evidence manifest, runbook final checklist, `autoresearch.md` file scope/descriptions/notes, and `autoresearch.sh` required-file indexes stay synchronized, including markdown row-split and capture-integrity note-scope guards. |
| Score analysis | `score-analysis.md` | present | Computed from `scorecard.md`; validates summary averages and numeric scenario winners. |
| Findings alignment | `findings-alignment.md` | present | Compares prose winners to numeric winners and documents intentional exceptions. |
| Handoff review | `handoff-review.md` | present | Final reviewer pass over high-risk guardrails before handoff, including summary references, purpose/findings scope, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope. |
| Task lifecycle audit | `task-lifecycle-audit.md` | present | S09 acceptance probe for native lifecycle absence/pending status and extension closest-equivalent non-equivalence. |
| Isolation proof | `isolation-proof.md` | present | Records native/no-subagent and extension/no-native-agent booleans. |

## Scenario evidence map

| Scenario | Arm | Scorecard evidence file | Evidence mode | Supporting live/source evidence | Status |
|---|---|---|---|---|---|
| S01 single recon | native | `captures/native-s01-live-child-output.txt` | live child output | `live-child-output.md`; native child completed, used read tool, returned exactly three files | present |
| S01 single recon | pi-subagents | `captures/subagents-s01-live-child-output.txt` | live runtime failure | `live-child-output.md`; `extension-load-audit.md`; `capture-timeline.md`; `stale-evidence-policy.md`; current fresh extension load fails before `/run scout` can execute | present |
| S02 parallel review | native | `captures/native-s02-parallel-review.txt` | source-backed | `source-probes.md` native `tasks[]` schema | present |
| S02 parallel review | pi-subagents | `captures/subagents-s02-parallel-review.txt` | source-backed only | `source-probes.md` `/parallel`, `tasks[]`, `--bg`, `--fork`; `command-surface.md`; current runtime load blocked | present |
| S03 chain handoff | native | `captures/native-s03-chain-handoff.txt` | source-backed | `source-probes.md` native `chain[]` and `/agents run-chain` | present |
| S03 chain handoff | pi-subagents | `captures/subagents-s03-chain-handoff.txt` | source-backed only | `source-probes.md` `/chain` and `/run-chain`; `command-surface.md`; current runtime load blocked | present |
| S04 saved workflow | native | `captures/native-s04-saved-workflow.txt` | source-backed | `source-probes.md` native saved chain handler/docs | present |
| S04 saved workflow | pi-subagents | `captures/subagents-s04-saved-workflow.txt` | source-backed only | `source-probes.md` `/run-chain`; `CHANGELOG.md` 0.24.0 removed save UI; `command-surface.md`; current runtime load blocked | present |
| S05 async/status/control | native | `captures/native-s05-async-status-control.txt` | source + live tmux + unit tests + paid start/status, interrupt/resume, and cancel probes | `captures/native-s05-status-live.txt`; `captures/native-s05-background-control-live.txt`; `captures/native-s05-background-interrupt-resume-live.txt`; `captures/native-s05-background-cancel-live.txt`; `native-control-currentness.md`; `native-control-tests.md`; `native-background-control-live.md`; `native-background-interrupt-resume-live.md`; `native-background-cancel-live.md`; native source/status now expose and test background status/detail/interrupt/cancel/resume control | present |
| S05 async/status/control | pi-subagents | `captures/subagents-s05-async-status-control.txt` | source + prior live fallthrough | `captures/subagents-s05-status-removed-live.txt`; `capture-timeline.md`; tool schema has status/interrupt/resume, `/subagents-status` removed | present |
| S06 doctor diagnostics | native | `captures/native-s06-doctor-diagnostics.txt` | source + live tmux | `captures/native-s06-doctor-live.txt`; native doctor source | present |
| S06 doctor diagnostics | pi-subagents | `captures/subagents-s06-doctor-diagnostics.txt` | source + prior live tmux | `captures/subagents-s06-doctor-live.txt`; `capture-timeline.md`; extension doctor source | present |
| S07 UI manager/selector | native | `captures/native-s07-ui-manager-selector.txt` | source + live tmux | `captures/native-s07-ui-selector-live.txt`; `/agents` selector source | present |
| S07 UI manager/selector | pi-subagents | `captures/subagents-s07-ui-manager-selector.txt` | source + prior live fallthrough | `captures/subagents-s07-manager-removed-live.txt`; `capture-timeline.md`; `pi-subagents` 0.24.0 removed manager overlay | present |
| S08 context discipline | native | `captures/native-s08-context-discipline.txt` | source-backed | `source-probes.md` native `default/fork/slim/none` and filtered fork context | present |
| S08 context discipline | pi-subagents | `captures/subagents-s08-context-discipline.txt` | source-backed only | `source-probes.md` `--fork` only; prompt runtime blocks recursive delegation; `command-surface.md`; current runtime load blocked | present |
| S09 task agent tool | native | `captures/native-s09-task-agent-tool.txt` | source-backed negative probe | `source-probes.md` native task lifecycle grep exits 1 for `action/taskId/create/list/get/update` | present |
| S09 task agent tool | pi-subagents | `captures/subagents-s09-task-agent-tool.txt` | source-backed closest equivalent only | `source-probes.md` extension management/status actions; no general task-list equivalent; `command-surface.md`; current runtime load blocked | present |

## Version and removed-surface guardrails

- Current extension version is source-probed as `pi-subagents 0.24.0`.
- `0.24.0` removed the old `/agents` manager overlay; no `/subagents` replacement is registered in current `src/slash/slash-commands.ts`.
- `0.24.0` removed `/subagents-status`; async runs remain inspectable through `subagent({ action: "status" })`, notifications, logs, and widgets.
- `capture-timeline.md` records that the older extension-loaded captures predate the newer current load-failure captures; rerun them before using them as current-runtime proof after loader changes.
- `stale-evidence-policy.md` is the reviewer checklist for applying that distinction consistently across scorecard, token evidence, and findings.
- `scenario-verdict-audit.md` classifies all 18 scored rows by evidence type so current runtime, prior runtime, and source-backed claims remain separate.
- `source-runtime-boundary.md` enforces the row-level caveat that `pi-subagents` source-backed rows are static capability evidence, not current runtime proof while the extension loader fails.
- `capture-integrity.md` verifies all 18 scorecard evidence captures contain their scenario-specific markers, so stale/swapped/placeholder capture files fail review.
- `ideas-backlog-audit.md` keeps `autoresearch.ideas.md` from preserving stale final-handoff artifact subsets as new audits land.
- `markdown-hygiene.md` generalizes the generated-Markdown guard after fused rows/bullets and table-heading joins were found in generated artifacts.
- `command-surface.md` keeps its extension-load audit guardrail and `/subagents` reappearance warning as separate bullets so the warning does not get buried in malformed Markdown.
- `token-accounting-audit.md` keeps model-call and token/cost claims aligned after adding the native S01 child probe and native S05 paid background start/status, interrupt/resume, and cancel probes.
- `repro-hygiene.md` keeps the scorer itself reproducible by avoiding py-compile bytecode writes during syntax checks.
- `recommendation-consistency.md` keeps final guidance aligned with the current load failure: use native by default; only use `pi-subagents` for async/control after fixing and rerunning the extension probes.
- `rerun-commands.md` keeps README/runbook reproduction commands aligned with the preserved captures and generated audit files.
- `artifact-index.md` keeps README Fresh artifacts, evidence manifest global evidence, runbook final checklist, `autoresearch.md` Files in scope/descriptions/notes, and `autoresearch.sh` required files in sync, and guards against fused table rows plus stale capture-integrity note-scope summaries.
- `eval-plan-currentness.md` keeps the planning artifact aligned with the current evidence mix: native S01 live child, native S05 paid start/status, interrupt/resume, and cancel probes, extension S01 load failure, source-backed rows, and S05-S07 prior extension captures with current-runtime caveats.
- `scorecard-template-audit.md` keeps the reusable scorecard template from carrying obsolete filled scores or source-only claims.
- `findings-template-audit.md` keeps the reusable findings template from carrying obsolete winners, command surfaces, extension versions, or token/cache claims.
- `eval-design-prompt-audit.md` keeps the historical seed prompt from describing removed `/subagents` and `/subagents-status` surfaces as active commands.
- `native-control-currentness.md` keeps native S05 aligned after background-run control landed, the cheap `/agents-status` capture was rerun, and paid start/status plus interrupt/resume and cancel probes were added.
- `native-control-tests.md` documents the schema/executor/status unit-test evidence for native background status/interrupt/cancel/resume control while preserving that the paid start/status, interrupt/resume, and cancel probes are narrow S05 background-run checks.
- `native-background-control-live.md` verifies the S05 paid start/status live probe, `native-background-interrupt-resume-live.md` verifies the paid interrupt/resume live probe, and `native-background-cancel-live.md` verifies the paid cancel live probe.
- `handoff-review.md` consolidates the final reviewer pass over artifact indexes, Markdown hygiene, capture integrity, current/prior boundaries, native S05 control evidence, pending work, recommendation consistency, summary references, purpose/findings scope, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope.
- The two removed-command probes are preserved because they reveal a real UX/token tradeoff from the earlier loaded-extension state: unregistered slash strings fell through into parent model turns and invoked `subagent list` rather than opening slash UIs.
- `token-evidence.md` aggregates those footer readings as roughly ↑22k prompt, ↓187 completion tokens, and $0.111 total cost, while comparable native registered command probes remained `$0.000` and native S01/S05 paid probes, including interrupt/resume and cancel, are recorded separately.

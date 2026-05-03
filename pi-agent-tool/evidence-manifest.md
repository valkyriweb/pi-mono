# Evidence Manifest

Purpose: make the scorecard reproducible by tying each scored row to an existing evidence file, evidence mode, and any live tmux/source probe that supports the claim. This prevents the eval from scoring rows whose evidence paths are stale or missing.

## Global evidence

| Evidence | Path | Status | Notes |
|---|---|---|---|
| Native startup capture | `captures/native-startup.txt` | present | Launch includes `--no-extensions --tools agent,read,grep,find,ls --thinking off`. |
| `pi-subagents` startup capture | `captures/subagents-startup.txt` | present | Launch includes `--no-builtin-tools --no-extensions -e <pi-subagents> --thinking off`. |
| Source probes | `source-probes.md` | present | Includes native command/tool probes, extension command/tool probes, removed-surface proof, and S09 negative task lifecycle probe. |
| Command surface | `command-surface.md` | present | Verifies native command presence, extension command presence, removed extension surfaces, launch flags, current extension load failure, markdown guardrail split, and 0.24.0 changelog guard. |
| Eval plan currentness | `eval-plan-currentness.md` | present | Ensures `eval-plan.md` no longer claims S01 is source-only after the live native child probe and current extension load failure were added. |
| Live child output | `live-child-output.md` | present | One tiny S01 live run: native child success vs current `pi-subagents` extension load failure. |
| Extension load audit | `extension-load-audit.md` | present | Source/capture diagnosis for the current `pi-subagents` module-format load failure before slash-command registration. |
| Capture timeline | `capture-timeline.md` | present | Timestamp audit showing older extension-loaded captures predate newer current load-failure captures. |
| Stale evidence policy | `stale-evidence-policy.md` | present | Reviewer checklist preventing prior loaded-extension captures from being cited as current runtime proof. |
| Scenario verdict audit | `scenario-verdict-audit.md` | present | Classifies every scored row as current-live, current-load-failure, prior-live, or source-backed. |
| Token evidence | `token-evidence.md` | present | Records native `$0.000` registered command captures, native S01 child cost, and `pi-subagents` prior removed-command fallthrough token/cost readings. |
| Token accounting audit | `token-accounting-audit.md` | present | Checks model-call/token wording across findings, scorecard, token evidence, and live child output. |
| Repro hygiene audit | `repro-hygiene.md` | present | Ensures `autoresearch.sh` syntax-checks Python helpers without dirtying `scripts/__pycache__`. |
| Recommendation consistency | `recommendation-consistency.md` | present | Ensures final guidance does not imply current `pi-subagents` runtime is usable before the loader failure is fixed/rerun. |
| Rerun command audit | `rerun-commands.md` | present | Ensures README/runbook reproduction commands cover scored captures and generated checks. |
| Artifact index audit | `artifact-index.md` | present | Ensures README, evidence manifest, and `autoresearch.sh` required-file indexes stay synchronized. |
| Score analysis | `score-analysis.md` | present | Computed from `scorecard.md`; validates summary averages and numeric scenario winners. |
| Findings alignment | `findings-alignment.md` | present | Compares prose winners to numeric winners and documents intentional exceptions. |
| Task lifecycle audit | `task-lifecycle-audit.md` | present | S09 acceptance probe for native lifecycle absence/pending status and extension closest-equivalent non-equivalence. |
| Isolation proof | `isolation-proof.md` | present | Records native/no-subagent and extension/no-native-agent booleans. |

## Scenario evidence map

| Scenario | Arm | Scorecard evidence file | Evidence mode | Supporting live/source evidence | Status |
|---|---|---|---|---|---|
| S01 single recon | native | `captures/native-s01-live-child-output.txt` | live child output | `live-child-output.md`; native child completed, used read tool, returned exactly three files | present |
| S01 single recon | pi-subagents | `captures/subagents-s01-live-child-output.txt` | live runtime failure | `live-child-output.md`; `extension-load-audit.md`; `capture-timeline.md`; `stale-evidence-policy.md`; current fresh extension load fails before `/run scout` can execute | present |
| S02 parallel review | native | `captures/native-s02-parallel-review.txt` | source-backed | `source-probes.md` native `tasks[]` schema | present |
| S02 parallel review | pi-subagents | `captures/subagents-s02-parallel-review.txt` | source-backed | `source-probes.md` `/parallel`, `tasks[]`, `--bg`, `--fork` | present |
| S03 chain handoff | native | `captures/native-s03-chain-handoff.txt` | source-backed | `source-probes.md` native `chain[]` and `/agents run-chain` | present |
| S03 chain handoff | pi-subagents | `captures/subagents-s03-chain-handoff.txt` | source-backed | `source-probes.md` `/chain` and `/run-chain` | present |
| S04 saved workflow | native | `captures/native-s04-saved-workflow.txt` | source-backed | `source-probes.md` native saved chain handler/docs | present |
| S04 saved workflow | pi-subagents | `captures/subagents-s04-saved-workflow.txt` | source-backed | `source-probes.md` `/run-chain`; `CHANGELOG.md` 0.24.0 removed save UI | present |
| S05 async/status/control | native | `captures/native-s05-async-status-control.txt` | source + live tmux | `captures/native-s05-status-live.txt`; native status source says background control unsupported | present |
| S05 async/status/control | pi-subagents | `captures/subagents-s05-async-status-control.txt` | source + prior live fallthrough | `captures/subagents-s05-status-removed-live.txt`; `capture-timeline.md`; tool schema has status/interrupt/resume, `/subagents-status` removed | present |
| S06 doctor diagnostics | native | `captures/native-s06-doctor-diagnostics.txt` | source + live tmux | `captures/native-s06-doctor-live.txt`; native doctor source | present |
| S06 doctor diagnostics | pi-subagents | `captures/subagents-s06-doctor-diagnostics.txt` | source + prior live tmux | `captures/subagents-s06-doctor-live.txt`; `capture-timeline.md`; extension doctor source | present |
| S07 UI manager/selector | native | `captures/native-s07-ui-manager-selector.txt` | source + live tmux | `captures/native-s07-ui-selector-live.txt`; `/agents` selector source | present |
| S07 UI manager/selector | pi-subagents | `captures/subagents-s07-ui-manager-selector.txt` | source + prior live fallthrough | `captures/subagents-s07-manager-removed-live.txt`; `capture-timeline.md`; `pi-subagents` 0.24.0 removed manager overlay | present |
| S08 context discipline | native | `captures/native-s08-context-discipline.txt` | source-backed | `source-probes.md` native `default/fork/slim/none` and filtered fork context | present |
| S08 context discipline | pi-subagents | `captures/subagents-s08-context-discipline.txt` | source-backed | `source-probes.md` `--fork` only; prompt runtime blocks recursive delegation | present |
| S09 task agent tool | native | `captures/native-s09-task-agent-tool.txt` | source-backed negative probe | `source-probes.md` native task lifecycle grep exits 1 for `action/taskId/create/list/get/update` | present |
| S09 task agent tool | pi-subagents | `captures/subagents-s09-task-agent-tool.txt` | source-backed closest equivalent | `source-probes.md` extension management/status actions; no general task-list equivalent | present |

## Version and removed-surface guardrails

- Current extension version is source-probed as `pi-subagents 0.24.0`.
- `0.24.0` removed the old `/agents` manager overlay; no `/subagents` replacement is registered in current `src/slash/slash-commands.ts`.
- `0.24.0` removed `/subagents-status`; async runs remain inspectable through `subagent({ action: "status" })`, notifications, logs, and widgets.
- `capture-timeline.md` records that the older extension-loaded captures predate the newer current load-failure captures; rerun them before using them as current-runtime proof after loader changes.
- `stale-evidence-policy.md` is the reviewer checklist for applying that distinction consistently across scorecard, token evidence, and findings.
- `scenario-verdict-audit.md` classifies all 18 scored rows by evidence type so current runtime, prior runtime, and source-backed claims remain separate.
- `command-surface.md` keeps its extension-load audit guardrail and `/subagents` reappearance warning as separate bullets so the warning does not get buried in malformed Markdown.
- `token-accounting-audit.md` keeps model-call and token/cost claims aligned after adding the native S01 child probe.
- `repro-hygiene.md` keeps the scorer itself reproducible by avoiding py-compile bytecode writes during syntax checks.
- `recommendation-consistency.md` keeps final guidance aligned with the current load failure: use native by default; only use `pi-subagents` for async/control after fixing and rerunning the extension probes.
- `rerun-commands.md` keeps README/runbook reproduction commands aligned with the preserved captures and generated audit files.
- `artifact-index.md` keeps README Fresh artifacts, evidence manifest global evidence, and `autoresearch.sh` required files in sync.
- `eval-plan-currentness.md` keeps the planning artifact aligned with the current evidence mix: native S01 live child, extension S01 load failure, source-backed rows, and prior extension captures.
- The two removed-command probes are preserved because they reveal a real UX/token tradeoff from the earlier loaded-extension state: unregistered slash strings fell through into parent model turns and invoked `subagent list` rather than opening slash UIs.
- `token-evidence.md` aggregates those footer readings as roughly ↑22k prompt, ↓187 completion tokens, and $0.111 total cost, while comparable native registered command probes remained `$0.000`.

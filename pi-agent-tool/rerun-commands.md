# Rerun Command Audit

Purpose: keep the documented reproduction commands aligned with the artifacts scored by `autoresearch.sh`. The README quick-run block previously risked omitting preserved live/fallthrough captures even though downstream scorer checks relied on them.

## Command coverage

| Check | Value | Meaning |
|---|---:|---|
| README required commands | 43/43 | Quick run includes source probes, startup captures, preserved live/fallthrough captures, audit checks, and scorer. |
| Runbook anchors | 32/32 | Detailed runbook covers the same critical steps. |
| README removed manager probe | 1 | README includes `/subagents` removed-command fallthrough probe. |
| README live child checker | 1 | README regenerates/validates `live-child-output.md`, `native-background-control-live.md`, `native-background-interrupt-resume-live.md`, and `native-background-cancel-live.md`. |
| README write-generators | 1 | README includes write-mode generators for command surface and score analysis. |
| handoff review checker | 1 | README, runbook, and findings include the handoff-review checker in reproduction guidance. |
| verified | 1 | All command-coverage checks passed. |

## Interpretation

- The README quick-run block now includes the removed `/subagents` probe preserved for token/fallthrough evidence.
- It also calls the generated-artifact checkers before `./autoresearch.sh`, including native-control-currentness, native-control-tests, native-background-control-live, native-background-interrupt-resume-live, native-background-cancel-live, ideas-backlog, markdown-hygiene, capture-integrity, rerun-command, artifact-index, eval-design-prompt, eval-plan currentness, scorecard-template, findings-template, handoff-review, and source/runtime boundary audits, reducing the risk of stale audit files during reproduction.
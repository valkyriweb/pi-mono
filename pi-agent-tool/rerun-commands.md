# Rerun Command Audit

Purpose: keep the documented reproduction commands aligned with the artifacts scored by `autoresearch.sh`. The README quick-run block previously risked omitting preserved live/fallthrough captures even though downstream scorer checks relied on them.

## Command coverage

| Check | Value | Meaning |
|---|---:|---|
| README required commands | 29/29 | Quick run includes source probes, startup captures, preserved live/fallthrough captures, audit checks, and scorer. |
| Runbook anchors | 18/18 | Detailed runbook covers the same critical steps. |
| README removed manager probe | 1 | README includes `/subagents` removed-command fallthrough probe. |
| README live child checker | 1 | README regenerates/validates `live-child-output.md`. |
| README write-generators | 1 | README includes write-mode generators for command surface and score analysis. |
| verified | 1 | All command-coverage checks passed. |

## Interpretation

- The README quick-run block now includes the removed `/subagents` probe preserved for token/fallthrough evidence.
- It also calls the generated-artifact checkers before `./autoresearch.sh`, including the rerun-command, artifact-index, eval-plan currentness, scorecard-template, and source/runtime boundary audits, reducing the risk of stale audit files during reproduction.

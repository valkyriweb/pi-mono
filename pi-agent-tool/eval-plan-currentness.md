# Eval Plan Currentness Audit

Purpose: keep `eval-plan.md` aligned with the evidence that was added after the initial source-backed baseline. This catches stale planning prose, especially the old S01 claim that neither arm had live child evidence.

## Currentness checks

| Check | Value | Meaning |
|---|---:|---|
| rows | 6 | Distinct eval-plan currentness checks. |
| S01 native live child | 1 | S01 native plan names the live `/agents run scout` child probe. |
| S01 extension load failure | 1 | S01 `pi-subagents` plan names the current load failure before `/run scout`. |
| no stale no-live wording | 1 | S01 no longer says both arms have no live child. |
| runtime caveat | 1 | Command-surface section separates source-declared extension commands from current runtime availability. |
| token caveat | 1 | Rubric names the one native child run, prior extension fallthroughs, and current extension no-child caveat. |
| secondary metrics delegated | 1 | Secondary metrics point to `autoresearch.md` instead of a stale short list. |
| verified | 1 | All currentness checks passed. |

## Interpretation

- The eval plan now reflects the current evidence mix: one tiny native live child probe, current `pi-subagents` load failure, older extension-loaded captures treated as historical, and source-backed rows where live fanout would spend tokens.
- This is a correctness check, not extra behavioral evidence; it prevents reviewers from following the old baseline plan after newer artifacts changed the evidence class.

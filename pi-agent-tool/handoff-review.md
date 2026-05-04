# Handoff Review

Purpose: final reviewer pass over the current eval artifact set before handoff. This consolidates the highest-risk guardrails so reviewers can see that artifact indexes, generated Markdown, captures, native S05 control evidence, source/runtime boundaries, stale evidence policy, final recommendations, summary references, findings scope, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope still agree.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| required audits present | 13/13 | High-risk audit artifacts exist and report verified/current rows. |
| current/prior boundary preserved | 1 | Findings, scorecard, eval plan, stale policy, and scenario verdicts distinguish current failure, prior live captures, and source-backed rows. |
| native S05 boundary preserved | 1 | Native background-control evidence includes paid start/status, interrupt/resume, and cancel probes while S09 task-lifecycle boundaries remain explicit. |
| pending work preserved | 1 | Deferred loader rerun, loader regression, task lifecycle, and final handoff ideas remain in the backlog. |
| summary refs current | 1 | Findings, README, and runbook surface the handoff review and current live/failure/prior evidence mix. |
| purpose scope current | 1 | Handoff-review purpose line names the full current guard set. |
| findings scope current | 1 | Findings handoff-review bullet names the full current guard set. |
| latest artifact-index scope preserved | 1 | Handoff review includes the README long-form and autoresearch-note artifact-index scope guards. |
| evidence manifest scope current | 1 | Evidence manifest describes the latest handoff-review artifact-index scope guards. |
| evidence manifest full scope current | 1 | Evidence manifest handoff-review summaries name the full current guard set. |
| runbook verdict scope current | 1 | Runbook handoff-review verdict names the full current guard set. |
| verified | 1 | Handoff review passed. |

## Audit matrix

| Artifact | Status | Required markers |
|---|---|---|
| `artifact-index.md` | pass | \| verified \| 1 \|, README summary current \| 1, autoresearch README summary note current \| 1 |
| `markdown-hygiene.md` | pass | \| verified \| 1 \| |
| `capture-integrity.md` | pass | \| verified \| 1 \| |
| `native-control-currentness.md` | pass | \| verified \| 1 \| |
| `native-control-tests.md` | pass | \| verified \| 1 \| |
| `native-background-control-live.md` | pass | \| verified \| 1 \| |
| `native-background-interrupt-resume-live.md` | pass | \| verified \| 1 \| |
| `native-background-cancel-live.md` | pass | \| verified \| 1 \| |
| `source-runtime-boundary.md` | pass | \| verified \| 1 \| |
| `recommendation-consistency.md` | pass | \| verified \| 1 \| |
| `eval-plan-currentness.md` | pass | prior extension tmux caveat \| 1, summary refs current \| 1 |
| `scenario-verdict-audit.md` | pass | Audit verified: 1. |
| `ideas-backlog-audit.md` | pass | \| verified \| 1 \| |

## Interpretation

- This is not new behavioral evidence; it is the final ambiguity check over the existing evidence/audit set.
- A failure means a reviewer-facing summary, guardrail, or deferred-work note no longer matches the current scorecard evidence mix.

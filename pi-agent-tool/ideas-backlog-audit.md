# Ideas Backlog Audit

Purpose: keep `autoresearch.ideas.md` useful. Deferred work should remain actionable and current with the evidence/audit surface, not preserve stale final-review lists after new guard artifacts land.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| ideas rows | 4 | Non-empty deferred-idea bullets. |
| required idea classes | 4/4 | Loader rerun, loader regression, task lifecycle, and final handoff ideas remain present. |
| final handoff markers | 13/13 | Final-handoff idea names the handoff review, current audit surfaces, or canonical indexes. |
| stale literal long list absent | 1 | Final-handoff idea no longer hardcodes the old partial artifact list. |
| runbook current | 1 | Runbook backlog verdict no longer claims native-control stress probes are deferred. |
| verified | 1 | Backlog is current and actionable. |

## Missing

- Missing idea classes: none.
- Missing final-handoff markers: none.

## Interpretation

- This audit does not force the deferred work to happen now; it prevents the backlog from pointing reviewers at stale artifact subsets.
- If a new required audit artifact lands, update the final-handoff idea to rely on `artifact-index.md`/`autoresearch.sh` indexes or name the new artifact explicitly.

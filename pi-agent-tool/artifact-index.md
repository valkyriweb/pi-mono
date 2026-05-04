# Artifact Index Audit

Purpose: keep the artifact inventories synchronized. As the eval accumulated evidence/audit files, the README quick index, evidence manifest, runbook final checklist, `autoresearch.md` Files in scope, and `autoresearch.sh` required-file list became separate sources of truth. This audit catches drift between them.

## Index checks

| Check | Value | Meaning |
|---|---:|---|
| required files | 41 | Files listed in `autoresearch.sh` `required_files`. |
| README required files present | 41/41 | Required files named in README Fresh artifacts. |
| README directory entries present | 2 | README names `captures/` and `scripts/`. |
| manifest audited artifacts present | 31/31 | Evidence manifest indexes all audited evidence artifacts. |
| runbook audited artifacts present | 31/31 | Runbook final checklist names all audited evidence artifacts. |
| autoresearch scope files present | 41/41 | `autoresearch.md` Files in scope names scorer-required files. |
| required files exist | 41/41 | Required files are non-empty on disk. |
| markdown rows | 22 | Generated index-check table rows remain split. |
| markdown guardrail split | 1 | Manifest and runbook rows are not fused. |
| autoresearch scope descriptions current | 1 | `autoresearch.md` Files in scope descriptions include current paid cancel evidence where relevant. |
| autoresearch artifact-index description current | 1 | `autoresearch.md` Files in scope describes artifact-index scope descriptions, notes, row splits, and capture-integrity note summaries. |
| autoresearch capture-integrity notes current | 1 | `autoresearch.md` notes name the current 78-marker capture integrity scope. |
| README scope current | 1 | README artifact-index entry names scope descriptions, notes, row splits, and capture-integrity note summaries. |
| README summary current | 1 | README long-form summary names artifact-index scope descriptions, notes, row splits, and capture-integrity note summaries. |
| findings scope current | 1 | Findings names README, evidence manifest, runbook, autoresearch scope/descriptions/notes, scorer-required files, row splits, and capture-integrity note summaries. |
| runbook section current | 1 | Runbook artifact-index section names the expanded scope and row-split guard. |
| runbook scope current | 1 | Runbook final checklist names the same artifact-index scope. |
| autoresearch notes scope current | 1 | Generated summary names artifact-index, markdown-hygiene, and capture-integrity note currentness work. |
| autoresearch notes current | 1 | `autoresearch.md` what's-been-tried notes include the latest artifact-index, markdown-hygiene, and capture-integrity note work. |
| autoresearch README summary note current | 1 | `autoresearch.md` notes include the README long-form artifact-index summary fix. |
| manifest scope current | 1 | Evidence manifest describes artifact-index coverage of scope descriptions, notes, row splits, and capture-integrity note summaries. |
| handoff scope current | 1 | README, runbook checklist, and autoresearch scope describe the expanded handoff-review guard set. |
| handoff crossrefs current | 1 | README, findings, evidence manifest, runbook, and autoresearch all describe the expanded handoff-review guard set. |
| verified | 1 | All index checks passed. |

## Missing entries

- Missing from README: none.
- Missing from evidence manifest: none.
- Missing from runbook checklist: none.
- Missing from autoresearch scope: none.

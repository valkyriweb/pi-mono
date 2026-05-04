# Markdown Hygiene Audit

Purpose: catch generated Markdown formatting defects that hide evidence. This was added after row/list join bugs were found in `command-surface.md`, `native-control-currentness.md`, and `artifact-index.md`.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| files checked | 41 | Root Markdown files scanned, excluding `source-probes.md` because it embeds source code containing `||`. |
| fused table rows | 0 | Lines containing `||`, the known table-row join symptom. |
| fused bullets | 0 | Lines matching a sentence immediately joined to a new bullet (`.-`). |
| table-heading joins | 0 | Headings immediately following table rows without a blank separator. |
| runbook current | 1 | Runbook names all Markdown hygiene symptom classes. |
| scope docs current | 1 | README, evidence manifest, runbook, and autoresearch scope docs use the canonical table-heading wording. |
| verified | 1 | No fused Markdown symptoms found. |

## Findings

- Fused table rows: none.
- Fused bullets: none.
- Table-heading joins: none.

## Interpretation

- This is a formatting/readability guard only; it does not replace evidence-specific checks.
- A failure means a generated artifact may be hiding a warning or checklist row from reviewers.

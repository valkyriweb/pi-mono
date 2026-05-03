# Artifact Index Audit

Purpose: keep the artifact inventories synchronized. As the eval accumulated evidence/audit files, the README quick index, evidence manifest, and `autoresearch.sh` required-file list became separate sources of truth. This audit catches drift between them.

## Index checks

| Check | Value | Meaning |
|---|---:|---|
| required files | 26 | Files listed in `autoresearch.sh` `required_files`. |
| README required files present | 26/26 | Required files named in README Fresh artifacts. |
| README directory entries present | 2 | README names `captures/` and `scripts/`. |
| manifest audited artifacts present | 19/19 | Evidence manifest indexes all audited evidence artifacts. |
| required files exist | 26/26 | Required files are non-empty on disk. |
| verified | 1 | All index checks passed. |

## Missing entries

- Missing from README: none.
- Missing from evidence manifest: none.

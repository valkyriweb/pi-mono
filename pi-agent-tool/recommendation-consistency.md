# Recommendation Consistency Audit

Purpose: keep the final recommendation aligned with the current runtime verdict. `pi-subagents` still has source-level async/control capability, but the installed extension currently fails to load under the fresh eval launch. The recommendation must not imply it is currently usable until the loader issue is fixed and rerun.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| recommendation rows | 6 | Six recommendation checks are enforced. |
| executive runtime caveat | 1 | Executive summary scopes `pi-subagents` async/control win to source/tool-schema and notes current load block. |
| S05 caveat | 1 | S05 marks `pi-subagents` as source-level/background-control winner, not current runtime proof. |
| final recommendation blocks current runtime reliance | 1 | Final recommendation says not to rely on current installed extension until fixed/rerun. |
| native default preserved | 1 | Native remains the default delegation recommendation. |
| rerun trigger present | 1 | Recommendation and supporting docs require rerunning S01/cheap probes after loader fix. |
| removed slash protection present | 1 | Recommendation still calls out removed slash fallthrough cost. |
| verified | 1 | All checks passed. |

## Recommendation summary

- Current runtime: native wins; `pi-subagents` cannot be treated as currently available while the fresh launch fails.
- Source/tool-schema: `pi-subagents` remains the async/background-control reference surface.
- Future action: fix loader/package interaction, rerun S01 plus cheap extension command probes, then rescore current-runtime rows.

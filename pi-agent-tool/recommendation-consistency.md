# Recommendation Consistency Audit

Purpose: keep the final recommendation aligned with the current runtime verdict. Native now has source-backed background-run control, while `pi-subagents` still has extension async/control features but currently fails to load under the fresh eval launch. The recommendation must not imply the extension is currently usable until the loader issue is fixed and rerun.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| recommendation rows | 6 | Six recommendation checks are enforced. |
| executive runtime caveat | 1 | Executive summary names native background-run control and scopes `pi-subagents` async/control to loader-blocked extension features. |
| S05 caveat | 1 | S05 marks native as current-runtime/source winner and keeps `pi-subagents` blocked until loader fix/rerun. |
| final recommendation blocks current runtime reliance | 1 | Final recommendation says not to rely on current installed extension until fixed/rerun. |
| native default preserved | 1 | Native remains the default delegation recommendation. |
| rerun trigger present | 1 | Recommendation and supporting docs require rerunning S01/cheap probes after loader fix. |
| removed slash protection present | 1 | Recommendation still calls out removed slash fallthrough cost. |
| verified | 1 | All checks passed. |

## Recommendation summary

- Current runtime: native wins; `pi-subagents` cannot be treated as currently available while the fresh launch fails.
- Source/tool-schema: native now covers generic background-run control; `pi-subagents` remains relevant only for extension-specific async widgets/logs or management workflows after loader repair.
- Future action: fix loader/package interaction, rerun S01 plus cheap extension command probes, then rescore current-runtime rows.

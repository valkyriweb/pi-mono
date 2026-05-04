# Eval Design Prompt Currentness Audit

Purpose: keep `eval-design-prompt.md` useful as historical/reusable scaffolding without preserving obsolete command-surface assumptions from the seed prompt.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| warning present | 1 | Prompt says it is historical scaffolding, not current evidence. |
| current caveats present | 12/12 | Prompt names current extension version, removed surfaces, source-declared commands, and load-failure caveat. |
| stale lines absent | 1 | Known obsolete seed-prompt command/action lines are gone. |
| verified | 1 | All checks passed. |

## Missing caveats

- none.

## Stale lines still present

- none.

## Interpretation

- The seed prompt can still explain why the eval exists, but it no longer tells a rerunner to treat removed `pi-subagents` slash surfaces as active commands.
- Current runtime/source boundaries remain delegated to the filled artifacts: `eval-plan.md`, `command-surface.md`, `scorecard.md`, and `source-runtime-boundary.md`.

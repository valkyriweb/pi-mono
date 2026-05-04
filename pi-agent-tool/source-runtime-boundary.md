# Source/Runtime Boundary Audit

Purpose: prevent `pi-subagents` source-declared capabilities from being read as current runtime availability while the fresh eval launch fails to load the extension. This is narrower than the scenario verdict audit: it checks row-level wording on source-backed extension rows.

## Boundary checks

| Check | Value | Meaning |
|---|---:|---|
| extension source-backed rows | 5 | `pi-subagents` rows scored from source only: S02, S03, S04, S08, S09. |
| scorecard rows caveated | 5/5 | Each source-backed extension row says current runtime load is blocked until loader fix/rerun. |
| manifest rows caveated | 5/5 | Evidence manifest marks the same rows as source-backed only and current-runtime blocked. |
| eval-plan rows caveated | 5/5 | Eval plan scenario rows carry the same source-only/current-runtime-blocked boundary. |
| eval-plan global caveat | 1 | Eval plan says source-declared commands are not current runtime availability. |
| scenario rule caveat | 1 | Scenario verdict audit scopes source-backed rows to static/current-version claims, not output quality. |
| verified | 1 | All boundary checks passed. |

## Interpretation

- Current-runtime `pi-subagents` availability comes from the load-failure captures and `extension-load-audit.md`.
- Source-backed extension rows still matter for installed-source capability comparison, but they are not proof that the commands currently run under the fresh eval launch.
- If the loader issue is fixed, rerun S01 plus cheap extension command probes and then remove or revise these blocked-runtime caveats.

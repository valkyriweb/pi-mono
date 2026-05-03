# Stale Evidence Policy

Purpose: prevent historical `pi-subagents` captures from being cited as current-runtime proof after the newer module-format load failure. This is a reviewer checklist, not an extra benchmark.

## Checklist

| Policy item | Rule | Status |
|---|---|---|
| Current runtime verdict | Use `captures/subagents-s01-live-child-output.txt`, `captures/subagents-startup.txt`, `live-child-output.md`, and `extension-load-audit.md` for current `pi-subagents` runtime availability. | verified |
| Historical loaded-extension captures | Treat `subagents-s05-status-removed-live.txt`, `subagents-s06-doctor-live.txt`, and `subagents-s07-manager-removed-live.txt` as prior loaded-extension evidence only; `capture-timeline.md` shows they predate current failures. | verified |
| Source-declared capability | Use `source-probes.md` for command/schema presence (`/run`, `/chain`, `/parallel`, `/subagents-doctor`) but do not infer current runtime availability from source alone. | verified |
| Token fallthrough evidence | Use `token-evidence.md` as a real cost footgun from the earlier loaded-extension state, not as a cost measurement for the current failed-load state. | verified |
| Scorecard wording | `scorecard.md` marks S05/S06/S07 `pi-subagents` live evidence as prior and states current runtime load is blocked. | verified |
| Rerun trigger | If the extension load failure is fixed, rerun S01 plus cheap `/run`/`/chain`/`/parallel`/`/run-chain`/`/subagents-doctor` probes before using old captures as current proof. | verified |

## Mechanical checks

- Manifest prior live rows tagged: 3/3.
- Scorecard prior live rows tagged: 3/3.
- Current failure evidence linked: 1.
- Timeline prior/current distinction linked: 1.
- Token caveat present: 1.
- Rerun trigger present: 1.

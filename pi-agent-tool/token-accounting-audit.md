# Token Accounting Audit

Purpose: keep model-call and token/cost language aligned after adding one tiny native S01 live child probe while preserving the mostly source-backed eval. This prevents stale claims like "no model calls" from surviving beside real token evidence.

## Accounting checks

| Check | Value | Meaning |
|---|---:|---|
| token evidence rows | 7 | Seven scenario rows in `token-evidence.md`. |
| native registered zero-cost probes | 3 | `/agents-status`, `/agents-doctor`, and `/agents` stayed local. |
| native S01 child cost present | 1 | `token-evidence.md` records ~$0.076 and 1958 child tokens. |
| extension removed-command cost present | 1 | Prior `/subagents*` fallthrough cost remains documented as $0.111. |
| current extension no-child caveat present | 1 | Current S01 extension failure has no child token accounting. |
| scorecard intro aligned | 1 | Scorecard says most, not all, token fields are `n/a`. |
| findings metadata aligned | 1 | Run metadata names the one native child and prior extension fallthroughs. |
| token conclusion caveated | 1 | Conclusion scopes fallthrough cost to earlier loaded-extension captures. |
| observed cost cents | 18.7 | 7.6c native S01 + 11.1c prior extension fallthroughs. |

## Interpretation

- The eval is still mostly source-backed; only one native child-output probe and two earlier extension fallthrough probes have paid-model footer evidence.
- Registered native status/doctor/selector commands remain local `$0.000` UI paths.
- Current `pi-subagents` S01 has no child token accounting because the extension fails before `/run scout` can execute.

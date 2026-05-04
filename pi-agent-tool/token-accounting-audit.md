# Token Accounting Audit

Purpose: keep model-call and token/cost language aligned after adding tiny native S01 and S05 paid child probes while preserving the mostly source-backed eval. This prevents stale claims like "no model calls" from surviving beside real token evidence.

## Accounting checks

| Check | Value | Meaning |
|---|---:|---|
| token evidence rows | 10 | Ten scenario rows in `token-evidence.md`. |
| native registered zero-cost probes | 3 | `/agents-status`, `/agents-doctor`, and `/agents` stayed local. |
| native paid child cost present | 1 | `token-evidence.md` records S01 ~$0.076/1958 tokens plus S05 start/status $0.0125/3377 tokens, interrupt/resume $0.0200/13139 tokens, and cancel $0.0675/12971 tokens. |
| extension removed-command cost present | 1 | Prior `/subagents*` fallthrough cost remains documented as $0.111. |
| current extension no-child caveat present | 1 | Current S01 extension failure has no child token accounting. |
| scorecard intro aligned | 1 | Scorecard says most, not all, token fields are `n/a`. |
| findings metadata aligned | 1 | Run metadata names the one native child and prior extension fallthroughs. |
| token conclusion caveated | 1 | Conclusion scopes fallthrough cost to earlier loaded-extension captures. |
| observed cost cents | 28.7 | 7.6c native S01 child + 1.25c native S05 start/status child + 2.0c native S05 interrupt/resume child + 6.75c native S05 cancel child + 11.1c prior extension fallthroughs. |

## Interpretation

- The eval is still mostly source-backed; only one native child-output probe, three native background-control probes, and two earlier extension fallthrough probes have paid-model evidence.
- Registered native status/doctor/selector commands remain local `$0.000` UI paths.
- Current `pi-subagents` S01 has no child token accounting because the extension fails before `/run scout` can execute.

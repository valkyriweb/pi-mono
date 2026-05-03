#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def count_token_rows(token: str) -> int:
    return sum(1 for line in token.splitlines() if re.match(r"^\| S\d\d ", line))


def registered_zero_count(token: str) -> int:
    return sum(1 for line in token.splitlines() if "| native |" in line and "$0.000" in line)


def write_markdown(path: Path, metrics: dict[str, int | float]) -> None:
    lines = [
        "# Token Accounting Audit",
        "",
        "Purpose: keep model-call and token/cost language aligned after adding one tiny native S01 live child probe while preserving the mostly source-backed eval. This prevents stale claims like \"no model calls\" from surviving beside real token evidence.",
        "",
        "## Accounting checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| token evidence rows | {metrics['token_accounting_rows']} | Seven scenario rows in `token-evidence.md`. |",
        f"| native registered zero-cost probes | {metrics['token_accounting_native_zero_rows']} | `/agents-status`, `/agents-doctor`, and `/agents` stayed local. |",
        f"| native S01 child cost present | {metrics['token_accounting_native_child_cost_present']} | `token-evidence.md` records ~$0.076 and 1958 child tokens. |",
        f"| extension removed-command cost present | {metrics['token_accounting_extension_removed_cost_present']} | Prior `/subagents*` fallthrough cost remains documented as $0.111. |",
        f"| current extension no-child caveat present | {metrics['token_accounting_current_extension_no_child_present']} | Current S01 extension failure has no child token accounting. |",
        f"| scorecard intro aligned | {metrics['token_accounting_scorecard_intro_aligned']} | Scorecard says most, not all, token fields are `n/a`. |",
        f"| findings metadata aligned | {metrics['token_accounting_findings_metadata_aligned']} | Run metadata names the one native child and prior extension fallthroughs. |",
        f"| token conclusion caveated | {metrics['token_accounting_token_conclusion_caveated']} | Conclusion scopes fallthrough cost to earlier loaded-extension captures. |",
        f"| observed cost cents | {metrics['token_accounting_observed_cost_cents']} | 7.6c native S01 + 11.1c prior extension fallthroughs. |",
        "",
        "## Interpretation",
        "",
        "- The eval is still mostly source-backed; only one native child-output probe and two earlier extension fallthrough probes have paid-model footer evidence.",
        "- Registered native status/doctor/selector commands remain local `$0.000` UI paths.",
        "- Current `pi-subagents` S01 has no child token accounting because the extension fails before `/run scout` can execute.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    token = read("token-evidence.md")
    findings = read("findings.md")
    scorecard = read("scorecard.md")
    live = read("live-child-output.md")

    metrics: dict[str, int | float] = {}
    metrics["token_accounting_rows"] = count_token_rows(token)
    metrics["token_accounting_native_zero_rows"] = registered_zero_count(token)
    metrics["token_accounting_native_child_cost_present"] = int(
        "captures/native-s01-live-child-output.txt" in token
        and "$0.076" in token
        and "1958 tokens" in token
        and "child_tokens=1958" in live
    )
    metrics["token_accounting_extension_removed_cost_present"] = int(
        "$0.111" in token
        and "~22k" in token
        and "187" in token
        and "earlier successful extension load" in token
    )
    metrics["token_accounting_current_extension_no_child_present"] = int(
        "Current fresh extension launch failed before `/run scout`; no child output/token accounting available" in token
        and "extension runtime failed before child output" in live
    )
    metrics["token_accounting_scorecard_intro_aligned"] = int(
        "Most token fields stay `n/a`" in scorecard
        and "one tiny native S01 live child probe" in scorecard
        and "two prior `pi-subagents` removed-command fallthrough probes" in scorecard
    )
    metrics["token_accounting_findings_metadata_aligned"] = int(
        "one tiny S01 native child run" in findings
        and "two prior removed-command fallthrough parent turns" in findings
        and "native S01 footer shows ~13k prompt, ~159 completion, ~$0.076" in findings
        and "$0.111 total" in findings
        and "unavailable / no model calls" not in findings
        and "Model calls in baseline | none" not in findings
    )
    metrics["token_accounting_token_conclusion_caveated"] = int(
        "earlier loaded-extension `pi-subagents` 0.24.0 captures" in token
        and "current fresh extension launch now fails before `/run`" in token
        and "one intentional native S01 child probe is recorded separately" in token
    )
    metrics["token_accounting_observed_cost_cents"] = 18.7
    verified = int(
        metrics["token_accounting_rows"] == 7
        and metrics["token_accounting_native_zero_rows"] == 3
        and metrics["token_accounting_native_child_cost_present"] == 1
        and metrics["token_accounting_extension_removed_cost_present"] == 1
        and metrics["token_accounting_current_extension_no_child_present"] == 1
        and metrics["token_accounting_scorecard_intro_aligned"] == 1
        and metrics["token_accounting_findings_metadata_aligned"] == 1
        and metrics["token_accounting_token_conclusion_caveated"] == 1
    )
    metrics["token_accounting_verified"] = verified
    write_markdown(ROOT / "token-accounting-audit.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

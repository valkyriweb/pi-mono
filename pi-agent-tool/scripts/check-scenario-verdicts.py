#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

EXPECTED_COUNTS = {
    "current-live": 4,
    "current-load-failure": 1,
    "prior-live": 3,
    "source-backed": 10,
}


def read(path: str) -> str:
    return (ROOT / path).read_text(errors="ignore") if (ROOT / path).exists() else ""


def parse_manifest_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for line in read("evidence-manifest.md").splitlines():
        if not re.match(r"^\| S\d\d ", line):
            continue
        cells = [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
        if len(cells) < 6:
            continue
        rows.append(
            {
                "scenario": cells[0],
                "arm": cells[1],
                "evidence_file": cells[2],
                "mode": cells[3],
                "support": cells[4],
                "status": cells[5],
            }
        )
    return rows


def classify(row: dict[str, str]) -> str:
    mode = row["mode"]
    if mode == "live child output" or mode == "source + live tmux":
        return "current-live"
    if mode == "live runtime failure":
        return "current-load-failure"
    if mode.startswith("source + prior live"):
        return "prior-live"
    if mode.startswith("source-backed") or mode == "source-backed" or mode.startswith("source-backed "):
        return "source-backed"
    return "unknown"


def scorecard_checks() -> dict[str, int]:
    scorecard = read("scorecard.md")
    prior = sum(
        1
        for line in scorecard.splitlines()
        if "| pi-subagents |" in line and "prior" in line and "current runtime load is blocked" in line
    )
    current_failure = int(
        "Current fresh extension launch failed before `/run scout`; source still declares `/run`, but runtime command surface was unavailable." in scorecard
    )
    one_live_native = int("Live native `/agents run scout`" in scorecard and "1958 child tokens" in scorecard)
    return {
        "scenario_verdict_scorecard_prior_rows": prior,
        "scenario_verdict_scorecard_current_failure": current_failure,
        "scenario_verdict_scorecard_native_live_child": one_live_native,
    }


def findings_checks() -> dict[str, int]:
    findings = read("findings.md")
    no_stale_false_claim = int("No live child-agent outputs were generated" not in findings)
    one_tiny_live_claim = int("one tiny" in findings.lower() and "live child" in findings.lower())
    current_failure_claim = int("current fresh extension launch fails" in findings or "current fresh extension launch fails" in findings.lower())
    return {
        "scenario_verdict_findings_no_stale_false_claim": no_stale_false_claim,
        "scenario_verdict_findings_one_tiny_live_claim": one_tiny_live_claim,
        "scenario_verdict_findings_current_failure_claim": current_failure_claim,
    }


def write_markdown(path: Path, rows: list[dict[str, str]], classes: dict[tuple[str, str], str], counts: Counter[str], verified: int) -> None:
    lines = [
        "# Scenario Verdict Audit",
        "",
        "Purpose: classify every scored scenario row by what kind of evidence it actually has. This prevents current runtime failures, prior loaded-extension captures, and source-backed capability probes from being blended into one ambiguous verdict.",
        "",
        "## Scenario verdict table",
        "",
        "| Scenario | Arm | Verdict class | Evidence mode | Evidence file |",
        "|---|---|---|---|---|",
    ]
    for row in rows:
        key = (row["scenario"], row["arm"])
        lines.append(
            f"| {row['scenario']} | {row['arm']} | {classes[key]} | {row['mode']} | `{row['evidence_file']}` |"
        )
    lines.extend(
        [
            "",
            "## Counts",
            "",
            f"- Current live/runtime rows: {counts['current-live']}/4.",
            f"- Current load-failure rows: {counts['current-load-failure']}/1.",
            f"- Prior loaded-extension rows: {counts['prior-live']}/3.",
            f"- Source-backed rows: {counts['source-backed']}/10.",
            f"- Unknown rows: {counts['unknown']}.",
            f"- Audit verified: {verified}.",
            "",
            "## Reviewer rule",
            "",
            "Use current-live and current-load-failure rows for current runtime behavior. Use prior-live rows only as historical loaded-extension evidence until rerun. Use source-backed rows for static capability/current-version claims, not output-quality claims.",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    rows = parse_manifest_rows()
    classes: dict[tuple[str, str], str] = {}
    counts: Counter[str] = Counter()
    for row in rows:
        cls = classify(row)
        classes[(row["scenario"], row["arm"])] = cls
        counts[cls] += 1

    scorecard = scorecard_checks()
    findings = findings_checks()
    verified = int(
        len(rows) == 18
        and all(counts[name] == expected for name, expected in EXPECTED_COUNTS.items())
        and counts["unknown"] == 0
        and scorecard["scenario_verdict_scorecard_prior_rows"] == 3
        and scorecard["scenario_verdict_scorecard_current_failure"] == 1
        and scorecard["scenario_verdict_scorecard_native_live_child"] == 1
        and findings["scenario_verdict_findings_no_stale_false_claim"] == 1
        and findings["scenario_verdict_findings_one_tiny_live_claim"] == 1
        and findings["scenario_verdict_findings_current_failure_claim"] == 1
    )
    write_markdown(ROOT / "scenario-verdict-audit.md", rows, classes, counts, verified)
    metrics = {
        "scenario_verdict_rows": len(rows),
        "scenario_verdict_current_live_rows": counts["current-live"],
        "scenario_verdict_current_failure_rows": counts["current-load-failure"],
        "scenario_verdict_prior_live_rows": counts["prior-live"],
        "scenario_verdict_source_backed_rows": counts["source-backed"],
        "scenario_verdict_unknown_rows": counts["unknown"],
        **scorecard,
        **findings,
        "scenario_verdict_verified": verified,
    }
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

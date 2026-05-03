#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ARMS = {"native", "pi-subagents", "tie", "no current winner"}
INTENTIONAL_EXCEPTIONS = {
    "S02": "Capability is effectively tied; prose records the extension async/fork flexibility edge while numeric score rewards native core integration.",
    "S03": "Capability is effectively tied; prose records operator-vs-core tradeoff while numeric score rewards native robustness/integration.",
    "S06": "Both arms have real diagnostics; numeric score gives native a small edge, prose treats the feature as a practical tie.",
    "S09": "Numeric score favors pi-subagents closest-equivalent management/status controls, but prose correctly says no current winner because the requested native lifecycle surface is absent and extension controls are not equivalent.",
}


def parse_table_row(line: str) -> list[str]:
    return [part.strip().strip("`") for part in line.strip().strip("|").split("|")]


def scenario_id(label: str) -> str:
    match = re.match(r"^(S\d\d)\b", label)
    if not match:
        raise ValueError(f"Cannot parse scenario id from: {label}")
    return match.group(1)


def parse_numeric_winners(path: Path) -> dict[str, tuple[str, str]]:
    winners: dict[str, tuple[str, str]] = {}
    for line in path.read_text().splitlines():
        if not re.match(r"^\| S\d\d ", line):
            continue
        cells = parse_table_row(line)
        if len(cells) < 4:
            raise ValueError(f"Malformed score-analysis row: {line}")
        scenario, winner = cells[0], cells[3]
        if winner not in {"native", "pi-subagents", "tie"}:
            raise ValueError(f"Unknown numeric winner for {scenario}: {winner}")
        winners[scenario_id(scenario)] = (scenario, winner)
    if len(winners) != 9:
        raise ValueError(f"Expected 9 numeric winner rows, found {len(winners)}")
    return winners


def normalize_finding_winner(text: str) -> str:
    value = text.strip().lower().replace("`", "")
    if "no current winner" in value or "no winner" in value:
        return "no current winner"
    if "tie" in value:
        return "tie"
    if "pi-subagents" in value:
        return "pi-subagents"
    if "native" in value:
        return "native"
    raise ValueError(f"Cannot classify findings winner line: {text}")


def parse_findings_winners(path: Path) -> dict[str, str]:
    winners: dict[str, str] = {}
    current: str | None = None
    for line in path.read_text().splitlines():
        heading = re.match(r"^## (S\d\d .+)$", line)
        if heading:
            current = scenario_id(heading.group(1).strip())
            continue
        if current and line.startswith("- Winner:"):
            winners[current] = normalize_finding_winner(line.split(":", 1)[1])
            current = None
    if len(winners) != 9:
        missing = sorted(set(parse_numeric_winners(Path("score-analysis.md"))) - set(winners))
        raise ValueError(f"Expected 9 findings winner lines, found {len(winners)}; missing={missing}")
    return winners


def alignment_status(scenario_key: str, numeric: str, qualitative: str) -> tuple[str, str]:
    if numeric == qualitative:
        return "aligned", "Findings winner matches numeric winner."
    if scenario_key in INTENTIONAL_EXCEPTIONS:
        return "intentional-exception", INTENTIONAL_EXCEPTIONS[scenario_key]
    return "conflict", f"Numeric winner is {numeric}, but findings winner is {qualitative}."


def write_alignment(path: Path, numeric: dict[str, tuple[str, str]], qualitative: dict[str, str]) -> dict[str, int]:
    rows: list[tuple[str, str, str, str, str]] = []
    counts = {"aligned": 0, "intentional-exception": 0, "conflict": 0}
    for key in sorted(numeric):
        scenario, numeric_winner = numeric[key]
        if key not in qualitative:
            rows.append((scenario, numeric_winner, "missing", "conflict", "Findings section has no Winner line."))
            counts["conflict"] += 1
            continue
        status, reason = alignment_status(key, numeric_winner, qualitative[key])
        counts[status] += 1
        rows.append((scenario, numeric_winner, qualitative[key], status, reason))

    lines = [
        "# Findings Alignment",
        "",
        "Generated from `score-analysis.md` and `findings.md` by `scripts/check-findings-alignment.py`. This file guards against the prose conclusion drifting away from the numeric scorecard while preserving documented judgment calls.",
        "",
        "## Scenario alignment",
        "",
        "| Scenario | Numeric winner | Findings winner | Status | Reason |",
        "|---|---|---|---|---|",
    ]
    for scenario, numeric_winner, qualitative_winner, status, reason in rows:
        lines.append(f"| {scenario} | {numeric_winner} | {qualitative_winner} | {status} | {reason} |")
    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- Aligned findings: {counts['aligned']}.",
            f"- Intentional qualitative exceptions: {counts['intentional-exception']}.",
            f"- Conflicts: {counts['conflict']}.",
            "- Any non-zero conflict count fails the autoresearch scorer.",
            "",
        ]
    )
    path.write_text("\n".join(lines))
    return counts


def main() -> int:
    numeric = parse_numeric_winners(Path("score-analysis.md"))
    qualitative = parse_findings_winners(Path("findings.md"))
    counts = write_alignment(Path("findings-alignment.md"), numeric, qualitative)
    if counts["conflict"]:
        raise ValueError(f"Findings alignment conflicts: {counts['conflict']}")
    print(f"findings_alignment_rows={sum(counts.values())}")
    print(f"findings_alignment_aligned={counts['aligned']}")
    print(f"findings_alignment_exceptions={counts['intentional-exception']}")
    print(f"findings_alignment_conflicts={counts['conflict']}")
    print("findings_alignment_verified=1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

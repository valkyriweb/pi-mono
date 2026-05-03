#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from collections import defaultdict
from pathlib import Path
from statistics import mean

SCORE_COLUMNS = ["Correctness", "Coverage", "UX", "Robustness", "Flexibility", "Evidence"]
ARMS = ["native", "pi-subagents"]


def rounded(value: float) -> float:
    return int(value * 10 + 0.5) / 10


def parse_table_row(line: str) -> list[str]:
    return [part.strip().strip("`") for part in line.strip().strip("|").split("|")]


def parse_scorecard(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for line in path.read_text().splitlines():
        if not re.match(r"^\| S\d\d ", line):
            continue
        cells = parse_table_row(line)
        if len(cells) < 16:
            raise ValueError(f"Malformed scorecard row: {line}")
        scores = [int(cells[index]) for index in range(2, 8)]
        if any(score < 1 or score > 5 for score in scores):
            raise ValueError(f"Score outside 1-5 range: {line}")
        rows.append(
            {
                "scenario": cells[0],
                "arm": cells[1],
                "scores": scores,
                "total": sum(scores),
                "evidence_file": cells[15],
            }
        )
    return rows


def parse_summary_averages(path: Path) -> dict[str, list[float]]:
    averages: dict[str, list[float]] = {}
    in_averages = False
    for line in path.read_text().splitlines():
        if line.strip() == "## Averages":
            in_averages = True
            continue
        if not in_averages or not line.startswith("|") or line.startswith("|---"):
            continue
        cells = parse_table_row(line)
        if not cells or cells[0] == "Arm":
            continue
        if cells[0] in ARMS:
            averages[cells[0]] = [float(cells[index]) for index in range(1, 7)]
    return averages


def compute_arm_averages(rows: list[dict[str, object]]) -> dict[str, list[float]]:
    by_arm: dict[str, list[list[int]]] = defaultdict(list)
    for row in rows:
        by_arm[str(row["arm"])].append(row["scores"])  # type: ignore[arg-type]
    result: dict[str, list[float]] = {}
    for arm in ARMS:
        scores = by_arm.get(arm, [])
        if len(scores) != 9:
            raise ValueError(f"Expected 9 rows for {arm}, found {len(scores)}")
        result[arm] = [rounded(mean(score[index] for score in scores)) for index in range(6)]
    return result


def compute_scenario_winners(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    by_scenario: dict[str, dict[str, dict[str, object]]] = defaultdict(dict)
    for row in rows:
        by_scenario[str(row["scenario"])][str(row["arm"])] = row
    winners: list[dict[str, object]] = []
    for scenario in sorted(by_scenario):
        arms = by_scenario[scenario]
        if set(arms) != set(ARMS):
            raise ValueError(f"Scenario {scenario} missing arm rows: {sorted(arms)}")
        native_total = int(arms["native"]["total"])
        subagents_total = int(arms["pi-subagents"]["total"])
        if native_total > subagents_total:
            winner = "native"
        elif subagents_total > native_total:
            winner = "pi-subagents"
        else:
            winner = "tie"
        winners.append(
            {
                "scenario": scenario,
                "native_total": native_total,
                "subagents_total": subagents_total,
                "winner": winner,
            }
        )
    return winners


def write_analysis(path: Path, rows: list[dict[str, object]], averages: dict[str, list[float]], winners: list[dict[str, object]]) -> None:
    lines = [
        "# Score Analysis",
        "",
        "Generated from `scorecard.md` by `scripts/check-scorecard-consistency.py`. This file makes the numeric scorecard conclusions reproducible and guards against stale summary averages.",
        "",
        "## Computed averages",
        "",
        "| Arm | Avg correctness | Avg coverage | Avg UX | Avg robustness | Avg flexibility | Avg evidence |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for arm in ARMS:
        values = " | ".join(f"{value:.1f}" for value in averages[arm])
        lines.append(f"| {arm} | {values} |")
    lines.extend(
        [
            "",
            "## Scenario numeric winners",
            "",
            "| Scenario | Native total | `pi-subagents` total | Numeric winner |",
            "|---|---:|---:|---|",
        ]
    )
    for item in winners:
        lines.append(
            f"| {item['scenario']} | {item['native_total']} | {item['subagents_total']} | {item['winner']} |"
        )
    native_wins = sum(1 for item in winners if item["winner"] == "native")
    subagent_wins = sum(1 for item in winners if item["winner"] == "pi-subagents")
    ties = sum(1 for item in winners if item["winner"] == "tie")
    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- Numeric scenario wins: native={native_wins}, pi-subagents={subagent_wins}, tie={ties}.",
            "- S02 and S03 are capability-near-ties in the prose, but native has a small numeric edge because the scorecard rewards tighter core integration/robustness.",
            "- S05 and S09 are the only numeric wins for `pi-subagents`: async/control and closest task-lifecycle equivalent, respectively.",
            "- The scorecard summary averages must match the computed averages above to one decimal place.",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", type=Path, help="Write a markdown analysis file")
    args = parser.parse_args()

    scorecard = Path("scorecard.md")
    rows = parse_scorecard(scorecard)
    if len(rows) != 18:
        raise ValueError(f"Expected 18 scorecard rows, found {len(rows)}")
    numeric_cells = len(rows) * len(SCORE_COLUMNS)
    computed_averages = compute_arm_averages(rows)
    summary_averages = parse_summary_averages(scorecard)
    winners = compute_scenario_winners(rows)

    mismatches: list[str] = []
    for arm in ARMS:
        if arm not in summary_averages:
            mismatches.append(f"missing summary row for {arm}")
            continue
        for column, expected, actual in zip(SCORE_COLUMNS, computed_averages[arm], summary_averages[arm], strict=True):
            if expected != actual:
                mismatches.append(f"{arm} {column}: expected {expected:.1f}, found {actual:.1f}")
    if mismatches:
        raise ValueError("Scorecard summary mismatch: " + "; ".join(mismatches))

    if args.write:
        write_analysis(args.write, rows, computed_averages, winners)

    native_wins = sum(1 for item in winners if item["winner"] == "native")
    subagent_wins = sum(1 for item in winners if item["winner"] == "pi-subagents")
    ties = sum(1 for item in winners if item["winner"] == "tie")
    print(f"scorecard_numeric_rows={len(rows)}")
    print(f"scorecard_numeric_cells={numeric_cells}")
    print("scorecard_average_consistency=1")
    print(f"scorecard_numeric_native_wins={native_wins}")
    print(f"scorecard_numeric_subagents_wins={subagent_wins}")
    print(f"scorecard_numeric_ties={ties}")
    print(f"scorecard_analysis_rows={len(winners)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

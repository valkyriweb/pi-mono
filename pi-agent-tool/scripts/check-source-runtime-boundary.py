#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_BACKED_EXTENSION_SCENARIOS = {
    "S02 parallel review",
    "S03 chain handoff",
    "S04 saved workflow",
    "S08 context discipline",
    "S09 task agent tool",
}


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def table_rows(text: str, arm: str = "pi-subagents") -> dict[str, str]:
    rows: dict[str, str] = {}
    for line in text.splitlines():
        if not line.startswith("| S") or f"| {arm} |" not in line:
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 2:
            rows[cells[0]] = line
    return rows


def count_caveated(rows: dict[str, str]) -> int:
    count = 0
    for scenario in SOURCE_BACKED_EXTENSION_SCENARIOS:
        row = rows.get(scenario, "").lower()
        if "source-backed" in row and "current runtime load is blocked" in row and "loader fix/rerun" in row:
            count += 1
    return count


def count_manifest_caveated(rows: dict[str, str]) -> int:
    count = 0
    for scenario in SOURCE_BACKED_EXTENSION_SCENARIOS:
        row = rows.get(scenario, "").lower()
        if "source-backed" in row and "only" in row and "current runtime load blocked" in row:
            count += 1
    return count


def write_markdown(path: Path, metrics: dict[str, int]) -> None:
    lines = [
        "# Source/Runtime Boundary Audit",
        "",
        "Purpose: prevent `pi-subagents` source-declared capabilities from being read as current runtime availability while the fresh eval launch fails to load the extension. This is narrower than the scenario verdict audit: it checks row-level wording on source-backed extension rows.",
        "",
        "## Boundary checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| extension source-backed rows | {metrics['source_runtime_extension_source_rows']} | `pi-subagents` rows scored from source only: S02, S03, S04, S08, S09. |",
        f"| scorecard rows caveated | {metrics['source_runtime_scorecard_rows_caveated']}/{metrics['source_runtime_extension_source_rows']} | Each source-backed extension row says current runtime load is blocked until loader fix/rerun. |",
        f"| manifest rows caveated | {metrics['source_runtime_manifest_rows_caveated']}/{metrics['source_runtime_extension_source_rows']} | Evidence manifest marks the same rows as source-backed only and current-runtime blocked. |",
        f"| eval-plan global caveat | {metrics['source_runtime_eval_plan_global_caveat']} | Eval plan says source-declared commands are not current runtime availability. |",
        f"| scenario rule caveat | {metrics['source_runtime_scenario_rule_caveat']} | Scenario verdict audit scopes source-backed rows to static/current-version claims, not output quality. |",
        f"| verified | {metrics['source_runtime_boundary_verified']} | All boundary checks passed. |",
        "",
        "## Interpretation",
        "",
        "- Current-runtime `pi-subagents` availability comes from the load-failure captures and `extension-load-audit.md`.",
        "- Source-backed extension rows still matter for installed-source capability comparison, but they are not proof that the commands currently run under the fresh eval launch.",
        "- If the loader issue is fixed, rerun S01 plus cheap extension command probes and then remove or revise these blocked-runtime caveats.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    scorecard_rows = table_rows(read("scorecard.md"))
    manifest_rows = table_rows(read("evidence-manifest.md"))
    eval_plan = read("eval-plan.md").lower()
    scenario_verdict = read("scenario-verdict-audit.md").lower()
    row_count = len(SOURCE_BACKED_EXTENSION_SCENARIOS)
    metrics = {
        "source_runtime_extension_source_rows": row_count,
        "source_runtime_scorecard_rows_caveated": count_caveated(scorecard_rows),
        "source_runtime_manifest_rows_caveated": count_manifest_caveated(manifest_rows),
        "source_runtime_eval_plan_global_caveat": int(
            "source-declared commands are not treated as current runtime availability" in eval_plan
            and "until the loader issue is fixed" in eval_plan
        ),
        "source_runtime_scenario_rule_caveat": int(
            "use source-backed rows for static capability/current-version claims" in scenario_verdict
            and "not output-quality claims" in scenario_verdict
        ),
    }
    metrics["source_runtime_boundary_verified"] = int(
        metrics["source_runtime_scorecard_rows_caveated"] == row_count
        and metrics["source_runtime_manifest_rows_caveated"] == row_count
        and metrics["source_runtime_eval_plan_global_caveat"] == 1
        and metrics["source_runtime_scenario_rule_caveat"] == 1
    )
    write_markdown(ROOT / "source-runtime-boundary.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["source_runtime_boundary_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

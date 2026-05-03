#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def get_scenario_row(text: str, scenario: str) -> list[str]:
    for line in text.splitlines():
        if line.startswith(f"| {scenario} "):
            return [cell.strip() for cell in line.strip().strip("|").split("|")]
    return []


def write_markdown(path: Path, metrics: dict[str, int]) -> None:
    lines = [
        "# Eval Plan Currentness Audit",
        "",
        "Purpose: keep `eval-plan.md` aligned with the evidence that was added after the initial source-backed baseline. This catches stale planning prose, especially the old S01 claim that neither arm had live child evidence.",
        "",
        "## Currentness checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| rows | {metrics['eval_plan_currentness_rows']} | Distinct eval-plan currentness checks. |",
        f"| S01 native live child | {metrics['eval_plan_s01_native_live_child']} | S01 native plan names the live `/agents run scout` child probe. |",
        f"| S01 extension load failure | {metrics['eval_plan_s01_subagents_load_failure']} | S01 `pi-subagents` plan names the current load failure before `/run scout`. |",
        f"| no stale no-live wording | {metrics['eval_plan_no_stale_no_live_child']} | S01 no longer says both arms have no live child. |",
        f"| runtime caveat | {metrics['eval_plan_runtime_caveat']} | Command-surface section separates source-declared extension commands from current runtime availability. |",
        f"| token caveat | {metrics['eval_plan_token_caveat']} | Rubric names the one native child run, prior extension fallthroughs, and current extension no-child caveat. |",
        f"| secondary metrics delegated | {metrics['eval_plan_secondary_metrics_delegated']} | Secondary metrics point to `autoresearch.md` instead of a stale short list. |",
        f"| verified | {metrics['eval_plan_currentness_verified']} | All currentness checks passed. |",
        "",
        "## Interpretation",
        "",
        "- The eval plan now reflects the current evidence mix: one tiny native live child probe, current `pi-subagents` load failure, older extension-loaded captures treated as historical, and source-backed rows where live fanout would spend tokens.",
        "- This is a correctness check, not extra behavioral evidence; it prevents reviewers from following the old baseline plan after newer artifacts changed the evidence class.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    plan = read("eval-plan.md")
    s01 = get_scenario_row(plan, "S01")
    s01_text = " | ".join(s01)
    native_cell = s01[2] if len(s01) > 2 else ""
    subagents_cell = s01[3] if len(s01) > 3 else ""
    evidence_cell = s01[4] if len(s01) > 4 else ""
    token_section_match = re.search(r"Token/value.*", plan, re.DOTALL)
    token_section = token_section_match.group(0) if token_section_match else ""
    metrics = {
        "eval_plan_currentness_rows": 6,
        "eval_plan_s01_native_live_child": int(
            "/agents run scout" in native_cell
            and "live" in native_cell.lower()
            and "completed" in native_cell.lower()
        ),
        "eval_plan_s01_subagents_load_failure": int(
            "/run scout" in subagents_cell
            and "failed before" in subagents_cell.lower()
            and "runtime unavailable" in subagents_cell.lower()
        ),
        "eval_plan_no_stale_no_live_child": int("no live child" not in s01_text.lower()),
        "eval_plan_runtime_caveat": int(
            "current fresh eval launch fails" in plan.lower()
            and "source-declared commands" in plan.lower()
            and "runtime availability" in plan.lower()
        ),
        "eval_plan_token_caveat": int(
            "one tiny native s01 live child" in token_section.lower()
            and "two prior `pi-subagents` removed-command fallthrough" in token_section.lower()
            and "current extension s01 has no child token" in token_section.lower()
        ),
        "eval_plan_secondary_metrics_delegated": int(
            "Secondary metrics: see `autoresearch.md`" in plan
            and "live metric list" in plan
        ),
    }
    metrics["eval_plan_currentness_verified"] = int(
        all(value == 1 for key, value in metrics.items() if key != "eval_plan_currentness_rows")
    )
    write_markdown(ROOT / "eval-plan-currentness.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["eval_plan_currentness_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

README_COMMANDS = [
    "./scripts/capture-source-probes.sh",
    "./scripts/capture-startup.sh native",
    "./scripts/capture-startup.sh subagents",
    "native-s06-doctor-live '/agents-doctor'",
    "native-s05-status-live '/agents-status'",
    "native-s07-ui-selector-live '/agents'",
    "subagents-s06-doctor-live '/subagents-doctor'",
    "subagents-s05-status-removed-live '/subagents-status'",
    "subagents-s07-manager-removed-live '/subagents'",
    "native-s01-live-child-output '/agents run scout --",
    "subagents-s01-live-child-output '/run scout",
    "python3 scripts/check-command-surface.py --write",
    "python3 scripts/check-live-child-output.py",
    "python3 scripts/check-extension-load-audit.py",
    "python3 scripts/check-capture-timeline.py",
    "python3 scripts/check-stale-evidence-policy.py",
    "python3 scripts/check-scenario-verdicts.py",
    "python3 scripts/check-token-accounting.py",
    "python3 scripts/check-repro-hygiene.py",
    "python3 scripts/check-recommendation-consistency.py",
    "python3 scripts/check-scorecard-consistency.py --write score-analysis.md",
    "python3 scripts/check-findings-alignment.py",
    "python3 scripts/check-task-lifecycle.py",
    "./autoresearch.sh",
]

RUNBOOK_ANCHORS = [
    "./scripts/capture-source-probes.sh",
    "./scripts/capture-startup.sh native",
    "./scripts/capture-startup.sh subagents",
    "subagents-s07-manager-removed-live '/subagents'",
    "python3 scripts/check-live-child-output.py",
    "python3 scripts/check-extension-load-audit.py",
    "python3 scripts/check-capture-timeline.py",
    "python3 scripts/check-stale-evidence-policy.py",
    "python3 scripts/check-scenario-verdicts.py",
    "python3 scripts/check-token-accounting.py",
    "python3 scripts/check-repro-hygiene.py",
    "python3 scripts/check-recommendation-consistency.py",
    "./autoresearch.sh",
]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def count_present(text: str, fragments: list[str]) -> int:
    return sum(1 for fragment in fragments if fragment in text)


def write_markdown(path: Path, metrics: dict[str, int]) -> None:
    lines = [
        "# Rerun Command Audit",
        "",
        "Purpose: keep the documented reproduction commands aligned with the artifacts scored by `autoresearch.sh`. The README quick-run block previously risked omitting preserved live/fallthrough captures even though downstream scorer checks relied on them.",
        "",
        "## Command coverage",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| README required commands | {metrics['rerun_readme_commands_present']}/{metrics['rerun_readme_commands_expected']} | Quick run includes source probes, startup captures, preserved live/fallthrough captures, audit checks, and scorer. |",
        f"| Runbook anchors | {metrics['rerun_runbook_anchors_present']}/{metrics['rerun_runbook_anchors_expected']} | Detailed runbook covers the same critical steps. |",
        f"| README removed manager probe | {metrics['rerun_readme_removed_manager_probe']} | README includes `/subagents` removed-command fallthrough probe. |",
        f"| README live child checker | {metrics['rerun_readme_live_child_checker']} | README regenerates/validates `live-child-output.md`. |",
        f"| README write-generators | {metrics['rerun_readme_write_generators']} | README includes write-mode generators for command surface and score analysis. |",
        f"| verified | {metrics['rerun_commands_verified']} | All command-coverage checks passed. |",
        "",
        "## Interpretation",
        "",
        "- The README quick-run block now includes the removed `/subagents` probe preserved for token/fallthrough evidence.",
        "- It also calls the generated-artifact checkers before `./autoresearch.sh`, reducing the risk of stale audit files during reproduction.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    readme = read("README.md")
    runbook = read("runbook.md")
    metrics = {
        "rerun_readme_commands_expected": len(README_COMMANDS),
        "rerun_readme_commands_present": count_present(readme, README_COMMANDS),
        "rerun_runbook_anchors_expected": len(RUNBOOK_ANCHORS),
        "rerun_runbook_anchors_present": count_present(runbook, RUNBOOK_ANCHORS),
        "rerun_readme_removed_manager_probe": int("subagents-s07-manager-removed-live '/subagents'" in readme),
        "rerun_readme_live_child_checker": int("python3 scripts/check-live-child-output.py" in readme),
        "rerun_readme_write_generators": int(
            "python3 scripts/check-command-surface.py --write" in readme
            and "python3 scripts/check-scorecard-consistency.py --write score-analysis.md" in readme
        ),
    }
    verified = int(
        metrics["rerun_readme_commands_present"] == metrics["rerun_readme_commands_expected"]
        and metrics["rerun_runbook_anchors_present"] == metrics["rerun_runbook_anchors_expected"]
        and metrics["rerun_readme_removed_manager_probe"] == 1
        and metrics["rerun_readme_live_child_checker"] == 1
        and metrics["rerun_readme_write_generators"] == 1
    )
    metrics["rerun_commands_verified"] = verified
    write_markdown(ROOT / "rerun-commands.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

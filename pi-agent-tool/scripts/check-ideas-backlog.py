#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_IDEAS = {
    "loader_rerun": "If the current `pi-subagents` module-format extension load failure is fixed",
    "loader_regression": "extension-loader regression",
    "task_lifecycle": "native non-spawn task lifecycle actions",
    "final_handoff": "Before final handoff",
}

FINAL_HANDOFF_MARKERS = [
    "handoff-review.md",
    "artifact-index.md",
    "autoresearch.sh` required_files",
    "markdown-hygiene.md",
    "capture-integrity.md",
    "native-control-currentness.md",
    "native-control-tests.md",
    "native-background-control-live.md",
    "native-background-interrupt-resume-live.md",
    "native-background-cancel-live.md",
    "source-runtime-boundary.md",
    "stale-evidence-policy.md",
    "recommendation-consistency.md",
]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def write_markdown(path: Path, metrics: dict[str, int], missing_ideas: list[str], missing_handoff_markers: list[str]) -> None:
    lines = [
        "# Ideas Backlog Audit",
        "",
        "Purpose: keep `autoresearch.ideas.md` useful. Deferred work should remain actionable and current with the evidence/audit surface, not preserve stale final-review lists after new guard artifacts land.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| ideas rows | {metrics['ideas_backlog_rows']} | Non-empty deferred-idea bullets. |",
        f"| required idea classes | {metrics['ideas_backlog_required_classes_present']}/{metrics['ideas_backlog_required_classes_expected']} | Loader rerun, loader regression, task lifecycle, and final handoff ideas remain present. |",
        f"| final handoff markers | {metrics['ideas_backlog_final_handoff_markers_present']}/{metrics['ideas_backlog_final_handoff_markers_expected']} | Final-handoff idea names the handoff review, current audit surfaces, or canonical indexes. |",
        f"| stale literal long list absent | {metrics['ideas_backlog_stale_long_list_absent']} | Final-handoff idea no longer hardcodes the old partial artifact list. |",
        f"| runbook current | {metrics['ideas_backlog_runbook_current']} | Runbook backlog verdict no longer claims native-control stress probes are deferred. |",
        f"| verified | {metrics['ideas_backlog_verified']} | Backlog is current and actionable. |",
        "",
        "## Missing",
        "",
        f"- Missing idea classes: {', '.join(missing_ideas) if missing_ideas else 'none'}.",
        f"- Missing final-handoff markers: {', '.join(missing_handoff_markers) if missing_handoff_markers else 'none'}.",
        "",
        "## Interpretation",
        "",
        "- This audit does not force the deferred work to happen now; it prevents the backlog from pointing reviewers at stale artifact subsets.",
        "- If a new required audit artifact lands, update the final-handoff idea to rely on `artifact-index.md`/`autoresearch.sh` indexes or name the new artifact explicitly.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    ideas = read("autoresearch.ideas.md")
    rows = [line for line in ideas.splitlines() if line.strip().startswith("- ")]
    missing_ideas = [name for name, marker in REQUIRED_IDEAS.items() if marker not in ideas]
    final_line = next((line for line in rows if "Before final handoff" in line), "")
    missing_handoff_markers = [marker for marker in FINAL_HANDOFF_MARKERS if marker not in final_line]
    stale_long_list_absent = int(
        "scorecard-template.md`, `evidence-manifest.md`, `artifact-index.md`, `eval-plan-currentness.md`" not in final_line
    )
    runbook = read("runbook.md")
    metrics = {
        "ideas_backlog_rows": len(rows),
        "ideas_backlog_required_classes_expected": len(REQUIRED_IDEAS),
        "ideas_backlog_required_classes_present": len(REQUIRED_IDEAS) - len(missing_ideas),
        "ideas_backlog_final_handoff_markers_expected": len(FINAL_HANDOFF_MARKERS),
        "ideas_backlog_final_handoff_markers_present": len(FINAL_HANDOFF_MARKERS) - len(missing_handoff_markers),
        "ideas_backlog_stale_long_list_absent": stale_long_list_absent,
        "ideas_backlog_runbook_current": int(
            "native S05 background start/status, interrupt/resume, and cancel probes are completed rather than deferred" in runbook
            and "optional future native-control stress-probe" not in runbook
        ),
    }
    metrics["ideas_backlog_verified"] = int(
        metrics["ideas_backlog_rows"] >= 4
        and metrics["ideas_backlog_required_classes_present"] == metrics["ideas_backlog_required_classes_expected"]
        and metrics["ideas_backlog_final_handoff_markers_present"] == metrics["ideas_backlog_final_handoff_markers_expected"]
        and metrics["ideas_backlog_stale_long_list_absent"] == 1
        and metrics["ideas_backlog_runbook_current"] == 1
    )
    write_markdown(ROOT / "ideas-backlog-audit.md", metrics, missing_ideas, missing_handoff_markers)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["ideas_backlog_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

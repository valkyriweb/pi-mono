#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

INTERPRETATION_SCOPE = "The guard covers both current live captures and source-backed captures, including the current `pi-subagents` load failure and the native S05 paid start/status, interrupt/resume, and cancel probes plus unit-test caveat."

EXPECTED_MARKERS: dict[str, list[str]] = {
    "captures/native-s01-live-child-output.txt": ["agent single: completed", "read:", "autoresearch.md", "scorecard.md", "findings.md"],
    "captures/subagents-s01-live-child-output.txt": ["Failed to load extension", "Cannot determine intended module format", "zsh: no such file or directory: /run"],
    "captures/native-s02-parallel-review.txt": ["S02 native", "tasks[]", "concurrency", "No `subagent` tool used"],
    "captures/subagents-s02-parallel-review.txt": ["S02 pi-subagents", "`/parallel`", "`--bg`", "`--fork`", "Native `agent` was disabled"],
    "captures/native-s03-chain-handoff.txt": ["S03 native", "chain[]", "{previous}", "`/agents run-chain`"],
    "captures/subagents-s03-chain-handoff.txt": ["S03 pi-subagents", "`/chain`", "`/run-chain`", "Native `/agents` and native `agent` were not used"],
    "captures/native-s04-saved-workflow.txt": ["S04 native", "saved chains", "`/agents list-chains`", "`/agents run-chain`"],
    "captures/subagents-s04-saved-workflow.txt": ["S04 pi-subagents", "`/run-chain`", "0.24.0 removed persistent save actions", "old manager save UX is gone"],
    "captures/native-s05-async-status-control.txt": ["S05 native", "`background: true`", "status/detail/interrupt/cancel/resume", "unit-test audit", "paid live background start/status, interrupt/resume, and cancel probes", "captures/native-s05-background-cancel-live.txt"],
    "captures/subagents-s05-async-status-control.txt": ["S05 pi-subagents", "`async`", "`status`", "`interrupt`", "`resume`", "removed the `/subagents-status` slash overlay"],
    "captures/native-s06-doctor-diagnostics.txt": ["S06 native", "`/agents-doctor`", "`/agents doctor`", "buildAgentDoctorReport"],
    "captures/subagents-s06-doctor-diagnostics.txt": ["S06 pi-subagents", "`/subagents-doctor`", "subagent({ action: \"doctor\" })", "src/extension/doctor.ts"],
    "captures/native-s07-ui-manager-selector.txt": ["S07 native", "`/agents`", "selector/scaffold UI", "not a manager"],
    "captures/subagents-s07-ui-manager-selector.txt": ["S07 pi-subagents", "0.24.0 removed", "no `/subagents` replacement", "token-cost footgun"],
    "captures/native-s08-context-discipline.txt": ["S08 native", "default, fork, slim, none", "Fork filtering", "`agent` and `subagent` tool artifacts"],
    "captures/subagents-s08-context-discipline.txt": ["S08 pi-subagents", "`--fork`", "context: \"fork\"", "does not match native's `default/slim/none/fork` enum"],
    "captures/native-s09-task-agent-tool.txt": ["S09 native", "source-backed negative probe", "Generic `action`/`runId`", "not the requested task-record lifecycle", "create/list/get/update/delete"],
    "captures/subagents-s09-task-agent-tool.txt": ["S09 pi-subagents", "closest task lifecycle equivalent", "create/list/get/update/delete reusable agent and chain definitions", "not a general non-spawn task-list lifecycle"],
}


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def parse_scorecard_evidence_files() -> set[str]:
    files: set[str] = set()
    for line in read("scorecard.md").splitlines():
        if not line.startswith("| S"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells and cells[0] != "Scenario":
            files.add(cells[-1])
    return files


def write_markdown(path: Path, metrics: dict[str, int], missing_files: list[str], missing_markers: dict[str, list[str]]) -> None:
    lines = [
        "# Capture Integrity Audit",
        "",
        "Purpose: verify that every scorecard evidence capture is not just present, but contains the scenario-specific markers the scorecard relies on. This is a lightweight guard against stale, swapped, or placeholder capture files.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| scorecard capture rows | {metrics['capture_integrity_scorecard_rows']} | Scorecard rows with evidence capture files. |",
        f"| expected capture files | {metrics['capture_integrity_expected_files']} | Capture files with marker expectations. |",
        f"| scorecard files covered | {metrics['capture_integrity_scorecard_files_covered']}/{metrics['capture_integrity_scorecard_rows']} | Every scorecard evidence file has an integrity expectation. |",
        f"| files present | {metrics['capture_integrity_files_present']}/{metrics['capture_integrity_expected_files']} | Expected capture files exist on disk. |",
        f"| markers expected | {metrics['capture_integrity_markers_expected']} | Scenario-specific marker checks. |",
        f"| markers present | {metrics['capture_integrity_markers_present']}/{metrics['capture_integrity_markers_expected']} | Expected markers found in capture files. |",
        f"| scope current | {metrics['capture_integrity_scope_current']} | Interpretation names native S05 paid start/status, interrupt/resume, and cancel probes. |",
        f"| runbook current | {metrics['capture_integrity_runbook_current']} | Runbook verdict names the current 78/78 marker count. |",
        f"| verified | {metrics['capture_integrity_verified']} | All capture integrity checks passed. |",
        "",
        "## Missing",
        "",
        f"- Missing files: {', '.join(missing_files) if missing_files else 'none'}.",
        "- Missing markers:",
    ]
    if missing_markers:
        for filename, markers in missing_markers.items():
            lines.append(f"  - `{filename}`: {', '.join(markers)}")
    else:
        lines.append("  - none")
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "- This does not replace live reruns; it checks that the captured/source-backed artifacts still contain the evidence claims cited by `scorecard.md`.",
            f"- {INTERPRETATION_SCOPE}",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    scorecard_files = parse_scorecard_evidence_files()
    expected_files = set(EXPECTED_MARKERS)
    missing_files = sorted(filename for filename in expected_files if not (ROOT / filename).is_file())
    missing_marker_map: dict[str, list[str]] = {}
    present_marker_count = 0
    expected_marker_count = 0
    for filename, markers in EXPECTED_MARKERS.items():
        text = read(filename)
        expected_marker_count += len(markers)
        missing = [marker for marker in markers if marker not in text]
        present_marker_count += len(markers) - len(missing)
        if missing:
            missing_marker_map[filename] = missing
    metrics = {
        "capture_integrity_scorecard_rows": len(scorecard_files),
        "capture_integrity_expected_files": len(expected_files),
        "capture_integrity_scorecard_files_covered": len(scorecard_files & expected_files),
        "capture_integrity_files_present": len(expected_files) - len(missing_files),
        "capture_integrity_markers_expected": expected_marker_count,
        "capture_integrity_markers_present": present_marker_count,
        "capture_integrity_scope_current": int(
            "paid start/status, interrupt/resume, and cancel probes plus unit-test caveat" in INTERPRETATION_SCOPE
            and "paid start/status plus unit-test caveat" not in INTERPRETATION_SCOPE
        ),
        "capture_integrity_runbook_current": int(
            "18/18 scorecard evidence captures are covered, 18/18 files exist, and 78/78 expected markers are present" in read("runbook.md")
            and "77/77 expected markers" not in read("runbook.md")
        ),
    }
    metrics["capture_integrity_verified"] = int(
        metrics["capture_integrity_scorecard_rows"] == 18
        and metrics["capture_integrity_expected_files"] == 18
        and metrics["capture_integrity_scorecard_files_covered"] == 18
        and metrics["capture_integrity_files_present"] == 18
        and metrics["capture_integrity_markers_present"] == metrics["capture_integrity_markers_expected"]
        and metrics["capture_integrity_scope_current"] == 1
        and metrics["capture_integrity_runbook_current"] == 1
    )
    write_markdown(ROOT / "capture-integrity.md", metrics, missing_files, missing_marker_map)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["capture_integrity_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

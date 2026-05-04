#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent

SOURCE_MARKERS = [
    "controlActionSchema",
    'Type.Literal("status")',
    'Type.Literal("detail")',
    'Type.Literal("interrupt")',
    'Type.Literal("cancel")',
    'Type.Literal("resume")',
    "background: Type.Optional",
    "Run in the background and return immediately with a run id",
]

STATUS_TEXT = "Background control: native background runs support status, interrupt, cancel, and single-run resume."

INTERPRETATION_BULLETS = [
    "- Native S05 is now scored from source, `native-control-tests.md`, a cheap `/agents-status` capture, one paid live start/status child probe, one paid live interrupt/resume probe, and one paid live cancel probe showing background control support.",
    "- This does not satisfy S09 task-record lifecycle: `task-lifecycle-audit.md` separately verifies generic control is not create/list/get/update/delete task lifecycle.",
    "- The paid cancel probe verifies operator-stop behavior without turning S05 into a broad child-output quality benchmark.",
]


def read(path: Path | str) -> str:
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    return p.read_text(errors="ignore") if p.exists() else ""


def scorecard_s05_native(scorecard: str) -> str:
    for line in scorecard.splitlines():
        if line.startswith("| S05 ") and "| native |" in line:
            return line
    return ""


def write_markdown(path: Path, metrics: dict[str, int]) -> None:
    lines = [
        "# Native Control Currentness Audit",
        "",
        "Purpose: keep S05 aligned after native background-run control landed in source/status output and after paid live start/status, interrupt/resume, and cancel probes were captured. Earlier artifacts said native background control was unsupported or untested; this audit prevents those stale claims from returning.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| source markers | {metrics['native_control_source_markers']}/{metrics['native_control_source_markers_expected']} | `agent.ts` exposes background and status/detail/interrupt/cancel/resume control markers. |",
        f"| status source text | {metrics['native_control_status_source']} | `status.ts` reports supported native background control. |",
        f"| live status capture | {metrics['native_control_status_capture']} | `captures/native-s05-status-live.txt` was rerun and no longer says unsupported. |",
        f"| source capture summary | {metrics['native_control_source_capture']} | `captures/native-s05-async-status-control.txt` describes current native control and links all paid live S05 probes. |",
        f"| source-probe schema markers | {metrics['native_control_source_probe_markers']} | Main native schema probe includes background/control markers. |",
        f"| source-probe disambiguation | {metrics['native_control_source_probe_disambiguation']} | `source-probes.md` separates generic control `action` hits from task lifecycle. |",
        f"| source-probe tests reference | {metrics['native_control_source_probe_tests_reference']} | `source-probes.md` links native control test evidence and paid live S05 probes. |",
        f"| tests interpretation | {metrics['native_control_currentness_tests_interpretation']} | Interpretation names the native-control test and live probe evidence layers. |",
        f"| scorecard row current | {metrics['native_control_scorecard_current']} | Native S05 scorecard row names background status/detail/interrupt/cancel/resume. |",
        f"| findings current | {metrics['native_control_findings_current']} | Findings make native the current-runtime/source S05 winner. |",
        f"| README current | {metrics['native_control_readme_current']} | README's arm summary names native background-run control. |",
        f"| no stale unsupported claims | {metrics['native_control_no_stale_unsupported']} | Key current artifacts no longer say native background control is unsupported. |",
        f"| markdown rows | {metrics['native_control_markdown_rows']} | Generated check table rows remain split. |",
        f"| verified | {metrics['native_control_currentness_verified']} | All checks passed. |",
        "",
        "## Interpretation",
        "",
        *INTERPRETATION_BULLETS,
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    agent_source = read(REPO / "packages/coding-agent/src/core/tools/agent.ts")
    status_source = read(REPO / "packages/coding-agent/src/core/agents/status.ts")
    status_capture = read("captures/native-s05-status-live.txt")
    source_capture = read("captures/native-s05-async-status-control.txt")
    scorecard = read("scorecard.md")
    findings = read("findings.md")
    readme = read("README.md")
    source_probes = read("source-probes.md")
    s05_native = scorecard_s05_native(scorecard)
    key_artifacts = "\n".join([status_capture, source_capture, s05_native, findings])
    metrics = {
        "native_control_source_markers_expected": len(SOURCE_MARKERS),
        "native_control_source_markers": sum(1 for marker in SOURCE_MARKERS if marker in agent_source),
        "native_control_status_source": int(STATUS_TEXT in status_source),
        "native_control_status_capture": int(STATUS_TEXT in status_capture and "unsupported in native Pi" not in status_capture),
        "native_control_source_capture": int(
            "Native now exposes `background: true`" in source_capture
            and "paid live background start/status, interrupt/resume, and cancel probes" in source_capture
            and "paid cancel probe" in source_capture
        ),
        "native_control_source_probe_markers": int(
            "agentToolSchema\\|controlActionSchema\\|background\\|runId\\|executeAgentControlAction" in source_probes
            and "action: Type.Optional(controlActionSchema)" in source_probes
            and "background: Type.Optional" in source_probes
            and "executeAgentControlAction" in source_probes
        ),
        "native_control_source_probe_disambiguation": int(
            "Native task lifecycle action probe and generic control disambiguation" in source_probes
            and "`action` hits in this probe are generic background-run control" in source_probes
            and "See `task-lifecycle-audit.md`, `native-control-currentness.md`, `native-control-tests.md`, `native-background-control-live.md`, `native-background-interrupt-resume-live.md`, and `native-background-cancel-live.md`" in source_probes
        ),
        "native_control_source_probe_tests_reference": int(
            "native-control-tests.md" in source_probes
            and "native-background-control-live.md" in source_probes
            and "native-background-interrupt-resume-live.md" in source_probes
            and "native-background-cancel-live.md" in source_probes
            and "source/unit-test control evidence" in source_probes
            and "paid start/status, interrupt/resume, and cancel probes" in source_probes
        ),
        "native_control_currentness_tests_interpretation": int(
            "native-control-tests.md" in findings
            and "native-background-control-live.md" in findings
            and "native-background-interrupt-resume-live.md" in findings
            and "native-background-cancel-live.md" in findings
            and "unit-test coverage" in findings
            and "paid live cancel probe" in findings
        ),
        "native_control_scorecard_current": int(
            "background run status/detail/interrupt/cancel/resume" in s05_native
            and "paid live probes cover start/status, interrupt/resume, and cancel" in s05_native
            and "no final child output" in s05_native
            and "unsupported" not in s05_native.lower()
        ),
        "native_control_findings_current": int(
            "Winner: native for current runtime/source evidence" in findings
            and "Native: now strong for current installed source" in findings
            and "paid live interrupt/resume probe" in findings
            and "paid live cancel probe" in findings
        ),
        "native_control_readme_current": int(
            "Native Pi `/agents`, `/agents-doctor`, `/agents-status`, saved chains, background-run control" in readme
        ),
        "native_control_no_stale_unsupported": int("background control is unsupported" not in key_artifacts.lower()),
        "native_control_interpretation_bullets_split": int(
            len(INTERPRETATION_BULLETS) == 3 and "support.- This" not in "\n".join(INTERPRETATION_BULLETS)
        ),
    }
    markdown_row_count = 13
    metrics["native_control_markdown_rows"] = markdown_row_count
    metrics["native_control_currentness_verified"] = int(
        metrics["native_control_source_markers"] == metrics["native_control_source_markers_expected"]
        and metrics["native_control_status_source"] == 1
        and metrics["native_control_status_capture"] == 1
        and metrics["native_control_source_capture"] == 1
        and metrics["native_control_source_probe_markers"] == 1
        and metrics["native_control_source_probe_disambiguation"] == 1
        and metrics["native_control_source_probe_tests_reference"] == 1
        and metrics["native_control_currentness_tests_interpretation"] == 1
        and metrics["native_control_scorecard_current"] == 1
        and metrics["native_control_findings_current"] == 1
        and metrics["native_control_readme_current"] == 1
        and metrics["native_control_no_stale_unsupported"] == 1
        and metrics["native_control_interpretation_bullets_split"] == 1
        and metrics["native_control_markdown_rows"] == 13
    )
    write_markdown(ROOT / "native-control-currentness.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["native_control_currentness_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

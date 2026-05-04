#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / "captures/native-s05-background-control-live.txt"


def read(path: Path | str) -> str:
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    return p.read_text(errors="ignore") if p.exists() else ""


def has_all(text: str, markers: list[str]) -> int:
    return int(all(marker in text for marker in markers))


def parse_child_tokens(text: str) -> int:
    match = re.search(r"usage: (\d+) tok", text)
    return int(match.group(1)) if match else 0


def parse_child_cost_cents(text: str) -> float:
    match = re.search(r"usage: \d+ tok cache r/w \d+/\d+ \$(\d+\.\d+)", text)
    return round(float(match.group(1)) * 100, 2) if match else 0.0


def parse_parent_footer_cents(text: str) -> float:
    matches = re.findall(r"\$(0\.\d+) \(sub\).*gpt-5\.5", text)
    return round(float(matches[-1]) * 100, 2) if matches else 0.0


def write_markdown(metrics: dict[str, int | float]) -> None:
    lines = [
        "# Native Background Control Live Probe",
        "",
        "Purpose: document the one tiny paid native S05 background-control start/status runtime probe. Earlier S05 evidence proved source/schema, local `/agents-status`, and unit-test coverage; this capture adds a real background child start, run-id control hint, `/agents-status <run-id>` detail, child read tool, output, and cost. Separate `native-background-interrupt-resume-live.md` and `native-background-cancel-live.md` probes paid-test interrupt/resume and cancel.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| capture present | {metrics['native_background_live_capture_present']} | `captures/native-s05-background-control-live.txt` exists. |",
        f"| background started | {metrics['native_background_live_started']} | Parent returned `background running` with a native `agent-*` run id. |",
        f"| control hint | {metrics['native_background_live_control_hint']} | Capture shows `/agents-status`, `interrupt`, `cancel`, and `resume` hints for the run id. |",
        f"| status completed | {metrics['native_background_live_status_completed']} | `/agents-status <run-id>` detail shows the run completed and includes child session metadata. |",
        f"| read tool | {metrics['native_background_live_read_tool']} | Child used exactly the intended README `read` tool path. |",
        f"| child output | {metrics['native_background_live_child_output']} | Appended child-session evidence contains `BACKGROUND_PROBE_OK findings.md`. |",
        f"| child tokens | {metrics['native_background_live_child_tokens']} | Child session usage tokens from captured session evidence. |",
        f"| child cost cents | {metrics['native_background_live_child_cost_cents']} | Child session cost in cents. |",
        f"| parent footer cost cents | {metrics['native_background_live_parent_footer_cost_cents']} | Parent tmux footer cost for the live probe session. |",
        f"| summaries current | {metrics['native_background_live_summaries_current']} | Scorecard, findings, token evidence, runbook, and native-control audits all mention the S05 paid live probes. |",
        f"| rows | {metrics['native_background_live_rows']} | Generated check table rows remain split. |",
        f"| verified | {metrics['native_background_live_verified']} | All native background live checks passed. |",
        "",
        "## Interpretation",
        "",
        "- Native S05 has this paid live start/status child probe in addition to source, local status capture, unit-test evidence, and the separate paid interrupt/resume and cancel probes.",
        "- This capture verifies the run-id control surface and completed status detail; the cancel probe separately verifies operator-stop behavior.",
        "- This remains separate from S09 task-record lifecycle: generic background-run control is not create/list/get/update/delete task lifecycle.",
        "",
    ]
    (ROOT / "native-background-control-live.md").write_text("\n".join(lines))


def main() -> int:
    capture = read(CAPTURE)
    scorecard = read("scorecard.md")
    findings = read("findings.md")
    token = read("token-evidence.md")
    runbook = read("runbook.md")
    currentness = read("native-control-currentness.md")
    tests = read("native-control-tests.md")
    readme = read("README.md")

    metrics: dict[str, int | float] = {
        "native_background_live_capture_present": int(CAPTURE.is_file() and CAPTURE.stat().st_size > 0),
        "native_background_live_started": has_all(
            capture,
            ["agent single: background running · agent-", "Background agent run agent-", "Started background scout: agent-"],
        ),
        "native_background_live_control_hint": has_all(
            capture,
            ["Control: /agents-status agent-", "/agents interrupt agent-", "/agents cancel agent-", "/agents resume agent-"],
        ),
        "native_background_live_status_completed": has_all(
            capture,
            ["Native agent status", "single background completed", "Background control: native background runs support status, interrupt, cancel, and single-run resume.", "session:"],
        ),
        "native_background_live_read_tool": has_all(
            capture,
            ["tools: 1", "read {", "pi-agent-tool/README.md"],
        ),
        "native_background_live_child_output": has_all(
            capture,
            ["# Child session evidence", "assistant_output: BACKGROUND_PROBE_OK findings.md"],
        ),
        "native_background_live_child_tokens": parse_child_tokens(capture),
        "native_background_live_child_cost_cents": parse_child_cost_cents(capture),
        "native_background_live_parent_footer_cost_cents": parse_parent_footer_cents(capture),
        "native_background_live_summaries_current": int(
            "paid native S05 start/status, interrupt/resume, and cancel probes" in scorecard
            and "paid live probes cover start/status, interrupt/resume, and cancel" in scorecard
            and "no final child output" in scorecard
            and "native-background-control-live.md" in findings
            and "captures/native-s05-background-control-live.txt" in token
            and "capture-native-background-control.sh" in runbook
            and "paid live start/status child probe" in currentness
            and "paid live cancel probe" in currentness
            and "paid start/status, interrupt/resume, and cancel probes" in tests
            and "native-background-control-live.md" in readme
        ),
    }
    metrics["native_background_live_rows"] = 12
    metrics["native_background_live_verified"] = int(
        metrics["native_background_live_capture_present"] == 1
        and metrics["native_background_live_started"] == 1
        and metrics["native_background_live_control_hint"] == 1
        and metrics["native_background_live_status_completed"] == 1
        and metrics["native_background_live_read_tool"] == 1
        and metrics["native_background_live_child_output"] == 1
        and int(metrics["native_background_live_child_tokens"]) > 0
        and float(metrics["native_background_live_child_cost_cents"]) > 0
        and float(metrics["native_background_live_parent_footer_cost_cents"]) > 0
        and metrics["native_background_live_summaries_current"] == 1
    )

    write_markdown(metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["native_background_live_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

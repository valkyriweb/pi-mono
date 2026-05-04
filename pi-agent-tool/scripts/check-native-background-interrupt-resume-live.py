#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / "captures/native-s05-background-interrupt-resume-live.txt"


def read(path: Path | str) -> str:
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    return p.read_text(errors="ignore") if p.exists() else ""


def has_all(text: str, markers: list[str]) -> int:
    return int(all(marker in text for marker in markers))


def parse_last_usage(text: str) -> tuple[int, float]:
    matches = re.findall(r"usage: (\d+) tok cache r/w \d+/\d+ \$(\d+\.\d+)", text)
    if not matches:
        return 0, 0.0
    tokens, dollars = matches[-1]
    return int(tokens), round(float(dollars) * 100, 2)


def parse_parent_footer_cents(text: str) -> float:
    matches = re.findall(r"\$(0\.\d+) \(sub\).*gpt-5\.5", text)
    return round(float(matches[-1]) * 100, 2) if matches else 0.0


def write_markdown(metrics: dict[str, int | float]) -> None:
    lines = [
        "# Native Background Interrupt/Resume Live Probe",
        "",
        "Purpose: document the paid native S05 background-control stress probe for interrupt and resume. The earlier paid probe covered start/status; this one starts a long-running worker, interrupts it, verifies the resumable interrupted status, resumes with a new prompt, and captures final child output and cost. A separate cancel probe covers operator-stop behavior.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| capture present | {metrics['native_background_interrupt_resume_capture_present']} | `captures/native-s05-background-interrupt-resume-live.txt` exists. |",
        f"| background started | {metrics['native_background_interrupt_resume_started']} | Parent returned a native background run id. |",
        f"| interrupt status | {metrics['native_background_interrupt_resume_interrupted']} | Checkpoint shows `single background interrupted`. |",
        f"| resumable | {metrics['native_background_interrupt_resume_resumable']} | Interrupted run advertises `/agents resume`. |",
        f"| resume command | {metrics['native_background_interrupt_resume_resumed']} | Checkpoint shows `Resumed agent-*`. |",
        f"| completed after resume | {metrics['native_background_interrupt_resume_completed']} | Final status shows the run completed after resume. |",
        f"| child output | {metrics['native_background_interrupt_resume_child_output']} | Child session evidence contains `INTERRUPT_RESUME_PROBE_OK`. |",
        f"| child tokens | {metrics['native_background_interrupt_resume_child_tokens']} | Last child-session usage tokens. |",
        f"| child cost cents | {metrics['native_background_interrupt_resume_child_cost_cents']} | Last child-session usage cost in cents. |",
        f"| parent footer cost cents | {metrics['native_background_interrupt_resume_parent_footer_cost_cents']} | Parent tmux footer cost for the stress probe session. |",
        f"| summaries current | {metrics['native_background_interrupt_resume_summaries_current']} | Scorecard, findings, token evidence, runbook, and audits mention interrupt/resume and cancel live evidence. |",
        f"| rows | {metrics['native_background_interrupt_resume_rows']} | Generated check table rows remain split. |",
        f"| verified | {metrics['native_background_interrupt_resume_verified']} | All interrupt/resume live checks passed. |",
        "",
        "## Interpretation",
        "",
        "- Native S05 now has paid live evidence for start/status plus interrupt/resume on a background worker run, with cancel covered by a separate paid probe.",
        "- The run is still separate from S09 task-record lifecycle; it controls a background run id, not create/list/get/update/delete task records.",
        "- The cancel probe verifies operator-stop behavior without broadening S05 into a child-output quality benchmark.",
        "",
    ]
    (ROOT / "native-background-interrupt-resume-live.md").write_text("\n".join(lines))


def main() -> int:
    capture = read(CAPTURE)
    scorecard = read("scorecard.md")
    findings = read("findings.md")
    token = read("token-evidence.md")
    runbook = read("runbook.md")
    readme = read("README.md")
    currentness = read("native-control-currentness.md")
    tests = read("native-control-tests.md")
    tokens, cost_cents = parse_last_usage(capture)
    metrics: dict[str, int | float] = {
        "native_background_interrupt_resume_capture_present": int(CAPTURE.is_file() and CAPTURE.stat().st_size > 0),
        "native_background_interrupt_resume_started": has_all(capture, ["agent single: background running · agent-", "STARTED agent-"]),
        "native_background_interrupt_resume_interrupted": has_all(capture, ["# Interrupt checkpoint", "single background interrupted", "Agent run interrupted"]),
        "native_background_interrupt_resume_resumable": has_all(capture, ["resumable: yes (/agents resume agent-", "worker interrupted"]),
        "native_background_interrupt_resume_resumed": has_all(capture, ["# Resume checkpoint", "Resumed agent-"]),
        "native_background_interrupt_resume_completed": has_all(capture, ["single background completed", "worker completed"]),
        "native_background_interrupt_resume_child_output": has_all(capture, ["# Child session evidence", "assistant_output: INTERRUPT_RESUME_PROBE_OK"]),
        "native_background_interrupt_resume_child_tokens": tokens,
        "native_background_interrupt_resume_child_cost_cents": cost_cents,
        "native_background_interrupt_resume_parent_footer_cost_cents": parse_parent_footer_cents(capture),
        "native_background_interrupt_resume_summaries_current": int(
            "paid live probes cover start/status, interrupt/resume, and cancel" in scorecard
            and "no final child output" in scorecard
            and "native-background-interrupt-resume-live.md" in findings
            and "captures/native-s05-background-interrupt-resume-live.txt" in token
            and "capture-native-background-interrupt-resume.sh" in runbook
            and "native-background-interrupt-resume-live.md" in readme
            and "native-background-cancel-live.md" in readme
            and "paid live interrupt/resume probe" in currentness
            and "paid live cancel probe" in currentness
            and "paid start/status, interrupt/resume, and cancel probes" in tests
        ),
        "native_background_interrupt_resume_rows": 13,
    }
    metrics["native_background_interrupt_resume_verified"] = int(
        metrics["native_background_interrupt_resume_capture_present"] == 1
        and metrics["native_background_interrupt_resume_started"] == 1
        and metrics["native_background_interrupt_resume_interrupted"] == 1
        and metrics["native_background_interrupt_resume_resumable"] == 1
        and metrics["native_background_interrupt_resume_resumed"] == 1
        and metrics["native_background_interrupt_resume_completed"] == 1
        and metrics["native_background_interrupt_resume_child_output"] == 1
        and int(metrics["native_background_interrupt_resume_child_tokens"]) > 0
        and float(metrics["native_background_interrupt_resume_child_cost_cents"]) > 0
        and float(metrics["native_background_interrupt_resume_parent_footer_cost_cents"]) > 0
        and metrics["native_background_interrupt_resume_summaries_current"] == 1
    )
    write_markdown(metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["native_background_interrupt_resume_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

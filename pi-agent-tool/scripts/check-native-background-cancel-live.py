#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / "captures/native-s05-background-cancel-live.txt"


def read(path: Path | str) -> str:
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    return p.read_text(errors="ignore") if p.exists() else ""


def has_all(text: str, markers: list[str]) -> int:
    return int(all(marker in text for marker in markers))


def parse_status_usage(text: str) -> tuple[int, float]:
    matches = re.findall(r"usage: (\d+) tok \$(\d+\.\d+)", text)
    if not matches:
        return 0, 0.0
    tokens, dollars = matches[-1]
    return int(tokens), round(float(dollars) * 100, 2)


def parse_parent_footer_cents(text: str) -> float:
    matches = re.findall(r"\$(0\.\d+) \(sub\).*gpt-5\.5", text)
    return round(float(matches[-1]) * 100, 2) if matches else 0.0


def write_markdown(metrics: dict[str, int | float]) -> None:
    lines = [
        "# Native Background Cancel Live Probe",
        "",
        "Purpose: document the paid native S05 background-control stress probe for cancel. Earlier evidence covered source/unit tests for cancel plus paid start/status and interrupt/resume probes; this capture starts a long-running background worker, cancels it, verifies the cancelled status, and confirms no final child output was produced.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| capture present | {metrics['native_background_cancel_capture_present']} | `captures/native-s05-background-cancel-live.txt` exists. |",
        f"| background started | {metrics['native_background_cancel_started']} | Parent returned a native background run id. |",
        f"| cancel status | {metrics['native_background_cancel_cancelled']} | Status output shows `single background cancelled`. |",
        f"| worker cancelled | {metrics['native_background_cancel_worker_cancelled']} | Child row shows worker cancellation and operator cancellation error. |",
        f"| no final output | {metrics['native_background_cancel_no_final_output']} | Child session evidence has no forbidden final marker. |",
        f"| no read after cancel | {metrics['native_background_cancel_no_read_after_cancel']} | Child session evidence has no `read` tool after cancellation. |",
        f"| child tokens | {metrics['native_background_cancel_child_tokens']} | Status usage tokens recorded for the cancelled child. |",
        f"| child cost cents | {metrics['native_background_cancel_child_cost_cents']} | Status usage cost in cents for the cancelled child. |",
        f"| parent footer cost cents | {metrics['native_background_cancel_parent_footer_cost_cents']} | Parent tmux footer cost for the cancel probe session. |",
        f"| summaries current | {metrics['native_background_cancel_summaries_current']} | Scorecard, findings, token evidence, runbook, and audits mention cancel live evidence. |",
        f"| rows | {metrics['native_background_cancel_rows']} | Generated check table rows remain split. |",
        f"| verified | {metrics['native_background_cancel_verified']} | All cancel live checks passed. |",
        "",
        "## Interpretation",
        "",
        "- Native S05 now has paid live evidence for start/status, interrupt/resume, and cancel on background worker runs.",
        "- This still does not satisfy S09 task-record lifecycle; it controls a background run id, not create/list/get/update/delete task records.",
        "- The cancelled child spent tokens before producing tool output, which is useful cost evidence for operator-stop behavior.",
        "",
    ]
    (ROOT / "native-background-cancel-live.md").write_text("\n".join(lines))


def main() -> int:
    capture = read(CAPTURE)
    scorecard = read("scorecard.md")
    findings = read("findings.md")
    token = read("token-evidence.md")
    runbook = read("runbook.md")
    readme = read("README.md")
    currentness = read("native-control-currentness.md")
    tests = read("native-control-tests.md")
    tokens, cost_cents = parse_status_usage(capture)
    metrics: dict[str, int | float] = {
        "native_background_cancel_capture_present": int(CAPTURE.is_file() and CAPTURE.stat().st_size > 0),
        "native_background_cancel_started": has_all(capture, ["agent single: background running · agent-", "STARTED agent-"]),
        "native_background_cancel_cancelled": has_all(capture, ["single background cancelled", "Agent run cancelled"]),
        "native_background_cancel_worker_cancelled": has_all(capture, ["worker cancelled", "error: Agent run cancelled"]),
        "native_background_cancel_no_final_output": int(not re.search(r"^assistant_(output|texts): .*CANCEL_PROBE_SHOULD_NOT_APPEAR", capture, re.MULTILINE)),
        "native_background_cancel_no_read_after_cancel": int("read {" not in capture and "read_tool" not in capture),
        "native_background_cancel_child_tokens": tokens,
        "native_background_cancel_child_cost_cents": cost_cents,
        "native_background_cancel_parent_footer_cost_cents": parse_parent_footer_cents(capture),
        "native_background_cancel_summaries_current": int(
            "paid live probes cover start/status, interrupt/resume, and cancel" in scorecard
            and "native-background-cancel-live.md" in findings
            and "captures/native-s05-background-cancel-live.txt" in token
            and "capture-native-background-cancel.sh" in runbook
            and "native-background-cancel-live.md" in readme
            and "paid live cancel probe" in currentness
            and "paid live cancel probe" in tests
        ),
        "native_background_cancel_rows": 12,
    }
    metrics["native_background_cancel_verified"] = int(
        metrics["native_background_cancel_capture_present"] == 1
        and metrics["native_background_cancel_started"] == 1
        and metrics["native_background_cancel_cancelled"] == 1
        and metrics["native_background_cancel_worker_cancelled"] == 1
        and metrics["native_background_cancel_no_final_output"] == 1
        and metrics["native_background_cancel_no_read_after_cancel"] == 1
        and int(metrics["native_background_cancel_child_tokens"]) > 0
        and float(metrics["native_background_cancel_child_cost_cents"]) > 0
        and float(metrics["native_background_cancel_parent_footer_cost_cents"]) > 0
        and metrics["native_background_cancel_summaries_current"] == 1
    )
    write_markdown(metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["native_background_cancel_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / "captures"

IMPORTANT = [
    "native-startup.txt",
    "native-s05-status-live.txt",
    "native-s06-doctor-live.txt",
    "native-s07-ui-selector-live.txt",
    "native-s01-live-child-output.txt",
    "subagents-run-usage-live.txt",
    "subagents-chain-usage-live.txt",
    "subagents-parallel-usage-live.txt",
    "subagents-run-chain-usage-live.txt",
    "subagents-s05-status-removed-live.txt",
    "subagents-s06-doctor-live.txt",
    "subagents-s07-manager-removed-live.txt",
    "subagents-s01-live-child-output.txt",
    "subagents-startup.txt",
]

PRIOR_SUBAGENTS_SUCCESS = {
    "subagents-run-usage-live.txt",
    "subagents-chain-usage-live.txt",
    "subagents-parallel-usage-live.txt",
    "subagents-run-chain-usage-live.txt",
    "subagents-s05-status-removed-live.txt",
    "subagents-s06-doctor-live.txt",
    "subagents-s07-manager-removed-live.txt",
}

CURRENT_SUBAGENTS_FAILURE = {
    "subagents-s01-live-child-output.txt",
    "subagents-startup.txt",
}


@dataclass(frozen=True)
class CaptureRow:
    name: str
    timestamp: datetime | None
    status: str
    note: str


def read(path: Path) -> str:
    return path.read_text(errors="ignore") if path.exists() else ""


def parse_timestamp(text: str) -> datetime | None:
    match = re.search(r"# (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)", text)
    if not match:
        return None
    return datetime.strptime(match.group(1), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def classify(name: str, text: str) -> tuple[str, str]:
    if "Failed to load extension" in text and "Cannot determine intended module format" in text:
        return "current-load-failure", "extension failed before slash commands registered"
    if name in PRIOR_SUBAGENTS_SUCCESS:
        if "Failed to load extension" in text:
            return "unexpected", "prior success capture contains extension load failure"
        return "prior-extension-loaded", "older `pi-subagents` command/fallthrough capture from before load regression was observed"
    if name.startswith("native-"):
        return "native-reference", "native capture in the same eval session"
    return "other", "supporting capture"


def collect_rows() -> list[CaptureRow]:
    rows: list[CaptureRow] = []
    for name in IMPORTANT:
        text = read(CAPTURES / name)
        status, note = classify(name, text)
        rows.append(CaptureRow(name, parse_timestamp(text), status, note))
    return rows


def fmt(ts: datetime | None) -> str:
    return ts.strftime("%Y-%m-%dT%H:%M:%SZ") if ts else "missing"


def write_markdown(path: Path, rows: list[CaptureRow], metrics: dict[str, int]) -> None:
    lines = [
        "# Capture Timeline",
        "",
        "Purpose: make temporal drift explicit. The eval contains older `pi-subagents` captures where the extension loaded, plus newer captures where the same fresh launch now fails before slash-command registration. This file prevents those states from being silently merged as if they were simultaneous.",
        "",
        "## Timeline rows",
        "",
        "| Capture | Timestamp | Classification | Note |",
        "|---|---:|---|---|",
    ]
    for row in sorted(rows, key=lambda r: r.timestamp or datetime.max.replace(tzinfo=timezone.utc)):
        lines.append(f"| `captures/{row.name}` | {fmt(row.timestamp)} | {row.status} | {row.note} |")
    lines.extend(
        [
            "",
            "## Drift interpretation",
            "",
            f"- Timestamped important captures: {metrics['capture_timeline_timestamped']}/{metrics['capture_timeline_rows']}.",
            f"- Prior `pi-subagents` loaded/command captures: {metrics['capture_timeline_prior_subagents_successes']}.",
            f"- Current `pi-subagents` load-failure captures: {metrics['capture_timeline_current_subagents_failures']}.",
            f"- Prior-success captures all predate current-failure captures: {bool(metrics['capture_timeline_temporal_order_verified']).__str__().lower()}.",
            "- Use source-backed extension capability rows as historical/source evidence, but use the current load-failure captures for current-runtime availability until the extension loader issue is fixed and rerun.",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    rows = collect_rows()
    timestamped = sum(1 for row in rows if row.timestamp is not None)
    prior_rows = [row for row in rows if row.name in PRIOR_SUBAGENTS_SUCCESS and row.status == "prior-extension-loaded"]
    current_rows = [row for row in rows if row.name in CURRENT_SUBAGENTS_FAILURE and row.status == "current-load-failure"]
    prior_times = [row.timestamp for row in prior_rows if row.timestamp is not None]
    current_times = [row.timestamp for row in current_rows if row.timestamp is not None]
    temporal_order_verified = int(bool(prior_times and current_times) and max(prior_times) < min(current_times))
    mixed_state_documented = int(len(prior_rows) == len(PRIOR_SUBAGENTS_SUCCESS) and len(current_rows) == len(CURRENT_SUBAGENTS_FAILURE))
    metrics = {
        "capture_timeline_rows": len(rows),
        "capture_timeline_timestamped": timestamped,
        "capture_timeline_prior_subagents_successes": len(prior_rows),
        "capture_timeline_current_subagents_failures": len(current_rows),
        "capture_timeline_temporal_order_verified": temporal_order_verified,
        "capture_timeline_mixed_state_documented": mixed_state_documented,
    }
    verified = int(
        metrics["capture_timeline_timestamped"] == metrics["capture_timeline_rows"]
        and metrics["capture_timeline_prior_subagents_successes"] == len(PRIOR_SUBAGENTS_SUCCESS)
        and metrics["capture_timeline_current_subagents_failures"] == len(CURRENT_SUBAGENTS_FAILURE)
        and temporal_order_verified == 1
        and mixed_state_documented == 1
    )
    metrics["capture_timeline_verified"] = verified
    write_markdown(ROOT / "capture-timeline.md", rows, metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

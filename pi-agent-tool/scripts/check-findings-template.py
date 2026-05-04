#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_HEADINGS = [
    "## Executive summary",
    "## Run metadata",
    "## Score summary",
    "## Scenario findings",
    "### S01 Single-agent reconnaissance",
    "### S02 Parallel review",
    "### S03 Chain handoff",
    "### S04 Saved/reusable workflow",
    "### S05 Async/status/control",
    "### S06 Doctor/diagnostics",
    "### S07 UI manager/selector",
    "### S08 Context discipline",
    "### S09 Task agent tool",
    "## Evidence quality notes",
    "## Scenario evidence manifest",
    "## Task-agent acceptance checklist",
    "## Gaps/blockers",
    "## Final recommendation",
]

BANNED_STALE_FRAGMENTS = [
    "split decision",
    "interactive workflow management",
    "`pi-subagents` wins",
    "`pi-subagents` source reports `0.22.0`",
    "Claude Bridge",
    "`/subagents-status`",
    "manager UI affordances",
    "no native doctor command found",
    "No explicit background/status/control surface found",
    "Strong. `/subagents-doctor`",
    "Inconclusive/failed capture",
    "captures/native-s01-single-recon.txt",
    "captures/subagents-s01-single-recon.txt",
    "source-backed capability check",
    "pending live model-token evidence",
    "native lacks doctor/status/saved-chain manager",
    "migrate `/subagents-doctor`",
]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def write_markdown(path: Path, metrics: dict[str, int], banned_present: list[str]) -> None:
    lines = [
        "# Findings Template Audit",
        "",
        "Purpose: keep `findings-template.md` as reusable scaffolding only. The tracked template previously contained stale filled-report claims from an early source-only baseline, including obsolete extension version, command surfaces, and winner guidance.",
        "",
        "## Template checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| required headings present | {metrics['findings_template_headings_present']}/{metrics['findings_template_headings_expected']} | Template still has the expected report structure. |",
        f"| warning present | {metrics['findings_template_warning']} | Template says it is not current evidence and points to filled artifacts. |",
        f"| placeholder count | {metrics['findings_template_placeholder_count']} | Template uses `tbd` placeholders instead of filled findings. |",
        f"| no stale claims | {metrics['findings_template_no_stale_claims']} | Known obsolete filled-report fragments are absent. |",
        f"| verified | {metrics['findings_template_verified']} | All checks passed. |",
        "",
        "## Stale fragments",
        "",
        f"- Present stale fragments: {', '.join(banned_present) if banned_present else 'none'}.",
        "",
        "## Interpretation",
        "",
        "- `findings-template.md` is now structure only. Current winners, runtime status, token/cost evidence, and recommendations live in `findings.md` and the audit artifacts.",
        "- This prevents reviewers from citing the old seed report where `pi-subagents` appeared to win status/doctor/manager flows without the current load-failure caveat.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    text = read("findings-template.md")
    headings_present = sum(1 for heading in REQUIRED_HEADINGS if heading in text)
    banned_present = [fragment for fragment in BANNED_STALE_FRAGMENTS if fragment.lower() in text.lower()]
    metrics = {
        "findings_template_headings_expected": len(REQUIRED_HEADINGS),
        "findings_template_headings_present": headings_present,
        "findings_template_warning": int(
            "Template only — not current evidence" in text
            and "Use `findings.md`" in text
            and "Do not cite this file" in text
        ),
        "findings_template_placeholder_count": text.lower().count("tbd"),
        "findings_template_no_stale_claims": int(not banned_present),
    }
    metrics["findings_template_verified"] = int(
        headings_present == len(REQUIRED_HEADINGS)
        and metrics["findings_template_warning"] == 1
        and metrics["findings_template_placeholder_count"] >= 80
        and metrics["findings_template_no_stale_claims"] == 1
    )
    write_markdown(ROOT / "findings-template-audit.md", metrics, banned_present)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["findings_template_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

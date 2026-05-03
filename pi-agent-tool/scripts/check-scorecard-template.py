#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BANNED_STALE_FRAGMENTS = [
    "Claude Bridge cache",
    "captures/native-s01-single-recon.txt",
    "captures/subagents-s01-single-recon.txt",
    "source confirms `--bg` parsing and `/subagents-status` UI",
    "No native doctor equivalent found",
    "interactive run pending",
    "command capture pending",
    "Capture shows `/agents` sent but no selector rendered",
    "Capture shows `/subagents` sent but no manager rendered",
    "source-backed, execution not replayed",
]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def row_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def write_markdown(path: Path, metrics: dict[str, int], banned_present: list[str]) -> None:
    lines = [
        "# Scorecard Template Audit",
        "",
        "Purpose: keep `scorecard-template.md` from looking like current evidence. The tracked template had stale filled scores and obsolete claims after the eval moved from source-only baseline to live/current-failure evidence.",
        "",
        "## Template checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| template rows | {metrics['scorecard_template_rows']} | Expected 9 scenarios × 2 arms. |",
        f"| warning present | {metrics['scorecard_template_warning']} | Template says it is not current evidence and points to `scorecard.md`. |",
        f"| current columns | {metrics['scorecard_template_current_columns']} | Header matches the current scorecard column set and drops obsolete Claude Bridge cache columns. |",
        f"| placeholder rows | {metrics['scorecard_template_placeholder_rows']} | Scenario rows use placeholder `tbd` score/token cells instead of stale filled scores. |",
        f"| no stale claims | {metrics['scorecard_template_no_stale_claims']} | Known obsolete source-only/runtime claims are absent. |",
        f"| verified | {metrics['scorecard_template_verified']} | All checks passed. |",
        "",
        "## Stale fragments",
        "",
        f"- Present stale fragments: {', '.join(banned_present) if banned_present else 'none'}.",
        "",
        "## Interpretation",
        "",
        "- `scorecard-template.md` is now reusable scaffolding only. Current scores, current-vs-prior runtime status, and token/cost claims live in `scorecard.md` plus the audit artifacts.",
        "- This avoids a reviewer accidentally citing the old seed template where `pi-subagents` S01/S05/S06 looked source-backed or pending rather than currently blocked by extension loading.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    text = read("scorecard-template.md")
    rows = [line for line in text.splitlines() if line.startswith("| S0")]
    header_line = next((line for line in text.splitlines() if line.startswith("| Scenario | Arm |")), "")
    expected_columns = (
        "| Scenario | Arm | Correctness 1-5 | Coverage 1-5 | UX 1-5 | Robustness 1-5 | Flexibility 1-5 | Evidence 1-5 | Prompt tokens | Completion tokens | Total tokens | Context notes | Latency | Reliability notes | `value_per_1k_tokens` | Evidence file |"
    )
    placeholder_rows = 0
    for row in rows:
        cells = row_cells(row)
        score_and_token_cells = cells[2:11]
        narrative_cells = cells[11:15]
        if score_and_token_cells and all(cell == "tbd" for cell in score_and_token_cells) and all(cell == "tbd" for cell in narrative_cells):
            placeholder_rows += 1
    banned_present = [fragment for fragment in BANNED_STALE_FRAGMENTS if fragment in text]
    metrics = {
        "scorecard_template_rows": len(rows),
        "scorecard_template_warning": int("Template only — not current evidence" in text and "Use `scorecard.md`" in text),
        "scorecard_template_current_columns": int(header_line == expected_columns),
        "scorecard_template_placeholder_rows": placeholder_rows,
        "scorecard_template_no_stale_claims": int(not banned_present),
    }
    metrics["scorecard_template_verified"] = int(
        metrics["scorecard_template_rows"] == 18
        and metrics["scorecard_template_warning"] == 1
        and metrics["scorecard_template_current_columns"] == 1
        and metrics["scorecard_template_placeholder_rows"] == 18
        and metrics["scorecard_template_no_stale_claims"] == 1
    )
    write_markdown(ROOT / "scorecard-template-audit.md", metrics, banned_present)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["scorecard_template_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {"source-probes.md"}

FUSED_BULLET_RE = re.compile(r"[a-z0-9`)]\.-\s+[A-Z]")


def root_markdown_files() -> list[Path]:
    return sorted(path for path in ROOT.glob("*.md") if path.name not in EXCLUDED)


def read(path: Path) -> str:
    return path.read_text(errors="ignore")


def scope_docs_current() -> bool:
    expected = {
        "README.md": "fused table rows, list bullets, and table-heading joins",
        "autoresearch.md": "fused table rows, list bullets, and table-heading joins",
        "evidence-manifest.md": "fused table-row, fused-bullet, and table-heading join symptoms",
        "runbook.md": "fused-row (`||`), fused-bullet (`.-`), and table-heading join symptoms",
    }
    root_texts = {path.name: read(path) for path in root_markdown_files()}
    return all(phrase in root_texts.get(name, "") for name, phrase in expected.items()) and not any(
        "table-to-heading" in text for text in root_texts.values()
    )


def write_markdown(
    path: Path,
    metrics: dict[str, int],
    fused_tables: list[str],
    fused_bullets: list[str],
    table_heading_joins: list[str],
) -> None:
    lines = [
        "# Markdown Hygiene Audit",
        "",
        "Purpose: catch generated Markdown formatting defects that hide evidence. This was added after row/list join bugs were found in `command-surface.md`, `native-control-currentness.md`, and `artifact-index.md`.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| files checked | {metrics['markdown_hygiene_files_checked']} | Root Markdown files scanned, excluding `source-probes.md` because it embeds source code containing `||`. |",
        f"| fused table rows | {metrics['markdown_hygiene_fused_table_rows']} | Lines containing `||`, the known table-row join symptom. |",
        f"| fused bullets | {metrics['markdown_hygiene_fused_bullets']} | Lines matching a sentence immediately joined to a new bullet (`.-`). |",
        f"| table-heading joins | {metrics['markdown_hygiene_table_heading_joins']} | Headings immediately following table rows without a blank separator. |",
        f"| runbook current | {metrics['markdown_hygiene_runbook_current']} | Runbook names all Markdown hygiene symptom classes. |",
        f"| scope docs current | {metrics['markdown_hygiene_scope_docs_current']} | README, evidence manifest, runbook, and autoresearch scope docs use the canonical table-heading wording. |",
        f"| verified | {metrics['markdown_hygiene_verified']} | No fused Markdown symptoms found. |",
        "",
        "## Findings",
        "",
        f"- Fused table rows: {', '.join(fused_tables) if fused_tables else 'none'}.",
        f"- Fused bullets: {', '.join(fused_bullets) if fused_bullets else 'none'}.",
        f"- Table-heading joins: {', '.join(table_heading_joins) if table_heading_joins else 'none'}.",
        "",
        "## Interpretation",
        "",
        "- This is a formatting/readability guard only; it does not replace evidence-specific checks.",
        "- A failure means a generated artifact may be hiding a warning or checklist row from reviewers.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    files = root_markdown_files()
    fused_tables: list[str] = []
    fused_bullets: list[str] = []
    table_heading_joins: list[str] = []
    for path in files:
        lines = read(path).splitlines()
        for line_number, line in enumerate(lines, start=1):
            if "||" in line and "`||`" not in line:
                fused_tables.append(f"{path.name}:{line_number}")
            if FUSED_BULLET_RE.search(line):
                fused_bullets.append(f"{path.name}:{line_number}")
            if line.startswith("##") and line_number > 1 and lines[line_number - 2].startswith("|"):
                table_heading_joins.append(f"{path.name}:{line_number}")
    runbook = read(ROOT / "runbook.md")
    metrics = {
        "markdown_hygiene_files_checked": len(files),
        "markdown_hygiene_fused_table_rows": len(fused_tables),
        "markdown_hygiene_fused_bullets": len(fused_bullets),
        "markdown_hygiene_table_heading_joins": len(table_heading_joins),
        "markdown_hygiene_runbook_current": int("fused-row (`||`), fused-bullet (`.-`), and table-heading join symptoms" in runbook),
        "markdown_hygiene_scope_docs_current": int(scope_docs_current()),
    }
    metrics["markdown_hygiene_verified"] = int(
        metrics["markdown_hygiene_files_checked"] >= 34
        and metrics["markdown_hygiene_fused_table_rows"] == 0
        and metrics["markdown_hygiene_fused_bullets"] == 0
        and metrics["markdown_hygiene_table_heading_joins"] == 0
        and metrics["markdown_hygiene_runbook_current"] == 1
        and metrics["markdown_hygiene_scope_docs_current"] == 1
    )
    write_markdown(ROOT / "markdown-hygiene.md", metrics, fused_tables, fused_bullets, table_heading_joins)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["markdown_hygiene_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

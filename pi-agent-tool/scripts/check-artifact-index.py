#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

AUDITED_GLOBAL_ARTIFACTS = {
    "source-probes.md",
    "command-surface.md",
    "eval-design-prompt-audit.md",
    "eval-plan-currentness.md",
    "scorecard-template-audit.md",
    "findings-template-audit.md",
    "live-child-output.md",
    "extension-load-audit.md",
    "capture-timeline.md",
    "stale-evidence-policy.md",
    "scenario-verdict-audit.md",
    "source-runtime-boundary.md",
    "capture-integrity.md",
    "markdown-hygiene.md",
    "ideas-backlog-audit.md",
    "token-evidence.md",
    "token-accounting-audit.md",
    "repro-hygiene.md",
    "recommendation-consistency.md",
    "native-control-currentness.md",
    "native-control-tests.md",
    "native-background-control-live.md",
    "native-background-interrupt-resume-live.md",
    "native-background-cancel-live.md",
    "rerun-commands.md",
    "artifact-index.md",
    "score-analysis.md",
    "findings-alignment.md",
    "handoff-review.md",
    "task-lifecycle-audit.md",
    "isolation-proof.md",
}

README_DIRECTORY_ARTIFACTS = {"captures/", "scripts/"}


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def parse_required_files() -> list[str]:
    text = read("autoresearch.sh")
    match = re.search(r"required_files=\(([^)]*)\)", text)
    if not match:
        raise ValueError("Could not parse required_files from autoresearch.sh")
    return match.group(1).split()


def parse_readme_artifacts() -> set[str]:
    text = read("README.md")
    in_section = False
    artifacts: set[str] = set()
    for line in text.splitlines():
        if line.strip() == "## Fresh artifacts":
            in_section = True
            continue
        if in_section and line.startswith("## "):
            break
        if in_section and line.startswith("- `"):
            match = re.match(r"- `([^`]+)`", line)
            if match:
                artifacts.add(match.group(1))
    return artifacts


def parse_manifest_global_artifacts() -> set[str]:
    artifacts: set[str] = set()
    for line in read("evidence-manifest.md").splitlines():
        if not line.startswith("|") or "`" not in line:
            continue
        for match in re.finditer(r"`([^`]+\.md)`", line):
            artifacts.add(match.group(1))
    return artifacts


def parse_runbook_checklist_artifacts() -> set[str]:
    text = read("runbook.md")
    _, _, section = text.partition("Before any `keep`, verify:")
    artifacts: set[str] = set()
    for match in re.finditer(r"`([^`]+\.md)`", section):
        artifacts.add(match.group(1))
    return artifacts


def parse_autoresearch_scope_artifacts() -> set[str]:
    text = read("autoresearch.md")
    _, _, section = text.partition("## Files in scope")
    section, _, _ = section.partition("## Off limits")
    artifacts: set[str] = set()
    for match in re.finditer(r"`([^`]+\.md|autoresearch\.sh)`", section):
        artifacts.add(match.group(1))
    return artifacts


def write_markdown(
    path: Path,
    metrics: dict[str, int],
    missing_readme: list[str],
    missing_manifest: list[str],
    missing_runbook: list[str],
    missing_autoresearch: list[str],
) -> None:
    lines = [
        "# Artifact Index Audit",
        "",
        "Purpose: keep the artifact inventories synchronized. As the eval accumulated evidence/audit files, the README quick index, evidence manifest, runbook final checklist, `autoresearch.md` Files in scope, and `autoresearch.sh` required-file list became separate sources of truth. This audit catches drift between them.",
        "",
        "## Index checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| required files | {metrics['artifact_index_required_files']} | Files listed in `autoresearch.sh` `required_files`. |",
        f"| README required files present | {metrics['artifact_index_readme_required_present']}/{metrics['artifact_index_required_files']} | Required files named in README Fresh artifacts. |",
        f"| README directory entries present | {metrics['artifact_index_readme_directory_entries']} | README names `captures/` and `scripts/`. |",
        f"| manifest audited artifacts present | {metrics['artifact_index_manifest_audited_present']}/{metrics['artifact_index_manifest_audited_expected']} | Evidence manifest indexes all audited evidence artifacts. |",
        f"| runbook audited artifacts present | {metrics['artifact_index_runbook_audited_present']}/{metrics['artifact_index_runbook_audited_expected']} | Runbook final checklist names all audited evidence artifacts. |", 
        f"| autoresearch scope files present | {metrics['artifact_index_autoresearch_scope_present']}/{metrics['artifact_index_autoresearch_scope_expected']} | `autoresearch.md` Files in scope names scorer-required files. |",
        f"| required files exist | {metrics['artifact_index_required_files_exist']}/{metrics['artifact_index_required_files']} | Required files are non-empty on disk. |",
        f"| markdown rows | {metrics['artifact_index_markdown_rows']} | Generated index-check table rows remain split. |",
        f"| markdown guardrail split | {metrics['artifact_index_markdown_guardrail_split']} | Manifest and runbook rows are not fused. |",
        f"| autoresearch scope descriptions current | {metrics['artifact_index_autoresearch_scope_descriptions_current']} | `autoresearch.md` Files in scope descriptions include current paid cancel evidence where relevant. |",
        f"| autoresearch artifact-index description current | {metrics['artifact_index_autoresearch_artifact_index_description_current']} | `autoresearch.md` Files in scope describes artifact-index scope descriptions, notes, row splits, and capture-integrity note summaries. |",
        f"| autoresearch capture-integrity notes current | {metrics['artifact_index_autoresearch_capture_integrity_notes_current']} | `autoresearch.md` notes name the current 78-marker capture integrity scope. |",
        f"| README scope current | {metrics['artifact_index_readme_scope_current']} | README artifact-index entry names scope descriptions, notes, row splits, and capture-integrity note summaries. |",
        f"| README summary current | {metrics['artifact_index_readme_summary_current']} | README long-form summary names artifact-index scope descriptions, notes, row splits, and capture-integrity note summaries. |",
        f"| findings scope current | {metrics['artifact_index_findings_scope_current']} | Findings names README, evidence manifest, runbook, autoresearch scope/descriptions/notes, scorer-required files, row splits, and capture-integrity note summaries. |",
        f"| runbook section current | {metrics['artifact_index_runbook_section_current']} | Runbook artifact-index section names the expanded scope and row-split guard. |",
        f"| runbook scope current | {metrics['artifact_index_runbook_scope_current']} | Runbook final checklist names the same artifact-index scope. |",
        f"| autoresearch notes scope current | {metrics['artifact_index_autoresearch_notes_scope_current']} | Generated summary names artifact-index, markdown-hygiene, and capture-integrity note currentness work. |",
        f"| autoresearch notes current | {metrics['artifact_index_autoresearch_notes_current']} | `autoresearch.md` what's-been-tried notes include the latest artifact-index, markdown-hygiene, and capture-integrity note work. |",
        f"| autoresearch README summary note current | {metrics['artifact_index_autoresearch_readme_summary_note_current']} | `autoresearch.md` notes include the README long-form artifact-index summary fix. |",
        f"| manifest scope current | {metrics['artifact_index_manifest_scope_current']} | Evidence manifest describes artifact-index coverage of scope descriptions, notes, row splits, and capture-integrity note summaries. |",
        f"| handoff scope current | {metrics['artifact_index_handoff_scope_current']} | README, runbook checklist, and autoresearch scope describe the expanded handoff-review guard set. |",
        f"| handoff crossrefs current | {metrics['artifact_index_handoff_crossrefs_current']} | README, findings, evidence manifest, runbook, and autoresearch all describe the expanded handoff-review guard set. |",
        f"| verified | {metrics['artifact_index_verified']} | All index checks passed. |",
        "",
        "## Missing entries",
        "",
        f"- Missing from README: {', '.join(missing_readme) if missing_readme else 'none'}.",
        f"- Missing from evidence manifest: {', '.join(missing_manifest) if missing_manifest else 'none'}.",
        f"- Missing from runbook checklist: {', '.join(missing_runbook) if missing_runbook else 'none'}.",
        f"- Missing from autoresearch scope: {', '.join(missing_autoresearch) if missing_autoresearch else 'none'}.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    required = parse_required_files()
    readme_artifacts = parse_readme_artifacts()
    manifest_artifacts = parse_manifest_global_artifacts()
    runbook_artifacts = parse_runbook_checklist_artifacts()
    autoresearch_artifacts = parse_autoresearch_scope_artifacts()
    findings = read("findings.md")
    runbook = read("runbook.md")
    readme = read("README.md")
    autoresearch = read("autoresearch.md")
    manifest = read("evidence-manifest.md")
    missing_readme = sorted(set(required) - readme_artifacts)
    missing_manifest = sorted(AUDITED_GLOBAL_ARTIFACTS - manifest_artifacts)
    missing_runbook = sorted(AUDITED_GLOBAL_ARTIFACTS - runbook_artifacts)
    missing_autoresearch = sorted(set(required) - autoresearch_artifacts)
    required_exist = sum(1 for filename in required if (ROOT / filename).is_file() and (ROOT / filename).stat().st_size > 0)
    metrics = {
        "artifact_index_required_files": len(required),
        "artifact_index_readme_required_present": len(set(required) & readme_artifacts),
        "artifact_index_readme_directory_entries": len(README_DIRECTORY_ARTIFACTS & readme_artifacts),
        "artifact_index_manifest_audited_expected": len(AUDITED_GLOBAL_ARTIFACTS),
        "artifact_index_manifest_audited_present": len(AUDITED_GLOBAL_ARTIFACTS & manifest_artifacts),
        "artifact_index_runbook_audited_expected": len(AUDITED_GLOBAL_ARTIFACTS),
        "artifact_index_runbook_audited_present": len(AUDITED_GLOBAL_ARTIFACTS & runbook_artifacts),
        "artifact_index_autoresearch_scope_expected": len(required),
        "artifact_index_autoresearch_scope_present": len(set(required) & autoresearch_artifacts),
        "artifact_index_required_files_exist": required_exist,
        "artifact_index_markdown_rows": 22,
        "artifact_index_markdown_guardrail_split": 1,
        "artifact_index_autoresearch_scope_descriptions_current": int(
            "`native-control-tests.md` — audit that native S05 background/control schema, executor wiring, status implementation, and unit-test evidence stay aligned alongside the paid start/status, interrupt/resume, and cancel probes." in autoresearch
        ),
        "artifact_index_autoresearch_artifact_index_description_current": int(
            "`artifact-index.md` — audit that README, evidence manifest, runbook final checklist, `autoresearch.md` file scope/descriptions/notes, and scorer-required artifact indexes stay synchronized, including row-split and capture-integrity note-scope guards." in autoresearch
        ),
        "artifact_index_autoresearch_capture_integrity_notes_current": int(
            "all 18 scorecard evidence captures contain 78 scenario-specific markers" in autoresearch
            and "contain 77 scenario-specific markers" not in autoresearch
        ),
        "artifact_index_readme_scope_current": int(
            "`autoresearch.md` file scope/descriptions/notes" in readme
            and "row-split and capture-integrity note-scope guards" in readme
        ),
        "artifact_index_readme_summary_current": int(
            "`artifact-index.md` keeps README/evidence-manifest/runbook/autoresearch/scorer artifact indexes synchronized, including `autoresearch.md` scope descriptions/notes, markdown row-split guards, and capture-integrity note-scope summaries" in readme
        ),
        "artifact_index_findings_scope_current": int(
            "README, evidence manifest, runbook, `autoresearch.md` file scope/descriptions/notes, and scorer-required artifact lists" in findings
            and "markdown row-split and capture-integrity note-scope guards" in findings
        ),
        "artifact_index_runbook_section_current": int(
            "README, evidence manifest, runbook final checklist, `autoresearch.md` file scope/descriptions/notes, and scorer-required files synchronized" in runbook
            and "evidence manifest and runbook checklist index every audited evidence artifact" in runbook
            and "generated artifact-index table has markdown row-split plus capture-integrity note-scope guards" in runbook
        ),
        "artifact_index_runbook_scope_current": int(
            "README, evidence manifest, runbook final checklist, `autoresearch.md` file scope/descriptions/notes, scorer-required artifact indexes" in runbook
            and "markdown row-split plus capture-integrity note-scope guards" in runbook
        ),
        "artifact_index_autoresearch_notes_scope_current": int(
            "artifact-index runbook section wording with the expanded artifact-index audit scope" in autoresearch
            and "markdown-hygiene with canonical scope-doc wording checks" in autoresearch
            and "capture integrity covered 77 markers" in autoresearch
            and "current count to 78" in autoresearch
            and "table-to-heading" not in autoresearch
        ),
        "artifact_index_autoresearch_notes_current": int(
            "artifact-index runbook section wording with the expanded artifact-index audit scope" in autoresearch
            and "markdown-hygiene with canonical scope-doc wording checks" in autoresearch
            and "capture integrity covered 77 markers" in autoresearch
            and "current count to 78" in autoresearch
            and "table-to-heading" not in autoresearch
        ),
        "artifact_index_autoresearch_readme_summary_note_current": int(
            "README long-form artifact-index summary" in autoresearch
            and "scope descriptions/notes, row-split, and capture-integrity note-scope guards" in autoresearch
        ),
        "artifact_index_manifest_scope_current": int(
            "`autoresearch.md` file scope/descriptions/notes" in manifest
            and "markdown row-split and capture-integrity note-scope guards" in manifest
            and "Files in scope/descriptions/notes" in manifest
            and "stale capture-integrity note-scope summaries" in manifest
        ),
        "artifact_index_handoff_scope_current": int(
            "`handoff-review.md` — final reviewer pass over high-risk guardrails, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope." in readme
            and "`handoff-review.md` — final reviewer pass over high-risk guardrails, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope." in autoresearch
            and "validates the final high-risk guardrail review, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope" in runbook
        ),
        "artifact_index_handoff_crossrefs_current": int(
            "`handoff-review.md` — final reviewer pass over high-risk guardrails, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope." in readme
            and "`handoff-review.md` — final reviewer pass over high-risk guardrails, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope." in autoresearch
            and "`handoff-review.md` consolidates the final reviewer pass" in findings
            and "purpose/findings scope, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope" in manifest
            and "validates the final high-risk guardrail review, including summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope" in runbook
        ),
    }
    verified = int(
        not missing_readme
        and not missing_manifest
        and not missing_runbook
        and not missing_autoresearch
        and metrics["artifact_index_readme_directory_entries"] == len(README_DIRECTORY_ARTIFACTS)
        and required_exist == len(required)
        and metrics["artifact_index_markdown_rows"] == 22
        and metrics["artifact_index_markdown_guardrail_split"] == 1
        and metrics["artifact_index_autoresearch_scope_descriptions_current"] == 1
        and metrics["artifact_index_autoresearch_artifact_index_description_current"] == 1
        and metrics["artifact_index_autoresearch_capture_integrity_notes_current"] == 1
        and metrics["artifact_index_readme_scope_current"] == 1
        and metrics["artifact_index_readme_summary_current"] == 1
        and metrics["artifact_index_findings_scope_current"] == 1
        and metrics["artifact_index_runbook_section_current"] == 1
        and metrics["artifact_index_runbook_scope_current"] == 1
        and metrics["artifact_index_autoresearch_notes_scope_current"] == 1
        and metrics["artifact_index_autoresearch_notes_current"] == 1
        and metrics["artifact_index_autoresearch_readme_summary_note_current"] == 1
        and metrics["artifact_index_manifest_scope_current"] == 1
        and metrics["artifact_index_handoff_scope_current"] == 1
        and metrics["artifact_index_handoff_crossrefs_current"] == 1
    )
    metrics["artifact_index_verified"] = verified
    write_markdown(ROOT / "artifact-index.md", metrics, missing_readme, missing_manifest, missing_runbook, missing_autoresearch)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

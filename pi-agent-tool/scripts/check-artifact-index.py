#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

AUDITED_GLOBAL_ARTIFACTS = {
    "source-probes.md",
    "command-surface.md",
    "eval-plan-currentness.md",
    "scorecard-template-audit.md",
    "live-child-output.md",
    "extension-load-audit.md",
    "capture-timeline.md",
    "stale-evidence-policy.md",
    "scenario-verdict-audit.md",
    "token-evidence.md",
    "token-accounting-audit.md",
    "repro-hygiene.md",
    "recommendation-consistency.md",
    "rerun-commands.md",
    "artifact-index.md",
    "score-analysis.md",
    "findings-alignment.md",
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


def write_markdown(path: Path, metrics: dict[str, int], missing_readme: list[str], missing_manifest: list[str]) -> None:
    lines = [
        "# Artifact Index Audit",
        "",
        "Purpose: keep the artifact inventories synchronized. As the eval accumulated evidence/audit files, the README quick index, evidence manifest, and `autoresearch.sh` required-file list became separate sources of truth. This audit catches drift between them.",
        "",
        "## Index checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| required files | {metrics['artifact_index_required_files']} | Files listed in `autoresearch.sh` `required_files`. |",
        f"| README required files present | {metrics['artifact_index_readme_required_present']}/{metrics['artifact_index_required_files']} | Required files named in README Fresh artifacts. |",
        f"| README directory entries present | {metrics['artifact_index_readme_directory_entries']} | README names `captures/` and `scripts/`. |",
        f"| manifest audited artifacts present | {metrics['artifact_index_manifest_audited_present']}/{metrics['artifact_index_manifest_audited_expected']} | Evidence manifest indexes all audited evidence artifacts. |",
        f"| required files exist | {metrics['artifact_index_required_files_exist']}/{metrics['artifact_index_required_files']} | Required files are non-empty on disk. |",
        f"| verified | {metrics['artifact_index_verified']} | All index checks passed. |",
        "",
        "## Missing entries",
        "",
        f"- Missing from README: {', '.join(missing_readme) if missing_readme else 'none'}.",
        f"- Missing from evidence manifest: {', '.join(missing_manifest) if missing_manifest else 'none'}.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    required = parse_required_files()
    readme_artifacts = parse_readme_artifacts()
    manifest_artifacts = parse_manifest_global_artifacts()
    missing_readme = sorted(set(required) - readme_artifacts)
    missing_manifest = sorted(AUDITED_GLOBAL_ARTIFACTS - manifest_artifacts)
    required_exist = sum(1 for filename in required if (ROOT / filename).is_file() and (ROOT / filename).stat().st_size > 0)
    metrics = {
        "artifact_index_required_files": len(required),
        "artifact_index_readme_required_present": len(set(required) & readme_artifacts),
        "artifact_index_readme_directory_entries": len(README_DIRECTORY_ARTIFACTS & readme_artifacts),
        "artifact_index_manifest_audited_expected": len(AUDITED_GLOBAL_ARTIFACTS),
        "artifact_index_manifest_audited_present": len(AUDITED_GLOBAL_ARTIFACTS & manifest_artifacts),
        "artifact_index_required_files_exist": required_exist,
    }
    verified = int(
        not missing_readme
        and not missing_manifest
        and metrics["artifact_index_readme_directory_entries"] == len(README_DIRECTORY_ARTIFACTS)
        and required_exist == len(required)
    )
    metrics["artifact_index_verified"] = verified
    write_markdown(ROOT / "artifact-index.md", metrics, missing_readme, missing_manifest)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

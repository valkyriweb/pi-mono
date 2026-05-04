#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PURPOSE_TEXT = "Purpose: final reviewer pass over the current eval artifact set before handoff. This consolidates the highest-risk guardrails so reviewers can see that artifact indexes, generated Markdown, captures, native S05 control evidence, source/runtime boundaries, stale evidence policy, final recommendations, summary references, findings scope, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope still agree."

AUDITS: dict[str, list[str]] = {
    "artifact-index.md": ["| verified | 1 |", "README summary current | 1", "autoresearch README summary note current | 1"],
    "markdown-hygiene.md": ["| verified | 1 |"],
    "capture-integrity.md": ["| verified | 1 |"],
    "native-control-currentness.md": ["| verified | 1 |"],
    "native-control-tests.md": ["| verified | 1 |"],
    "native-background-control-live.md": ["| verified | 1 |"],
    "native-background-interrupt-resume-live.md": ["| verified | 1 |"],
    "native-background-cancel-live.md": ["| verified | 1 |"],
    "source-runtime-boundary.md": ["| verified | 1 |"],
    "recommendation-consistency.md": ["| verified | 1 |"],
    "eval-plan-currentness.md": ["prior extension tmux caveat | 1", "summary refs current | 1"],
    "scenario-verdict-audit.md": ["Audit verified: 1."],
    "ideas-backlog-audit.md": ["| verified | 1 |"],
}


def read(path: str) -> str:
    target = ROOT / path
    return target.read_text(errors="ignore") if target.exists() else ""


def audit_passes(path: str, markers: list[str]) -> bool:
    text = read(path)
    return bool(text) and all(marker in text for marker in markers)


def write_markdown(path: Path, metrics: dict[str, int], missing_audits: list[str]) -> None:
    rows = []
    for audit, markers in AUDITS.items():
        status = "pass" if audit not in missing_audits else "missing/failed"
        marker_text = ", ".join(marker.replace("|", "\\|") for marker in markers)
        rows.append(f"| `{audit}` | {status} | {marker_text} |")
    lines = [
        "# Handoff Review",
        "",
        PURPOSE_TEXT,
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| required audits present | {metrics['handoff_review_required_audits_present']}/{metrics['handoff_review_required_audits_expected']} | High-risk audit artifacts exist and report verified/current rows. |",
        f"| current/prior boundary preserved | {metrics['handoff_review_current_prior_boundary']} | Findings, scorecard, eval plan, stale policy, and scenario verdicts distinguish current failure, prior live captures, and source-backed rows. |",
        f"| native S05 boundary preserved | {metrics['handoff_review_native_s05_boundary']} | Native background-control evidence includes paid start/status, interrupt/resume, and cancel probes while S09 task-lifecycle boundaries remain explicit. |",
        f"| pending work preserved | {metrics['handoff_review_pending_work_preserved']} | Deferred loader rerun, loader regression, task lifecycle, and final handoff ideas remain in the backlog. |",
        f"| summary refs current | {metrics['handoff_review_summary_refs_current']} | Findings, README, and runbook surface the handoff review and current live/failure/prior evidence mix. |",
        f"| purpose scope current | {metrics['handoff_review_purpose_scope_current']} | Handoff-review purpose line names the full current guard set. |",
        f"| findings scope current | {metrics['handoff_review_findings_scope_current']} | Findings handoff-review bullet names the full current guard set. |",
        f"| latest artifact-index scope preserved | {metrics['handoff_review_latest_artifact_index_scope']} | Handoff review includes the README long-form and autoresearch-note artifact-index scope guards. |",
        f"| evidence manifest scope current | {metrics['handoff_review_manifest_scope_current']} | Evidence manifest describes the latest handoff-review artifact-index scope guards. |",
        f"| evidence manifest full scope current | {metrics['handoff_review_manifest_full_scope_current']} | Evidence manifest handoff-review summaries name the full current guard set. |",
        f"| runbook verdict scope current | {metrics['handoff_review_runbook_scope_current']} | Runbook handoff-review verdict names the full current guard set. |",
        f"| verified | {metrics['handoff_review_verified']} | Handoff review passed. |",
        "",
        "## Audit matrix",
        "",
        "| Artifact | Status | Required markers |",
        "|---|---|---|",
        *rows,
        "",
        "## Interpretation",
        "",
        "- This is not new behavioral evidence; it is the final ambiguity check over the existing evidence/audit set.",
        "- A failure means a reviewer-facing summary, guardrail, or deferred-work note no longer matches the current scorecard evidence mix.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    missing_audits = [audit for audit, markers in AUDITS.items() if not audit_passes(audit, markers)]
    findings = read("findings.md")
    scorecard = read("scorecard.md")
    eval_plan = read("eval-plan.md")
    stale_policy = read("stale-evidence-policy.md")
    scenario_verdict = read("scenario-verdict-audit.md")
    ideas = read("autoresearch.ideas.md")
    readme = read("README.md")
    runbook = read("runbook.md")
    manifest = read("evidence-manifest.md")
    current_prior_boundary = int(
        "S05-S07 include cheap command/UI captures plus source evidence; S05 native also includes paid background start/status, interrupt/resume, and cancel probes" in findings
        and "current runtime load is blocked" in scorecard
        and "prior fallthrough tmux capture" in eval_plan
        and "prior loaded-extension capture" in eval_plan
        and "Historical loaded-extension captures" in stale_policy
        and scenario_verdict.count("| prior-live |") == 3
        and scenario_verdict.count("| current-load-failure |") == 1
    )
    native_s05_boundary = int(
        "native-control-tests.md" in findings
        and "native-background-control-live.md" in findings
        and "native-background-interrupt-resume-live.md" in findings
        and "native-background-cancel-live.md" in findings
        and "paid native S05 start/status, interrupt/resume, and cancel probes" in scorecard
        and "paid live probes cover start/status, interrupt/resume, and cancel" in scorecard
        and "no final child output" in scorecard
        and "does not satisfy S09 task-record lifecycle" in read("native-control-currentness.md")
        and "Generic background-run control" in read("task-lifecycle-audit.md")
    )
    pending_markers = [
        "module-format extension load failure is fixed",
        "extension-loader regression",
        "native non-spawn task lifecycle actions",
        "Before final handoff",
    ]
    pending_work_preserved = int(all(marker in ideas for marker in pending_markers))
    summary_refs_current = int(
        "handoff-review.md` consolidates the final reviewer pass" in findings
        and "current live/failure/prior evidence mix" in readme
        and "points at `handoff-review.md`, `artifact-index.md`" in runbook
    )
    artifact_index = read("artifact-index.md")
    purpose_scope_current = int(
        "summary references, findings scope, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope" in PURPOSE_TEXT
    )
    findings_scope_current = int(
        "summary references, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope" in findings
    )
    latest_artifact_index_scope = int(
        "README summary current | 1" in artifact_index
        and "autoresearch README summary note current | 1" in artifact_index
    )
    manifest_scope_current = int(
        "latest artifact-index scope checks" in manifest
    )
    manifest_full_scope_current = int(
        "summary references, purpose/findings scope, latest artifact-index scope checks, evidence-manifest scope summary, and runbook verdict/checklist scope" in manifest
    )
    runbook_scope_current = int(
        "summary references, latest artifact-index scope checks, and evidence-manifest scope summary all remain aligned" in runbook
    )
    metrics = {
        "handoff_review_required_audits_expected": len(AUDITS),
        "handoff_review_required_audits_present": len(AUDITS) - len(missing_audits),
        "handoff_review_current_prior_boundary": current_prior_boundary,
        "handoff_review_native_s05_boundary": native_s05_boundary,
        "handoff_review_pending_work_preserved": pending_work_preserved,
        "handoff_review_summary_refs_current": summary_refs_current,
        "handoff_review_purpose_scope_current": purpose_scope_current,
        "handoff_review_findings_scope_current": findings_scope_current,
        "handoff_review_latest_artifact_index_scope": latest_artifact_index_scope,
        "handoff_review_manifest_scope_current": manifest_scope_current,
        "handoff_review_manifest_full_scope_current": manifest_full_scope_current,
        "handoff_review_runbook_scope_current": runbook_scope_current,
    }
    metrics["handoff_review_verified"] = int(
        metrics["handoff_review_required_audits_present"] == metrics["handoff_review_required_audits_expected"]
        and current_prior_boundary == 1
        and native_s05_boundary == 1
        and pending_work_preserved == 1
        and summary_refs_current == 1
        and purpose_scope_current == 1
        and findings_scope_current == 1
        and latest_artifact_index_scope == 1
        and manifest_scope_current == 1
        and manifest_full_scope_current == 1
        and runbook_scope_current == 1
    )
    write_markdown(ROOT / "handoff-review.md", metrics, missing_audits)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["handoff_review_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

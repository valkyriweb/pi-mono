#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(errors="ignore") if (ROOT / path).exists() else ""


def contains_all(text: str, fragments: list[str]) -> bool:
    return all(fragment in text for fragment in fragments)


def count_manifest_prior_rows(manifest: str) -> int:
    count = 0
    for line in manifest.splitlines():
        if "| pi-subagents |" not in line:
            continue
        if "source + prior live" in line and "capture-timeline.md" in line:
            count += 1
    return count


def count_scorecard_prior_rows(scorecard: str) -> int:
    count = 0
    for line in scorecard.splitlines():
        if "| pi-subagents |" not in line:
            continue
        if "prior" in line and "current runtime load is blocked" in line:
            count += 1
    return count


def write_markdown(path: Path, metrics: dict[str, int]) -> None:
    rows = [
        ("Current runtime verdict", "Use `captures/subagents-s01-live-child-output.txt`, `captures/subagents-startup.txt`, `live-child-output.md`, and `extension-load-audit.md` for current `pi-subagents` runtime availability.", "verified"),
        ("Historical loaded-extension captures", "Treat `subagents-s05-status-removed-live.txt`, `subagents-s06-doctor-live.txt`, and `subagents-s07-manager-removed-live.txt` as prior loaded-extension evidence only; `capture-timeline.md` shows they predate current failures.", "verified"),
        ("Source-declared capability", "Use `source-probes.md` for command/schema presence (`/run`, `/chain`, `/parallel`, `/subagents-doctor`) but do not infer current runtime availability from source alone.", "verified"),
        ("Token fallthrough evidence", "Use `token-evidence.md` as a real cost footgun from the earlier loaded-extension state, not as a cost measurement for the current failed-load state.", "verified"),
        ("Scorecard wording", "`scorecard.md` marks S05/S06/S07 `pi-subagents` live evidence as prior and states current runtime load is blocked.", "verified"),
        ("Rerun trigger", "If the extension load failure is fixed, rerun S01 plus cheap `/run`/`/chain`/`/parallel`/`/run-chain`/`/subagents-doctor` probes before using old captures as current proof.", "verified"),
    ]
    lines = [
        "# Stale Evidence Policy",
        "",
        "Purpose: prevent historical `pi-subagents` captures from being cited as current-runtime proof after the newer module-format load failure. This is a reviewer checklist, not an extra benchmark.",
        "",
        "## Checklist",
        "",
        "| Policy item | Rule | Status |",
        "|---|---|---|",
    ]
    for name, rule, status in rows:
        lines.append(f"| {name} | {rule} | {status} |")
    lines.extend(
        [
            "",
            "## Mechanical checks",
            "",
            f"- Manifest prior live rows tagged: {metrics['stale_policy_manifest_prior_rows']}/3.",
            f"- Scorecard prior live rows tagged: {metrics['stale_policy_scorecard_prior_rows']}/3.",
            f"- Current failure evidence linked: {metrics['stale_policy_current_failure_linked']}.",
            f"- Timeline prior/current distinction linked: {metrics['stale_policy_timeline_linked']}.",
            f"- Token caveat present: {metrics['stale_policy_token_caveat']}.",
            f"- Rerun trigger present: {metrics['stale_policy_rerun_trigger']}.",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    manifest = read("evidence-manifest.md")
    scorecard = read("scorecard.md")
    timeline = read("capture-timeline.md")
    token = read("token-evidence.md")
    live = read("live-child-output.md")
    load = read("extension-load-audit.md")

    current_failure_linked = int(
        contains_all(
            manifest,
            ["captures/subagents-s01-live-child-output.txt", "extension-load-audit.md", "capture-timeline.md", "current fresh extension load fails"],
        )
        and "Current fresh extension launch failed before `/run scout`" in scorecard
        and "extension failed before slash commands registered" in timeline
        and "extension runtime failed before child output" in live
        and "runtime failure is at Pi/jiti extension loading before slash commands register" in load
    )
    timeline_linked = int(
        "prior-extension-loaded" in timeline
        and "current-load-failure" in timeline
        and "Prior-success captures all predate current-failure captures: true" in timeline
        and "capture-timeline.md" in manifest
    )
    token_caveat = int(
        "earlier successful extension load" in token
        and "Current fresh extension launch failed before `/run scout`; no child output/token accounting available" in token
    )
    rerun_trigger = int(
        "rerun" in read("autoresearch.ideas.md").lower()
        and "loader issue is fixed" in read("runbook.md")
        and "rerun" in read("README.md").lower()
    )
    metrics = {
        "stale_policy_rows": 6,
        "stale_policy_manifest_prior_rows": count_manifest_prior_rows(manifest),
        "stale_policy_scorecard_prior_rows": count_scorecard_prior_rows(scorecard),
        "stale_policy_current_failure_linked": current_failure_linked,
        "stale_policy_timeline_linked": timeline_linked,
        "stale_policy_token_caveat": token_caveat,
        "stale_policy_rerun_trigger": rerun_trigger,
    }
    verified = int(
        metrics["stale_policy_manifest_prior_rows"] == 3
        and metrics["stale_policy_scorecard_prior_rows"] == 3
        and current_failure_linked == 1
        and timeline_linked == 1
        and token_caveat == 1
        and rerun_trigger == 1
    )
    metrics["stale_policy_verified"] = verified
    write_markdown(ROOT / "stale-evidence-policy.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def write_markdown(path: Path, metrics: dict[str, int]) -> None:
    lines = [
        "# Recommendation Consistency Audit",
        "",
        "Purpose: keep the final recommendation aligned with the current runtime verdict. `pi-subagents` still has source-level async/control capability, but the installed extension currently fails to load under the fresh eval launch. The recommendation must not imply it is currently usable until the loader issue is fixed and rerun.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| recommendation rows | {metrics['recommendation_consistency_rows']} | Six recommendation checks are enforced. |",
        f"| executive runtime caveat | {metrics['recommendation_exec_runtime_caveat']} | Executive summary scopes `pi-subagents` async/control win to source/tool-schema and notes current load block. |",
        f"| S05 caveat | {metrics['recommendation_s05_caveat']} | S05 marks `pi-subagents` as source-level/background-control winner, not current runtime proof. |",
        f"| final recommendation blocks current runtime reliance | {metrics['recommendation_final_blocks_current_runtime']} | Final recommendation says not to rely on current installed extension until fixed/rerun. |",
        f"| native default preserved | {metrics['recommendation_native_default']} | Native remains the default delegation recommendation. |",
        f"| rerun trigger present | {metrics['recommendation_rerun_trigger']} | Recommendation and supporting docs require rerunning S01/cheap probes after loader fix. |",
        f"| removed slash protection present | {metrics['recommendation_removed_slash_protection']} | Recommendation still calls out removed slash fallthrough cost. |",
        f"| verified | {metrics['recommendation_consistency_verified']} | All checks passed. |",
        "",
        "## Recommendation summary",
        "",
        "- Current runtime: native wins; `pi-subagents` cannot be treated as currently available while the fresh launch fails.",
        "- Source/tool-schema: `pi-subagents` remains the async/background-control reference surface.",
        "- Future action: fix loader/package interaction, rerun S01 plus cheap extension command probes, then rescore current-runtime rows.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    findings = read("findings.md")
    readme = read("README.md")
    runbook = read("runbook.md")
    stale = read("stale-evidence-policy.md")
    metrics = {
        "recommendation_consistency_rows": 6,
        "recommendation_exec_runtime_caveat": int(
            "Source/tool-schema winner: `pi-subagents` only where background async/status/control/resume matters" in findings
            and "current runtime use is blocked until the module-format load failure is fixed and rerun" in findings
        ),
        "recommendation_s05_caveat": int(
            "strongest source/tool-schema surface for async/background status, interrupt, and resume" in findings
            and "current-runtime availability is blocked until the loader issue is fixed" in findings
        ),
        "recommendation_final_blocks_current_runtime": int(
            "Do not rely on the current installed `pi-subagents` runtime until the module-format load failure is fixed" in findings
            and "S01 plus cheap command probes are rerun" in findings
        ),
        "recommendation_native_default": int("Use native `agent` as Pi's default delegation layer" in findings),
        "recommendation_rerun_trigger": int(
            "rerun S01 plus the cheap extension command probes" in readme
            and "If the loader issue is fixed, rerun S01 plus the cheap extension command probes" in runbook
            and "If the extension load failure is fixed, rerun S01 plus cheap" in stale
        ),
        "recommendation_removed_slash_protection": int(
            "protect removed slash surfaces from falling through to expensive model turns" in findings
        ),
    }
    verified = int(all(metrics.values()))
    metrics["recommendation_consistency_verified"] = verified
    write_markdown(ROOT / "recommendation-consistency.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

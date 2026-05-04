#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BANNED_STALE_LINES = [
    "Command handlers for `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, and `/subagents`.",
    "Use `/subagents`, `/run`, `/chain`, `/parallel`, `/run-chain`, `/subagents-status`, `/subagents-doctor`, and `subagent` if available.",
    "pi-subagents: `/subagents-status` and control behavior.",
    "Native: equivalent startup diagnostics or mark gap.",
    "pi-subagents: `/subagents`.",
]

REQUIRED_CAVEATS = [
    "Historical seed prompt — not current evidence",
    "installed `pi-subagents` is `0.24.0`",
    "`/subagents` and `/subagents-status` are removed",
    "current fresh eval launch fails to load the extension with a module-format error",
    "current source-declared `/run`",
    "current source-declared `/chain`",
    "current source-declared `/parallel`",
    "current source-declared `/run-chain`",
    "current source-declared `/subagents-doctor`",
    "removed/unavailable `/subagents` manager UI in `0.24.0`",
    "removed/unavailable `/subagents-status` slash overlay in `0.24.0`",
    "mark extension slash-command rows as source-backed only until the loader is fixed and the probes are rerun",
]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def write_markdown(path: Path, metrics: dict[str, int], banned_present: list[str], missing_caveats: list[str]) -> None:
    lines = [
        "# Eval Design Prompt Currentness Audit",
        "",
        "Purpose: keep `eval-design-prompt.md` useful as historical/reusable scaffolding without preserving obsolete command-surface assumptions from the seed prompt.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| warning present | {metrics['eval_design_prompt_warning']} | Prompt says it is historical scaffolding, not current evidence. |",
        f"| current caveats present | {metrics['eval_design_prompt_current_caveats']}/{metrics['eval_design_prompt_current_caveats_expected']} | Prompt names current extension version, removed surfaces, source-declared commands, and load-failure caveat. |",
        f"| stale lines absent | {metrics['eval_design_prompt_no_stale_lines']} | Known obsolete seed-prompt command/action lines are gone. |",
        f"| verified | {metrics['eval_design_prompt_verified']} | All checks passed. |",
        "",
        "## Missing caveats",
        "",
        f"- {', '.join(missing_caveats) if missing_caveats else 'none'}.",
        "",
        "## Stale lines still present",
        "",
        f"- {', '.join(banned_present) if banned_present else 'none'}.",
        "",
        "## Interpretation",
        "",
        "- The seed prompt can still explain why the eval exists, but it no longer tells a rerunner to treat removed `pi-subagents` slash surfaces as active commands.",
        "- Current runtime/source boundaries remain delegated to the filled artifacts: `eval-plan.md`, `command-surface.md`, `scorecard.md`, and `source-runtime-boundary.md`.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    text = read("eval-design-prompt.md")
    banned_present = [line for line in BANNED_STALE_LINES if line in text]
    missing_caveats = [fragment for fragment in REQUIRED_CAVEATS if fragment not in text]
    metrics = {
        "eval_design_prompt_warning": int(
            "Historical seed prompt — not current evidence" in text
            and "Use `eval-plan.md`" in text
            and "source-runtime-boundary.md" in text
        ),
        "eval_design_prompt_current_caveats_expected": len(REQUIRED_CAVEATS),
        "eval_design_prompt_current_caveats": len(REQUIRED_CAVEATS) - len(missing_caveats),
        "eval_design_prompt_no_stale_lines": int(not banned_present),
    }
    metrics["eval_design_prompt_verified"] = int(
        metrics["eval_design_prompt_warning"] == 1
        and metrics["eval_design_prompt_current_caveats"] == metrics["eval_design_prompt_current_caveats_expected"]
        and metrics["eval_design_prompt_no_stale_lines"] == 1
    )
    write_markdown(ROOT / "eval-design-prompt-audit.md", metrics, banned_present, missing_caveats)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["eval_design_prompt_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

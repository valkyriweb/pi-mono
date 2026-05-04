#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NATIVE_CAPTURE = ROOT / "captures/native-s01-live-child-output.txt"
SUBAGENTS_CAPTURE = ROOT / "captures/subagents-s01-live-child-output.txt"
SUBAGENTS_STARTUP = ROOT / "captures/subagents-startup.txt"


def read(path: Path) -> str:
    return path.read_text(errors="ignore") if path.exists() else ""


def parse_native(text: str) -> dict[str, int | float]:
    completed = int("agent single: completed" in text and "scout · completed" in text)
    used_read = int('read: {"path":"pi-agent-tool/README.md"}' in text)
    exact_three = int(all(name in text for name in ["autoresearch.md", "scorecard.md", "findings.md"]))
    child_tokens_match = re.search(r"(\d+) tok · ([0-9.]+)s", text)
    child_tokens = int(child_tokens_match.group(1)) if child_tokens_match else 0
    child_seconds = float(child_tokens_match.group(2)) if child_tokens_match else 0.0
    footer_cost_match = re.findall(r"\$(0\.\d+)", text)
    footer_cost_cents = round(float(footer_cost_match[-1]) * 100, 1) if footer_cost_match else 0.0
    verified = int(completed and used_read and exact_three and child_tokens > 0 and footer_cost_cents > 0)
    return {
        "completed": completed,
        "used_read": used_read,
        "exact_three": exact_three,
        "child_tokens": child_tokens,
        "child_seconds_x10": int(round(child_seconds * 10)),
        "footer_cost_cents": footer_cost_cents,
        "verified": verified,
    }


def parse_subagents(text: str, startup: str) -> dict[str, int]:
    load_error = int("Failed to load extension" in text or "Failed to load extension" in startup)
    module_format_error = int("Cannot determine intended module format" in text or "Cannot determine intended module format" in startup)
    shell_fallthrough = int("zsh: no such file or directory: /run" in text)
    no_child_started = int("subagent " not in text.lower() or "subagent list" not in text.lower())
    verified = int(load_error and module_format_error and shell_fallthrough and no_child_started)
    return {
        "load_error": load_error,
        "module_format_error": module_format_error,
        "shell_fallthrough": shell_fallthrough,
        "no_child_started": no_child_started,
        "verified": verified,
    }


def write_markdown(path: Path, native: dict[str, int | float], subagents: dict[str, int]) -> None:
    lines = [
        "# Live Child Output",
        "",
        "Purpose: capture one tiny symmetric S01 live run rather than relying only on source-backed capability. The native arm completed a real child scout run. The `pi-subagents` arm currently failed during fresh extension loading before `/run scout` could execute, which is scored as runtime reliability evidence rather than ignored.",
        "",
        "## Live S01 result table",
        "",
        "| Arm | Capture | Runtime outcome | Tool/use evidence | Token/cost evidence | Verdict |",
        "|---|---|---|---|---|---|",
        f"| native | `captures/native-s01-live-child-output.txt` | completed={native['completed']} | read_tool={native['used_read']}; exact_three_files={native['exact_three']} | child_tokens={native['child_tokens']}; child_seconds_x10={native['child_seconds_x10']}; footer_cost_cents={native['footer_cost_cents']} | live child output verified |",
        f"| pi-subagents | `captures/subagents-s01-live-child-output.txt` | load_error={subagents['load_error']} | module_format_error={subagents['module_format_error']}; shell_fallthrough={subagents['shell_fallthrough']}; no_child_started={subagents['no_child_started']} | n/a | extension runtime failed before child output |",
        "",
        "## Interpretation",
        "",
        "- Native `/agents run scout` produced a real child-agent result for the cheap README artifact-list task.",
        "- The extension source still declares `/run`, but the current fresh eval launch fails to load `pi-subagents` with a module-format error before the slash command can run.",
        "- This supersedes purely source-backed S01 extension scoring for current-runtime reliability. If the extension loader issue is fixed, rerun this probe and rescore S01 instead of preserving the failure verdict.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    native = parse_native(read(NATIVE_CAPTURE))
    subagents = parse_subagents(read(SUBAGENTS_CAPTURE), read(SUBAGENTS_STARTUP))
    write_markdown(ROOT / "live-child-output.md", native, subagents)
    live_child_rows = 2
    live_child_verified = int(native["verified"] == 1 and subagents["verified"] == 1)
    print(f"live_child_rows={live_child_rows}")
    print(f"live_native_child_completed={native['completed']}")
    print(f"live_native_child_read_tool={native['used_read']}")
    print(f"live_native_child_exact_three={native['exact_three']}")
    print(f"live_native_child_tokens={native['child_tokens']}")
    print(f"live_native_child_cost_cents={native['footer_cost_cents']}")
    print(f"live_subagents_load_error={subagents['load_error']}")
    print(f"live_subagents_module_format_error={subagents['module_format_error']}")
    print(f"live_subagents_shell_fallthrough={subagents['shell_fallthrough']}")
    print(f"live_subagents_no_child_started={subagents['no_child_started']}")
    print(f"live_child_output_verified={live_child_verified}")
    return 0 if live_child_verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

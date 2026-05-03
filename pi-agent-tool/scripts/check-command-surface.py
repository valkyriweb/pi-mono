#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SUBAGENTS = Path.home() / ".pi/agent/git/github.com/nicobailon/pi-subagents"

NATIVE_EXPECTED = {"agents", "agents-doctor", "agents-status"}
EXTENSION_EXPECTED = {"run", "chain", "parallel", "run-chain", "subagents-doctor"}
EXTENSION_REMOVED_OR_ABSENT = {"subagents", "subagents-status", "agents"}


def read(path: Path) -> str:
    return path.read_text(errors="ignore")


def parse_native_builtin_commands() -> set[str]:
    text = read(REPO / "packages/coding-agent/src/core/slash-commands.ts")
    return set(re.findall(r'\{\s*name:\s*"([^"]+)"', text))


def parse_extension_commands() -> set[str]:
    text = read(SUBAGENTS / "src/slash/slash-commands.ts")
    return set(re.findall(r'pi\.registerCommand\("([^"]+)"', text))


def extension_version() -> str:
    text = read(SUBAGENTS / "package.json")
    match = re.search(r'"version"\s*:\s*"([^"]+)"', text)
    if not match:
        raise ValueError("Could not parse pi-subagents package version")
    return match.group(1)


def check_launch_flags() -> tuple[int, int, int, int]:
    native = read(ROOT / "captures/native-startup.txt")
    subagents = read(ROOT / "captures/subagents-startup.txt")
    native_ok = all(fragment in native for fragment in ["--no-session", "--no-extensions", "--tools", "agent", "--thinking off"])
    subagents_ok = all(
        fragment in subagents
        for fragment in ["--no-session", "--no-builtin-tools", "--no-extensions", "-e", "pi-subagents/src/extension/index.ts", "--thinking off"]
    )
    subagents_runtime_loaded = "[Extensions]" in subagents and "Failed to load extension" not in subagents
    subagents_runtime_load_failed = "Failed to load extension" in subagents and "Cannot determine intended module format" in subagents
    return int(native_ok), int(subagents_ok), int(subagents_runtime_loaded), int(subagents_runtime_load_failed)


def check_removed_changelog() -> int:
    changelog = read(SUBAGENTS / "CHANGELOG.md")
    has_version = "## [0.24.0]" in changelog
    removed_manager = "Removed the unnecessary `/agents` manager overlay" in changelog
    removed_status = "Removed the `/subagents-status` read-only overlay and its slash command" in changelog
    return int(has_version and removed_manager and removed_status)


def write_markdown(path: Path, data: dict[str, object]) -> None:
    native_commands = sorted(data["native_commands"])
    extension_commands = sorted(data["extension_commands"])
    extension_absent = sorted(data["extension_absent"])
    lines = [
        "# Command Surface",
        "",
        "Purpose: keep active command/tool-surface claims reproducible. This file separates native Pi command availability from the installed `pi-subagents` extension command surface, so removed or reintroduced extension commands cannot silently invalidate the eval.",
        "",
        "## Native arm surface",
        "",
        "| Expected native command | Present in native source | Notes |",
        "|---|---:|---|",
    ]
    for command in sorted(NATIVE_EXPECTED):
        lines.append(f"| `/{command}` | {str(command in native_commands).lower()} | Built-in Pi command from `packages/coding-agent/src/core/slash-commands.ts`. |")
    lines.extend(
        [
            "",
            "Native isolation launch check:",
            "",
            f"- `captures/native-startup.txt` includes `--no-extensions`: {str(bool(data['native_launch_ok'])).lower()}.",
            f"- `captures/native-startup.txt` includes explicit native tool allowlist with `agent`: {str(bool(data['native_launch_ok'])).lower()}.",
            "",
            "## `pi-subagents` extension surface",
            "",
            f"Installed extension version: `pi-subagents {data['extension_version']}`.",
            "",
            "| Expected extension command | Present in extension source | Notes |",
            "|---|---:|---|",
        ]
    )
    for command in sorted(EXTENSION_EXPECTED):
        lines.append(f"| `/{command}` | {str(command in extension_commands).lower()} | Registered by `src/slash/slash-commands.ts`. |")
    lines.extend(
        [
            "",
            "| Removed/absent extension surface | Absent from extension source | Notes |",
            "|---|---:|---|",
        ]
    )
    for command in sorted(EXTENSION_REMOVED_OR_ABSENT):
        note = "Old extension manager overlay name; native `/agents` may still exist in Pi, but it is not an extension command." if command == "agents" else "Requested/legacy extension surface is not registered in `pi-subagents` 0.24.0."
        lines.append(f"| `/{command}` | {str(command in extension_absent).lower()} | {note} |")
    lines.extend(
        [
            "",
            "Extension isolation launch check:",
            "",
            f"- `captures/subagents-startup.txt` includes `--no-builtin-tools`: {str(bool(data['subagents_launch_ok'])).lower()}.",
            f"- `captures/subagents-startup.txt` explicitly loads only the `pi-subagents` extension via `-e`: {str(bool(data['subagents_launch_ok'])).lower()}.",
            f"- `captures/subagents-startup.txt` shows extension runtime loaded: {str(bool(data['subagents_runtime_loaded'])).lower()}.",
            f"- `captures/subagents-startup.txt` shows current module-format load failure: {str(bool(data['subagents_runtime_load_failed'])).lower()}.",
            "- Source command presence remains useful, but runtime command availability is currently blocked by the extension load failure.",
            "- See `extension-load-audit.md` for the source/capture diagnosis of the module-format load error.",
            "",
            "## Drift guard summary",
            "",
            f"- Native expected commands present: {data['native_expected_present']}/3.",
            f"- Extension expected commands present: {data['extension_expected_present']}/5.",
            f"- Removed/absent extension surfaces absent: {data['extension_removed_absent']}/3.",
            f"- Removed-surface changelog guard: {data['removed_changelog_verified']}.",
            f"- Launch isolation guards passed: {data['launch_isolation_count']}/2.",
            f"- Current extension runtime load failure detected: {data['subagents_runtime_load_failed']}.",
            "- Extension load audit: `extension-load-audit.md`.",
            "- If `/subagents` or `/subagents-status` reappears, this file and the scorecard must be updated rather than silently carrying stale removal findings.",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="Write command-surface.md")
    args = parser.parse_args()

    native_commands = parse_native_builtin_commands()
    extension_commands = parse_extension_commands()
    ext_version = extension_version()
    native_launch_ok, subagents_launch_ok, subagents_runtime_loaded, subagents_runtime_load_failed = check_launch_flags()
    removed_changelog_verified = check_removed_changelog()

    native_expected_present = len(NATIVE_EXPECTED & native_commands)
    extension_expected_present = len(EXTENSION_EXPECTED & extension_commands)
    extension_absent = {command for command in EXTENSION_REMOVED_OR_ABSENT if command not in extension_commands}
    extension_removed_absent = len(extension_absent)
    launch_isolation_count = native_launch_ok + subagents_launch_ok

    data: dict[str, object] = {
        "native_commands": native_commands,
        "extension_commands": extension_commands,
        "extension_absent": extension_absent,
        "extension_version": ext_version,
        "native_launch_ok": native_launch_ok,
        "subagents_launch_ok": subagents_launch_ok,
        "native_expected_present": native_expected_present,
        "extension_expected_present": extension_expected_present,
        "extension_removed_absent": extension_removed_absent,
        "launch_isolation_count": launch_isolation_count,
        "subagents_runtime_loaded": subagents_runtime_loaded,
        "subagents_runtime_load_failed": subagents_runtime_load_failed,
        "removed_changelog_verified": removed_changelog_verified,
    }
    if args.write:
        write_markdown(ROOT / "command-surface.md", data)

    current_markdown = read(ROOT / "command-surface.md") if (ROOT / "command-surface.md").exists() else ""
    markdown_guardrail_split = int(
        "`extension-load-audit.md`.- If" not in current_markdown
        and "- Extension load audit: `extension-load-audit.md`.\n- If `/subagents` or `/subagents-status` reappears" in current_markdown
    )
    command_surface_verified = int(
        native_expected_present == len(NATIVE_EXPECTED)
        and extension_expected_present == len(EXTENSION_EXPECTED)
        and extension_removed_absent == len(EXTENSION_REMOVED_OR_ABSENT)
        and ext_version == "0.24.0"
        and launch_isolation_count == 2
        and removed_changelog_verified == 1
        and subagents_runtime_load_failed == 1
        and markdown_guardrail_split == 1
    )

    print(f"command_surface_native_expected_present={native_expected_present}")
    print(f"command_surface_extension_expected_present={extension_expected_present}")
    print(f"command_surface_extension_removed_absent={extension_removed_absent}")
    print(f"command_surface_launch_isolation={launch_isolation_count}")
    print(f"command_surface_removed_changelog_verified={removed_changelog_verified}")
    print(f"command_surface_subagents_runtime_loaded={subagents_runtime_loaded}")
    print(f"command_surface_subagents_runtime_load_failed={subagents_runtime_load_failed}")
    print(f"command_surface_markdown_guardrail_split={markdown_guardrail_split}")
    print(f"command_surface_verified={command_surface_verified}")
    return 0 if command_surface_verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

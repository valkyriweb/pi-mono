#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SUBAGENTS = Path.home() / ".pi/agent/git/github.com/nicobailon/pi-subagents"
ENTRY = SUBAGENTS / "src/extension/index.ts"
RENDER = SUBAGENTS / "src/tui/render.ts"
PACKAGE_JSON = SUBAGENTS / "package.json"
LOADER = REPO / "packages/coding-agent/src/core/extensions/loader.ts"
CODING_AGENT_INDEX = REPO / "packages/coding-agent/src/index.ts"
EXTENSIONS_INDEX = REPO / "packages/coding-agent/src/core/extensions/index.ts"
CAPTURES = [
    ROOT / "captures/subagents-startup.txt",
    ROOT / "captures/subagents-s01-live-child-output.txt",
]


def read(path: Path) -> str:
    return path.read_text(errors="ignore") if path.exists() else ""


def package_metrics() -> dict[str, int | str]:
    pkg = json.loads(read(PACKAGE_JSON))
    extensions = pkg.get("pi", {}).get("extensions", []) if isinstance(pkg.get("pi"), dict) else []
    entry_declared = "./src/extension/index.ts" in extensions
    return {
        "name": str(pkg.get("name", "")),
        "version": str(pkg.get("version", "")),
        "type_module": int(pkg.get("type") == "module"),
        "entry_declared": int(entry_declared),
        "manifest_verified": int(pkg.get("name") == "pi-subagents" and pkg.get("version") == "0.24.0" and pkg.get("type") == "module" and entry_declared),
    }


def source_has_cjs_exports(text: str) -> int:
    return int(bool(re.search(r"\bmodule\.exports\b|\bexports\.", text)))


def entry_top_level_await_absent(text: str) -> int:
    # Conservative entrypoint check: the entry file should not contain a bare top-level
    # await line. This is not a full TypeScript parser; it only guards the current
    # root-cause note from blaming source-authored top-level await in the entry file.
    return int(re.search(r"(?m)^\s*await\b", text) is None)


def source_metrics() -> dict[str, int]:
    entry = read(ENTRY)
    render = read(RENDER)
    src_files = list((SUBAGENTS / "src").rglob("*.ts"))
    all_src = "\n".join(read(path) for path in src_files)
    default_export = int("export default function registerSubagentExtension" in entry)
    entry_cjs_exports_absent = int(source_has_cjs_exports(entry) == 0)
    src_cjs_exports_absent = int(source_has_cjs_exports(all_src) == 0)
    top_level_await_absent = entry_top_level_await_absent(entry)
    runtime_imports_pi_coding_agent = int(
        "getMarkdownTheme" in render and 'from "@mariozechner/pi-coding-agent"' in render
    )
    return {
        "default_export": default_export,
        "entry_cjs_exports_absent": entry_cjs_exports_absent,
        "src_cjs_exports_absent": src_cjs_exports_absent,
        "entry_top_level_await_absent": top_level_await_absent,
        "runtime_imports_pi_coding_agent": runtime_imports_pi_coding_agent,
        "source_shape_verified": int(default_export and entry_cjs_exports_absent and top_level_await_absent),
    }


def loader_metrics() -> dict[str, int]:
    loader = read(LOADER)
    coding_index = read(CODING_AGENT_INDEX)
    extensions_index = read(EXTENSIONS_INDEX)
    uses_jiti = int("createJiti" in loader and "jiti.import(extensionPath, { default: true })" in loader)
    returns_failed_error = int("Failed to load extension:" in loader)
    alias_to_package_index = int('"@mariozechner/pi-coding-agent": packageIndex' in loader)
    package_index_source_checkout = int('path.resolve(__dirname, "../..", "index.js")' in loader)
    index_reexports_extensions = int('from "./core/extensions/index.js"' in coding_index)
    extensions_index_reexports_loader = int('from "./loader.js"' in extensions_index)
    self_import_cycle_verified = int(
        alias_to_package_index
        and package_index_source_checkout
        and index_reexports_extensions
        and extensions_index_reexports_loader
    )
    return {
        "loader_jiti_import_verified": uses_jiti,
        "loader_error_wrapping_verified": returns_failed_error,
        "loader_alias_to_index": alias_to_package_index,
        "loader_package_index_source_checkout": package_index_source_checkout,
        "loader_index_reexports_extensions": index_reexports_extensions,
        "loader_extensions_index_reexports_loader": extensions_index_reexports_loader,
        "loader_self_import_cycle_verified": self_import_cycle_verified,
        "loader_verified": int(uses_jiti and returns_failed_error and self_import_cycle_verified),
    }


def capture_metrics() -> dict[str, int]:
    runtime_error_files = 0
    module_error_files = 0
    for path in CAPTURES:
        text = read(path)
        runtime_error_files += int("Failed to load extension" in text)
        module_error_files += int("Cannot determine intended module format" in text)
    return {
        "runtime_error_files": runtime_error_files,
        "module_format_error_files": module_error_files,
        "capture_error_verified": int(runtime_error_files == len(CAPTURES) and module_error_files == len(CAPTURES)),
    }


def write_markdown(path: Path, pkg: dict[str, int | str], source: dict[str, int], loader: dict[str, int], captures: dict[str, int]) -> None:
    rows = [
        ("runtime captures", "captures/subagents-startup.txt; captures/subagents-s01-live-child-output.txt", f"runtime_error_files={captures['runtime_error_files']}; module_format_error_files={captures['module_format_error_files']}"),
        ("package manifest", "~/.pi/agent/git/github.com/nicobailon/pi-subagents/package.json", f"name={pkg['name']}; version={pkg['version']}; type_module={pkg['type_module']}; entry_declared={pkg['entry_declared']}"),
        ("extension entry", "src/extension/index.ts", f"default_export={source['default_export']}; entry_cjs_exports_absent={source['entry_cjs_exports_absent']}; entry_top_level_await_absent={source['entry_top_level_await_absent']}"),
        ("source CJS marker scan", "pi-subagents/src/**/*.ts", f"src_cjs_exports_absent={source['src_cjs_exports_absent']}"),
        ("extension runtime import", "src/tui/render.ts", f"imports_pi_coding_agent={source['runtime_imports_pi_coding_agent']}"),
        ("Pi loader import path", "packages/coding-agent/src/core/extensions/loader.ts", f"jiti_import_default={loader['loader_jiti_import_verified']}; wraps_failed_load={loader['loader_error_wrapping_verified']}"),
        ("Pi loader package alias", "packages/coding-agent/src/core/extensions/loader.ts", f"alias_to_index={loader['loader_alias_to_index']}; source_checkout_index={loader['loader_package_index_source_checkout']}"),
        ("Pi index re-export chain", "packages/coding-agent/src/index.ts; src/core/extensions/index.ts", f"index_reexports_extensions={loader['loader_index_reexports_extensions']}; extensions_reexports_loader={loader['loader_extensions_index_reexports_loader']}"),
        ("diagnosis", "combined evidence", "manifest and extension entry look ESM-first; current source-checkout loader aliases extension imports of @mariozechner/pi-coding-agent back through src/index, which re-exports the loader and trips the Pi/jiti module-format failure before slash commands register"),
    ]
    lines = [
        "# Extension Load Audit",
        "",
        "Purpose: explain the current `pi-subagents` runtime failure without patching production Pi or the extension. This turns the S01 `/run scout` failure from a bare screenshot into a reproducible source/capture diagnosis.",
        "",
        "## Root-cause evidence",
        "",
        "| Surface | Evidence path | Finding |",
        "|---|---|---|",
    ]
    for row in rows:
        lines.append(f"| {row[0]} | `{row[1]}` | {row[2]} |")
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "- The installed package is `pi-subagents` 0.24.0, declares `type: module`, and points Pi at `./src/extension/index.ts`.",
            "- The extension entry is an ESM-style default-exported factory and does not contain source-authored CommonJS `exports.*`/`module.exports` markers.",
            "- `src/tui/render.ts` imports `getMarkdownTheme` from `@mariozechner/pi-coding-agent` at runtime, so extension loading follows Pi's package alias instead of staying within type-only imports.",
            "- In the current source checkout, the loader aliases `@mariozechner/pi-coding-agent` to `src/index`; that index re-exports `core/extensions/index`, which re-exports `loader`, creating a self-import path while jiti is loading the extension.",
            "- Current Pi loads extension TypeScript through `createJiti(...).import(extensionPath, { default: true })` and reports `Cannot determine intended module format because both 'exports' and top-level await are present` before slash commands register.",
            "- Therefore the current eval treats `/run` as present in source but unavailable at runtime until the source-checkout loader/package interaction is fixed and the S01 probe is rerun.",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    pkg = package_metrics()
    source = source_metrics()
    loader = loader_metrics()
    captures = capture_metrics()
    verified = int(
        pkg["manifest_verified"] == 1
        and source["source_shape_verified"] == 1
        and source["runtime_imports_pi_coding_agent"] == 1
        and loader["loader_verified"] == 1
        and captures["capture_error_verified"] == 1
    )
    write_markdown(ROOT / "extension-load-audit.md", pkg, source, loader, captures)
    print("extension_load_audit_rows=9")
    print(f"extension_load_runtime_error_files={captures['runtime_error_files']}")
    print(f"extension_load_module_format_error_files={captures['module_format_error_files']}")
    print(f"extension_load_manifest_verified={pkg['manifest_verified']}")
    print(f"extension_load_entry_default_export={source['default_export']}")
    print(f"extension_load_entry_cjs_exports_absent={source['entry_cjs_exports_absent']}")
    print(f"extension_load_entry_top_level_await_absent={source['entry_top_level_await_absent']}")
    print(f"extension_load_runtime_imports_pi_coding_agent={source['runtime_imports_pi_coding_agent']}")
    print(f"extension_load_loader_jiti_verified={loader['loader_jiti_import_verified']}")
    print(f"extension_load_loader_alias_to_index={loader['loader_alias_to_index']}")
    print(f"extension_load_loader_source_index={loader['loader_package_index_source_checkout']}")
    print(f"extension_load_index_reexports_loader={loader['loader_self_import_cycle_verified']}")
    print(f"extension_load_diagnosis_verified={verified}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

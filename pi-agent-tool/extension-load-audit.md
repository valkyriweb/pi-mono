# Extension Load Audit

Purpose: explain the current `pi-subagents` runtime failure without patching production Pi or the extension. This turns the S01 `/run scout` failure from a bare screenshot into a reproducible source/capture diagnosis.

## Root-cause evidence

| Surface | Evidence path | Finding |
|---|---|---|
| runtime captures | `captures/subagents-startup.txt; captures/subagents-s01-live-child-output.txt` | runtime_error_files=2; module_format_error_files=2 |
| package manifest | `~/.pi/agent/git/github.com/nicobailon/pi-subagents/package.json` | name=pi-subagents; version=0.24.0; type_module=1; entry_declared=1 |
| extension entry | `src/extension/index.ts` | default_export=1; entry_cjs_exports_absent=1; entry_top_level_await_absent=1 |
| source CJS marker scan | `pi-subagents/src/**/*.ts` | src_cjs_exports_absent=1 |
| extension runtime import | `src/tui/render.ts` | imports_pi_coding_agent=1 |
| Pi loader import path | `packages/coding-agent/src/core/extensions/loader.ts` | jiti_import_default=1; wraps_failed_load=1 |
| Pi loader package alias | `packages/coding-agent/src/core/extensions/loader.ts` | alias_to_index=1; source_checkout_index=1 |
| Pi index re-export chain | `packages/coding-agent/src/index.ts; src/core/extensions/index.ts` | index_reexports_extensions=1; extensions_reexports_loader=1 |
| diagnosis | `combined evidence` | manifest and extension entry look ESM-first; current source-checkout loader aliases extension imports of @mariozechner/pi-coding-agent back through src/index, which re-exports the loader and trips the Pi/jiti module-format failure before slash commands register |

## Interpretation

- The installed package is `pi-subagents` 0.24.0, declares `type: module`, and points Pi at `./src/extension/index.ts`.
- The extension entry is an ESM-style default-exported factory and does not contain source-authored CommonJS `exports.*`/`module.exports` markers.
- `src/tui/render.ts` imports `getMarkdownTheme` from `@mariozechner/pi-coding-agent` at runtime, so extension loading follows Pi's package alias instead of staying within type-only imports.
- In the current source checkout, the loader aliases `@mariozechner/pi-coding-agent` to `src/index`; that index re-exports `core/extensions/index`, which re-exports `loader`, creating a self-import path while jiti is loading the extension.
- Current Pi loads extension TypeScript through `createJiti(...).import(extensionPath, { default: true })` and reports `Cannot determine intended module format because both 'exports' and top-level await are present` before slash commands register.
- Therefore the current eval treats `/run` as present in source but unavailable at runtime until the source-checkout loader/package interaction is fixed and the S01 probe is rerun.

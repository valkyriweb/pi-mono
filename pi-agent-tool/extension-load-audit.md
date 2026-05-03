# Extension Load Audit

Purpose: explain the current `pi-subagents` runtime failure without patching production Pi or the extension. This turns the S01 `/run scout` failure from a bare screenshot into a reproducible source/capture diagnosis.

## Root-cause evidence

| Surface | Evidence path | Finding |
|---|---|---|
| runtime captures | `captures/subagents-startup.txt; captures/subagents-s01-live-child-output.txt` | runtime_error_files=2; module_format_error_files=2 |
| package manifest | `~/.pi/agent/git/github.com/nicobailon/pi-subagents/package.json` | name=pi-subagents; version=0.24.0; type_module=1; entry_declared=1 |
| extension entry | `src/extension/index.ts` | default_export=1; entry_cjs_exports_absent=1; entry_top_level_await_absent=1 |
| source CJS marker scan | `pi-subagents/src/**/*.ts` | src_cjs_exports_absent=1 |
| Pi loader | `packages/coding-agent/src/core/extensions/loader.ts` | jiti_import_default=1; wraps_failed_load=1 |
| diagnosis | `combined evidence` | manifest and source look ESM-first; runtime failure is at Pi/jiti extension loading before slash commands register |

## Interpretation

- The installed package is `pi-subagents` 0.24.0, declares `type: module`, and points Pi at `./src/extension/index.ts`.
- The extension entry is an ESM-style default-exported factory and does not contain source-authored CommonJS `exports.*`/`module.exports` markers.
- Current Pi loads extension TypeScript through `createJiti(...).import(extensionPath, { default: true })` and reports `Cannot determine intended module format because both 'exports' and top-level await are present`.
- Therefore the current eval treats `/run` as present in source but unavailable at runtime until the loader/package interaction is fixed and the S01 probe is rerun.

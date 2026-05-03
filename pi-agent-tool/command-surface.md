# Command Surface

Purpose: keep active command/tool-surface claims reproducible. This file separates native Pi command availability from the installed `pi-subagents` extension command surface, so removed or reintroduced extension commands cannot silently invalidate the eval.

## Native arm surface

| Expected native command | Present in native source | Notes |
|---|---:|---|
| `/agents` | true | Built-in Pi command from `packages/coding-agent/src/core/slash-commands.ts`. |
| `/agents-doctor` | true | Built-in Pi command from `packages/coding-agent/src/core/slash-commands.ts`. |
| `/agents-status` | true | Built-in Pi command from `packages/coding-agent/src/core/slash-commands.ts`. |

Native isolation launch check:

- `captures/native-startup.txt` includes `--no-extensions`: true.
- `captures/native-startup.txt` includes explicit native tool allowlist with `agent`: true.

## `pi-subagents` extension surface

Installed extension version: `pi-subagents 0.24.0`.

| Expected extension command | Present in extension source | Notes |
|---|---:|---|
| `/chain` | true | Registered by `src/slash/slash-commands.ts`. |
| `/parallel` | true | Registered by `src/slash/slash-commands.ts`. |
| `/run` | true | Registered by `src/slash/slash-commands.ts`. |
| `/run-chain` | true | Registered by `src/slash/slash-commands.ts`. |
| `/subagents-doctor` | true | Registered by `src/slash/slash-commands.ts`. |

| Removed/absent extension surface | Absent from extension source | Notes |
|---|---:|---|
| `/agents` | true | Old extension manager overlay name; native `/agents` may still exist in Pi, but it is not an extension command. |
| `/subagents` | true | Requested/legacy extension surface is not registered in `pi-subagents` 0.24.0. |
| `/subagents-status` | true | Requested/legacy extension surface is not registered in `pi-subagents` 0.24.0. |

Extension isolation launch check:

- `captures/subagents-startup.txt` includes `--no-builtin-tools`: true.
- `captures/subagents-startup.txt` explicitly loads only the `pi-subagents` extension via `-e`: true.
- `captures/subagents-startup.txt` shows extension runtime loaded: false.
- `captures/subagents-startup.txt` shows current module-format load failure: true.
- Source command presence remains useful, but runtime command availability is currently blocked by the extension load failure.

## Drift guard summary

- Native expected commands present: 3/3.
- Extension expected commands present: 5/5.
- Removed/absent extension surfaces absent: 3/3.
- Removed-surface changelog guard: 1.
- Launch isolation guards passed: 2/2.
- Current extension runtime load failure detected: 1.
- If `/subagents` or `/subagents-status` reappears, this file and the scorecard must be updated rather than silently carrying stale removal findings.

# Tool Parity Slice Handoff

## Slice A: native Agent/Task parity

Status: verified.

### Verified behavior

- `agent`, `Agent`, and `Task` are registered in the tool registry.
- `Agent` and `Task` expose Claude-compatible fields:
  - `prompt`
  - `subagent_type`
  - `run_in_background`
- Alias normalization works:
  - `prompt` aliases `task`
  - `subagent_type` aliases `agent`
  - `run_in_background` aliases `background`
- Conflicting aliases reject with clear errors:
  - `agent and subagent_type differ`
  - `task and prompt differ`
  - `background and run_in_background differ`
- Built-in agent casing resolves as intended:
  - `Explore` resolves to `explore`
  - `Plan` resolves to `plan`
  - exact IDs win before case-insensitive fallback
- Lowercase `agent` and legacy `Task` construction still work.
- Default active tools use uppercase `Agent` and `Task`, not redundant lowercase `agent`.

### Evidence

Commands run:

```bash
npm --prefix packages/coding-agent run test -- test/agent-tool.test.ts test/agent-definitions.test.ts
```

Result: `2 passed (2)`, `21 passed (21)`.

```bash
npm --prefix packages/coding-agent run build
```

Result: build completed successfully and copied assets.

```bash
node /tmp/pi-agent-tool-parity-smoke.mjs
```

Result: `built-dist agent tool parity smoke passed`.

Source/test coverage:

- `packages/coding-agent/src/core/tools/agent.ts`
  - alias fields and normalization
  - uppercase `Agent` wrapper
  - legacy `Task` wrapper
- `packages/coding-agent/src/core/tools/index.ts`
  - tool names and registry constructors for `agent`, `Agent`, and `Task`
- `packages/coding-agent/src/core/agents/registry.ts`
  - exact match first, then unique case-insensitive fallback
- `packages/coding-agent/src/core/sdk.ts`
  - default active tool names include `Agent` and `Task`
  - default active tool names omit lowercase `agent`
- `packages/coding-agent/test/agent-tool.test.ts`
  - alias normalization
  - conflict rejection
  - registry schema exposure
- `packages/coding-agent/test/agent-definitions.test.ts`
  - `Explore`/`Plan` casing fallback
  - exact-ID precedence

### Worktree note

The worktree already contained merge conflicts in other packages. For Slice A verification, coding-agent conflicted files were resolved to the Slice A side so targeted tests and build could run. Unrelated non-coding-agent conflicts remain outside this handoff.

## Exact next prompt for Slice B

```text
Working directory:
- /Users/luke/Projects/personal/pi-mono-fork

Implement and verify Slice B: native slash-command/tool-search compatibility for Agent/Task parity.

Start from Slice A evidence in:
packages/coding-agent/docs/tool-parity-slice-handoff.md

Goals:
- Ensure tool search/deferred-tool activation prefers native uppercase `Agent` and legacy `Task` where Claude-compatible names are expected.
- Preserve lowercase `agent` compatibility for existing Pi prompts, config, and extensions.
- Confirm slash/help/tool listing surfaces do not show redundant confusing `agent`/`Agent` duplicates unless explicitly listing all registered aliases.
- Confirm `Agent`/`Task` descriptions and schemas remain Claude-compatible in generated prompt/tool docs.
- Add or update targeted tests for tool search, slash/help output, and active tool activation.
- Keep `agent`, `Agent`, and `Task` registered; do not remove lowercase `agent`.

Run:
- targeted tool-search/slash/help tests
- targeted agent tool parity tests from Slice A
- `npm --prefix packages/coding-agent run build`
- built-dist smoke covering tool search/listing behavior

Then update this handoff file with Slice B evidence and the exact next prompt for Slice C.
```

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

## Slice B: tool-search compatibility

Status: verified.

### Verified behavior

- Deferred tool search keeps lowercase `agent` compatibility while preferring Claude-compatible aliases for agent-like deferred tools.
- Query matches that include `agent` no longer surface redundant lowercase `agent` when `Agent` and `Task` are present.
- `Agent`/`Task` registry/schema behavior remains unchanged.

### Evidence

Commands run:

```bash
npm --prefix packages/coding-agent run test -- test/agent-tool.test.ts
```

Result: `14 passed (14)`.

```bash
npm --prefix packages/coding-agent run build
```

Result: build completed successfully and copied assets.

Source/test coverage:

- `packages/coding-agent/src/core/deferred-tool-search-tool.ts`
  - Claude-compatible alias preference for deferred tool queries
- `packages/coding-agent/test/agent-tool.test.ts`
  - regression for agent-like deferred query matches

### Exact next prompt for Slice C

```text
Working directory:
- /Users/luke/Projects/personal/pi-mono-fork

Implement and verify Slice C: slash/help/tool-listing parity for native Agent/Task surfaces.

Start from Slice A and Slice B evidence in:
packages/coding-agent/docs/tool-parity-slice-handoff.md

Goals:
- Confirm slash/help/tool listing surfaces present native Agent/Task ergonomics without redundant confusing duplicates.
- Confirm generated prompt/tool docs remain Claude-compatible for Agent/Task.
- Add or update targeted tests for slash/help output and active tool listing.
- Keep `agent`, `Agent`, and `Task` registered; do not remove lowercase `agent`.

Run:
- targeted slash/help/listing tests
- targeted agent and tool-search parity tests from Slices A/B
- `npm --prefix packages/coding-agent run build`
- built-dist smoke covering tool listing behavior

Then update this handoff file with Slice C evidence and the exact next prompt for the final slice.
```

# Fork Changelog

Fork-specific changes maintained by valkyriweb. Upstream package changelogs stay reserved for upstream release notes and upstreamable changes.

## [Unreleased]

### Added

- Added push-based background-agent completion notifications. When a background `agent` run (or `ctx.forkAgent`) reaches a terminal status (`completed | failed | cancelled | interrupted`), the parent session is sent an `agent_completion` custom message carrying `runId`, `status`, `summary`, `result` preview, `output_path`s, `session_path`s, `duration_ms`, `total_tokens`, and `tool_calls`. Mirrors Claude Code's `<task_notification>` shape. The notification fires exactly once per run (atomic dedup via a per-run `notified` flag inside `agents/status.ts`) and is delivered as a `followUp`, so `message_start` fires when the loop picks it up — which is exactly the wake signal pi-goal's `goal_wait` listens for. The `agent` tool's prompt guidelines now explicitly say "do not poll with action=status/detail while waiting”, matching Claude Code's anti-polling rule. New extension hook point: `AgentToolOptions.onBackgroundTerminal(notification)` and `AgentExecutorOptions.onBackgroundTerminal`, wired into the session's `sendCustomMessage` path.
- Added `ctx.forkAgent(opts)` to `ExtensionContext`: spawns a cache-preserving background child agent in `context: "fork"` mode, inheriting the parent's frozen turn-start system prompt 1:1 (byte-identical system + tools prefix for cache hits). Returns `{ handle, sessionId }` where `handle.wait()` resolves with the run's terminal `AgentToolDetails`, `handle.abort()` cancels within ~1s, and `handle.status` snapshots the current `AgentToolStatus`. Caller signal is chained via `cancelAgentRecentRun(runId)`.
- Added `ctx.transcript.append(entry)` to `ExtensionContext` with `TranscriptEntry = { kind: "memory_saved"; verb: "Saved" | "Improved"; paths: string[] }`. Routes through `sendCustomMessage` with `customType: "memory_saved"` so the entry serializes through every mode (interactive renders inline, print/RPC see it in the event stream).
- Added a built-in `memory_saved` message renderer in the interactive TUI (`MemorySavedMessageComponent`). Extension-registered renderers still win; the built-in is a fallback so extensions can append memory entries without shipping their own renderer.
- Added a `"fast"` model alias for the built-in `agent` tool, resolving to the parent provider's mapped cheap variant (Anthropic→Haiku, OpenAI→gpt-5.4-mini, Google→Flash Lite, claude-bridge→Haiku, etc.) via `fastModelPerProvider` in `model-resolver.ts`. Falls back to the parent model when the provider has no mapping. The built-in `explore` agent now defaults to `model: "fast"` so codebase research no longer burns the parent's expensive model.
- Added native background lifecycle control for the built-in `agent` tool, including background launch, footer visibility, selectable `/agents runs` controls, `/agents-status` visibility, interrupt/cancel, and single-run resume.
- Added `pi-agent-tool/eval-design-prompt.md` to design a token-efficient A/B eval comparing native Pi agents with `pi-subagents`.
- Added a native built-in `agent` tool with single, parallel, and chain modes, built-in child agent definitions, user/project Markdown discovery, context modes, `/agents`, and migration docs for the legacy `subagent` extension example.
- Added native-search backend selection for the built-in `grep` and `find` tools, preferring controlled/system `ugrep` and `bfs` before falling back to managed/system `rg` and `fd`.
- Documented Claude Code native search-tool findings and the planned `ugrep`/`bfs` backend direction for Pi's built-in `grep` and `find` tools.

### Changed

- Tightened the built-in `explore` agent prompt to mirror Claude Code's read-only search specialist: explicit READ-ONLY prohibitions, parallel-tool guidance, caller-specified thoroughness levels (`quick` / `medium` / `very thorough`).
- Removed the built-in `scout` agent; it overlapped `explore`. `explore` is now the single read-only research agent.
- Updated the `agent` tool's prompt guidelines to route codebase research and file/symbol lookups to `explore` instead of `general`, and to prefer `plan` before delegating implementation to `worker`.
- Deferred the built-in `statusline-setup` agent until Pi's statusline target is defined.

### Fixed

- Improved interactive responsiveness under frequent render/status updates by scheduling TUI renders with `setImmediate` instead of `process.nextTick`, and caching footer cumulative usage totals between session-entry changes.
- Included the built-in `grep`, `find`, `ls`, and `agent` tools in the default active tool set so the system prompt exposes them when no explicit tool allowlist is configured.
- Added bounded default timeouts to the built-in `grep` and `find` tools with structured timeout results, partial output when available, AbortSignal preservation, and explicit `timeout` overrides up to 300 seconds.
- Fixed runtime active-tool changes made during tool execution so the next provider request in the same agent run receives the refreshed tool schema. This makes deferred-tool activators such as `tool_search` able to expose newly activated tools immediately, and deduplicates repeated active tool names.

## 2026-05-02

- Locally aliased the installed `pi-subagents` manager command from `/agents` to `/subagents` for A/B testing against native `/agents`; this lives under `~/.pi/agent/git/github.com/nicobailon/pi-subagents` and may be overwritten by `pi update`.
- Merged upstream `v0.72.0` into the fork.

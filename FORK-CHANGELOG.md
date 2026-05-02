# Fork Changelog

Fork-specific changes maintained by valkyriweb. Upstream package changelogs stay reserved for upstream release notes and upstreamable changes.

## [Unreleased]

### Added

- Added `pi-agent-tool/eval-design-prompt.md` to design a token-efficient A/B eval comparing native Pi agents with `pi-subagents`.
- Added a native built-in `agent` tool with single, parallel, and chain modes, built-in child agent definitions, user/project Markdown discovery, context modes, `/agents`, and migration docs for the legacy `subagent` extension example.
- Added native-search backend selection for the built-in `grep` and `find` tools, preferring controlled/system `ugrep` and `bfs` before falling back to managed/system `rg` and `fd`.
- Documented Claude Code native search-tool findings and the planned `ugrep`/`bfs` backend direction for Pi's built-in `grep` and `find` tools.

### Changed

- Deferred the built-in `statusline-setup` agent until Pi's statusline target is defined.

### Fixed

- Included the built-in `grep`, `find`, `ls`, and `agent` tools in the default active tool set so the system prompt exposes them when no explicit tool allowlist is configured.
- Added bounded default timeouts to the built-in `grep` and `find` tools with structured timeout results, partial output when available, AbortSignal preservation, and explicit `timeout` overrides up to 300 seconds.
- Fixed runtime active-tool changes made during tool execution so the next provider request in the same agent run receives the refreshed tool schema. This makes deferred-tool activators such as `tool_search` able to expose newly activated tools immediately, and deduplicates repeated active tool names.

## 2026-05-02

- Locally aliased the installed `pi-subagents` manager command from `/agents` to `/subagents` for A/B testing against native `/agents`; this lives under `~/.pi/agent/git/github.com/nicobailon/pi-subagents` and may be overwritten by `pi update`.
- Merged upstream `v0.72.0` into the fork.

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

## Slice B: richer native grep output modes

Status: corrected and verified.

### Corrected behavior

- Native `grep` now exposes Claude-style schema fields:
  - `outputMode` / `output_mode`
  - `headLimit` / `head_limit`
  - `offset`
  - `type`
  - `multiline`
- Native `grep` supports output modes:
  - `content` for matching lines with file paths and line numbers.
  - `files_with_matches` for matching file paths only.
  - `count` for per-file match counts.
- Existing calls with no `outputMode` keep Pi's old content-line behavior.
- `limit` remains backwards-compatible as the wrapper-side match collection cap.
- `headLimit` / `head_limit` and `offset` paginate returned output entries after matches are collected.
- `type` uses the `rg --type` backend path, because that support is clear. Calls without `type` may still prefer `ugrep`.
- `multiline: true` is rejected clearly for now because equivalent `ugrep`/`rg` parity has not been verified for Pi's backend abstraction.
- This Slice B correction is implemented in the native custom `grep` tool, not through bash.

### Source/test coverage

- `packages/coding-agent/src/core/tools/grep.ts`
  - schema aliases and output mode normalization
  - native `files_with_matches` and `count` formatting
  - output pagination via `headLimit` / `head_limit` + `offset`
  - `type` routed to the `rg` backend
  - clear rejection for unsupported `multiline`
- `packages/coding-agent/test/tools.test.ts`
  - schema exposure for the new grep fields
  - content/files/count mode regressions
  - camelCase and snake_case pagination regressions
  - old default content behavior regression
  - unsupported multiline rejection regression

### Evidence

Commands run:

```bash
npm --prefix packages/coding-agent run test -- test/tools.test.ts
```

Result: `1 passed (1)`, `93 passed (93)`.

```bash
npm --prefix packages/coding-agent run build
```

Result: build completed successfully and copied assets.

```bash
npm run check
```

Result: completed successfully; Biome, `tsgo --noEmit`, browser smoke, and web-ui checks all passed.

Final combined gate:

```bash
npm --prefix packages/coding-agent run test -- test/tools.test.ts && npm --prefix packages/coding-agent run build && npm run check
```

Result: targeted tests `1 passed (1)`, `93 passed (93)`; build completed successfully; `npm run check` completed successfully with no Biome fixes applied.

### Tooling note for Pi/Codex conversion

When the Pi Codex conversion extension is active, especially with the `openai-codex` provider selected, Slice work should play nicely with native Codex/Pi tools:

- Prefer native `Edit` / `edit` and patch-style file tools for file modifications.
- Do not use ad-hoc bash/python string-rewrite scripts for source edits.
- Keep tool-parity slice docs explicit about native-tool behavior so converted calls do not drift toward shell workarounds.

## Slice C: edit exactness audit

Status: verified.

### Files changed

- `packages/coding-agent/src/core/tools/edit-diff.ts`
  - default edit matching now uses exact `indexOf` against LF-normalized file content.
  - duplicate detection now counts exact occurrences only.
  - fuzzy-normalized edit matching helpers were removed.
- `packages/coding-agent/test/tools.test.ts`
  - converted the old fuzzy-positive suite into exactness regressions.
  - added coverage for quote, whitespace, dash, NBSP, fullwidth punctuation, Unicode compatibility, exact/overlapping duplicates, preview, and multi-edit rejection behavior.
- `packages/coding-agent/src/core/tools/bash.ts`
  - tiny Biome-only template literal cleanup needed for `npm run check`.
- `packages/coding-agent/src/modes/interactive/components/footer.ts`
  - tiny Biome-only template literal cleanup needed for `npm run check`.

### Verified behavior

- Default `edit` only replaces exact `oldText` after existing LF line-ending normalization.
- Partial/fuzzy-normalized matches reject clearly with the existing exact-text error.
- Smart quote, Unicode dash, Unicode compatibility, fullwidth punctuation, NBSP, and trailing-whitespace normalization do not cause replacements.
- Non-unique exact matches, including overlapping occurrences, reject clearly.
- Overlapping multi-edits still reject.
- Multi-edit matching is still against the original file, not incrementally.
- Failed multi-edits do not partially write.
- Legacy top-level `oldText`/`newText` preparation is preserved.
- CRLF and BOM preservation is unchanged.
- Preview rendering uses the same exact semantics as execution.

### Evidence

Commands run:

```bash
npm --prefix packages/coding-agent run test -- test/tools.test.ts test/edit-tool-legacy-input.test.ts test/edit-tool-no-full-redraw.test.ts
```

Result: `3 passed (3)`, `95 passed (95)`.

```bash
npm --prefix packages/coding-agent run build
```

Result: build completed successfully and copied assets.

```bash
npm run check
```

Result: completed successfully; Biome, `tsgo --noEmit`, browser smoke, web-ui checks all passed.

### Known divergences from Claude Code

- Pi keeps public multi-edit support (`edits[]`) while Claude Code's current public edit shape is single replacement per call.
- Pi still does not enforce Claude-style read-before-edit or stale-file guards for edits.
- Pi preserves LF/CRLF normalization for matching so LF `oldText` can edit CRLF files; this is intentional existing behavior.
- Pi removed fuzzy edit matching rather than preserving Claude Code's quote-normalized fallback.

### Remaining risks

- A future explicit repair/fuzzy-edit flow would need a separate tool/schema option and its own safety tests; it should not reuse default `edit` silently.
- Exact semantics are covered in `tools.test.ts`; if a future specialized edit test file is split out, keep these regressions with the edit suite.

## Slice D: shell command exit semantics

Status: verified.

### Files changed

- `packages/coding-agent/src/core/tools/bash.ts`
  - added a conservative command-specific exit classifier for simple shell commands.
  - treats exit `1` as semantic success for expected command families only.
  - appends an explicit semantic-success summary instead of throwing a tool error.
  - preserves native-tool blocking before execution.
- `packages/coding-agent/test/bash-command-semantics.test.ts`
  - added coverage for semantic exit families, true failures, compound-command conservatism, output summaries, and native guard precedence.
- `packages/coding-agent/docs/tool-parity-slice-handoff.md`
  - recorded Slice D evidence and next Slice E prompt.

### Verified behavior

- `grep`, `egrep`, `fgrep`, `rg`, and `git grep` exit `1` classify as “no matches” semantic success when the command reaches bash execution.
- `diff` and `git diff` exit `1` classify as “differences found” semantic success.
- `test` and `[` exit `1` classify as “condition was false” semantic success.
- `find` exit `1` classifies as “partial results or inaccessible paths” semantic success.
- Semantic-success results include text like `Command exited with code 1 (...; treated as success).`
- Exit codes other than `1` for these command families still fail normally.
- Non-semantic commands such as `false` with exit `1` still fail normally.
- Compound commands with separators such as `git grep needle; false` and `diff a b && false` are not classified semantically.
- Direct native-tool guard behavior is unchanged: `grep`, `rg`, `find`, and `ls` bash invocations still return the existing blocked-tool error before execution.
- Background bash, timeout, abort, output truncation, and render behavior were not changed.

### Evidence

Commands run:

```bash
npm --prefix packages/coding-agent run test -- test/bash-command-semantics.test.ts test/bash-native-tool-guard.test.ts
```

Result: `2 passed (2)`, `41 passed (41)`.

```bash
npm --prefix packages/coding-agent run build
```

Result: build completed successfully and copied assets.

```bash
npm run check
```

Result: completed successfully; Biome, `tsgo --noEmit`, browser smoke, and web-ui checks all passed.

### Known divergences from Claude Code

- Pi still blocks direct `grep`/`rg`/`find`/`ls` bash invocations in the tool wrapper; Claude Code relies more on Bash command semantics. Pi’s classifier mainly affects allowed commands such as `egrep`, `fgrep`, `diff`, `git grep`, `git diff`, `test`, `[`, and wrapper/script forms that reach execution.
- Pi only applies semantic exit handling to conservative simple commands. It intentionally does not classify compound shell commands where the final exit `1` may come from a different command.
- Pi’s parser is lightweight shell tokenization, not a full shell AST.

### Remaining risks

- Some real `find` failures can also exit `1` on some platforms. This matches the requested Claude-style behavior, but the native guard prevents most direct `find` bash use.
- Complex shell constructs that are semantically safe may still be reported as normal failures because Pi avoids guessing across compound commands.
- If future command blocking expands to `egrep`/`fgrep` or more `find` wrapper forms, keep the semantic classifier tests focused on commands that can still reach execution.

## Slice E: read/MCP image robustness

Status: verified for in-repo read/tool-result paths. MCP `tools/list` pagination was audited as not applicable in this repo: there is no in-tree MCP client or `tools/list` implementation to fix; the only MCP references are docs/settings and provider comments. Any cursor pagination fix belongs in the external MCP adapter package if/when it is vendored here.

### Files changed

- `packages/coding-agent/test/tools.test.ts`
  - strengthened misleading `.png` regression to use HTML content and assert text fallback, not image handling.
  - existing byte-sniffing regression continues to verify real PNG bytes read as an image despite a wrong `.txt` extension.
- `packages/coding-agent/src/core/agent-session.ts`
  - normalizes unsupported `image/*` tool-result blocks before they enter the next model call.
  - saves unsupported image bytes under `.pi/tool-artifacts/<tool-call-id>-<index>.<mime-subtype>` and replaces the inline image with a text reference.
  - preserves supported inline image MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- `packages/coding-agent/test/suite/agent-session-model-extension.test.ts`
  - added an MCP-like extension-tool regression for `image/bmp` output.
- `packages/ai/src/providers/anthropic.ts`
  - added a provider-side safety fallback so direct Anthropic tool-result serialization never emits unsupported image MIME blocks.
- `packages/ai/test/anthropic-tool-serialization-stable.test.ts`
  - added a no-provider-call regression proving unsupported image MIME is downgraded before Anthropic request serialization.
- `packages/coding-agent/docs/tool-parity-slice-handoff.md`
  - recorded Slice E evidence and next recommended slice.

### Verified behavior

- HTML/text saved as `.png` is read as text and does not produce an image block.
- Real PNG bytes saved with a wrong `.txt` extension are detected from bytes and returned as an image.
- Unsupported tool-result images such as `image/bmp` no longer flow into the next model call as inline image blocks.
- Unsupported tool-result images are saved to `.pi/tool-artifacts/` with a clear text reference in the tool result.
- Anthropic serialization has a second defensive fallback: unsupported image MIME blocks become text, not invalid Anthropic image content.
- Supported image tool results are unchanged.
- Read permission/access checks are unchanged; the read tool still calls `access()` before MIME sniffing or file reads.

### Evidence

Commands run:

```bash
npm --prefix packages/coding-agent run test -- test/tools.test.ts test/suite/agent-session-model-extension.test.ts
```

Result: `2 passed (2)`, `95 passed (95)`.

```bash
npm --prefix packages/ai run test -- test/anthropic-tool-serialization-stable.test.ts
```

Result: `1 passed (1)`, `5 passed (5)`.

```bash
npm --prefix packages/coding-agent run build
```

Result: build completed successfully and copied assets.

```bash
npm run check
```

Result: completed successfully; Biome, `tsgo --noEmit`, browser smoke, and web-ui checks all passed.

After `npm run check`, targeted tests were re-run together:

```bash
npm --prefix packages/coding-agent run test -- test/tools.test.ts test/suite/agent-session-model-extension.test.ts && npm --prefix packages/ai run test -- test/anthropic-tool-serialization-stable.test.ts
```

Result: coding-agent `2 passed (2)`, `95 passed (95)`; ai `1 passed (1)`, `5 passed (5)`.

### Known divergences from Claude Code

- Pi saves unsupported tool-result images under `.pi/tool-artifacts/`; Claude Code's exact artifact directory/name is not mirrored.
- Pi's provider-side Anthropic fallback cannot save files because `packages/ai` has no cwd/session filesystem context. It only prevents invalid payloads if unsupported images bypass `AgentSession`.
- Pi has no in-repo MCP client or `tools/list` cursor loop. Pagination parity is therefore unverified for external MCP adapters.

### Remaining risks

- External MCP adapter packages may still drop paginated `tools/list` results until their own cursor loops are audited.
- Artifact files are local session artifacts and are not automatically pruned by this slice.
- Unsupported non-image binary tool-result shapes are outside this slice; only `ImageContent` blocks with unsupported `image/*` MIME are normalized.

### Final roadmap status

- Slice A native `Agent`/`Task` parity: verified.
- Slice B richer grep output modes/tool-search compatibility: verified.
- Slice C exact edit semantics: verified.
- Slice D shell command exit semantics: verified.
- Slice E read/MCP image robustness: verified for in-repo paths; external MCP pagination remains adapter-owned.

### Recommended future work

Next useful parity slice: **skill reload hygiene** from `packages/coding-agent/docs/claude-code-2.1.144-tool-opportunities.md`.

Prompt:

```text
Working directory:
- /Users/luke/Projects/personal/pi-mono-fork

Implement and verify the next parity slice from packages/coding-agent/docs/claude-code-2.1.144-tool-opportunities.md: skill reload hygiene.

Start from:
- packages/coding-agent/docs/tool-parity-slice-handoff.md
- packages/coding-agent/docs/claude-code-2.1.144-tool-opportunities.md

Goals:
- Audit skill/resource/theme watcher reload paths.
- Ensure non-.md files under skill directories do not trigger skill reload storms.
- Add targeted regressions for generated files, package installs, images, and build artifacts under skill dirs.
- Keep markdown skill edits/reloads working.
- Keep changes surgical; do not refactor unrelated extension/resource loading.

Run targeted watcher/resource tests, `npm --prefix packages/coding-agent run build`, and `npm run check`, then update the handoff with evidence and remaining risks.
```


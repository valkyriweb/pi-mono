# Claude Code 2.1.145 read truncation handoff

Date: 2026-05-20

> Temporary handoff note. Delete the AGENTS.md pointer after this has been seen and converted into tracked work.

## Source evidence

Release diff archive: `~/Projects/oss/claude-code-cli-src-code`

- `diffs/2.1.144..2.1.145/summary.md` — 4 package files changed.
- `diffs/2.1.144..2.1.145/package.patch` — public wrapper/type changes.
- Native package check: `@anthropic-ai/claude-code-darwin-arm64` binary changed from `207919008` to `208546464` bytes.
- `strings` on the 2.1.145 binary shows `truncatedByTokenCap` in the `FileReadTool` path.

## Reverse-engineered change

Claude Code 2.1.145 adds a structured signal to text `Read` results:

```ts
truncatedByTokenCap?: boolean
```

Behavior inferred from the 2.1.145 native binary:

- A whole-file read can exceed the tool/model token cap.
- Claude catches that token-cap failure and returns a first page instead of failing the read.
- The output is marked with `file.truncatedByTokenCap === true`.
- Internal attachment / `@file` consumers can branch on this flag instead of parsing a rendered warning string.

The package patch also adds Android/FreeBSD platform keys, but no matching optional native packages ship yet. The practical value is safer “native binary unavailable” messaging, not platform support.

## Pi implication

Pi already truncates `read` output in `packages/coding-agent/src/core/tools/read.ts` and exposes UI-only `details.truncation`, but the model-facing result is still primarily prose:

- `[Showing lines ... Use offset=...]`
- `[Line ... exceeds ...]`

Claude's improvement is not the prose. It is the durable structured partial-read signal.

## Recommended pi-mono-fork work

1. Extend `ReadToolDetails` with stable partial-read metadata, for example:

```ts
partial?: {
  reason: "line_limit" | "byte_limit" | "first_line_byte_limit";
  startLine: number;
  endLine: number;
  totalLines: number;
  nextOffset?: number;
}
```

2. Populate it in `packages/coding-agent/src/core/tools/read.ts` whenever `truncateHead()` cuts content or a first line exceeds the byte cap.
3. Keep the current model-facing continuation text for compatibility.
4. Add tests for:
   - line-limit truncation sets `partial.reason === "line_limit"`;
   - byte-limit truncation sets `partial.reason === "byte_limit"`;
   - first-line byte overflow sets `partial.reason === "first_line_byte_limit"`;
   - user-specified `limit` that stops before EOF exposes `nextOffset` if we decide to classify that as partial.

## Higher-value adjacent work

Apply the same structured partial-read concept to `packages/coding-agent/src/core/context-file-imports.ts`:

- cap imported file size;
- mark imported `ContextFile` entries as truncated/partial;
- emit diagnostics with exact path and truncation reason;
- render a visible warning in the project-context block;
- add regression tests in `packages/coding-agent/test/context-file-imports.test.ts`.

This protects prompt-cache stability and prevents one oversized `@import` from silently bloating session startup.

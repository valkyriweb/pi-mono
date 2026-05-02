# Worker Implementation Report — Native `agent` Tool MVP

## Summary

Implemented the native built-in `agent` tool MVP skeleton and integration:

- Added built-in agent definitions: `general-purpose`, `worker`, `explore`, `plan`, `scout`, `reviewer`, `statusline-setup`.
- Added Markdown user/project agent loading and precedence registry.
- Added context policies for `default`, `fork`, `slim`, and `none`, including fork filtering for native `agent` and legacy `subagent` artifacts.
- Added in-process child `AgentSession` execution via `createAgentSessionFromServices()` and isolated in-memory child `SessionManager`s.
- Added single, parallel, and sequential chain execution, including `{previous}` substitution.
- Added parent-bounded child tool calculation and recursive `agent` denial.
- Added model/thinking precedence helpers.
- Added parent-owned output file writing for `output`/`outputMode`.
- Added native `agent` tool schema/rendering and wired it into built-in tools/default active tools.
- Protected built-in `agent` from extension tool override.
- Added `/agents` slash metadata, selector component, and interactive handler.
- Updated README/docs/changelog and added a legacy/migration banner to the official `subagent` example README.

## Commits made

None.

Commit attempts are blocked by the repository pre-commit hook, which runs `npm run check`. That check fails in pre-existing sandbox example type errors unrelated to this implementation:

- `packages/coding-agent/examples/extensions/sandbox/index.ts`: missing `@anthropic-ai/sandbox-runtime` module/type resolution.
- Same sandbox file: `network` and `filesystem` fields not present on `SandboxRuntimeConfig`.

I did not bypass hooks (`--no-verify` is forbidden) and did not change the sandbox example because it is outside the MVP file list and appears unrelated to this task.

## Files created

- `packages/coding-agent/src/core/agents/types.ts`
- `packages/coding-agent/src/core/agents/definitions.ts`
- `packages/coding-agent/src/core/agents/registry.ts`
- `packages/coding-agent/src/core/agents/loader.ts`
- `packages/coding-agent/src/core/agents/context.ts`
- `packages/coding-agent/src/core/agents/executor.ts`
- `packages/coding-agent/src/core/agents/output.ts`
- `packages/coding-agent/src/core/tools/agent.ts`
- `packages/coding-agent/src/modes/interactive/components/agents-selector.ts`
- `packages/coding-agent/test/agent-definitions.test.ts`
- `packages/coding-agent/test/agent-loader.test.ts`
- `packages/coding-agent/test/agent-context-inheritance.test.ts`
- `packages/coding-agent/test/agent-tool.test.ts`
- `packages/coding-agent/test/agent-permissions.test.ts`
- `packages/coding-agent/test/agent-model-selection.test.ts`
- `packages/coding-agent/test/interactive-mode-agents-command.test.ts`
- `handoff/worker-implementation-report.md`

## Files edited

- `packages/coding-agent/src/core/tools/index.ts`
- `packages/coding-agent/src/core/sdk.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/slash-commands.ts`
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/src/modes/interactive/components/index.ts`
- `packages/coding-agent/test/tool-execution-component.test.ts`
- `packages/coding-agent/README.md`
- `packages/coding-agent/docs/usage.md`
- `packages/coding-agent/docs/extensions.md`
- `packages/coding-agent/docs/skills.md`
- `packages/coding-agent/docs/tui.md`
- `packages/coding-agent/examples/extensions/subagent/README.md`
- `packages/coding-agent/CHANGELOG.md`

## Validation

Passed:

```bash
cd packages/coding-agent && npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-definitions.test.ts test/agent-loader.test.ts test/agent-context-inheritance.test.ts
```

Result: 3 files passed, 9 tests passed.

Blocked/failed:

```bash
cd packages/coding-agent && npm run check
```

Result: failed because `packages/coding-agent` has no `check` script.

```bash
npm run check
```

Result: `biome check --write --error-on-warnings .` passed, then `tsgo --noEmit` failed on pre-existing sandbox example type errors in `packages/coding-agent/examples/extensions/sandbox/index.ts`.

```bash
cd packages/coding-agent && npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-tool.test.ts test/agent-permissions.test.ts test/agent-model-selection.test.ts test/tool-execution-component.test.ts test/interactive-mode-agents-command.test.ts
```

Result: failed before test execution because `@mariozechner/pi-tui` resolves to an unbuilt workspace package with no `dist` entry. Running `npm run build` is forbidden by task rules, so I did not build `packages/tui`.

Targeted type check for changed implementation/test paths:

```bash
./node_modules/.bin/tsgo --noEmit 2>&1 | grep -E 'packages/coding-agent/(src/(core/agents|core/tools/agent|core/tools/index|core/agent-session|core/sdk|modes/interactive/components/agents-selector|modes/interactive/interactive-mode)|test/(agent|interactive-mode-agents|tool-execution-component))'
```

Result: no matching errors. The command exits non-zero only because full `tsgo --noEmit` still fails on the sandbox example errors above.

## Deferred or blocked

- Commits blocked by pre-existing pre-commit/typecheck failures in the sandbox extension example.
- Full validation blocked by missing package-local `check` script and unbuilt `@mariozechner/pi-tui` workspace package. Building is explicitly forbidden.
- No suite harness tests were added because the non-suite targeted tests could not fully run in this unbuilt workspace state.

## Spec deviations / notes

- `packages/coding-agent/src/core/agent-session-services.ts` did not need code changes; its existing `resourceLoaderOptions` and `createAgentSessionFromServices()` APIs were sufficient.
- `packages/coding-agent/src/core/resource-loader.ts` did not need changes; existing `noContextFiles`, `noSkills`, and `appendSystemPromptOverride` hooks were sufficient.
- `docs/sdk.md` was not changed because no public SDK factory/type was intentionally added.
- The agent renderer uses text rendering for expanded child output rather than Markdown rendering, to keep the native renderer minimal and avoid extra constructor requirements. The content remains markdown text in the tool result.

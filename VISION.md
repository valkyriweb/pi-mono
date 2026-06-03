# VISION.md — valkyriweb/pi-mono

## Purpose

A personal, daily-driver fork of [`earendil-works/pi-mono`](https://github.com/earendil-works/pi-mono)
(the Pi coding agent). The fork exists to ship a small set of capabilities Pi
does not have upstream yet — a hooks/filters extension layer, prompt-cache
splitting, an agent/sub-agent subsystem, and Claude-Code-parity tool surfaces —
while staying close enough to upstream that it keeps rebasing cleanly.

The fork is **not** a hard divergence. Its job is to keep every commit
classifiable and the rebase surface shrinkable, so each fork-owned primitive can
eventually be upstreamed (and deleted from the fork).

## Who this serves

- The maintainer (@valkyriweb) as the primary operator running `pi` day to day.
- The sibling `my-pi` extension stack, which depends on the fork's platform
  seams (hooks, filters, cache boundary, `forkAgent`, `maxTurns`).
- Agents running on `pi` that rely on stable tool schemas and a cache-stable
  system prompt.

## What good looks like

- Every fork commit is classifiable as **upstream-native**, **platform delta**
  (generic, upstreamable), or **behavior delta** (forbidden as an inline core
  patch — must live in a `my-pi` extension).
- The fork rebases onto `upstream/main` with a shrinking, well-understood
  conflict set; the weekly `upstream-sync` workflow stays green or produces a
  clear conflict PR.
- The system-prompt prefix and `tools[]` array stay byte-stable within a
  session (prompt-cache is never burst by a fork change).
- `npm run check`, `test:build-gate`, and the my-pi extension gate are green
  before any release.

## Product / system principles

- **No behavior delta in core.** Opinions about what Pi *does* (prompts, tool
  logic, routing) live in `my-pi` extensions and ride the hooks/filters layer,
  never inline in `packages/coding-agent`.
- **Platform primitives are written to be upstream-PR-able.** Each one that
  lands upstream shrinks the fork's rebase surface.
- **Cache stability is sacred.** Never add/remove/reorder skills or `tools[]`
  mid-session; deliver mid-task changes as trailing user blocks.
- **Erasable TypeScript only** in checked sources (Node strip-only mode): no
  enums, namespaces, parameter properties, or `import =`.
- **Fork-owned artifacts are intentional.** Upstream-provenance files and the
  upstream remote are kept on purpose; don't "clean them up."

## Current priorities

- Shrink the rebase surface: upstream the generic platform primitives; replace
  any remaining inline core patches with extension seams + hooks.
- Keep the prompt-cache contract enforced by `test:build-gate`.
- Keep CI honest and fast: fork-safety-check, workflow sanity, changelog guard.

## Non-goals

- Becoming a permanently divergent hard fork with bespoke behavior baked into
  core.
- Inline behavior patches in `packages/coding-agent` when an extension seam
  exists or can be added.
- Re-implementing features that belong in `my-pi` extensions inside this repo.
- Publishing under or impersonating the upstream `@earendil-works/*` scope.

## Release and operations posture

- **Versioning:** lockstep across the four publishable `@valkyriweb/pi-*`
  packages — one shared version, bumped together. `patch` = fixes + additions,
  `minor` = breaking; no major releases.
- **Release gate:** local `npm run check` + `test:build-gate`, then a tag-driven
  CI release (`build-binaries.yml`) that publishes to npm via GitHub Actions
  OIDC trusted publishing. Full runbook: [`docs/RELEASING.md`](docs/RELEASING.md).
- **Smoke evidence:** Node and Bun startup, `--version`/`--list-models`,
  interactive boot, and a real prompt against the default provider
  (`npm run release:local`).
- **Rollback posture:** the publish helper is idempotent and skips versions
  already on npm; re-run the tag workflow rather than re-running the release
  script for the same version.

## Agent guidance

- May do without asking: behavior-preserving refactors of fork-owned code, docs,
  tests, CI hygiene, and changelog updates — committing only files changed in
  this session via explicit paths.
- Requires approval: new runtime dependencies, core behavior changes, releases,
  force-pushes, and anything that mutates the GitHub repo or upstream.
- Direction and runbooks: this file, root `AGENTS.md`, `CONTRIBUTING.md`,
  `docs/RELEASING.md`, and the sibling `my-pi/docs/` (fork-patch inventory,
  cache strategy, platform program).

## Open questions

- TBD: which platform primitives are ready to PR upstream next (owner:
  @valkyriweb) — tracked in `my-pi/docs/pi-fork-patch-inventory.md`.

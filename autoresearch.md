# Autoresearch: OpenAI Codex cache hit rate in Pi

## Objective
Improve prompt-cache hit rate for Pi coding-agent sessions using the `openai-codex` provider, with emphasis on the low first-request / cross-session hit rate observed across local Pi sessions.

## Baseline Diagnosis
Local session logs under `~/.pi/agent/sessions` show two different realities:

- Across all recent OpenAI Codex assistant messages: **95.17% cache-read ratio** (`1,731,801,088 cacheRead / (87,858,680 input + 1,731,801,088 cacheRead)`).
- First OpenAI Codex assistant message per session: **38.11% cache-read ratio** (`2,661,248 cacheRead / (4,322,435 input + 2,661,248 cacheRead)`).
- 267/689 recent sessions had **0% first-message cacheRead**.

The low hit rate is therefore not primarily the in-session tool loop. It is cold-start / cross-session cache affinity.

Current provider code sets `prompt_cache_key: options?.sessionId` in `packages/ai/src/providers/openai-codex-responses.ts`. Pi session IDs are unique per session, so identical boot prefixes from different Pi sessions are routed under different prompt-cache keys. That likely fragments cache affinity and explains low first-message hits while later same-session turns recover via provider prefix cache and websocket continuation.

## Metrics
- **Primary**: `first_request_hit_rate` (unitless 0..1, higher is better) — live two-session probe cacheRead ratio on the second cold session's first request.
- **Secondary**:
  - `overall_hit_rate` — total cacheRead ratio across both probe requests.
  - `second_cache_read` — raw cacheRead tokens on second request.
  - `second_input` — raw uncached input tokens on second request.
  - `requests` — expected 2.
  - `elapsed_seconds` — benchmark wall time.

## How to Run
`./autoresearch.sh`

The script runs two first-request Codex calls with different `sessionId`s and identical long context. It outputs `METRIC` lines parsed by Pi autoresearch.

## Files in Scope
- `packages/ai/src/providers/openai-codex-responses.ts` — Codex Responses request construction, prompt cache key, websocket cached transport.
- `packages/ai/test/codex-cache-affinity-probe.ts` — live diagnostic benchmark for cross-session cache affinity.
- `autoresearch.md`, `autoresearch.sh`, `autoresearch.ideas.md` — experiment instructions/state.

## Off Limits
- Do not edit generated model files directly.
- Do not change auth storage, OAuth flows, or unrelated providers.
- Do not run full repo build/test commands forbidden by `AGENTS.md`.

## Constraints
- Keep changes minimal and provider-local.
- No new dependencies.
- Live probes use real OpenAI Codex tokens; keep them bounded.
- After code changes, run focused TypeScript/test checks where practical, not full `npm test`.

## What's Been Tried
- Baseline log review found aggregate recent cache hit ratio is high (95.17%) but first request per session is low (38.11%), pointing at cross-session cache affinity rather than in-session context growth.
- Source inspection found `prompt_cache_key` is tied to unique `sessionId`; hypothesis is to replace it with a stable affinity key for the reusable prompt prefix while leaving websocket continuation keyed by session.

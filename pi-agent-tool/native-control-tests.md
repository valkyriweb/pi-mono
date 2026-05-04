# Native Control Test Audit

Purpose: document the source/unit-test evidence for native S05 background-run control alongside the paid start/status, interrupt/resume, and cancel probes. The live `/agents-status` capture proves the command surface advertises control; these source/test checks prove the tool schema, executor wiring, status implementation, and unit tests cover status/interrupt/cancel/resume while paid probes cover the runtime control paths narrowly.

## Checks

| Check | Value | Meaning |
|---|---:|---|
| tool schema background/control | 1 | `agent.ts` exposes `background`, control `action`, `runId`, and `status/detail/interrupt/cancel/resume`. |
| executor background wiring | 1 | `executor.ts` starts recent runs as background, attaches controllers, returns a run id, and supports single-run resume. |
| status control implementation | 1 | `status.ts` formats native background control and implements interrupt/cancel/resume state transitions. |
| running status unit test | 1 | `agent-status.test.ts` verifies running background runs in list/detail status output. |
| interrupt/cancel unit test | 1 | `agent-status.test.ts` verifies interrupt and cancel update background status. |
| resume unit test | 1 | `agent-status.test.ts` verifies resume delegates resumable background runs. |
| scorecard unit-test evidence | 1 | Scorecard S05 row names the unit-test audit evidence layer. |
| findings unit-test evidence | 1 | Findings S05 summary names the unit-test audit evidence layer. |
| findings audit reference | 1 | Findings audit section links the native-control test artifact. |
| scorecard caveat preserved | 1 | Scorecard says paid start/status, interrupt/resume, and cancel probes exist. |
| capture caveat preserved | 1 | S05 source-backed capture keeps the paid start/status, interrupt/resume, and cancel probe boundary. |
| manifest cancel current | 1 | Evidence manifest no longer describes cancel as source/unit-test only after the paid cancel probe. |
| evidence count current | 1 | Interpretation says six evidence sources now that cancel has its own paid probe. |
| rows | 15 | Generated check table rows remain split. |
| verified | 1 | All native control test evidence checks passed. |

## Interpretation

- Native S05 now has six evidence sources: source/schema markers, a cheap live `/agents-status` capture, unit tests for status/interrupt/cancel/resume state handling, one paid live start/status child probe, one paid live interrupt/resume probe, and one paid live cancel probe.
- The paid probes cover background start, run-id hint, status detail, interrupt, resumable state, resume, cancel, output/no-output boundaries, and cost.
- This does not change S09: generic background-run control is not task-record create/list/get/update/delete lifecycle.

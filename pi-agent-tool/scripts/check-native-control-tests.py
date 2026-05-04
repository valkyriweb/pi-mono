#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent


def read(path: Path) -> str:
    return path.read_text(errors="ignore") if path.exists() else ""


def has_all(text: str, markers: list[str]) -> int:
    return int(all(marker in text for marker in markers))


def write_markdown(metrics: dict[str, int]) -> None:
    lines = [
        "# Native Control Test Audit",
        "",
        "Purpose: document the source/unit-test evidence for native S05 background-run control alongside the paid start/status, interrupt/resume, and cancel probes. The live `/agents-status` capture proves the command surface advertises control; these source/test checks prove the tool schema, executor wiring, status implementation, and unit tests cover status/interrupt/cancel/resume while paid probes cover the runtime control paths narrowly.",
        "",
        "## Checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| tool schema background/control | {metrics['native_control_tool_schema_background_present']} | `agent.ts` exposes `background`, control `action`, `runId`, and `status/detail/interrupt/cancel/resume`. |",
        f"| executor background wiring | {metrics['native_control_executor_background_present']} | `executor.ts` starts recent runs as background, attaches controllers, returns a run id, and supports single-run resume. |",
        f"| status control implementation | {metrics['native_control_status_implementation_present']} | `status.ts` formats native background control and implements interrupt/cancel/resume state transitions. |",
        f"| running status unit test | {metrics['native_control_unit_running_status_test']} | `agent-status.test.ts` verifies running background runs in list/detail status output. |",
        f"| interrupt/cancel unit test | {metrics['native_control_unit_interrupt_cancel_test']} | `agent-status.test.ts` verifies interrupt and cancel update background status. |",
        f"| resume unit test | {metrics['native_control_unit_resume_test']} | `agent-status.test.ts` verifies resume delegates resumable background runs. |",
        f"| scorecard unit-test evidence | {metrics['native_control_scorecard_unit_test_evidence']} | Scorecard S05 row names the unit-test audit evidence layer. |",
        f"| findings unit-test evidence | {metrics['native_control_findings_unit_test_evidence']} | Findings S05 summary names the unit-test audit evidence layer. |",
        f"| findings audit reference | {metrics['native_control_findings_audit_reference']} | Findings audit section links the native-control test artifact. |",
        f"| scorecard caveat preserved | {metrics['native_control_scorecard_paid_caveat']} | Scorecard says paid start/status, interrupt/resume, and cancel probes exist. |",
        f"| capture caveat preserved | {metrics['native_control_capture_paid_caveat']} | S05 source-backed capture keeps the paid start/status, interrupt/resume, and cancel probe boundary. |",
        f"| manifest cancel current | {metrics['native_control_manifest_cancel_current']} | Evidence manifest no longer describes cancel as source/unit-test only after the paid cancel probe. |",
        f"| evidence count current | {metrics['native_control_evidence_count_current']} | Interpretation says six evidence sources now that cancel has its own paid probe. |",
        f"| rows | {metrics['native_control_test_rows']} | Generated check table rows remain split. |",
        f"| verified | {metrics['native_control_tests_verified']} | All native control test evidence checks passed. |",
        "",
        "## Interpretation",
        "",
        "- Native S05 now has six evidence sources: source/schema markers, a cheap live `/agents-status` capture, unit tests for status/interrupt/cancel/resume state handling, one paid live start/status child probe, one paid live interrupt/resume probe, and one paid live cancel probe.",
        "- The paid probes cover background start, run-id hint, status detail, interrupt, resumable state, resume, cancel, output/no-output boundaries, and cost.",
        "- This does not change S09: generic background-run control is not task-record create/list/get/update/delete lifecycle.",
        "",
    ]
    (ROOT / "native-control-tests.md").write_text("\n".join(lines))


def main() -> int:
    agent_tool = read(REPO / "packages/coding-agent/src/core/tools/agent.ts")
    executor = read(REPO / "packages/coding-agent/src/core/agents/executor.ts")
    status = read(REPO / "packages/coding-agent/src/core/agents/status.ts")
    tests = read(REPO / "packages/coding-agent/test/agent-status.test.ts")
    scorecard = read(ROOT / "scorecard.md")
    findings = read(ROOT / "findings.md")
    capture = read(ROOT / "captures/native-s05-async-status-control.txt")
    manifest = read(ROOT / "evidence-manifest.md")

    metrics = {
        "native_control_tool_schema_background_present": has_all(
            agent_tool,
            [
                "const controlActionSchema",
                'Type.Literal("status")',
                'Type.Literal("detail")',
                'Type.Literal("interrupt")',
                'Type.Literal("cancel")',
                'Type.Literal("resume")',
                "runId",
                "Run in the background and return immediately with a run id",
            ],
        ),
        "native_control_executor_background_present": has_all(
            executor,
            [
                "background?: boolean",
                "startAgentRecentRun(input.mode, input.tasks, { background: input.background })",
                "attachAgentRecentRunController",
                "Background agent run ${recentRun.id} started",
                "resumeSingleBackgroundRun",
            ],
        ),
        "native_control_status_implementation_present": has_all(
            status,
            [
                "Background control: native background runs support status, interrupt, cancel, and single-run resume.",
                "interruptAgentRecentRun",
                "cancelAgentRecentRun",
                "resumeAgentRecentRun",
                "Control: /agents interrupt <run-id>, /agents cancel <run-id>, /agents resume <run-id> [-- prompt]",
            ],
        ),
        "native_control_unit_running_status_test": has_all(
            tests,
            [
                'test("shows running background runs in status and detail views"',
                "agent-1 single background running",
                "Control: /agents interrupt <run-id>",
                "session: /tmp/child-session.jsonl",
            ],
        ),
        "native_control_unit_interrupt_cancel_test": has_all(
            tests,
            [
                'test("interrupt and cancel update background status"',
                "interruptAgentRecentRun(interruptRun.id)",
                "agent-1 single background interrupted resumable",
                "cancelAgentRecentRun(cancelRun.id)",
                "agent-2 single background cancelled",
            ],
        ),
        "native_control_unit_resume_test": has_all(
            tests,
            [
                'test("resume control delegates resumable background runs"',
                "resumeAgentRecentRun(run.id, \"continue\")",
                "expect(resume).toHaveBeenCalledWith(\"continue\")",
            ],
        ),
        "native_control_scorecard_unit_test_evidence": has_all(
            scorecard,
            [
                "source + live status capture + unit-test audit + paid native S05 start/status, interrupt/resume, and cancel probes",
                "no final child output",
            ],
        ),
        "native_control_findings_unit_test_evidence": has_all(
            findings,
            [
                "native-control-tests.md",
                "unit-test coverage for running status, interrupt/cancel, and resume",
                "paid live cancel probe",
            ],
        ),
        "native_control_findings_audit_reference": has_all(
            findings,
            [
                "native-control-tests.md",
                "schema, executor wiring, status implementation, and unit tests",
                "paid start/status, interrupt/resume, and cancel probes", 
            ],
        ),
        "native_control_scorecard_paid_caveat": has_all(
            scorecard,
            [
                "paid live probes cover start/status, interrupt/resume, and cancel",
                "no final child output",
            ],
        ),
        "native_control_capture_paid_caveat": has_all(
            capture,
            [
                "source-backed plus tmux `/agents-status` capture plus unit-test audit plus paid live background start/status, interrupt/resume, and cancel probes",
                "paid cancel probe",
            ],
        ),
        "native_control_manifest_cancel_current": int(
            "paid start/status, interrupt/resume, and cancel probes are narrow S05 background-run checks" in manifest
            and "source/unit-test cancel boundary" not in manifest
            and "cancel remains source/unit-test evidence" not in manifest
        ),
        "native_control_evidence_count_current": int(
            "five evidence layers" not in findings
            and "five evidence layers" not in manifest
        ),
    }
    metrics["native_control_test_rows"] = 15
    metrics["native_control_tests_verified"] = int(
        all(value == 1 for key, value in metrics.items() if key != "native_control_test_rows")
    )

    write_markdown(metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if metrics["native_control_tests_verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

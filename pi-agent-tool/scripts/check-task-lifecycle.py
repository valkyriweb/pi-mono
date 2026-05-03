#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SUBAGENTS = Path.home() / ".pi/agent/git/github.com/nicobailon/pi-subagents"

NATIVE_EXPECTED_LIFECYCLE_FIELDS = [
    "action",
    "taskId",
    "subject",
    "activeForm",
    "metadata",
    "blockedBy",
    "owner",
]
NATIVE_EXPECTED_LIFECYCLE_ACTIONS = ["create", "list", "get", "update", "delete"]
NATIVE_EXPECTED_STATUSES = ["pending", "in_progress", "completed", "deleted"]
NATIVE_DELEGATION_MARKERS = [
    "agent: Type.Optional(Type.String())",
    "task: Type.Optional(Type.String())",
    "tasks: Type.Optional(Type.Array(taskSchema",
    "chain: Type.Optional(Type.Array(taskSchema",
    "agent tool requires exactly one mode",
]
EXTENSION_MANAGEMENT_ACTIONS = ["list", "get", "create", "update", "delete", "doctor", "status", "interrupt", "resume"]


def read(path: Path) -> str:
    return path.read_text(errors="ignore")


def type_literal_present(source: str, literal: str) -> bool:
    escaped = re.escape(literal)
    return bool(re.search(rf'Type\.Literal\("{escaped}"\)|enum:\s*\[[^\]]*"{escaped}"', source))


def word_present(source: str, word: str) -> bool:
    return bool(re.search(rf'\b{re.escape(word)}\b', source))


def native_state() -> dict[str, object]:
    source = read(REPO / "packages/coding-agent/src/core/tools/agent.ts")
    lifecycle_field_hits = {field: word_present(source, field) for field in NATIVE_EXPECTED_LIFECYCLE_FIELDS}
    lifecycle_action_hits = {action: type_literal_present(source, action) for action in NATIVE_EXPECTED_LIFECYCLE_ACTIONS}
    lifecycle_status_hits = {status: type_literal_present(source, status) for status in NATIVE_EXPECTED_STATUSES}
    delegation_markers = {marker: marker in source for marker in NATIVE_DELEGATION_MARKERS}
    lifecycle_fields_present = sum(lifecycle_field_hits.values())
    lifecycle_actions_present = sum(lifecycle_action_hits.values())
    lifecycle_statuses_present = sum(lifecycle_status_hits.values())
    delegation_modes_preserved = int(all(delegation_markers.values()))
    lifecycle_absent = int(lifecycle_fields_present == 0 and lifecycle_actions_present == 0 and lifecycle_statuses_present == 0)
    return {
        "source": source,
        "field_hits": lifecycle_field_hits,
        "action_hits": lifecycle_action_hits,
        "status_hits": lifecycle_status_hits,
        "delegation_markers": delegation_markers,
        "fields_present": lifecycle_fields_present,
        "actions_present": lifecycle_actions_present,
        "statuses_present": lifecycle_statuses_present,
        "delegation_modes_preserved": delegation_modes_preserved,
        "lifecycle_absent": lifecycle_absent,
    }


def extension_state() -> dict[str, object]:
    schema = read(SUBAGENTS / "src/extension/schemas.ts")
    management = read(SUBAGENTS / "src/agents/agent-management.ts")
    index = read(SUBAGENTS / "src/extension/index.ts")
    combined = schema + "\n" + management + "\n" + index
    action_hits = {action: word_present(combined, action) for action in EXTENSION_MANAGEMENT_ACTIONS}
    management_actions_present = sum(action_hits.values())
    has_agent_chain_management = all(word_present(combined, token) for token in ["agent", "chainName", "config"])
    has_async_control = all(word_present(schema, token) for token in ["status", "interrupt", "resume", "async"])
    has_general_task_records = any(word_present(combined, token) for token in ["taskId", "activeForm", "blockedBy"])
    equivalent_absent = int(management_actions_present >= 7 and has_agent_chain_management and has_async_control and not has_general_task_records)
    return {
        "action_hits": action_hits,
        "management_actions_present": management_actions_present,
        "has_agent_chain_management": int(has_agent_chain_management),
        "has_async_control": int(has_async_control),
        "has_general_task_records": int(has_general_task_records),
        "equivalent_absent": equivalent_absent,
    }


def write_markdown(path: Path, native: dict[str, object], extension: dict[str, object]) -> None:
    field_hits: dict[str, bool] = native["field_hits"]  # type: ignore[assignment]
    action_hits: dict[str, bool] = native["action_hits"]  # type: ignore[assignment]
    status_hits: dict[str, bool] = native["status_hits"]  # type: ignore[assignment]
    delegation_markers: dict[str, bool] = native["delegation_markers"]  # type: ignore[assignment]
    extension_actions: dict[str, bool] = extension["action_hits"]  # type: ignore[assignment]

    lines = [
        "# Task Lifecycle Audit",
        "",
        "Purpose: make S09 reproducible. The requested updated native task-agent tool requires non-spawn task lifecycle actions (`create`, `list`, `get`, `update`, delete semantics) with task record fields (`taskId`, `subject`, `activeForm`, dependencies/owner/metadata). Current source is audited as absent/pending rather than assumed.",
        "",
        "## Native task lifecycle acceptance probe",
        "",
        "| Required native lifecycle surface | Present in `packages/coding-agent/src/core/tools/agent.ts` |",
        "|---|---:|",
    ]
    for field in NATIVE_EXPECTED_LIFECYCLE_FIELDS:
        lines.append(f"| field `{field}` | {str(field_hits[field]).lower()} |")
    for action in NATIVE_EXPECTED_LIFECYCLE_ACTIONS:
        lines.append(f"| action `{action}` | {str(action_hits[action]).lower()} |")
    for status in NATIVE_EXPECTED_STATUSES:
        lines.append(f"| status `{status}` | {str(status_hits[status]).lower()} |")
    lines.extend(
        [
            "",
            "Native verdict: `absent/pending`.",
            "",
            f"- Lifecycle fields present: {native['fields_present']}.",
            f"- Lifecycle actions present: {native['actions_present']}.",
            f"- Lifecycle statuses present: {native['statuses_present']}.",
            f"- Existing delegation modes preserved: {native['delegation_modes_preserved']}.",
            "",
            "## Native delegation compatibility guard",
            "",
            "| Existing native delegation marker | Present |",
            "|---|---:|",
        ]
    )
    for marker, present in delegation_markers.items():
        lines.append(f"| `{marker}` | {str(present).lower()} |")
    lines.extend(
        [
            "",
            "## `pi-subagents` closest-equivalent audit",
            "",
            "`pi-subagents` has agent/chain management and async run control, but the audit treats those as non-equivalent unless general task records (`taskId`, `activeForm`, dependencies) exist.",
            "",
            "| Extension management/control marker | Present |",
            "|---|---:|",
        ]
    )
    for action in EXTENSION_MANAGEMENT_ACTIONS:
        lines.append(f"| action/control `{action}` | {str(extension_actions[action]).lower()} |")
    lines.extend(
        [
            f"| agent/chain management fields | {str(bool(extension['has_agent_chain_management'])).lower()} |",
            f"| async status/control fields | {str(bool(extension['has_async_control'])).lower()} |",
            f"| general task-record fields (`taskId`/`activeForm`/`blockedBy`) | {str(bool(extension['has_general_task_records'])).lower()} |",
            "",
            "Extension verdict: `closest equivalent only, not a general task-list lifecycle API`.",
            "",
            "## Audit summary",
            "",
            f"- Native task lifecycle absent: {native['lifecycle_absent']}.",
            f"- Native delegation modes preserved: {native['delegation_modes_preserved']}.",
            f"- Extension management/control actions present: {extension['management_actions_present']}.",
            f"- Extension general task equivalent absent: {extension['equivalent_absent']}.",
            "- If the native lifecycle fields land, this audit should fail and S09 must be rescored instead of preserving the pending verdict.",
            "",
        ]
    )
    path.write_text("\n".join(lines))


def main() -> int:
    native = native_state()
    extension = extension_state()
    write_markdown(ROOT / "task-lifecycle-audit.md", native, extension)
    acceptance_rows = len(NATIVE_EXPECTED_LIFECYCLE_FIELDS) + len(NATIVE_EXPECTED_LIFECYCLE_ACTIONS) + len(NATIVE_EXPECTED_STATUSES)
    extension_rows = len(EXTENSION_MANAGEMENT_ACTIONS) + 3
    audit_verified = int(
        native["lifecycle_absent"] == 1
        and native["delegation_modes_preserved"] == 1
        and extension["equivalent_absent"] == 1
        and extension["management_actions_present"] >= 7
    )
    print(f"task_lifecycle_acceptance_rows={acceptance_rows}")
    print(f"task_lifecycle_native_fields_present={native['fields_present']}")
    print(f"task_lifecycle_native_actions_present={native['actions_present']}")
    print(f"task_lifecycle_native_statuses_present={native['statuses_present']}")
    print(f"task_lifecycle_native_absent={native['lifecycle_absent']}")
    print(f"task_lifecycle_delegation_preserved={native['delegation_modes_preserved']}")
    print(f"task_lifecycle_extension_rows={extension_rows}")
    print(f"task_lifecycle_extension_management_actions={extension['management_actions_present']}")
    print(f"task_lifecycle_extension_equivalent_absent={extension['equivalent_absent']}")
    print(f"task_lifecycle_audit_verified={audit_verified}")
    return 0 if audit_verified else 1


if __name__ == "__main__":
    raise SystemExit(main())

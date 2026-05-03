# Task Lifecycle Audit

Purpose: make S09 reproducible. The requested updated native task-agent tool requires non-spawn task lifecycle actions (`create`, `list`, `get`, `update`, delete semantics) with task record fields (`taskId`, `subject`, `activeForm`, dependencies/owner/metadata). Current source is audited as absent/pending rather than assumed.

## Native task lifecycle acceptance probe

| Required native lifecycle surface | Present in `packages/coding-agent/src/core/tools/agent.ts` |
|---|---:|
| field `action` | false |
| field `taskId` | false |
| field `subject` | false |
| field `activeForm` | false |
| field `metadata` | false |
| field `blockedBy` | false |
| field `owner` | false |
| action `create` | false |
| action `list` | false |
| action `get` | false |
| action `update` | false |
| action `delete` | false |
| status `pending` | false |
| status `in_progress` | false |
| status `completed` | false |
| status `deleted` | false |

Native verdict: `absent/pending`.

- Lifecycle fields present: 0.
- Lifecycle actions present: 0.
- Lifecycle statuses present: 0.
- Existing delegation modes preserved: 1.

## Native delegation compatibility guard

| Existing native delegation marker | Present |
|---|---:|
| `agent: Type.Optional(Type.String())` | true |
| `task: Type.Optional(Type.String())` | true |
| `tasks: Type.Optional(Type.Array(taskSchema` | true |
| `chain: Type.Optional(Type.Array(taskSchema` | true |
| `agent tool requires exactly one mode` | true |

## `pi-subagents` closest-equivalent audit

`pi-subagents` has agent/chain management and async run control, but the audit treats those as non-equivalent unless general task records (`taskId`, `activeForm`, dependencies) exist.

| Extension management/control marker | Present |
|---|---:|
| action/control `list` | true |
| action/control `get` | true |
| action/control `create` | true |
| action/control `update` | true |
| action/control `delete` | true |
| action/control `doctor` | true |
| action/control `status` | true |
| action/control `interrupt` | true |
| action/control `resume` | true |
| agent/chain management fields | true |
| async status/control fields | true |
| general task-record fields (`taskId`/`activeForm`/`blockedBy`) | false |

Extension verdict: `closest equivalent only, not a general task-list lifecycle API`.

## Audit summary

- Native task lifecycle absent: 1.
- Native delegation modes preserved: 1.
- Extension management/control actions present: 9.
- Extension general task equivalent absent: 1.
- If the native lifecycle fields land, this audit should fail and S09 must be rescored instead of preserving the pending verdict.

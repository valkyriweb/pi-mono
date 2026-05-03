# Scorecard

Filled baseline for current local checkout and installed extension. Token fields are `n/a` because the baseline avoids paid child-agent runs; exact token/cache accounting requires live model logs.

| Scenario | Arm | Correctness 1-5 | Coverage 1-5 | UX 1-5 | Robustness 1-5 | Flexibility 1-5 | Evidence 1-5 | Prompt tokens | Completion tokens | Total tokens | Context notes | Latency | Reliability notes | `value_per_1k_tokens` | Evidence file |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|
| S01 single recon | native | 5 | 5 | 4 | 5 | 5 | 5 | ~13k | ~159 | ~13.2k | Live native `/agents run scout` used the native `agent` tool, read `pi-agent-tool/README.md`, and returned exactly three artifact filenames. | ~6.9s child | live child completed; 1 read tool; 1958 child tokens; parent footer ~$0.076 | high | captures/native-s01-live-child-output.txt |
| S01 single recon | pi-subagents | 1 | 1 | 1 | 1 | 1 | 5 | n/a | n/a | n/a | Current fresh extension launch failed before `/run scout`; source still declares `/run`, but runtime command surface was unavailable. | startup failure | live capture shows extension load error, then shell-level `zsh: no such file or directory: /run` | low | captures/subagents-s01-live-child-output.txt |
| S02 parallel review | native | 5 | 5 | 4 | 5 | 5 | 4 | n/a | n/a | n/a | Native `tasks[]`, bounded concurrency, child session refs. | n/a | source-backed, no live child | high | captures/native-s02-parallel-review.txt |
| S02 parallel review | pi-subagents | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | `/parallel`, `tasks[]`, `--bg`, `--fork`. | n/a | source-backed, no live child | high | captures/subagents-s02-parallel-review.txt |
| S03 chain handoff | native | 5 | 5 | 4 | 5 | 5 | 4 | n/a | n/a | n/a | Native `chain[]` plus saved-chain scaffold. | n/a | source-backed, no live child | high | captures/native-s03-chain-handoff.txt |
| S03 chain handoff | pi-subagents | 4 | 5 | 4 | 4 | 5 | 4 | n/a | n/a | n/a | `/chain` and `/run-chain` remain available. | n/a | source-backed, no live child | high | captures/subagents-s03-chain-handoff.txt |
| S04 saved workflow | native | 4 | 5 | 4 | 4 | 4 | 5 | n/a | n/a | n/a | Saved JSON chains under native chain dirs and `/agents run-chain`. | n/a | source-backed | high | captures/native-s04-saved-workflow.txt |
| S04 saved workflow | pi-subagents | 3 | 4 | 3 | 4 | 4 | 5 | n/a | n/a | n/a | `/run-chain` exists; 0.24.0 removed clarify save actions and manager overlay. | n/a | source-backed current-version limitation | medium | captures/subagents-s04-saved-workflow.txt |
| S05 async/status/control | native | 3 | 2 | 3 | 4 | 2 | 5 | n/a | n/a | n/a | `/agents-status` lists recent foreground runs; no native background control. | tmux cheap | source + live status capture | medium | captures/native-s05-async-status-control.txt |
| S05 async/status/control | pi-subagents | 4 | 4 | 3 | 3 | 5 | 5 | ~11k | ~106 | ~11.1k | Tool supports async/status/interrupt/resume; `/subagents-status` slash overlay removed and falls through to model/tool usage. | tmux + one model fallback | source + removed-command fallthrough capture | medium | captures/subagents-s05-async-status-control.txt |
| S06 doctor diagnostics | native | 5 | 5 | 4 | 5 | 4 | 5 | n/a | n/a | n/a | `/agents-doctor` reports runtime, tools, agents, chains, models. | tmux cheap | source + live doctor capture | high | captures/native-s06-doctor-diagnostics.txt |
| S06 doctor diagnostics | pi-subagents | 4 | 5 | 4 | 4 | 4 | 5 | n/a | n/a | n/a | `/subagents-doctor` and `subagent({action:"doctor"})`. | tmux cheap | source + live doctor capture | high | captures/subagents-s06-doctor-diagnostics.txt |
| S07 UI manager/selector | native | 4 | 4 | 4 | 4 | 3 | 4 | n/a | n/a | n/a | `/agents` selector inserts prompt scaffold; not a full manager. | tmux cheap | live selector capture | medium | captures/native-s07-ui-manager-selector.txt |
| S07 UI manager/selector | pi-subagents | 1 | 1 | 1 | 2 | 2 | 5 | ~11k | ~81 | ~11.1k | Requested `/subagents` manager is unavailable; removed slash falls through to model/tool usage. | tmux + one model fallback | source + removed-command fallthrough capture | low | captures/subagents-s07-ui-manager-selector.txt |
| S08 context discipline | native | 5 | 5 | 4 | 5 | 5 | 5 | n/a | n/a | n/a | Explicit `default`, `fork`, `slim`, `none`; fork filters `agent`/`subagent` artifacts. | n/a | source-backed strongest controls | high | captures/native-s08-context-discipline.txt |
| S08 context discipline | pi-subagents | 3 | 3 | 4 | 4 | 3 | 4 | n/a | n/a | n/a | `--fork`/`context:"fork"`; no native-equivalent context enum. | n/a | source-backed partial parity | medium | captures/subagents-s08-context-discipline.txt |
| S09 task agent tool | native | 1 | 1 | 2 | 3 | 2 | 5 | n/a | n/a | n/a | Non-spawn task lifecycle action schema absent in current native `agent` tool. | n/a | honest pending/absent implementation | low | captures/native-s09-task-agent-tool.txt |
| S09 task agent tool | pi-subagents | 2 | 2 | 3 | 4 | 3 | 5 | n/a | n/a | n/a | Agent/chain management + async run control, but no general task-list lifecycle equivalent. | n/a | source-backed closest equivalent only | medium | captures/subagents-s09-task-agent-tool.txt |

## Averages

| Arm | Avg correctness | Avg coverage | Avg UX | Avg robustness | Avg flexibility | Avg evidence | Overall value/token |
|---|---:|---:|---:|---:|---:|---:|---|
| native | 4.1 | 4.1 | 3.7 | 4.4 | 3.9 | 4.7 | High for core delegation, diagnostics, saved chains, and context control; weak for requested task lifecycle and background control. |
| pi-subagents | 2.9 | 3.3 | 3.0 | 3.3 | 3.6 | 4.7 | Source has async/control and extension workflows, but current fresh extension launch fails under the eval command; 0.24.0 also loses requested `/subagents` manager and `/subagents-status`, and removed commands can fall through into token-spending model turns when the extension loads. |

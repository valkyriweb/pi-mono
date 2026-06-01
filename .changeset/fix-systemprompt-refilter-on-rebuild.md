---
"@valkyriweb/pi-coding-agent": patch
---

fix(core): re-apply `systemPrompt:build` filters after a mid-turn tool/skill rebuild

`_rebuildSystemPrompt` (fired by `setActiveToolsByName` and `resources_discover`) produced an unfiltered system prompt and promoted it to `agent.state.systemPrompt`. When an extension changed the active tool/skill set during `before_agent_start`, the unfiltered prompt shipped — re-introducing volatile content (e.g. the date line) and undoing cache-stabilising boundary relocation, bursting the prompt cache on every real tool/skill change. The send chokepoint now re-applies the `systemPrompt:build` filters (via the new `ExtensionRunner.applySystemPromptBuildFilters`) whenever a rebuild occurred.

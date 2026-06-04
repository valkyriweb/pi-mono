---
"@valkyriweb/pi-coding-agent": patch
"@valkyriweb/pi-ai": patch
"@valkyriweb/pi-agent-core": patch
"@valkyriweb/pi-tui": patch
---

Rollup of the 31 commits since 0.78.2 (PRs #45–#50): mirror Claude Code tool-use efficiency in prompt guidance; footer streaming work-bar with elapsed timer and esc-to-interrupt hint; codex `prompt_cache_key` derived from stable prefix shape (`cacheAffinityKey` now forwarded through `buildBaseOptions`); reference-equality no-op guard in `setActiveToolsByName`/`setDeferredToolOverrides` so identical tool-set rebuilds no longer burst the cache prefix; footer cache-hit average % panel; repo chrome (PR template, `.pi-ws-*` gitignore, biome config). Patch on purpose: `@valkyriweb/my-pi-full` pins `<0.79.0` — a minor bump would strand every published profile until a coordinated my-pi release.

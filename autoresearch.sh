#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
started=$(date +%s)
output=$(cd packages/ai && npx tsx test/codex-cache-affinity-probe.ts --pairs 1 --padding 240 --transport sse --delay-ms 15000)
printf '%s
' "$output"
ended=$(date +%s)
if ! grep -q '^METRIC elapsed_seconds=' <<<"$output"; then
  echo "METRIC elapsed_seconds=$((ended-started))"
fi

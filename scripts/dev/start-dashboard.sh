#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DASHBOARD="$ROOT/dashboard"
LOCAL_API_PORT="${AGENTGATE_LOCAL_API_PORT:-18644}"
DASHBOARD_PORT="${AGENTGATE_DASHBOARD_PORT:-5175}"

export AGENTGATE_API_TARGET="${AGENTGATE_API_TARGET:-http://127.0.0.1:${LOCAL_API_PORT}}"

cd "$DASHBOARD"
exec npx --yes pnpm@10.34.5 dev --host 127.0.0.1 --port "$DASHBOARD_PORT"

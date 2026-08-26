#!/usr/bin/env bash
set -euo pipefail

SSH_TARGET="${AGENTGATE_SSH_TARGET:-agentgate-dev}"
LOCAL_API_PORT="${AGENTGATE_LOCAL_API_PORT:-18644}"

printf '%s\n' 'Checking SSH...'
ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_TARGET" \
  'test "$(hostname)" = alexeylab && test "$(whoami)" = alexeybe1kin && test -d "$HOME/agentgate"'

printf '%s\n' 'Checking local forwarded API...'
python - "$LOCAL_API_PORT" <<'PY'
import json
import sys
import urllib.request

port = int(sys.argv[1])
url = f"http://127.0.0.1:{port}/health"
with urllib.request.urlopen(url, timeout=5) as response:
    payload = json.load(response)
if payload.get("status") != "ok":
    raise SystemExit(f"unexpected health payload: {payload}")
print(f"API_OK {payload.get('service', 'unknown')}")
PY

printf '%s\n' 'AgentGate development preflight passed.'

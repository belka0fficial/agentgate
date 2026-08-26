#!/usr/bin/env bash
set -euo pipefail

SSH_TARGET="${AGENTGATE_SSH_TARGET:-agentgate-dev}"
LOCAL_API_PORT="${AGENTGATE_LOCAL_API_PORT:-18644}"
REMOTE_API_PORT="${AGENTGATE_REMOTE_API_PORT:-8644}"

exec ssh \
  -N \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -L "127.0.0.1:${LOCAL_API_PORT}:127.0.0.1:${REMOTE_API_PORT}" \
  "$SSH_TARGET"

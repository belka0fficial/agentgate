#!/usr/bin/env python3
"""Small stdio MCP server for the brain runtime to publish AgentGate outputs safely."""
from __future__ import annotations

import json
import os
import sys
from typing import Any
from urllib import error, request

SERVER_NAME = "agentgate"
SERVER_VERSION = "0.1.0"

TOOLS = [
    {
        "name": "agentgate_create_suggestion",
        "description": "Publish a useful suggestion to the owner's AgentGate Suggestions inbox.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"}, "summary": {"type": "string"},
                "category": {"type": "string"}, "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                "urgency": {"type": "string", "enum": ["low", "normal", "high"]},
                "evidence": {"type": "array", "items": {"type": "object"}}, "source_ref": {"type": "string"},
            },
            "required": ["title", "summary"], "additionalProperties": False,
        },
    },
    {
        "name": "agentgate_register_app",
        "description": "Register a personal local or hosted app in AgentGate. This never starts processes or opens ports.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"}, "description": {"type": "string"}, "url": {"type": "string"},
                "health_url": {"type": "string"}, "source_ref": {"type": "string"}, "pinned": {"type": "boolean"},
            },
            "required": ["name", "url"], "additionalProperties": False,
        },
    },
]


def _post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    base = os.environ.get("AGENTGATE_URL", "http://127.0.0.1:8030").rstrip("/")
    key = os.environ.get("AGENTGATE_MCP_KEY", "")
    if not key:
        raise RuntimeError("AGENTGATE_MCP_KEY is not configured")
    body = json.dumps(payload).encode()
    req = request.Request(f"{base}{path}", data=body, method="POST", headers={"Content-Type": "application/json", "X-AgentGate-MCP-Key": key})
    try:
        with request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode())
    except error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:500]
        raise RuntimeError(f"AgentGate rejected the request ({exc.code}): {detail}") from exc


def respond(message_id: Any, result: Any | None = None, error_value: Exception | str | None = None) -> None:
    body = {"jsonrpc": "2.0", "id": message_id}
    if error_value is None:
        body["result"] = result
    else:
        body["error"] = {"code": -32000, "message": str(error_value)}
    print(json.dumps(body), flush=True)


def handle(item: dict[str, Any]) -> None:
    method = item.get("method")
    params = item.get("params", {})
    if method == "initialize":
        respond(item.get("id"), {"protocolVersion": params.get("protocolVersion", "2025-06-18"), "capabilities": {"tools": {}}, "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION}})
    elif method == "tools/list":
        respond(item.get("id"), {"tools": TOOLS})
    elif method == "tools/call":
        name = params.get("name")
        routes = {"agentgate_create_suggestion": "/api/mcp/suggestions", "agentgate_register_app": "/api/mcp/apps"}
        if name not in routes:
            raise RuntimeError(f"Unknown tool: {name}")
        result = _post(routes[name], params.get("arguments", {}))
        respond(item.get("id"), {"content": [{"type": "text", "text": json.dumps(result)}]})
    elif "id" in item:
        respond(item.get("id"), {})


def main() -> int:
    for line in sys.stdin:
        item: dict[str, Any] | None = None
        try:
            item = json.loads(line)
            handle(item)
        except Exception as exc:
            respond(item.get("id") if item else None, error_value=exc)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

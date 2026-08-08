from __future__ import annotations

import base64
import hashlib
import hmac
import time

from fastapi import HTTPException, Request

from .config import Settings

COOKIE_NAME = "agentgate_session"
CSRF_COOKIE_NAME = "agentgate_csrf"


def _signature(value: str, secret: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def issue_session(settings: Settings) -> str:
    payload = f"owner:{int(time.time()) + 60 * 60 * 12}"
    signed = f"{payload}.{_signature(payload, settings.session_secret)}"
    return base64.urlsafe_b64encode(signed.encode()).decode()


def issue_csrf_token(session: str, settings: Settings) -> str:
    """Bind a readable double-submit token to the signed HttpOnly session."""
    return _signature(f"csrf:{session}", settings.session_secret)


def require_auth(request: Request) -> None:
    settings: Settings = request.app.state.settings
    token = request.cookies.get(COOKIE_NAME, "")
    try:
        signed = base64.urlsafe_b64decode(token.encode()).decode()
        payload, signature = signed.rsplit(".", 1)
        owner, expiry = payload.split(":", 1)
    except Exception as exc:
        raise HTTPException(401, "Sign in required") from exc
    if owner != "owner" or not hmac.compare_digest(signature, _signature(payload, settings.session_secret)) or int(expiry) < time.time():
        raise HTTPException(401, "Session expired")


def require_csrf(request: Request) -> None:
    """Reject cross-site writes while allowing the scoped MCP integration separately."""
    settings: Settings = request.app.state.settings
    session = request.cookies.get(COOKIE_NAME, "")
    expected = issue_csrf_token(session, settings)
    supplied = request.headers.get("X-CSRF-Token", "")
    if not session or not hmac.compare_digest(supplied, expected):
        raise HTTPException(403, "Invalid CSRF token")

    origin = request.headers.get("Origin")
    if origin:
        from urllib.parse import urlparse

        parsed = urlparse(origin)
        if parsed.netloc != request.headers.get("host", ""):
            raise HTTPException(403, "Cross-origin request denied")


def validate_admin_key(value: str, settings: Settings) -> bool:
    return bool(settings.admin_key and hmac.compare_digest(value, settings.admin_key))


def require_mcp(request: Request) -> None:
    settings: Settings = request.app.state.settings
    value = request.headers.get("X-AgentGate-MCP-Key", "")
    if not settings.mcp_key or not hmac.compare_digest(value, settings.mcp_key):
        raise HTTPException(401, "MCP integration key required")

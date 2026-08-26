from __future__ import annotations

import asyncio
import json
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from .auth import CSRF_COOKIE_NAME, COOKIE_NAME, issue_csrf_token, issue_session, require_auth, require_csrf, require_mcp, validate_admin_key
from .config import get_settings
from .db import Database, now
from .upstream import Upstream


class Login(BaseModel):
    key: str | None = Field(default=None, min_length=1)
    owner_token: str | None = Field(default=None, min_length=1)

    @property
    def credential(self) -> str:
        return self.owner_token or self.key or ""


class ChatInput(BaseModel):
    input: str = Field(min_length=1, max_length=100_000)
    provider: str | None = None
    model: str | None = None
    intensity: str | None = None
    memory_incognito: bool = False


class SuggestionInput(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    summary: str = Field(min_length=1, max_length=10_000)
    category: str = "general"
    confidence: Literal["low", "medium", "high"] = "medium"
    urgency: Literal["low", "normal", "high"] = "normal"
    evidence: list[dict[str, Any]] = []
    source: str = "manual"
    source_ref: str | None = None


class AppInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2_000)
    url: str
    health_url: str | None = None
    source: str = "manual"
    source_ref: str | None = None
    pinned: bool = False


class CharacterInput(BaseModel):
    name: str = Field(default="Brain", max_length=120)
    owner_name: str = Field(default="", max_length=120)
    personality: str = Field(default="", max_length=10_000)
    background: str = Field(default="", max_length=10_000)
    speaking_style: str = Field(default="", max_length=5_000)
    boundaries: str = Field(default="", max_length=5_000)
    avatar_url: str | None = Field(default=None, max_length=2_000)


def character_context(item: dict[str, Any]) -> str:
    """Make the local character settings inspectable before any broader sync exists."""
    name = item.get("name") or "Brain"
    owner = item.get("owner_name") or "the user"
    sections = [f"# Identity\nYou are {name}, the user's personal agent. Address the user as {owner}."]
    for label, key in (
        ("Personality", "personality"),
        ("Background", "background"),
        ("Speaking style", "speaking_style"),
        ("Boundaries", "boundaries"),
    ):
        if item.get(key):
            sections.append(f"# {label}\n{item[key]}")
    return "\n\n".join(sections)


def valid_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(422, "URL must be an absolute http(s) URL")
    return value


def redact_sensitive(value: Any, key: str = "") -> Any:
    """Keep approval details useful without exposing browser-unsafe internals."""
    lowered_key = key.lower()
    normalized_key = lowered_key.replace("-", "_").replace(".", "_")
    if normalized_key in {"args_digest"}:
        return value
    unsafe_key_parts = (
        "token",
        "secret",
        "password",
        "authorization",
        "api_key",
        "api-key",
        "x_api_key",
        "x-api-key",
        "x_goog_api_key",
        "x-goog-api-key",
        "auth_header",
        "auth_headers",
        "headers",
        "access_key",
        "secret_key",
        "cookie",
        "raw_args",
        "args",
        "arguments",
        "parameters",
        "last_output",
        "output",
        "stdout",
        "stderr",
        "result",
        "log",
        "logs",
        "trace",
        "command",
        "cmd",
        "shell",
        "prompt",
        "system_prompt",
        "hidden_prompt",
        "instruction",
        "instructions",
        "source_uri",
        "host_path",
        "filesystem_path",
        "working_dir",
        "workdir",
        "cwd",
        "socket_path",
        "docker_socket",
        "env",
        "environ",
        "environment",
        "provider_url",
        "base_url",
        "endpoint_url",
        "upstream_url",
    )
    if any(part in lowered_key or part in normalized_key for part in unsafe_key_parts):
        return "[redacted]"
    if isinstance(value, str):
        lowered = value.lower()
        unsafe_text = (
            "http://",
            "https://",
            "file://",
            "/home/",
            "/users/",
            "/var/",
            "/etc/",
            "/root/",
            "/run/",
            "/tmp/",
            "\\users\\",
            "c:/users/",
            "c:\\users\\",
            ".sock",
            "bearer ",
            "bearer:",
            "authorization:",
            "api key:",
            "api_key:",
            "token=",
            "token:",
            "password=",
            "password:",
            "secret=",
            "secret:",
            "api.openai.com",
            "api.anthropic.com",
            "generativelanguage.googleapis.com",
            "chatgpt.com/backend-api",
            "openrouter.ai/api",
        )
        return "reference withheld" if any(part in lowered for part in unsafe_text) else value
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for name, item in value.items():
            safe_name = str(name)
            if browser_unsafe_key(safe_name) or browser_unsafe_string(safe_name):
                continue
            redacted[safe_name] = redact_sensitive(item, safe_name)
        return redacted
    if isinstance(value, list):
        return [redact_sensitive(item) for item in value]
    return value


def verification_view(source: str, item: dict[str, Any]) -> dict[str, Any]:
    payload = item.get("payload") or item.get("summary") or {}
    binding = payload.get("binding") if isinstance(payload, dict) else {}
    safe_source = redact_sensitive(source)
    safe_id = redact_sensitive(item.get("source_id") or item.get("id") or item.get("approval_id"))
    safe_binding = redact_sensitive({
        "type": payload.get("subject_type") if isinstance(payload, dict) else None,
        "id": payload.get("subject_id") if isinstance(payload, dict) else None,
        "version": (payload.get("subject_version") or payload.get("object_version") or payload.get("version")) if isinstance(payload, dict) else None,
        "digest": (binding or {}).get("args_digest") if isinstance(binding, dict) else None,
    }) if isinstance(payload, dict) else {}
    safe_binding = {
        "type": safe_browser_string(safe_binding.get("type"), "unknown") if isinstance(safe_binding, dict) else "unknown",
        "id": safe_browser_string(safe_binding.get("id"), "unknown") if isinstance(safe_binding, dict) else "unknown",
        "version": safe_browser_string(safe_binding.get("version"), "unknown") if isinstance(safe_binding, dict) else "unknown",
        "digest": safe_browser_string(safe_binding.get("digest"), "reference withheld") if isinstance(safe_binding, dict) else "reference withheld",
    }
    action = redact_sensitive({
        "subject_type": payload.get("subject_type"),
        "subject_id": payload.get("subject_id"),
        "subject_version": payload.get("subject_version") or payload.get("object_version") or payload.get("version"),
        "binding": {
            "expires_at": (binding or {}).get("expires_at"),
            "args_digest": (binding or {}).get("args_digest"),
            "consumed_at": (binding or {}).get("consumed_at"),
        },
    }) if isinstance(payload, dict) else {}
    return {
        "id": safe_id,
        "source": safe_source,
        "source_id": safe_id,
        "status": redact_sensitive(item.get("status", "pending")),
        "title": safe_browser_string(redact_sensitive(item.get("title") or (payload.get("title") if isinstance(payload, dict) else None)), "Approval required"),
        "details": safe_browser_string(redact_sensitive(item.get("details") or (payload.get("message") if isinstance(payload, dict) else None)), "Review exact binding before deciding."),
        "actor": redact_sensitive(item.get("actor") or (payload.get("actor") if isinstance(payload, dict) else None)),
        "severity": safe_browser_string(item.get("severity") or (payload.get("risk") if isinstance(payload, dict) else None), "low"),
        "created_at": safe_browser_string(item.get("created_at"), "unknown"),
        "expires_at": redact_sensitive(item.get("expires_at") or (binding or {}).get("expires_at") if isinstance(binding, dict) else None),
        "session_id": redact_sensitive(item.get("session_id")),
        "run_id": redact_sensitive(item.get("run_id")),
        "binding": safe_binding,
        "action": action if isinstance(action, dict) else {},
    }


def safe_suggestion_confidence(value: Any) -> tuple[int | None, str]:
    if isinstance(value, (int, float)):
        bounded = max(0, min(100, int(value)))
        return bounded, f"{bounded}%"
    label = safe_browser_string(value, "unknown")
    mapping = {"low": 30, "medium": 60, "high": 90}
    if label in mapping:
        return mapping[label], label
    return None, "unknown"


def safe_suggestion(item: dict[str, Any]) -> dict[str, Any]:
    status = safe_browser_string(item.get("status"), "new")
    priority = safe_browser_string(item.get("priority") or item.get("urgency"), "medium")
    theme = safe_browser_string(item.get("theme") or item.get("category"), "Other")
    title = safe_browser_string(item.get("title"), "Suggestion")
    summary = safe_browser_string(item.get("summary"), "Details withheld")
    confidence, confidence_label = safe_suggestion_confidence(item.get("confidence"))
    if title == "reference withheld":
        title = "Suggestion"
    if summary == "reference withheld":
        summary = "Details withheld"
    return {
        "id": safe_browser_string(item.get("id"), "suggestion"),
        "title": title,
        "summary": summary,
        "status": status,
        "theme": theme,
        "priority": priority,
        "confidence": confidence,
        "confidence_label": confidence_label,
        "created_at": safe_browser_string(item.get("created_at"), "unknown"),
        "updated_at": safe_browser_string(item.get("updated_at"), "unknown"),
        "metadata_only": True,
    }


def decision_result_view(source: str, source_id: str, payload: Any, decision: str | None = None) -> dict[str, Any]:
    safe_payload = safe_browser_payload(payload)
    status = "unknown"
    if isinstance(safe_payload, dict):
        status = safe_browser_string(safe_payload.get("status") or safe_payload.get("state"), "unknown")
    return {
        "source": source,
        "id": safe_browser_string(source_id, "unknown"),
        "source_id": safe_browser_string(source_id, "unknown"),
        "status": status,
        "decision": safe_browser_string(decision, status),
        "metadata_only": True,
        "raw_response_withheld": True,
    }


def normalize_source(source: str | None) -> str:
    return "brain" if source in {None, "", "hermes", "brain"} else source


def browser_unsafe_key(key: str) -> bool:
    lowered = key.lower()
    normalized = lowered.replace("-", "_").replace(".", "_")
    if normalized in {"args_digest"}:
        return False
    unsafe_parts = (
        "token", "secret", "password", "authorization", "api_key", "x_api_key",
        "x_goog_api_key", "auth_header", "auth_headers", "headers", "access_key",
        "secret_key", "cookie", "raw_args", "args", "arguments", "parameters",
        "last_output", "output", "stdout", "stderr", "result", "log", "logs",
        "trace", "command", "cmd", "shell", "prompt", "system_prompt",
        "hidden_prompt", "instruction", "instructions", "source_uri", "host_path",
        "filesystem_path", "working_dir", "workdir", "cwd", "socket_path",
        "docker_socket", "env", "environ", "environment", "provider_url", "base_url",
        "endpoint_url", "upstream_url",
    )
    return any(part in lowered or part in normalized for part in unsafe_parts)


def browser_unsafe_string(value: str) -> bool:
    lowered = value.lower()
    if any(marker in lowered for marker in ("http://", "https://", "file://")):
        return True
    provider_markers = (
        "api.openai.com",
        "api.anthropic.com",
        "generativelanguage.googleapis.com",
        "chatgpt.com/backend-api",
        "openrouter.ai/api",
    )
    if any(marker in lowered for marker in provider_markers):
        return True
    host_markers = (
        ".sock",
        "\\users\\",
    )
    if any(marker in lowered for marker in host_markers):
        return True
    # Fail closed for filesystem-looking host paths. Avoid treating URL paths
    # as safe display metadata; browser-facing overview payloads must not carry
    # host paths even when the root is not one of the common Linux directories.
    if re.search(r"(^|[\s'\"(=:])/(?:home|users|var|etc|root|run|tmp|opt|srv|mnt|proc|dev|volumes|private|usr/local|usr/bin|usr/sbin|lib|boot|sys)(?:/|$)", lowered):
        return True
    if re.search(r"(^|[\s'\"(=:])[a-z]:[/\\](?:users|windows|program files|programdata|temp|tmp|projects|work|agentgate|secrets)(?:[/\\]|$)", lowered):
        return True
    secret_markers = (
        "api_key", "authorization", "bearer ", "bearer:", "x-memorygate-key",
        "token=", "token:", "password=", "password:", "secret=", "secret:",
        "api key:", "api_key:", "api-key", "x-api-key", "x_goog_api_key", "x-goog-api-key",
        "auth_headers", "aiza",
        "hidden prompt", "system prompt", "private instruction", "private owner", "owner instruction",
        "internal decision", "private detail", "private output", "private stdout", "private stderr",
        "meet owner", "meet at", "meet bank",
    )
    if any(marker in lowered for marker in secret_markers):
        return True
    stripped = value.strip()
    return stripped.startswith(("sk-", "sk_proj_", "sk-proj-", "AIza")) or (stripped.startswith("sk_") and len(stripped) > 12)


def safe_browser_string(value: Any, fallback: str = "not provided") -> str:
    if not isinstance(value, str) or not value.strip():
        return fallback
    return "reference withheld" if browser_unsafe_string(value) else value


def safe_browser_value(value: Any) -> Any:
    if isinstance(value, str):
        return safe_browser_string(value)
    if isinstance(value, list):
        return [safe_browser_value(item) for item in value]
    if isinstance(value, dict):
        safe: dict[str, Any] = {}
        for key, item in value.items():
            safe_key = str(key)
            if browser_unsafe_key(safe_key) or browser_unsafe_string(safe_key):
                continue
            safe[safe_key] = safe_browser_value(item)
        return safe
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return None


def safe_browser_error(value: Any, source: str = "upstream") -> dict[str, str]:
    source_value = value.get("source") if isinstance(value, dict) else None
    return {"source": safe_browser_string(source_value, source), "message": "source unavailable"}


def safe_browser_payload(value: Any) -> Any:
    return safe_browser_value(value)


def safe_memory_evidence(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    rows: list[dict[str, Any]] = []
    for item in value:
        if isinstance(item, str):
            rows.append({"label": safe_browser_string(item)})
        elif isinstance(item, dict):
            row: dict[str, Any] = {}
            for key in ("label", "source", "kind", "ref", "id", "title"):
                if key in item:
                    row[key] = safe_browser_string(item.get(key), "")
            if row:
                rows.append(row)
    return rows


def safe_memory_record(item: Any, index: int) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {"id": f"memory-{index + 1}", "title": "Untitled memory", "kind": "unknown", "confidence": "unknown"}
    row = {
        "id": safe_browser_string(item.get("id") or item.get("memory_id"), f"memory-{index + 1}"),
        "title": safe_browser_string(item.get("title") or item.get("claim") or item.get("summary"), "Untitled memory"),
        "kind": safe_browser_string(item.get("kind") or item.get("type"), "unknown"),
        "confidence": safe_browser_string(item.get("confidence") or item.get("state"), "unknown"),
    }
    for key in ("updated_at", "created_at", "state"):
        if isinstance(item.get(key), str):
            row[key] = safe_browser_string(item.get(key), "")
    if isinstance(item.get("source"), str):
        row["source"] = safe_browser_string(item.get("source"), "unknown")
    evidence = safe_memory_evidence(item.get("evidence") or item.get("sources") or item.get("source_refs"))
    if evidence:
        row["evidence"] = evidence
    entities = item.get("entities") or item.get("linked_entities")
    if isinstance(entities, list):
        safe_entities: list[dict[str, str]] = []
        for entity in entities:
            if not isinstance(entity, dict):
                continue
            safe_entity: dict[str, str] = {}
            for key in ("id", "name", "label", "kind", "type"):
                if isinstance(entity.get(key), str):
                    safe_entity[key] = safe_browser_string(entity.get(key), "")
            if safe_entity:
                safe_entities.append(safe_entity)
        if safe_entities:
            row["entities"] = safe_entities
    return row


def memory_items(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        for key in ("results", "items", "memories", "observations", "patterns", "matches"):
            if isinstance(value.get(key), list):
                return value[key]
    return []


def safe_memory_records(value: Any) -> list[dict[str, Any]]:
    return [safe_memory_record(item, index) for index, item in enumerate(memory_items(value)) if isinstance(item, dict)]



def safe_briefing_view(value: Any) -> dict[str, Any]:
    if isinstance(value, dict) and "error" in value:
        return {"available": False, "source": "memorygate", "error": safe_browser_error(value.get("error"), "memorygate"), "metadata_only": True, "content_withheld": True}
    if isinstance(value, dict) and "errors" in value:
        return {"available": False, "source": "memorygate", "error": safe_browser_error(value.get("errors"), "memorygate"), "metadata_only": True, "content_withheld": True}
    return {"available": bool(value), "source": "memorygate", "metadata_only": True, "content_withheld": True}

def safe_memory_error(value: Any) -> dict[str, str]:
    if isinstance(value, dict):
        source = safe_browser_string(value.get("source"), "memorygate")
        message = safe_browser_string(value.get("message") or value.get("detail") or value.get("error"), "source unavailable")
        return {"source": source, "message": message}
    if isinstance(value, str):
        return {"source": "memorygate", "message": safe_browser_string(value, "source unavailable")}
    return {"source": "memorygate", "message": "source unavailable"}


def safe_memory_search_response(value: Any) -> Any:
    if isinstance(value, list):
        return safe_memory_records(value)
    if isinstance(value, dict):
        shaped: dict[str, Any] = {}
        for key, item in value.items():
            if key in {"results", "items", "memories", "matches"}:
                shaped[key] = safe_memory_records(item)
            elif key == "errors" and isinstance(item, dict):
                shaped[key] = {str(section): safe_browser_error(error, "memorygate") for section, error in item.items()}
            elif key == "error":
                shaped[key] = safe_browser_error(item, "memorygate")
            elif key in {"total", "count", "has_more", "next_offset"}:
                shaped[key] = safe_browser_value(item)
        return shaped
    return safe_browser_value(value)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if len(settings.admin_key) < 16 or len(settings.session_secret) < 32 or len(settings.mcp_key) < 16:
        raise RuntimeError("AGENTGATE_ADMIN_KEY, AGENTGATE_MCP_KEY (16+ chars), and AGENTGATE_SESSION_SECRET (32+ chars) are required")
    app.state.settings = settings
    app.state.db = Database(settings.data_dir)
    app.state.db.initialize()
    app.state.upstream = Upstream(settings)
    yield


app = FastAPI(title="AgentGate", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[], allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"], allow_headers=["Content-Type", "X-CSRF-Token"])


def db(request: Request) -> Database:
    return request.app.state.db


def upstream(request: Request) -> Upstream:
    return request.app.state.upstream


@app.get("/api/health")
async def health(request: Request):
    return {"status": "ok", "service": "agentgate", "time": now()}


@app.post("/api/auth/login")
async def login(payload: Login, response: Response, request: Request):
    if not validate_admin_key(payload.credential, request.app.state.settings):
        raise HTTPException(401, "Invalid key")
    session_token = issue_session(request.app.state.settings)
    csrf_token = issue_csrf_token(session_token, request.app.state.settings)
    response.set_cookie(COOKIE_NAME, session_token, httponly=True, samesite="strict", max_age=43_200)
    response.set_cookie(CSRF_COOKIE_NAME, csrf_token, httponly=False, samesite="strict", max_age=43_200)
    return owner_session_payload(True, csrf_token)


@app.post("/api/auth/logout", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    response.delete_cookie(CSRF_COOKIE_NAME)
    return owner_session_payload(False, None)


def owner_session_payload(authenticated: bool, csrf_token: str | None) -> dict[str, Any]:
    return {
        "status": "authenticated" if authenticated else "locked",
        "authenticated": authenticated,
        "owner_authenticated": authenticated,
        "auth_mode": "owner_key",
        "token_storage": "HttpOnly session cookie + readable CSRF cookie",
        "csrf_required": True,
        "csrf_token": csrf_token,
        "session_expires_at": None,
        "metadata_only": True,
        "credentials_included": False,
        "token_included": False,
    }


@app.get("/api/auth/session", dependencies=[Depends(require_auth)])
async def session(request: Request):
    session_token = request.cookies.get(COOKIE_NAME, "")
    csrf_token = issue_csrf_token(session_token, request.app.state.settings) if session_token else None
    return owner_session_payload(True, csrf_token)


def dependency_status_from_payload(payload: Any) -> str:
    if isinstance(payload, dict):
        status = str(payload.get("status") or payload.get("state") or "").lower()
        if status in {"degraded", "offline", "blocked", "auth_required", "stale", "empty", "planned", "unknown"}:
            return status
        if status in {"unavailable", "unreachable"}:
            return "offline"
        if status in {"ok", "online", "live", "healthy", "ready"}:
            return "live"
    return "unknown"


def dependency_status_from_exception(exc: HTTPException) -> str:
    if exc.status_code in {401, 403}:
        return "auth_required"
    detail = exc.detail
    if isinstance(detail, dict):
        status = str(detail.get("status") or detail.get("code") or detail.get("message") or "").lower()
        if "auth" in status or "forbidden" in status:
            return "auth_required"
        if "degraded" in status:
            return "degraded"
    elif isinstance(detail, str):
        lowered = detail.lower()
        if "auth" in lowered or "forbidden" in lowered:
            return "auth_required"
        if "degraded" in lowered:
            return "degraded"
    return "offline"


@app.get("/api/health/dependencies", dependencies=[Depends(require_auth)])
async def dependency_health(up: Upstream = Depends(upstream)):
    async def check(name: str, path: str):
        try:
            payload = await up.request(name, "GET", path)
            return {"name": name, "status": dependency_status_from_payload(payload)}
        except HTTPException as exc:
            return {"name": name, "status": dependency_status_from_exception(exc), "detail": safe_browser_error(exc.detail, name)}
    return await asyncio.gather(check("brain", "/health"), check("toolgate", "/v2/status"), check("memorygate", "/health"), check("systemgate", "/health"))


@app.get("/api/home", dependencies=[Depends(require_auth)])
async def home(request: Request, up: Upstream = Depends(upstream), store: Database = Depends(db)):
    async def optional(name: str, path: str):
        try:
            return await up.request(name, "GET", path)
        except HTTPException as exc:
            return {"error": safe_browser_error(exc.detail)}
    brain, toolgate, memorygate, chats, jobs, requests = await asyncio.gather(
        optional("brain", "/health/detailed"), optional("toolgate", "/v2/status"), optional("memorygate", "/health"),
        optional("brain", "/api/sessions"), optional("brain", "/api/jobs"), optional("toolgate", "/v2/requests"),
    )
    suggestions = [safe_suggestion(store.decode(item)) for item in store.rows("SELECT * FROM suggestions WHERE status = 'new' ORDER BY created_at DESC LIMIT 3")]
    apps = store.rows("SELECT * FROM apps WHERE pinned = 1 ORDER BY position, name LIMIT 8")
    toolgate_pending = [item for item in requests if isinstance(item, dict) and item.get("kind") == "verification" and item.get("status") == "pending"] if isinstance(requests, list) else []
    brain_pending = [store.decode(item) for item in store.rows("SELECT * FROM verification_refs WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10")]
    chat_rows = chats if isinstance(chats, list) else chats.get("sessions", chats.get("items", [])) if isinstance(chats, dict) else []
    job_rows = jobs if isinstance(jobs, list) else jobs.get("jobs", []) if isinstance(jobs, dict) else []
    return {
        "health": {"brain": safe_browser_payload(brain), "toolgate": safe_browser_payload(toolgate), "memorygate": safe_browser_payload(memorygate)}, "suggestions": safe_browser_payload(suggestions),
        "pinned_apps": safe_browser_payload(apps), "pending_verifications": [verification_view("toolgate", item) for item in toolgate_pending] + [verification_view("brain", item) for item in brain_pending],
        "recent_chats": safe_chat_rows(chat_rows), "active_jobs": safe_automation_rows([item for item in job_rows if not item.get("paused", False)][:5], "brain"),
    }


@app.get("/api/chats", dependencies=[Depends(require_auth)])
async def chats(limit: int = 100, up: Upstream = Depends(upstream)):
    return await up.request("brain", "GET", "/api/sessions", params={"limit": min(limit, 100), "offset": 0, "include_children": True})


@app.post("/api/chats", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_chat(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("brain", "POST", "/api/sessions", json=payload)


@app.get("/api/chats/{session_id}", dependencies=[Depends(require_auth)])
async def chat(session_id: str, up: Upstream = Depends(upstream)):
    return await up.request("brain", "GET", f"/api/sessions/{session_id}")


@app.patch("/api/chats/{session_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_chat(session_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("brain", "PATCH", f"/api/sessions/{session_id}", json=payload)


@app.delete("/api/chats/{session_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_chat(session_id: str, up: Upstream = Depends(upstream)):
    return await up.request("brain", "DELETE", f"/api/sessions/{session_id}")


@app.get("/api/chats/{session_id}/messages", dependencies=[Depends(require_auth)])
async def messages(session_id: str, up: Upstream = Depends(upstream)):
    return await up.request("brain", "GET", f"/api/sessions/{session_id}/messages")


@app.post("/api/chats/{session_id}/fork", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def fork_chat(session_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("brain", "POST", f"/api/sessions/{session_id}/fork", json=payload)


@app.post("/api/chats/{session_id}/stream", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def stream_chat(session_id: str, payload: ChatInput, request: Request):
    up: Upstream = request.app.state.upstream
    store: Database = request.app.state.db
    body: dict[str, Any] = {"input": payload.input}
    if payload.model: body["model"] = payload.model
    if payload.provider: body["provider"] = payload.provider
    if payload.intensity: body["model_options"] = {"reasoning_effort": payload.intensity}
    if payload.memory_incognito:
        body["instructions"] = "Do not create, update, or persist long-term memory for this turn."

    async def events() -> AsyncIterator[bytes]:
        client = httpx.AsyncClient(timeout=None)
        try:
            response = await client.send(client.build_request("POST", f"{up.base('brain')}/api/sessions/{session_id}/chat/stream", headers={**up.headers("brain"), "Accept": "text/event-stream"}, json=body), stream=True)
            if response.is_error:
                yield f"event: run.failed\ndata: {json.dumps({'message': 'Brain stream failed', 'status': response.status_code})}\n\n".encode()
                return
            event_name = "message"
            async for line in response.aiter_lines():
                if line.startswith("event:"):
                    event_name = line[6:].strip()
                elif line.startswith("data:") and "approval" in event_name:
                    try:
                        approval = json.loads(line[5:].strip())
                        source_id = str(approval.get("approval_id") or approval.get("id") or approval.get("request_id") or "")
                        if source_id:
                            store.upsert_verification({
                                "source": "brain", "source_id": source_id, "run_id": str(approval.get("run_id") or "") or None,
                                "session_id": session_id, "status": "pending", "summary": approval,
                                "expires_at": approval.get("expires_at"),
                            })
                    except (ValueError, TypeError):
                        pass
                if line:
                    yield f"{line}\n".encode()
                else:
                    yield b"\n"
        except httpx.HTTPError:
            yield b"event: run.failed\ndata: {\"message\":\"Brain stream disconnected\"}\n\n"
        finally:
            await client.aclose()
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/models", dependencies=[Depends(require_auth)])
async def models(up: Upstream = Depends(upstream)):
    try:
        options = await up.request("brain", "GET", "/api/model/options")
    except HTTPException as exc:
        return {"providers": [], "models": [], "error": safe_browser_error(exc.detail, "brain")}
    safe_options = safe_browser_payload(options)
    providers = provider_rows_from_options(safe_options)
    models = []
    if isinstance(safe_options, dict) and isinstance(safe_options.get("models"), list):
        models = [safe_browser_payload(model) for model in safe_options["models"] if isinstance(model, dict)]
    elif isinstance(safe_options, list):
        models = [safe_browser_payload(model) for model in safe_options if isinstance(model, dict)]
    return {"providers": providers, "models": models, "runtime_note": "source-bound model metadata only"}





def provider_rows_from_options(options: Any) -> list[dict[str, Any]]:
    if isinstance(options, dict):
        providers = options.get("providers")
        if isinstance(providers, list):
            return [safe_browser_payload(provider) for provider in providers if isinstance(provider, dict)]
        models = options.get("models")
        if isinstance(models, list):
            seen: dict[str, dict[str, Any]] = {}
            for item in models:
                if not isinstance(item, dict):
                    continue
                provider_id = str(item.get("provider") or item.get("provider_id") or "unknown")
                row = seen.setdefault(provider_id, {
                    "id": provider_id,
                    "name": provider_id,
                    "kind": "model-provider",
                    "status": "unknown",
                    "configured": False,
                    "models_visible": True,
                    "model_count": 0,
                    "models_status": "source-bound",
                })
                row["model_count"] = int(row["model_count"]) + 1
            return list(seen.values())
    if isinstance(options, list):
        return [safe_browser_payload(provider) for provider in options if isinstance(provider, dict)]
    return []


@app.get("/api/model/providers", dependencies=[Depends(require_auth)])
async def model_providers(up: Upstream = Depends(upstream)):
    try:
        options = await up.request("brain", "GET", "/api/model/options")
    except HTTPException as exc:
        return {"providers": [], "error": safe_browser_error(exc.detail, "brain")}
    return {"providers": provider_rows_from_options(safe_browser_payload(options))}


@app.get("/api/model/gateway-candidates", dependencies=[Depends(require_auth)])
async def model_gateway_candidates(up: Upstream = Depends(upstream)):
    try:
        options = safe_browser_payload(await up.request("brain", "GET", "/api/model/options"))
    except HTTPException as exc:
        return {"candidate_count": 0, "candidates": [], "runtime_note": "source unavailable", "error": safe_browser_error(exc.detail, "brain")}
    if isinstance(options, dict):
        candidates = options.get("candidates") if isinstance(options.get("candidates"), list) else options.get("models") if isinstance(options.get("models"), list) else []
        gateway = options.get("gateway") if isinstance(options.get("gateway"), dict) else None
        setup = options.get("setup") if isinstance(options.get("setup"), dict) else None
    else:
        candidates = options if isinstance(options, list) else []
        gateway = None
        setup = None
    safe_candidates = [safe_browser_payload(item) for item in candidates if isinstance(item, dict)]
    return {
        "gateway": safe_browser_payload(gateway) if gateway else None,
        "candidates": safe_candidates,
        "candidate_count": len(safe_candidates),
        "setup": safe_browser_payload(setup) if setup else None,
        "runtime_note": "source-bound model metadata only",
    }


@app.post("/api/model/route-check", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def model_route_check(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    provider = safe_browser_string(payload.get("provider"), "unknown")
    model = safe_browser_string(payload.get("model"), "unknown")
    try:
        options = safe_browser_payload(await up.request("brain", "GET", "/api/model/options"))
    except HTTPException as exc:
        return {"provider": provider, "model": model, "status": "degraded", "model_visible": False, "provider_status": "unknown", "configured": False, "risk": "unknown", "policy": "metadata-only", "note": safe_browser_error(exc.detail, "brain")["message"]}
    encoded = json.dumps(options).lower() if isinstance(options, (dict, list)) else ""
    visible = provider.lower() in encoded and model.lower() in encoded
    return {"provider": provider, "model": model, "status": "ok" if visible else "unknown", "model_visible": visible, "provider_status": "source-bound", "configured": visible, "risk": "metadata-only", "policy": "manual review before save", "note": "Checked against Brain model metadata"}


@app.post("/api/model/route-plan", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def model_route_plan(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    primary = await model_route_check({"provider": payload.get("primary_provider"), "model": payload.get("primary_model")}, up)
    fallback = await model_route_check({"provider": payload.get("fallback_provider"), "model": payload.get("fallback_model")}, up)
    return {"agent_id": safe_browser_string(payload.get("agent_id"), "agent_pi_operator"), "schema": "model-route-plan.v1", "routes": [primary, fallback], "fallback_policy": {"status": "planned", "automatic_fallback": False, "blocked_reasons": ["model route saves require ToolGate approval"]}, "safe_metadata_only": True, "automatic_fallback_enabled": False}


@app.post("/api/model/routes/{agent_id}/save", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def model_route_save(agent_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    plan = await model_route_plan({**payload, "agent_id": agent_id}, up)
    return {"status": "pending_approval", "requires_approval": True, "approval_reasons": ["model route changes are gated"], "safe_metadata_only": True, "route_plan": plan}


@app.get("/api/agents", dependencies=[Depends(require_auth)])
async def agents(up: Upstream = Depends(upstream)):
    try:
        payload = await up.request("brain", "GET", "/api/agents")
    except HTTPException as exc:
        return {"agents": [], "error": safe_browser_error(exc.detail, "brain")}
    safe_payload = safe_browser_payload(payload)
    rows = safe_payload.get("agents", safe_payload) if isinstance(safe_payload, dict) else safe_payload
    if not isinstance(rows, list):
        rows = []
    agents = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        agent_id = safe_browser_string(item.get("id") or item.get("agent_id"), f"agent-{index + 1}")
        label = safe_browser_string(item.get("label") or item.get("display_name") or item.get("name"), agent_id)
        agents.append({
            "id": agent_id,
            "name": label,
            "label": label,
            "status": safe_browser_string(item.get("status"), "unknown"),
            "source": "brain",
        })
    return {"agents": agents, "runtime_note": "source-bound agent metadata only"}


@app.get("/api/capabilities", dependencies=[Depends(require_auth)])
async def capabilities(up: Upstream = Depends(upstream)):
    return await up.request("brain", "GET", "/v1/capabilities")


@app.get("/api/capabilities/{kind}", dependencies=[Depends(require_auth)])
async def capability_kind(kind: Literal["skills", "toolsets"], up: Upstream = Depends(upstream)):
    return await up.request("brain", "GET", f"/v1/{kind}")


@app.get("/api/verifications", dependencies=[Depends(require_auth)])
async def verifications(store: Database = Depends(db), up: Upstream = Depends(upstream)):
    try:
        toolgate = await up.request("toolgate", "GET", "/v2/requests")
    except HTTPException:
        toolgate = []
    rows = [verification_view("toolgate", item) for item in toolgate if item.get("kind") == "verification"]
    for item in store.rows("SELECT * FROM verification_refs ORDER BY created_at DESC"):
        decoded = store.decode(item)
        rows.append(verification_view(normalize_source(decoded.get("source")), decoded))
    return rows


@app.get("/api/approvals", dependencies=[Depends(require_auth)])
async def approvals(store: Database = Depends(db), up: Upstream = Depends(upstream)):
    return await verifications(store, up)


@app.post("/api/verifications/toolgate/{request_id}/decision", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def decide_toolgate(request_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    result = await up.request("toolgate", "POST", f"/v2/requests/{request_id}/decision", json=payload)
    return decision_result_view("toolgate", request_id, result, str(payload.get("decision") or "decided"))


@app.post("/api/runs/{run_id}/stop", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def stop_run(run_id: str, up: Upstream = Depends(upstream)):
    result = await up.request("brain", "POST", f"/v1/runs/{run_id}/stop")
    return decision_result_view("brain", run_id, result, "stopped")


@app.post("/api/runs/{run_id}/approval", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def approve_run(run_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    result = await up.request("brain", "POST", f"/v1/runs/{run_id}/approval", json=payload)
    return decision_result_view("brain", run_id, result, str(payload.get("decision") or "approved"))


@app.post("/api/verifications/brain/{source_id}/decision", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def decide_brain(source_id: str, payload: dict[str, Any], store: Database = Depends(db), up: Upstream = Depends(upstream)):
    item = store.row("SELECT * FROM verification_refs WHERE source IN ('brain', 'hermes') AND source_id = ?", (source_id,))
    if not item or not item.get("run_id"):
        raise HTTPException(404, "Brain approval is no longer available")
    result = await up.request("brain", "POST", f"/v1/runs/{item['run_id']}/approval", json=payload)
    store.upsert_verification({"source": "brain", "source_id": source_id, "run_id": item["run_id"], "session_id": item.get("session_id"), "status": payload.get("decision", "approved"), "summary": store.decode(item).get("summary", {}), "expires_at": item.get("expires_at")})
    return decision_result_view("brain", source_id, result, str(payload.get("decision") or "approved"))


@app.get("/api/suggestions", dependencies=[Depends(require_auth)])
async def suggestions(store: Database = Depends(db)):
    rows = [store.decode(item) for item in store.rows("SELECT * FROM suggestions ORDER BY created_at DESC")]
    return {"suggestions": [safe_suggestion(item) for item in rows], "metadata_only": True}


@app.post("/api/suggestions", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_suggestion(payload: SuggestionInput, store: Database = Depends(db)):
    return safe_suggestion(store.create_suggestion(payload.model_dump()))


@app.patch("/api/suggestions/{suggestion_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_suggestion(suggestion_id: str, payload: dict[str, Any], store: Database = Depends(db)):
    allowed = {key: value for key, value in payload.items() if key in {"status", "title", "summary", "category", "confidence", "urgency"}}
    if not allowed: raise HTTPException(422, "No supported fields")
    assignments = ", ".join(f"{key} = ?" for key in allowed) + ", updated_at = ?"
    store.execute(f"UPDATE suggestions SET {assignments} WHERE id = ?", (*allowed.values(), now(), suggestion_id))
    item = store.row("SELECT * FROM suggestions WHERE id = ?", (suggestion_id,))
    if not item: raise HTTPException(404, "Suggestion not found")
    return safe_suggestion(store.decode(item))


@app.get("/api/apps", dependencies=[Depends(require_auth)])
async def apps(store: Database = Depends(db)):
    return store.rows("SELECT * FROM apps ORDER BY pinned DESC, position, name")


@app.post("/api/apps", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_app(payload: AppInput, store: Database = Depends(db)):
    data = payload.model_dump(); data["url"] = valid_url(data["url"])
    if data.get("health_url"): data["health_url"] = valid_url(data["health_url"])
    return store.create_app(data)


@app.patch("/api/apps/{app_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_app(app_id: str, payload: dict[str, Any], store: Database = Depends(db)):
    allowed = {key: value for key, value in payload.items() if key in {"name", "description", "status", "pinned", "position", "url", "health_url"}}
    if "url" in allowed: allowed["url"] = valid_url(allowed["url"])
    if "health_url" in allowed and allowed["health_url"]: allowed["health_url"] = valid_url(allowed["health_url"])
    if not allowed: raise HTTPException(422, "No supported fields")
    if "pinned" in allowed: allowed["pinned"] = int(bool(allowed["pinned"]))
    assignments = ", ".join(f"{key} = ?" for key in allowed) + ", updated_at = ?"
    store.execute(f"UPDATE apps SET {assignments} WHERE id = ?", (*allowed.values(), now(), app_id))
    item = store.row("SELECT * FROM apps WHERE id = ?", (app_id,))
    if not item: raise HTTPException(404, "App not found")
    return item


@app.delete("/api/apps/{app_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_app(app_id: str, store: Database = Depends(db)):
    if not store.row("SELECT id FROM apps WHERE id = ?", (app_id,)): raise HTTPException(404, "App not found")
    store.execute("DELETE FROM apps WHERE id = ?", (app_id,))
    return {"deleted": True}


@app.post("/api/apps/{app_id}/health-check", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def check_app(app_id: str, store: Database = Depends(db)):
    item = store.row("SELECT * FROM apps WHERE id = ?", (app_id,))
    if not item:
        raise HTTPException(404, "App not found")
    target = item.get("health_url") or item["url"]
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
            response = await client.get(target)
        status = "healthy" if response.status_code < 400 else "unhealthy"
    except httpx.HTTPError:
        status = "unreachable"
    store.execute("UPDATE apps SET status = ?, updated_at = ? WHERE id = ?", (status, now(), app_id))
    return {"id": app_id, "status": status}


@app.get("/api/gates/toolgate", dependencies=[Depends(require_auth)])
async def toolgate_gate(up: Upstream = Depends(upstream)):
    async def optional(path: str):
        try: return await up.request("toolgate", "GET", path)
        except HTTPException as exc: return {"error": safe_browser_error(exc.detail)}
    status, tools, automations, services, events = await asyncio.gather(optional("/v2/status"), optional("/v2/tools"), optional("/v2/automations"), optional("/v2/services"), optional("/v2/events?limit=12"))
    safe_status = safe_browser_payload(status)
    if isinstance(status, dict) and "error" in status:
        safe_status = {**safe_status, "error": safe_browser_error(status.get("error"), "toolgate")} if isinstance(safe_status, dict) else {"error": safe_browser_error(status.get("error"), "toolgate")}
    return {
        "status": safe_status,
        "tools": safe_browser_payload(tools) if isinstance(tools, list) else [],
        "automations": safe_automation_rows(automations, "toolgate"),
        "services": safe_browser_payload(services) if isinstance(services, list) else [],
        "events": safe_toolgate_events(events),
        "error": safe_status.get("error") if isinstance(safe_status, dict) else None,
    }


@app.get("/api/gates/memorygate", dependencies=[Depends(require_auth)])
async def memorygate_gate(request: Request, up: Upstream = Depends(upstream)):
    agent = request.app.state.settings.memorygate_agent_id
    async def optional(method: str, path: str):
        try: return await up.request("memorygate", method, path)
        except HTTPException as exc: return {"error": safe_browser_error(exc.detail)}
    briefing, memories, observations, patterns = await asyncio.gather(
        optional("GET", f"/briefing/{agent}"), optional("GET", "/memory"),
        optional("GET", "/observation/active"), optional("GET", f"/pattern/active/{agent}"),
    )
    errors = {
        "briefing": briefing.get("error") if isinstance(briefing, dict) else None,
        "memories": memories.get("error") if isinstance(memories, dict) else None,
        "observations": observations.get("error") if isinstance(observations, dict) else None,
        "patterns": patterns.get("error") if isinstance(patterns, dict) else None,
    }
    return {
        "briefing": safe_briefing_view(briefing),
        "memories": safe_memory_records(memories),
        "observations": safe_memory_records(observations),
        "patterns": safe_memory_records(patterns),
        "errors": {key: safe_browser_error(value, "memorygate") for key, value in errors.items() if value is not None},
    }


@app.post("/api/gates/memorygate/search", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def memory_search(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    try:
        result = await up.request("memorygate", "POST", "/memory/search", json=payload)
    except HTTPException as exc:
        return {"error": safe_browser_error(exc.detail, "memorygate")}
    return safe_memory_search_response(result)


@app.get("/api/cron/jobs", dependencies=[Depends(require_auth)])
async def cron_jobs(up: Upstream = Depends(upstream)):
    try:
        jobs = await up.request("brain", "GET", "/api/jobs")
    except HTTPException as exc:
        return {"jobs": [], "error": safe_browser_error(exc.detail), "metadata_only": True, "raw_response_withheld": True}
    return {"jobs": safe_automation_rows(jobs, "brain"), "metadata_only": True}




def safe_automation_rows(value: Any, source: str) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else value.get("jobs", value.get("automations", [])) if isinstance(value, dict) else []
    safe_rows: list[dict[str, Any]] = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        row: dict[str, Any] = {
            "id": safe_browser_string(item.get("id") or item.get("job_id"), f"{source}-{index + 1}"),
            "name": f"{source} automation",
            "status": safe_browser_string(item.get("status") or item.get("last_status"), "unknown"),
            "source": source,
        }
        for key in ("schedule", "next_run", "next", "last_run"):
            if isinstance(item.get(key), str):
                row[key] = safe_browser_string(item.get(key), "")
        if "paused" in item:
            row["paused"] = bool(item.get("paused"))
        safe_rows.append(row)
    return safe_rows



def safe_chat_rows(value: Any) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else value.get("sessions", value.get("items", [])) if isinstance(value, dict) else []
    safe_rows: list[dict[str, Any]] = []
    for index, item in enumerate(rows[:5]):
        if not isinstance(item, dict):
            continue
        row: dict[str, Any] = {
            "id": safe_browser_string(item.get("id") or item.get("session_id"), f"chat-{index + 1}"),
            "source": "brain",
            "status": safe_browser_string(item.get("status") or item.get("state"), "unknown"),
            "metadata_only": True,
            "preview_withheld": True,
        }
        for key in ("updated_at", "created_at"):
            if isinstance(item.get(key), str):
                row[key] = safe_browser_string(item.get(key), "")
        for key in ("message_count", "turn_count"):
            if isinstance(item.get(key), int):
                row[key] = item.get(key)
        safe_rows.append(row)
    return safe_rows

def safe_action_result(source: str, item: Any, action: str = "updated") -> dict[str, Any]:
    payload = item if isinstance(item, dict) else {}
    return {
        "id": safe_browser_string(payload.get("id") or payload.get("job_id"), "unknown"),
        "source": source,
        "status": safe_browser_string(payload.get("status") or payload.get("state"), "unknown"),
        "action": safe_browser_string(action, "updated"),
        "metadata_only": True,
        "raw_response_withheld": True,
    }


def safe_toolgate_events(value: Any) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else value.get("events", []) if isinstance(value, dict) else []
    safe_rows: list[dict[str, Any]] = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        row: dict[str, Any] = {
            "id": safe_browser_string(item.get("id") or item.get("event_id"), f"event-{index + 1}"),
            "kind": safe_browser_string(item.get("kind") or item.get("type"), "event"),
            "status": safe_browser_string(item.get("status") or item.get("state"), "unknown"),
            "source": "toolgate",
            "metadata_only": True,
            "details_withheld": True,
        }
        for key in ("created_at", "updated_at", "severity"):
            if isinstance(item.get(key), str):
                row[key] = safe_browser_string(item.get(key), "")
        binding = item.get("binding") if isinstance(item.get("binding"), dict) else {}
        digest = binding.get("args_digest") if isinstance(binding, dict) else None
        if isinstance(digest, str):
            row["args_digest"] = safe_browser_string(digest, "")
        safe_rows.append(row)
    return safe_rows

@app.get("/api/automations", dependencies=[Depends(require_auth)])
async def automations(up: Upstream = Depends(upstream)):
    async def optional(name: str, path: str):
        try:
            return await up.request(name, "GET", path)
        except HTTPException as exc:
            return {"error": safe_browser_error(exc.detail)}
    jobs, toolgate_automations = await asyncio.gather(
        optional("brain", "/api/jobs"),
        optional("toolgate", "/v2/automations"),
    )
    return {
        "jobs": safe_automation_rows(jobs, "brain"),
        "toolgate_automations": safe_automation_rows(toolgate_automations, "toolgate"),
        "errors": {
            "brain": jobs.get("error") if isinstance(jobs, dict) else None,
            "toolgate": toolgate_automations.get("error") if isinstance(toolgate_automations, dict) else None,
        },
    }


@app.get("/api/system", dependencies=[Depends(require_auth)])
async def system(up: Upstream = Depends(upstream)):
    async def optional(path: str):
        try:
            return await up.request("systemgate", "GET", path)
        except HTTPException as exc:
            return {"error": safe_browser_error(exc.detail)}
    vitals, containers, backups = await asyncio.gather(
        optional("/vitals"),
        optional("/containers"),
        optional("/backups"),
    )
    return {"vitals": safe_browser_payload(vitals), "containers": safe_browser_payload(containers), "backups": safe_browser_payload(backups)}


@app.post("/api/cron/jobs", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_cron(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    try:
        result = await up.request("brain", "POST", "/api/jobs", json=payload)
    except HTTPException as exc:
        return {"id": "unknown", "source": "brain", "status": "degraded", "action": "created", "error": safe_browser_error(exc.detail), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, "created")


@app.patch("/api/cron/jobs/{job_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_cron(job_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    try:
        result = await up.request("brain", "PATCH", f"/api/jobs/{job_id}", json=payload)
    except HTTPException as exc:
        return {"id": safe_browser_string(job_id, "unknown"), "source": "brain", "status": "degraded", "action": "updated", "error": safe_browser_error(exc.detail), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, "updated")


@app.delete("/api/cron/jobs/{job_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_cron(job_id: str, up: Upstream = Depends(upstream)):
    try:
        result = await up.request("brain", "DELETE", f"/api/jobs/{job_id}")
    except HTTPException as exc:
        return {"id": safe_browser_string(job_id, "unknown"), "source": "brain", "status": "degraded", "action": "deleted", "error": safe_browser_error(exc.detail), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, "deleted")


@app.post("/api/cron/jobs/{job_id}/{action}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def cron_action(job_id: str, action: Literal["pause", "resume", "run"], up: Upstream = Depends(upstream)):
    try:
        result = await up.request("brain", "POST", f"/api/jobs/{job_id}/{action}")
    except HTTPException as exc:
        return {"id": safe_browser_string(job_id, "unknown"), "source": "brain", "status": "degraded", "action": safe_browser_string(action, "updated"), "error": safe_browser_error(exc.detail), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, action)


@app.get("/api/character", dependencies=[Depends(require_auth)])
async def character(store: Database = Depends(db)):
    item = store.row("SELECT * FROM character_profile WHERE id = 'primary'")
    profile = item or CharacterInput().model_dump()
    return {**profile, "context_preview": character_context(profile)}


@app.put("/api/character", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def save_character(payload: CharacterInput, store: Database = Depends(db)):
    item = {"id": "primary", **payload.model_dump(), "updated_at": now()}
    store.execute("""INSERT INTO character_profile VALUES (:id,:name,:owner_name,:personality,:background,:speaking_style,:boundaries,:avatar_url,:updated_at)
        ON CONFLICT(id) DO UPDATE SET name=:name,owner_name=:owner_name,personality=:personality,background=:background,speaking_style=:speaking_style,boundaries=:boundaries,avatar_url=:avatar_url,updated_at=:updated_at""", item)
    return {**item, "context_preview": character_context(item)}


@app.post("/api/mcp/suggestions", dependencies=[Depends(require_mcp)])
async def mcp_create_suggestion(payload: SuggestionInput, store: Database = Depends(db)):
    data = payload.model_dump()
    data["source"] = "brain"
    return store.create_suggestion(data)


@app.post("/api/mcp/apps", dependencies=[Depends(require_mcp)])
async def mcp_create_app(payload: AppInput, store: Database = Depends(db)):
    data = payload.model_dump()
    data["source"] = "brain"
    data["url"] = valid_url(data["url"])
    if data.get("health_url"):
        data["health_url"] = valid_url(data["health_url"])
    return store.create_app(data)


@app.get("/{full_path:path}", include_in_schema=False)
async def dashboard(full_path: str):
    """Serve the production Vite build while keeping API routes above this fallback."""
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(404, "API route not found")
    dist = Path(__file__).resolve().parents[2] / "dashboard" / "dist"
    candidate = dist / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)
    if (dist / "index.html").exists():
        return FileResponse(dist / "index.html")
    raise HTTPException(503, "Dashboard has not been built. Run npm run build in dashboard/.")

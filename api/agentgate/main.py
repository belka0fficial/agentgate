from __future__ import annotations

import asyncio
import json
import re
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal
from urllib.parse import quote, urlparse

import httpx
from fastapi import Body, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
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


class OwnerPasswordChange(BaseModel):
    current_key: str = Field(min_length=1, max_length=4096)
    new_key: str = Field(min_length=12, max_length=4096)


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


SYSTEM_BUILTIN_JOBS: tuple[dict[str, Any], ...] = (
    {
        "id": "system:technology-radar-global",
        "name": "technology-radar-global",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/product/technology-intelligence.md#technology-radar-global",
    },
    {
        "id": "system:technology-radar-china",
        "name": "technology-radar-china",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/product/technology-intelligence.md#technology-radar-china",
    },
    {
        "id": "system:agentgate-reference-refresh",
        "name": "agentgate-reference-refresh",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/product/technology-intelligence.md#agentgate-reference-refresh",
    },
    {
        "id": "system:agentgate-suggestion-discovery-scan",
        "name": "agentgate-suggestion-discovery-scan",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/product/continuous-improvement.md#agentgate-suggestion-discovery-scan",
    },
    {
        "id": "system:agent-skill-quality-review",
        "name": "agent-skill-quality-review",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/product/continuous-improvement.md#weekly-quality-job",
    },
    {
        "id": "system:auto-skill-update-review",
        "name": "auto-skill-update-review",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/product/continuous-improvement.md#auto-skill-update-review",
    },
    {
        "id": "system:flow-improvement-review",
        "name": "flow-improvement-review",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/product/continuous-improvement.md#flow-improvement-review",
    },
    {
        "id": "system:supply-chain-update-review",
        "name": "supply-chain-update-review",
        "kind": "cron",
        "status": "planned",
        "schedule": "weekly",
        "source_ref": "docs/architecture/software-supply-chain.md",
    },
)

SYSTEM_BUILTIN_JOB_IDS = {item["id"] for item in SYSTEM_BUILTIN_JOBS}


class CharacterInput(BaseModel):
    name: str = Field(default="Brain", max_length=120)
    owner_name: str = Field(default="", max_length=120)
    personality: str = Field(default="", max_length=10_000)
    background: str = Field(default="", max_length=10_000)
    boundaries: str = Field(default="", max_length=5_000)



def browser_unsafe_string(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    text = value
    lowered = text.lower()
    if re.search(r"\b(sk-[A-Za-z0-9_-]{8,}|sk-proj-[A-Za-z0-9_-]+|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|glpat-[A-Za-z0-9_-]+|hf_[A-Za-z0-9_-]+|xox[baprs]-[A-Za-z0-9-]+|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{10,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b", text):
        return True
    unsafe = (
        "http://", "https://", "file://", "/home/", "/users/", "/var/", "/etc/", "/root/", "/run/", "/tmp/",
        "c:/users/", "c:\\users\\", "\\users\\", ".sock", ".log", ".out", ".err", "stdout", "stderr", "log path",
        "bearer ", "authorization:", "api key:", "api_key:", "token=", "token:", "password=", "password:", "secret=", "secret:",
        "prompt:", "raw prompt", "hidden prompt", "system prompt", "private owner", "auth_headers", "api-key", "plain-provider-secret", "owner.txt", "api.openai.com", "api.anthropic.com",
        "generativelanguage.googleapis.com", "chatgpt.com/backend-api", "openrouter.ai/api", "raw_owner_prompt",
    )
    if re.search(r"(^|[^A-Za-z])[A-Za-z]:[\\/]", text):
        return True
    if "\\" in text or re.search(r"(^|\s)/(?:[A-Za-z0-9._-]+/){1,}", text):
        return True
    return any(part in lowered for part in unsafe)


def safe_browser_string(value: Any, fallback: str = "unknown") -> str:
    if not isinstance(value, str) or not value.strip():
        return fallback
    return "reference withheld" if browser_unsafe_string(value) else value


def safe_doc_source_ref(value: Any, fallback: str = "docs/README.md") -> str:
    if not isinstance(value, str):
        return fallback
    if re.fullmatch(r"docs/[A-Za-z0-9._/#:-]+", value):
        return value
    return safe_browser_string(value, fallback)


def safe_capability_label(value: Any, fallback: str) -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    if not text:
        return fallback
    lowered = text.lower()
    token_prefixes = ("glpat", "github", "github_pat", "ghp_", "hf_", "akia", "aiza", "eyj", "sk-", "xox", "bearer")
    if browser_unsafe_string(text) or lowered.startswith(token_prefixes) or "..." in text:
        return "reference withheld"
    if any(mark in text for mark in ("/", "\\", ":", "=", "@")):
        return "reference withheld"
    if "." in text and re.search(r"[A-Za-z0-9-]+\.[A-Za-z]{2,}", text):
        return "reference withheld"
    if len(text) >= 24 and " " not in text and re.search(r"[A-Za-z]", text) and re.search(r"[0-9]", text):
        return "reference withheld"
    if not re.fullmatch(r"[A-Za-z0-9 _.,()#:+-]{1,80}", text):
        return "reference withheld"
    return text


def capability_item_status(value: Any) -> str:
    return normalized_status(value)


def collection_status(payload: Any, rows: list[dict[str, Any]], kind: str) -> str:
    if isinstance(payload, dict) and payload.get("error"):
        return "degraded"
    if isinstance(payload, dict):
        explicit = normalized_status(payload.get("status") or payload.get("state"))
        if explicit != "unknown":
            return explicit
        if kind in payload:
            return "live" if rows else "empty"
    if isinstance(payload, list):
        return "live" if rows else "empty"
    return "unknown"


def safe_capability_error(source: str) -> dict[str, str]:
    return {"source": source, "message": "source unavailable"}


ALLOWED_SOURCE_STATUSES = {"live", "degraded", "offline", "stale", "blocked", "empty", "planned", "unknown"}


def normalized_status(value: Any, *, absent: str = "unknown") -> str:
    if value is None or value == "":
        return absent
    raw = str(value).strip().lower()
    aliases = {
        "ok": "live",
        "healthy": "unknown",
        "online": "unknown",
        "ready": "unknown",
        "connected": "unknown",
        "auth_required": "blocked",
        "unauthorized": "blocked",
        "forbidden": "blocked",
        "permission_denied": "blocked",
    }
    raw = aliases.get(raw, raw)
    return raw if raw in ALLOWED_SOURCE_STATUSES else "unknown"


def source_status(payload: Any, source: str) -> dict[str, str]:
    if isinstance(payload, dict) and payload.get("error"):
        return {"source": source, "status": "degraded", "message": "source unavailable"}
    if isinstance(payload, dict):
        return {"source": source, "status": normalized_status(payload.get("status") or payload.get("state"), absent="unknown")}
    if isinstance(payload, list):
        return {"source": source, "status": "live" if payload else "empty"}
    return {"source": source, "status": "empty"}


def safe_items(payload: Any, *, source: str, kind: str) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict):
        if kind in payload:
            rows = payload.get(kind) or []
        else:
            rows = payload.get("items") or payload.get("results") or []
    else:
        rows = []
    safe: list[dict[str, Any]] = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        safe.append({
            "id": f"{kind}-{index}",
            "name": safe_capability_label(item.get("name") or item.get("title") or item.get("id"), f"{kind.title()} item"),
            "status": capability_item_status(item.get("status") or item.get("state")),
            "source": source,
            "kind": kind,
            "metadata_only": True,
            "details_withheld": True,
        })
    return safe

def character_context(item: dict[str, Any]) -> str:
    """Make the local character settings inspectable before any broader sync exists."""
    name = item.get("name") or "Brain"
    owner = item.get("owner_name") or "the user"
    sections = [f"# Identity\nYou are {name}, the user's personal agent. Address the user as {owner}."]
    for label, key in (
        ("Personality", "personality"),
        ("Background", "background"),
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
        "action_payload_withheld": True,
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
    return {"source": source, "message": "source unavailable"}


def safe_browser_payload(value: Any) -> Any:
    return safe_browser_value(value)


def safe_memory_evidence(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list) or not value:
        return []
    return [{"count": len(value), "details_withheld": True}]


def safe_memory_record(item: Any, index: int) -> dict[str, Any]:
    if not isinstance(item, dict):
        item = {}
    kind = str(item.get("kind") or item.get("type") or "unknown").lower()
    if kind not in {"fact", "pattern", "theory", "context", "observation", "watch", "watch_item", "unknown"}:
        kind = "unknown"
    confidence = str(item.get("confidence") or item.get("state") or "unknown").lower()
    if confidence not in {"low", "medium", "high", "unknown", "stale", "unconfirmed"}:
        confidence = "unknown"
    row: dict[str, Any] = {
        "id": f"memory-{index + 1}",
        "title": f"Memory record {index + 1}",
        "kind": kind,
        "confidence": confidence,
        "metadata_only": True,
        "content_withheld": True,
        "evidence": safe_memory_evidence(item.get("evidence") or item.get("sources") or item.get("source_refs")),
        "linked_entity_count": len(item.get("entities") or item.get("linked_entities") or []) if isinstance(item.get("entities") or item.get("linked_entities") or [], list) else 0,
    }
    for key in ("updated_at", "created_at"):
        if isinstance(item.get(key), str):
            row[key] = safe_browser_string(item[key], "")
    if isinstance(item.get("source"), str):
        row["source"] = "memorygate"
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


def source_status_from(result: dict[str, Any], source: str) -> dict[str, Any]:
    accepted = {"live", "ok", "empty", "planned", "degraded", "offline", "stale", "unknown", "blocked"}
    if not result.get("ok"):
        error = result.get("error")
        status_hint = ""
        if isinstance(error, dict):
            status_hint = str(error.get("status") or error.get("code") or error.get("message") or "").lower()
        elif error is not None:
            status_hint = str(error).lower()
        failed_status = "blocked" if any(part in status_hint for part in ("auth_required", "unauthorized", "forbidden", "permission", "401", "403")) else "degraded"
        return {"status": failed_status, "source": source, "detail": safe_browser_error(error, source)}
    payload = result.get("data")
    raw_status = payload.get("status") if isinstance(payload, dict) else None
    status = safe_browser_string(raw_status, "unknown").lower() if raw_status else "unknown"
    if status == "ok":
        status = "live"
    elif status in {"auth_required", "unauthorized", "forbidden", "permission_denied"}:
        status = "blocked"
    elif status not in accepted:
        status = "unknown"
    return {"status": status, "source": source}


def safe_health_view(result: dict[str, Any], source: str) -> dict[str, Any]:
    view = source_status_from(result, source)
    view.pop("detail", None)
    view["metadata_only"] = True
    return view


def safe_suggestion_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [safe_suggestion(item) for item in rows[:3] if isinstance(item, dict)]


ATTENTION_NOTIFICATION_PLAN = {
    "status": "planned",
    "source": "agentgate",
    "delivery": [],
    "reason": "No durable browser push or background delivery notification contract is available.",
}


def attention_href(base: str, source_id: Any | None = None, *, source: str | None = None) -> str | None:
    safe_id = safe_browser_string(source_id, "") if source_id is not None else ""
    if source_id is not None and (not safe_id or safe_id == "reference withheld"):
        return None
    if base == "approvals" and source in {"brain", "toolgate"} and safe_id:
        return f"/approvals?source={source}&source_id={quote(safe_id, safe='')}"
    if base == "flow-execution" and safe_id:
        return f"/flow-execution/{quote(safe_id, safe='')}"
    if base == "suggestions":
        return "/suggestions"
    return None


def attention_approval_item(source: str, item: dict[str, Any]) -> dict[str, Any]:
    view = verification_view(source, item)
    canonical_source = source if source in {"brain", "toolgate"} else "unknown"
    row = {
        "kind": "pending_approval",
        "status": "live",
        "source": canonical_source,
        "source_id": view["source_id"],
        "title": "Approval requires review",
        "severity": "high" if str(view.get("severity") or "").lower() == "high" else "medium" if str(view.get("severity") or "").lower() == "medium" else "low",
        "metadata_only": True,
        "details_withheld": True,
    }
    href = attention_href("approvals", view["source_id"], source=canonical_source)
    if href:
        row["href"] = href
    return row


def dependency_attention_item(name: str, status: str) -> dict[str, Any]:
    return {
        "kind": "degraded_dependency",
        "status": status,
        "source": safe_browser_string(name, "dependency"),
        "title": f"{safe_browser_string(name, 'Dependency')} is {status}",
        "metadata_only": True,
        "details_withheld": True,
    }


def valid_attention_timestamp(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    candidate = value.strip().replace("Z", "+00:00")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})", value.strip()):
        return None
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def is_recent_attention_timestamp(value: Any) -> bool:
    normalized = valid_attention_timestamp(value)
    if not normalized:
        return False
    parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    now_utc = datetime.now(timezone.utc)
    return now_utc - timedelta(days=7) <= parsed <= now_utc


def job_failed_recently(item: dict[str, Any]) -> bool:
    status = str(item.get("last_status") or item.get("status") or item.get("state") or "").lower()
    timestamp = item.get("last_run_at") or item.get("last_run")
    if status in {"failed", "error"} and is_recent_attention_timestamp(timestamp):
        return True
    history = item.get("run_history")
    if isinstance(history, list):
        return any(
            isinstance(row, dict)
            and safe_run_history_label(row.get("status")) == "failed"
            and is_recent_attention_timestamp(row.get("completed_at") or row.get("finished_at") or row.get("created_at"))
            for row in history
        )
    return False


def failed_job_attention_item(item: dict[str, Any], index: int) -> dict[str, Any]:
    safe_id = safe_browser_string(item.get("id") or item.get("job_id"), f"job-{index + 1}")
    row = {
        "kind": "failed_recent_job",
        "status": "failed",
        "source": "brain",
        "source_id": safe_id,
        "title": "brain automation failed recently",
        "metadata_only": True,
        "details_withheld": True,
    }
    last_run = valid_attention_timestamp(item.get("last_run_at") or item.get("last_run"))
    if last_run:
        row["last_run"] = last_run
    href = attention_href("flow-execution", safe_id)
    if href:
        row["href"] = href
    return row


def suggestion_attention_item(item: dict[str, Any]) -> dict[str, Any]:
    suggestion = safe_suggestion(item)
    return {
        "kind": "new_suggestion",
        "status": suggestion["status"],
        "source": "agentgate",
        "source_id": suggestion["id"],
        "title": "New suggestion requires review",
        "priority": suggestion["priority"],
        "confidence": suggestion["confidence"],
        "confidence_label": suggestion["confidence_label"],
        "href": "/suggestions",
        "metadata_only": True,
        "details_withheld": True,
    }


async def optional_upstream(up: Upstream, name: str, path: str) -> dict[str, Any]:
    try:
        return {"ok": True, "data": await up.request(name, "GET", path)}
    except HTTPException as exc:
        return {"ok": False, "error": exc.detail}
    except Exception:
        return {"ok": False, "error": {"source": name, "message": "source unavailable"}}


def app_lifecycle_unavailable() -> dict[str, Any]:
    return {
        "available": False,
        "status": "planned",
        "source": "toolgate",
        "reason": "No approved ToolGate app lifecycle contract is available.",
        "actions": [],
    }


def safe_home_app_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": safe_browser_string(item.get("id"), f"app-{index + 1}"),
            "name": safe_browser_string(item.get("name"), "Pinned app"),
            "purpose": safe_browser_string(item.get("description") or item.get("purpose"), "not provided"),
            "pinned": bool(item.get("pinned", True)),
            "metadata_only": True,
        }
        for index, item in enumerate(rows[:8])
        if isinstance(item, dict)
    ]


def safe_opaque_ref(value: Any, fallback: str = "not provided") -> str:
    if not isinstance(value, str) or not value.strip():
        return fallback
    text = value.strip()
    if "/" in text or "\\" in text or "://" in text or re.match(r"^[A-Za-z]:", text) or len(text) > 120:
        return "reference withheld"
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,120}", text):
        return "reference withheld"
    return text


def safe_app_record(item: dict[str, Any], index: int = 0) -> dict[str, Any]:
    return {
        "id": safe_browser_string(item.get("id"), f"app-{index + 1}"),
        "name": safe_browser_string(item.get("name"), "App"),
        "purpose": safe_browser_string(item.get("description") or item.get("purpose"), "not provided"),
        "status": safe_browser_string(item.get("status"), "unknown").lower() if safe_browser_string(item.get("status"), "unknown").lower() in ALLOWED_SOURCE_STATUSES else "unknown",
        "source": safe_browser_string(item.get("source"), "agentgate-local-registry"),
        "source_ref": safe_opaque_ref(item.get("source_ref")),
        "pinned": bool(item.get("pinned", False)),
        "metadata_only": True,
        "lifecycle": app_lifecycle_unavailable(),
    }


def safe_app_rows(rows: list[dict[str, Any]], limit: int | None = 8) -> list[dict[str, Any]]:
    selected = rows[:limit] if limit is not None else rows
    safe: list[dict[str, Any]] = []
    for index, item in enumerate(selected):
        if isinstance(item, dict):
            safe.append(safe_app_record(item, index))
    return safe


def safe_brain_verification_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [verification_view("brain", item) for item in rows if isinstance(item, dict)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if len(settings.session_secret) < 32 or len(settings.mcp_key) < 16:
        raise RuntimeError("AGENTGATE_MCP_KEY (16+ chars) and AGENTGATE_SESSION_SECRET (32+ chars) are required")
    if settings.admin_key and len(settings.admin_key) < 16:
        raise RuntimeError("AGENTGATE_ADMIN_KEY must be 16+ chars when configured")
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
    return {
        "status": "live",
        "service": "agentgate",
        "time": now(),
        "process_only": True,
        "dependencies_checked": False,
        "dependency_health_route": "/api/health/dependencies",
    }


@app.post("/api/auth/login")
async def login(payload: Login, response: Response, request: Request, store: Database = Depends(db)):
    settings = request.app.state.settings
    if not (validate_admin_key(payload.credential, settings) or validate_stored_owner_key(payload.credential, store, settings)):
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


def owner_key_verifier(value: str, settings) -> str:
    return hmac.new(settings.session_secret.encode(), f"owner-key:{value}".encode(), hashlib.sha256).hexdigest()


def stored_owner_configured(store: Database) -> bool:
    return store.row("SELECT id FROM owner_config WHERE id = 'primary'") is not None


def validate_stored_owner_key(value: str, store: Database, settings) -> bool:
    row = store.row("SELECT verifier FROM owner_config WHERE id = 'primary'")
    if not row:
        return False
    return hmac.compare_digest(row.get("verifier", ""), owner_key_verifier(value, settings))


def owner_setup_required(store: Database, settings) -> bool:
    return not settings.admin_key and not stored_owner_configured(store)


@app.get("/api/auth/bootstrap")
async def auth_bootstrap(request: Request, store: Database = Depends(db)):
    setup_required = owner_setup_required(store, request.app.state.settings)
    return {
        "status": "setup_required" if setup_required else "configured",
        "setup_required": setup_required,
        "auth_mode": "owner_key",
        "metadata_only": True,
    }


@app.post("/api/auth/bootstrap")
async def auth_bootstrap_create(payload: Login, response: Response, request: Request, store: Database = Depends(db)):
    settings = request.app.state.settings
    if not owner_setup_required(store, settings):
        raise HTTPException(409, "Owner password is already configured")
    credential = payload.credential.strip()
    if len(credential) < 12:
        raise HTTPException(422, "Owner password must be at least 12 characters")
    store.execute("INSERT INTO owner_config (id, verifier, updated_at) VALUES ('primary', ?, ?)", (owner_key_verifier(credential, settings), now()))
    session_token = issue_session(settings)
    csrf_token = issue_csrf_token(session_token, settings)
    response.set_cookie(COOKIE_NAME, session_token, httponly=True, samesite="strict", max_age=43_200)
    response.set_cookie(CSRF_COOKIE_NAME, csrf_token, httponly=False, samesite="strict", max_age=43_200)
    result = owner_session_payload(True, csrf_token)
    result["setup_completed"] = True
    return result


@app.get("/api/auth/session", dependencies=[Depends(require_auth)])
async def session(request: Request):
    session_token = request.cookies.get(COOKIE_NAME, "")
    csrf_token = issue_csrf_token(session_token, request.app.state.settings) if session_token else None
    return owner_session_payload(True, csrf_token)


@app.put("/api/auth/password", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def change_owner_password(payload: OwnerPasswordChange, request: Request, store: Database = Depends(db)):
    settings = request.app.state.settings
    current = payload.current_key.strip()
    new_key = payload.new_key.strip()
    if len(new_key) < 12:
        raise HTTPException(422, "Owner password must be at least 12 characters")
    if not (validate_admin_key(current, settings) or validate_stored_owner_key(current, store, settings)):
        raise HTTPException(401, "Current owner password is invalid")
    store.execute(
        "INSERT INTO owner_config (id, verifier, updated_at) VALUES ('primary', ?, ?) ON CONFLICT(id) DO UPDATE SET verifier=excluded.verifier, updated_at=excluded.updated_at",
        (owner_key_verifier(new_key, settings), now()),
    )
    return {
        "status": "updated",
        "auth_mode": "owner_key",
        "metadata_only": True,
        "credentials_included": False,
        "token_included": False,
    }


def dependency_status_from_payload(payload: Any) -> str:
    if isinstance(payload, dict):
        status = str(payload.get("status") or payload.get("state") or "").lower()
        if status in {"degraded", "offline", "blocked", "auth_required", "stale", "empty", "planned", "unknown"}:
            return "blocked" if status == "auth_required" else status
        if status in {"unavailable", "unreachable"}:
            return "offline"
        if status in {"ok", "live"}:
            return "live"
    return "unknown"


def dependency_status_from_exception(exc: HTTPException) -> str:
    if exc.status_code in {401, 403}:
        return "blocked"
    detail = exc.detail
    if isinstance(detail, dict):
        status = str(detail.get("status") or detail.get("code") or detail.get("message") or "").lower()
        if "auth" in status or "forbidden" in status:
            return "blocked"
        if "degraded" in status:
            return "degraded"
    elif isinstance(detail, str):
        lowered = detail.lower()
        if "auth" in lowered or "forbidden" in lowered:
            return "blocked"
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


@app.get("/api/attention", dependencies=[Depends(require_auth)])
async def attention(up: Upstream = Depends(upstream), store: Database = Depends(db)):
    brain_health, toolgate_health, memorygate_health, systemgate_health, requests, jobs = await asyncio.gather(
        optional_upstream(up, "brain", "/health/detailed"),
        optional_upstream(up, "toolgate", "/v2/status"),
        optional_upstream(up, "memorygate", "/health"),
        optional_upstream(up, "systemgate", "/health"),
        optional_upstream(up, "toolgate", "/v2/requests"),
        optional_upstream(up, "brain", "/api/jobs"),
    )

    source_statuses = {
        "brain": source_status_from(brain_health, "brain"),
        "toolgate": source_status_from(toolgate_health, "toolgate"),
        "memorygate": source_status_from(memorygate_health, "memorygate"),
        "systemgate": source_status_from(systemgate_health, "systemgate"),
        "toolgate_requests": source_status_from(requests, "toolgate"),
        "brain_jobs": source_status_from(jobs, "brain"),
    }

    request_rows = requests.get("data") if requests.get("ok") else []
    toolgate_pending = [
        attention_approval_item("toolgate", item)
        for item in request_rows
        if isinstance(item, dict) and item.get("kind") == "verification" and item.get("status") == "pending"
    ] if isinstance(request_rows, list) else []
    brain_pending = [
        attention_approval_item(normalize_source(decoded.get("source")), decoded)
        for decoded in [store.decode(item) for item in store.rows("SELECT * FROM verification_refs WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10")]
    ]

    degraded_dependencies = [
        dependency_attention_item(name, row["status"])
        for name, row in source_statuses.items()
        if row.get("status") in {"degraded", "offline", "stale", "blocked", "auth_required"}
    ]

    job_rows = job_items(jobs.get("data")) if jobs.get("ok") else []
    failed_jobs = [
        failed_job_attention_item(item, index)
        for index, item in enumerate(job_rows)
        if job_failed_recently(item)
    ][:5]

    suggestion_rows = [store.decode(item) for item in store.rows("SELECT * FROM suggestions WHERE status = 'new' ORDER BY created_at DESC LIMIT 3")]
    suggestion_items = [suggestion_attention_item(item) for item in suggestion_rows]

    items = toolgate_pending + brain_pending + degraded_dependencies + failed_jobs + suggestion_items
    degraded = any(row.get("status") in {"degraded", "offline", "stale", "blocked", "auth_required"} for row in source_statuses.values())
    status = "degraded" if degraded else "live" if items else "empty"
    return {
        "metadata_only": True,
        "status": status,
        "source_status": source_statuses,
        "summary": {
            "pending_approvals": len(toolgate_pending) + len(brain_pending),
            "degraded_dependencies": len(degraded_dependencies),
            "failed_recent_jobs": len(failed_jobs),
            "new_suggestions": len(suggestion_items),
        },
        "items": items[:12],
        "empty_state": "empty" if not items else "live",
        "notifications": ATTENTION_NOTIFICATION_PLAN,
    }


@app.get("/api/home", dependencies=[Depends(require_auth)])
async def home(request: Request, up: Upstream = Depends(upstream), store: Database = Depends(db)):
    agent = request.app.state.settings.memorygate_agent_id

    async def optional(name: str, path: str):
        try:
            return {"ok": True, "data": await up.request(name, "GET", path)}
        except HTTPException as exc:
            return {"ok": False, "error": exc.detail}
        except Exception:
            return {"ok": False, "error": {"source": name, "message": "source unavailable"}}

    def data(result: dict[str, Any], fallback: Any) -> Any:
        return result.get("data") if result.get("ok") else fallback

    (
        brain_health,
        toolgate_health,
        memorygate_health,
        chats,
        jobs,
        requests,
        memory_briefing,
        memory_observations,
        memory_patterns,
    ) = await asyncio.gather(
        optional("brain", "/health/detailed"),
        optional("toolgate", "/v2/status"),
        optional("memorygate", "/health"),
        optional("brain", "/api/sessions"),
        optional("brain", "/api/jobs"),
        optional("toolgate", "/v2/requests"),
        optional("memorygate", f"/briefing/{agent}"),
        optional("memorygate", "/observation/active"),
        optional("memorygate", f"/pattern/active/{agent}"),
    )

    suggestions = safe_suggestion_rows([store.decode(item) for item in store.rows("SELECT * FROM suggestions WHERE status = 'new' ORDER BY created_at DESC LIMIT 3")])
    apps = safe_home_app_rows(store.rows("SELECT * FROM apps WHERE pinned = 1 ORDER BY position, name LIMIT 8"))
    request_rows = data(requests, [])
    toolgate_pending = [
        verification_view("toolgate", item)
        for item in request_rows
        if isinstance(item, dict) and item.get("kind") == "verification" and item.get("status") == "pending"
    ] if isinstance(request_rows, list) else []
    brain_pending = safe_brain_verification_rows([store.decode(item) for item in store.rows("SELECT * FROM verification_refs WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10")])

    chat_rows = safe_chat_rows(data(chats, {}))
    job_rows = safe_automation_rows(data(jobs, {}), "brain")
    active_jobs = [item for item in job_rows if not item.get("paused", False) and item.get("status") != "paused"][:5]

    briefing = data(memory_briefing, {})
    observations = data(memory_observations, [])
    patterns = data(memory_patterns, [])
    memory_counts_available = memorygate_health.get("ok") and (memory_briefing.get("ok") or memory_observations.get("ok") or memory_patterns.get("ok"))
    memory_status = "degraded" if not memory_counts_available else source_status_from(memorygate_health, "memorygate")["status"]
    if memory_status == "ok":
        memory_status = "live"
    active_observations = len(observations) if isinstance(observations, list) else 0
    active_patterns = len(patterns) if isinstance(patterns, list) else 0
    briefing_summary = safe_browser_string(briefing.get("summary") or briefing.get("briefing"), "unavailable") if isinstance(briefing, dict) else "unavailable"
    if briefing_summary == "reference withheld":
        briefing_summary = "details withheld"
    if not (memory_briefing.get("ok") and memory_observations.get("ok") and memory_patterns.get("ok")):
        memory_status = "degraded"
    if memory_status == "live" and briefing_summary == "unavailable" and active_observations == 0 and active_patterns == 0:
        memory_status = "empty"

    pending_verifications = toolgate_pending + brain_pending
    source_status = {
        "brain": source_status_from(brain_health, "brain"),
        "brain_chats": source_status_from(chats, "brain"),
        "brain_jobs": source_status_from(jobs, "brain"),
        "toolgate": source_status_from(toolgate_health, "toolgate"),
        "toolgate_requests": source_status_from(requests, "toolgate"),
        "memorygate": source_status_from(memorygate_health, "memorygate"),
        "memorygate_briefing": source_status_from(memory_briefing, "memorygate"),
        "memorygate_observations": source_status_from(memory_observations, "memorygate"),
        "memorygate_patterns": source_status_from(memory_patterns, "memorygate"),
    }
    return {
        "source_status": source_status,
        "health": {"brain": safe_health_view(brain_health, "brain"), "toolgate": safe_health_view(toolgate_health, "toolgate"), "memorygate": safe_health_view(memorygate_health, "memorygate")},
        "summary": {
            "pending_approvals": len(pending_verifications),
            "recent_chats": len(chat_rows[:5]),
            "active_jobs": len(active_jobs),
            "pinned_apps": len(apps),
            "suggestions": len(suggestions),
        },
        "empty_states": {
            "pending_verifications": "empty" if not pending_verifications and requests.get("ok") else "degraded" if not requests.get("ok") else "live",
            "recent_chats": "empty" if not chat_rows and chats.get("ok") else "degraded" if not chats.get("ok") else "live",
            "active_jobs": "empty" if not active_jobs and jobs.get("ok") else "degraded" if not jobs.get("ok") else "live",
            "pinned_apps": "empty" if not apps else "live",
            "suggestions": "empty" if not suggestions else "live",
        },
        "memory_status": {
            "status": memory_status,
            "source": "memorygate",
            "briefing": briefing_summary,
            "active_observations": active_observations,
            "active_patterns": active_patterns,
        },
        "suggestions": suggestions,
        "pinned_apps": apps,
        "pending_verifications": pending_verifications,
        "recent_chats": chat_rows[:5],
        "active_jobs": active_jobs,
        "activity": [],
    }


SESSION_ID_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}")


class SessionCreateInput(BaseModel):
    title: str = Field(default="New AgentGate conversation", min_length=1, max_length=160)
    agent_id: str | None = Field(default="agent_pi_operator", max_length=80)


class SessionRenameInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)


class SessionDeleteInput(BaseModel):
    confirm_source: Literal["brain"]
    confirm_session_id: str = Field(min_length=1, max_length=128)


def validate_session_id(value: Any) -> str:
    if not isinstance(value, str) or not SESSION_ID_RE.fullmatch(value) or browser_unsafe_string(value):
        raise HTTPException(422, "Session id must be a source-bound brain id")
    return value


def encoded_session_path(session_id: str, suffix: str = "") -> str:
    safe_id = validate_session_id(session_id)
    return f"/api/sessions/{quote(safe_id, safe='')}{suffix}"


def safe_session_text(value: Any, fallback: str) -> str:
    text = safe_browser_string(value, fallback)
    if text == "reference withheld":
        return text
    return text[:240]


def safe_session_status(value: Any, *, absent: str = "unknown") -> str:
    return normalized_status(value, absent=absent)


def session_rows_from_payload(payload: Any) -> list[Any]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("sessions", "items", "results"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []


def safe_chat_session(item: Any) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    raw_id = item.get("id") or item.get("session_id") or item.get("source_id")
    try:
        session_id = validate_session_id(raw_id)
    except HTTPException:
        return None
    row: dict[str, Any] = {
        "id": session_id,
        "source": "brain",
        "source_id": session_id,
        "title": safe_session_text(item.get("title") or item.get("name"), "Untitled session"),
        "preview": safe_session_text(item.get("preview") or item.get("summary") or item.get("last_message"), "No preview reported"),
        "updated_at": safe_browser_string(item.get("updated_at") or item.get("last_activity_at") or item.get("created_at"), "unknown"),
        "status": safe_session_status(item.get("status") or item.get("state"), absent="live"),
        "metadata_only": True,
        "details_withheld": True,
    }
    for key in ("created_at", "last_message_at"):
        if key in item:
            row[key] = safe_browser_string(item.get(key), "unknown")
    if isinstance(item.get("message_count"), int) and item["message_count"] >= 0:
        row["message_count"] = item["message_count"]
    elif isinstance(item.get("turn_count"), int) and item["turn_count"] >= 0:
        row["message_count"] = item["turn_count"]
    for key in ("model", "mode", "agent_id", "run_id"):
        if key in item:
            value = safe_browser_string(item.get(key), "unknown")
            if value != "reference withheld":
                row[key] = value
    return row


def safe_chat_sessions_response(payload: Any) -> dict[str, Any]:
    rows = [row for row in (safe_chat_session(item) for item in session_rows_from_payload(payload)) if row]
    explicit = normalized_status(payload.get("status") or payload.get("state"), absent="unknown") if isinstance(payload, dict) else "unknown"
    status = explicit if explicit != "unknown" else "live" if rows else "empty" if isinstance(payload, (dict, list)) else "unknown"
    return {
        "sessions": rows,
        "status": status,
        "source": "brain",
        "source_status": {"source": "brain", "status": status},
        "metadata_only": True,
        "safe_fields": ["id", "source", "source_id", "title", "preview", "updated_at", "status", "message_count", "model", "mode"],
    }


def safe_chat_detail_response(payload: Any) -> dict[str, Any]:
    source = payload.get("session") if isinstance(payload, dict) and isinstance(payload.get("session"), dict) else payload
    row = safe_chat_session(source)
    if not row:
        return {"session": None, "status": "missing", "source": "brain", "metadata_only": True}
    return {"session": row, "status": row["status"], "source": "brain", "metadata_only": True}


def safe_chat_mutation_response(payload: Any, *, status_fallback: str = "live") -> dict[str, Any]:
    if isinstance(payload, dict):
        raw_status = str(payload.get("status") or "").lower()
        raw_id = payload.get("id") or payload.get("session_id")
        if status_fallback == "deleted" and raw_status == "deleted":
            try:
                safe_id = validate_session_id(raw_id)
            except HTTPException:
                safe_id = "unknown"
            if safe_id != "unknown":
                return {"metadata_only": True, "source": "brain", "id": safe_id, "status": "deleted"}
    row = safe_chat_session(payload)
    if row:
        return {"session": row, "status": row["status"], "source": "brain", "metadata_only": True}
    if isinstance(payload, dict):
        raw_id = payload.get("id") or payload.get("session_id")
        try:
            safe_id = validate_session_id(raw_id)
        except HTTPException:
            safe_id = "unknown"
        if safe_id != "unknown":
            return {"metadata_only": True, "source": "brain", "id": safe_id, "status": safe_session_status(payload.get("status"), absent=status_fallback)}
    return {"metadata_only": True, "source": "brain", "status": status_fallback, "details_withheld": True}


def safe_upstream_http_error(exc: HTTPException, source: str = "brain") -> HTTPException:
    status_code = exc.status_code if isinstance(exc.status_code, int) else 503
    status = "blocked" if status_code in {401, 403} else "missing" if status_code == 404 else "degraded" if status_code >= 500 else "unknown"
    return HTTPException(status_code, {"source": source, "status": status, "message": "source unavailable"})


def validate_session_title(value: str) -> str:
    title = value.strip()
    if not title or browser_unsafe_string(title) or any(ord(ch) < 32 for ch in title):
        raise HTTPException(422, "Session title must be safe browser text")
    return title


@app.get("/api/chats", dependencies=[Depends(require_auth)])
async def chats(limit: int = 100, up: Upstream = Depends(upstream)):
    safe_limit = max(1, min(limit, 100))
    try:
        payload = await up.request("brain", "GET", "/api/sessions", params={"limit": safe_limit, "offset": 0, "include_children": True})
    except HTTPException as exc:
        status = "blocked" if exc.status_code in {401, 403} else "offline" if exc.status_code == 503 else "degraded"
        return {"sessions": [], "status": status, "source": "brain", "source_status": {"source": "brain", "status": status}, "metadata_only": True, "error": safe_browser_error(exc.detail, "brain")}
    return safe_chat_sessions_response(payload)


@app.post("/api/chats", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_chat(payload: SessionCreateInput, up: Upstream = Depends(upstream)):
    body: dict[str, Any] = {"title": validate_session_title(payload.title)}
    if payload.agent_id:
        agent_id = safe_browser_string(payload.agent_id, "")
        if not agent_id or agent_id == "reference withheld" or not re.fullmatch(r"[A-Za-z0-9._:@-]{1,80}", agent_id):
            raise HTTPException(422, "Agent id must be a source-bound safe id")
        body["agent_id"] = agent_id
    try:
        result = await up.request("brain", "POST", "/api/sessions", json=body)
    except HTTPException as exc:
        raise safe_upstream_http_error(exc) from exc
    return safe_chat_mutation_response(result)


@app.get("/api/chats/{session_id}", dependencies=[Depends(require_auth)])
async def chat(session_id: str, up: Upstream = Depends(upstream)):
    path = encoded_session_path(session_id)
    try:
        payload = await up.request("brain", "GET", path)
    except HTTPException as exc:
        raise safe_upstream_http_error(exc) from exc
    return safe_chat_detail_response(payload)


@app.patch("/api/chats/{session_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_chat(session_id: str, payload: SessionRenameInput, up: Upstream = Depends(upstream)):
    path = encoded_session_path(session_id)
    body = {"title": validate_session_title(payload.title)}
    try:
        result = await up.request("brain", "PATCH", path, json=body)
    except HTTPException as exc:
        raise safe_upstream_http_error(exc) from exc
    return safe_chat_mutation_response(result)


@app.delete("/api/chats/{session_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_chat(session_id: str, payload: SessionDeleteInput = Body(...), up: Upstream = Depends(upstream)):
    safe_id = validate_session_id(session_id)
    if payload.confirm_session_id != safe_id:
        raise HTTPException(422, "Delete requires explicit source confirmation for this brain session")
    path = encoded_session_path(safe_id)
    body = {"confirm_source": "brain", "confirm_session_id": safe_id}
    try:
        result = await up.request("brain", "DELETE", path, json=body, params={"confirm_source": "brain"})
    except HTTPException as exc:
        raise safe_upstream_http_error(exc) from exc
    return safe_chat_mutation_response(result, status_fallback="deleted")


def safe_chat_messages(payload: Any) -> Any:
    rows = payload.get("messages", []) if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        return {"messages": [], "metadata_only": True, "status": "unknown"}
    safe_rows: list[dict[str, Any]] = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        safe_item: dict[str, Any] = {
            "id": safe_browser_string(item.get("id"), f"message-{index}"),
            "role": safe_browser_string(item.get("role"), "unknown"),
            "content": item.get("content", "") if isinstance(item.get("content", ""), str) else "",
            "created_at": safe_browser_string(item.get("created_at"), "unknown"),
        }
        trace = item.get("trace")
        if isinstance(trace, list):
            safe_item["trace"] = [
                {
                    "tool": safe_browser_string(entry.get("tool"), "tool withheld"),
                    "duration_ms": entry.get("duration_ms") if isinstance(entry.get("duration_ms"), (int, float)) else None,
                    "details_withheld": True,
                }
                for entry in trace
                if isinstance(entry, dict)
            ]
        safe_rows.append(safe_item)
    status = "live" if isinstance(payload, list) or (isinstance(payload, dict) and isinstance(payload.get("messages"), list)) else "degraded" if isinstance(payload, dict) and payload.get("error") else "unknown"
    return {"messages": safe_rows, "metadata_only": True, "status": status}


@app.get("/api/chats/{session_id}/messages", dependencies=[Depends(require_auth)])
async def messages(session_id: str, up: Upstream = Depends(upstream)):
    path = encoded_session_path(session_id, "/messages")
    try:
        payload = await up.request("brain", "GET", path)
    except HTTPException as exc:
        raise safe_upstream_http_error(exc) from exc
    return safe_chat_messages(payload)


def safe_fork_response(payload: Any) -> dict[str, Any]:
    source = payload.get("session") if isinstance(payload, dict) and isinstance(payload.get("session"), dict) else payload
    row = safe_chat_session(source)
    if row:
        return {"session": row, "status": row["status"], "source": "brain", "metadata_only": True, "details_withheld": True}
    return {"status": "unknown", "source": "brain", "metadata_only": True, "details_withheld": True}


@app.post("/api/chats/{session_id}/fork", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def fork_chat(session_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    path = encoded_session_path(session_id, "/fork")
    try:
        result = await up.request("brain", "POST", path, json=safe_browser_payload(payload))
    except HTTPException as exc:
        raise safe_upstream_http_error(exc) from exc
    return safe_fork_response(result)


@app.post("/api/chats/{session_id}/stream", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def stream_chat(session_id: str, payload: ChatInput, request: Request):
    up: Upstream = request.app.state.upstream
    store: Database = request.app.state.db
    safe_session_id = validate_session_id(session_id)
    body: dict[str, Any] = {"input": payload.input}
    if payload.model: body["model"] = payload.model
    if payload.provider: body["provider"] = payload.provider
    if payload.intensity: body["model_options"] = {"reasoning_effort": payload.intensity}
    if payload.memory_incognito:
        body["instructions"] = "Do not create, update, or persist long-term memory for this turn."

    def safe_approval_event(value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            return {"status": "unknown", "metadata_only": True, "approval_payload_withheld": True}
        allowed = {
            "approval_id", "id", "request_id", "run_id", "session_id", "subject_type",
            "subject_id", "subject_version", "object_version", "version", "expires_at",
            "status", "decision", "args_digest", "created_at",
        }
        result = {key: safe_browser_string(value[key], "unknown") for key in allowed if key in value}
        result["metadata_only"] = True
        result["approval_payload_withheld"] = True
        return result

    async def events() -> AsyncIterator[bytes]:
        client = httpx.AsyncClient(timeout=None)
        try:
            stream_path = encoded_session_path(safe_session_id, "/chat/stream")
            response = await client.send(client.build_request("POST", f"{up.base('brain')}{stream_path}", headers={**up.headers("brain"), "Accept": "text/event-stream"}, json=body), stream=True)
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
                                "session_id": safe_session_id, "status": "pending", "summary": approval,
                                "expires_at": approval.get("expires_at"),
                            })
                    except (ValueError, TypeError):
                        pass
                if line.startswith("data:"):
                    try:
                        raw_event = json.loads(line[5:].strip())
                        if "approval" in event_name:
                            safe_event = safe_approval_event(raw_event)
                        elif isinstance(raw_event, dict):
                            safe_event = {}
                            for key, value in raw_event.items():
                                if browser_unsafe_key(str(key)) or browser_unsafe_string(str(key)):
                                    continue
                                if key in {"content", "delta", "text"} and isinstance(value, str):
                                    safe_event[key] = value
                                else:
                                    safe_event[key] = safe_browser_payload(value)
                            safe_event["metadata_only"] = True
                            safe_event["event_payload_withheld"] = True
                        else:
                            safe_event = {"metadata_only": True, "event_payload_withheld": True}
                        safe_line = json.dumps(safe_event, separators=(",", ":"))
                        yield f"event: {event_name}\n".encode()
                        yield f"data: {safe_line}\n".encode()
                    except (ValueError, TypeError):
                        yield b'event: message\n'
                        yield b'data: {\"status\":\"unknown\",\"metadata_only\":true,\"event_payload_withheld\":true}\n'
                elif line:
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
    async def optional(source: str, path: str):
        try:
            return await up.request(source, "GET", path)
        except HTTPException:
            return {"error": True}

    brain_caps, toolgate_status, tools, toolsets, skills, automations = await asyncio.gather(
        optional("brain", "/v1/capabilities"),
        optional("toolgate", "/v2/status"),
        optional("toolgate", "/v2/tools"),
        optional("brain", "/v1/toolsets"),
        optional("brain", "/v1/skills"),
        optional("toolgate", "/v2/automations"),
    )
    tool_rows = safe_items(tools, source="toolgate", kind="tools")
    toolset_rows = safe_items(toolsets, source="brain", kind="toolsets")
    skill_rows = safe_items(skills, source="brain", kind="skills")
    automation_rows = safe_items(automations, source="toolgate", kind="automations")
    brain_status = source_status(brain_caps, "brain")
    toolgate_state = source_status(toolgate_status, "toolgate")
    if isinstance(toolsets, dict) and toolsets.get("error") or isinstance(skills, dict) and skills.get("error"):
        brain_status = {"source": "brain", "status": "degraded", "message": "source unavailable"}
    if isinstance(tools, dict) and tools.get("error") or isinstance(automations, dict) and automations.get("error"):
        toolgate_state = {"source": "toolgate", "status": "degraded", "message": "source unavailable"}
    return {
        "metadata_only": True,
        "sources": {
            "brain": brain_status,
            "toolgate": toolgate_state,
        },
        "section_statuses": {
            "tools": collection_status(tools, tool_rows, "tools"),
            "toolsets": collection_status(toolsets, toolset_rows, "toolsets"),
            "skills": collection_status(skills, skill_rows, "skills"),
            "automations": collection_status(automations, automation_rows, "automations"),
        },
        "tools": tool_rows,
        "toolsets": toolset_rows,
        "skills": skill_rows,
        "automations": automation_rows,
        "counts": {
            "tools": len(tool_rows),
            "toolsets": len(toolset_rows),
            "skills": len(skill_rows),
            "automations": len(automation_rows),
        },
    }


@app.get("/api/capabilities/{kind}", dependencies=[Depends(require_auth)])
async def capability_kind(kind: Literal["skills", "toolsets"], up: Upstream = Depends(upstream)):
    try:
        payload = await up.request("brain", "GET", f"/v1/{kind}")
    except HTTPException:
        return {kind: [], "source": "brain", "status": "degraded", "error": safe_capability_error("brain"), "metadata_only": True}
    rows = safe_items(payload, source="brain", kind=kind)
    explicit_status = source_status(payload, "brain")["status"]
    status = explicit_status
    if status == "unknown" and isinstance(payload, dict) and kind in payload:
        status = "live" if rows else "empty"
    return {kind: rows, "source": "brain", "status": status, "metadata_only": True}


VERIFICATION_HISTORY_UNAVAILABLE_REASON = "No real source-bound approval history query contract is available."


def verification_history_unavailable() -> dict[str, Any]:
    return {
        "available": False,
        "status": "unavailable",
        "source": "toolgate+brain",
        "reason": VERIFICATION_HISTORY_UNAVAILABLE_REASON,
        "items": [],
        "metadata_only": True,
    }


async def verification_center_payload(store: Database, up: Upstream) -> dict[str, Any]:
    source_statuses: dict[str, dict[str, Any]] = {}
    try:
        toolgate = await up.request("toolgate", "GET", "/v2/requests")
        if isinstance(toolgate, list):
            request_status = "live" if toolgate else "empty"
        elif isinstance(toolgate, dict):
            request_status = normalized_status(toolgate.get("status") or toolgate.get("state"))
            if request_status == "unknown":
                request_status = "unknown"
        else:
            request_status = "unknown"
        source_statuses["toolgate_requests"] = {"status": request_status, "source": "toolgate"}
    except HTTPException as exc:
        toolgate = []
        source_statuses["toolgate_requests"] = {
            "status": dependency_status_from_exception(exc),
            "source": "toolgate",
            "error": safe_browser_error(exc.detail, "toolgate"),
        }

    pending: list[dict[str, Any]] = []
    if isinstance(toolgate, list):
        pending.extend(
            verification_view("toolgate", item)
            for item in toolgate
            if isinstance(item, dict)
            and item.get("kind") == "verification"
            and item.get("status", "pending") == "pending"
        )

    for item in store.rows("SELECT * FROM verification_refs WHERE status = 'pending' ORDER BY created_at DESC"):
        decoded = store.decode(item)
        pending.append(verification_view(normalize_source(decoded.get("source")), decoded))

    return {
        "metadata_only": True,
        "safe_fields": [
            "id",
            "source",
            "source_id",
            "status",
            "severity",
            "title",
            "details",
            "binding",
            "action",
            "created_at",
            "expires_at",
        ],
        "pending": pending,
        "pending_count": len(pending),
        "history": verification_history_unavailable(),
        "sources": source_statuses,
    }


@app.get("/api/verifications", dependencies=[Depends(require_auth)])
async def verifications(store: Database = Depends(db), up: Upstream = Depends(upstream)):
    return await verification_center_payload(store, up)


@app.get("/api/approvals", dependencies=[Depends(require_auth)])
async def approvals(store: Database = Depends(db), up: Upstream = Depends(upstream)):
    return await verification_center_payload(store, up)


@app.post("/api/verifications/toolgate/{request_id:path}/decision", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def decide_toolgate(request_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    decision = payload.get("decision")
    if decision not in {"approved", "rejected"}:
        raise HTTPException(422, "Decision must be approved or rejected")
    upstream_id = quote(request_id, safe="")
    result = await up.request("toolgate", "POST", f"/v2/requests/{upstream_id}/decision", json=payload)
    return decision_result_view("toolgate", request_id, result, str(payload.get("decision") or "decided"))


@app.post("/api/runs/{run_id}/stop", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def stop_run(run_id: str, up: Upstream = Depends(upstream)):
    result = await up.request("brain", "POST", f"/v1/runs/{run_id}/stop")
    return decision_result_view("brain", run_id, result, "stopped")


@app.post("/api/runs/{run_id}/approval", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def approve_run(run_id: str, payload: dict[str, Any]):
    return JSONResponse(status_code=423, content={
        "id": safe_browser_string(run_id, "unknown"),
        "source": "brain",
        "status": "blocked",
        "action": "approval not confirmed",
        "metadata_only": True,
        "raw_response_withheld": True,
        "error": {"source": "agentgate", "message": "Brain approvals require a stored source-bound verification."},
    })


@app.post("/api/verifications/brain/{source_id:path}/decision", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def decide_brain(source_id: str, payload: dict[str, Any], store: Database = Depends(db), up: Upstream = Depends(upstream)):
    decision = payload.get("decision")
    if decision not in {"approved", "rejected"}:
        raise HTTPException(422, "Decision must be approved or rejected")
    item = store.row("SELECT * FROM verification_refs WHERE source IN ('brain', 'hermes') AND source_id = ?", (source_id,))
    if not item or not item.get("run_id"):
        raise HTTPException(404, "Brain approval is no longer available")
    result = await up.request("brain", "POST", f"/v1/runs/{item['run_id']}/approval", json={"decision": decision})
    store.upsert_verification({"source": "brain", "source_id": source_id, "run_id": item["run_id"], "session_id": item.get("session_id"), "status": decision, "summary": store.decode(item).get("summary", {}), "expires_at": item.get("expires_at")})
    return decision_result_view("brain", source_id, result, str(decision))


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
    rows = store.rows("SELECT * FROM apps ORDER BY pinned DESC, position, name")
    safe_rows = safe_app_rows(rows, limit=None)
    return {
        "apps": safe_rows,
        "source_status": {"status": "unknown" if safe_rows else "empty", "source": "agentgate-local-registry"},
        "metadata_only": True,
        "safe_fields": ["id", "name", "purpose", "status", "source", "source_ref", "pinned", "lifecycle"],
        "creation": {
            "status": "planned",
            "source": "toolgate",
            "requires_approval": True,
            "reason": "App creation/deployment requires ToolGate approval.",
        },
    }


@app.get("/api/apps/{app_id}", dependencies=[Depends(require_auth)])
async def app_detail(app_id: str, store: Database = Depends(db)):
    item = store.row("SELECT * FROM apps WHERE id = ?", (app_id,))
    if not item:
        raise HTTPException(404, "App not found")
    return {"app": safe_app_record(item), "metadata_only": True}


@app.post("/api/apps", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_app(payload: AppInput):
    return {
        "status": "pending_approval",
        "source": "toolgate",
        "requires_approval": True,
        "metadata_only": True,
        "app": {
            "name": safe_browser_string(payload.name, "App"),
            "purpose": safe_browser_string(payload.description, "not provided"),
            "source": safe_browser_string(payload.source, "manual"),
            "source_ref": safe_opaque_ref(payload.source_ref),
            "pinned": bool(payload.pinned),
            "lifecycle": app_lifecycle_unavailable(),
        },
        "reason": "App creation/deployment must be approved through ToolGate before local registry mutation.",
    }


@app.patch("/api/apps/{app_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_app(app_id: str, payload: dict[str, Any], store: Database = Depends(db)):
    allowed = {key: value for key, value in payload.items() if key in {"name", "description", "status", "pinned", "position"}}
    if not allowed:
        raise HTTPException(422, "No supported fields")
    if "pinned" in allowed:
        allowed["pinned"] = int(bool(allowed["pinned"]))
    assignments = ", ".join(f"{key} = ?" for key in allowed) + ", updated_at = ?"
    store.execute(f"UPDATE apps SET {assignments} WHERE id = ?", (*allowed.values(), now(), app_id))
    item = store.row("SELECT * FROM apps WHERE id = ?", (app_id,))
    if not item:
        raise HTTPException(404, "App not found")
    return {"app": safe_app_record(item), "metadata_only": True}


@app.delete("/api/apps/{app_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_app(app_id: str, store: Database = Depends(db)):
    if not store.row("SELECT id FROM apps WHERE id = ?", (app_id,)):
        raise HTTPException(404, "App not found")
    store.execute("DELETE FROM apps WHERE id = ?", (app_id,))
    return {"deleted": True, "metadata_only": True}


@app.post("/api/apps/{app_id}/health-check", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def check_app(app_id: str, store: Database = Depends(db)):
    if not store.row("SELECT id FROM apps WHERE id = ?", (app_id,)):
        raise HTTPException(404, "App not found")
    return JSONResponse(status_code=501, content={
        "id": safe_browser_string(app_id, "unknown"),
        "status": "planned",
        "source": "toolgate",
        "action": "health-check",
        "metadata_only": True,
        "reason": "App health checks require a safe source-bound lifecycle contract.",
    })


@app.post("/api/apps/{app_id}/{action}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def app_lifecycle_action(app_id: str, action: Literal["start", "stop", "restart"], store: Database = Depends(db)):
    if not store.row("SELECT id FROM apps WHERE id = ?", (app_id,)):
        raise HTTPException(404, "App not found")
    return JSONResponse(status_code=501, content={
        "id": safe_browser_string(app_id, "unknown"),
        "status": "planned",
        "source": "toolgate",
        "action": safe_browser_string(action, "updated"),
        "metadata_only": True,
        "reason": "No real approved ToolGate app lifecycle route is available.",
    })


@app.get("/api/gates/toolgate", dependencies=[Depends(require_auth)])
async def toolgate_gate(up: Upstream = Depends(upstream)):
    async def optional(path: str):
        try:
            return await up.request("toolgate", "GET", path)
        except HTTPException as exc:
            return {"error": safe_browser_error(exc.detail, "toolgate")}

    status, tools, automations, services, events = await asyncio.gather(
        optional("/v2/status"),
        optional("/v2/tools"),
        optional("/v2/automations"),
        optional("/v2/services"),
        optional("/v2/events?limit=12"),
    )
    safe_status = safe_browser_payload(status)
    if isinstance(status, dict) and "error" in status:
        safe_status = {"error": safe_browser_error(status.get("error"), "toolgate")}
    source_statuses = {
        "status": toolgate_source_status(status),
        "tools": toolgate_source_status(tools),
        "automations": toolgate_source_status(automations),
        "services": toolgate_source_status(services),
        "events": toolgate_source_status(events),
    }
    return {
        "metadata_only": True,
        "safe_fields": ["id", "name", "status", "source", "kind", "schedule", "next_run", "last_run", "approval_request_id", "approval_href", "actions"],
        "source_status": source_statuses,
        "status": safe_status,
        "tools": safe_items(tools, source="toolgate", kind="tools"),
        "automations": safe_toolgate_automation_rows(automations),
        "services": safe_items(services, source="toolgate", kind="services"),
        "events": safe_toolgate_events(events),
        "error": safe_status.get("error") if isinstance(safe_status, dict) else None,
    }


@app.get("/api/gates/memorygate", dependencies=[Depends(require_auth)])
async def memorygate_gate(request: Request, up: Upstream = Depends(upstream)):
    agent = request.app.state.settings.memorygate_agent_id

    async def optional(method: str, path: str):
        try:
            return await up.request("memorygate", method, path)
        except HTTPException as exc:
            return {"error": safe_browser_error(exc.detail, "memorygate")}

    briefing, memories, observations, patterns = await asyncio.gather(
        optional("GET", f"/briefing/{agent}"),
        optional("GET", "/memory"),
        optional("GET", "/observation/active"),
        optional("GET", f"/pattern/active/{agent}"),
    )
    errors = {
        "briefing": briefing.get("error") if isinstance(briefing, dict) else None,
        "memories": memories.get("error") if isinstance(memories, dict) else None,
        "observations": observations.get("error") if isinstance(observations, dict) else None,
        "patterns": patterns.get("error") if isinstance(patterns, dict) else None,
    }
    return {
        "metadata_only": True,
        "safe_fields": ["id", "title", "kind", "confidence", "updated_at", "created_at", "state", "source", "evidence", "entities"],
        "source_status": {
            "briefing": source_status(briefing, "memorygate"),
            "memories": source_status(memories, "memorygate"),
            "observations": source_status(observations, "memorygate"),
            "patterns": source_status(patterns, "memorygate"),
        },
        "search": {
            "status": "planned",
            "source": "memorygate",
            "route": "/api/gates/memorygate/search",
            "method": "POST",
            "metadata_only": True,
            "content_withheld": True,
        },
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


def flow_loop_runtime_planned() -> dict[str, Any]:
    return {
        "flow_execution": {
            "status": "planned",
            "source": "pi-runtime",
            "reason": "No versioned Pi-native Flow execution definition contract is available through AgentGate yet.",
        },
        "loop_execution": {
            "status": "planned",
            "source": "pi-runtime",
            "reason": "No versioned Pi-native bounded Loop execution definition contract is available through AgentGate yet.",
        },
    }


RUN_HISTORY_LABELS = {
    "ok": "success",
    "success": "success",
    "completed": "success",
    "failed": "failed",
    "error": "failed",
    "blocked": "blocked",
    "pending_approval": "blocked",
    "stopped": "stopped",
    "cancelled": "stopped",
    "canceled": "stopped",
    "running": "running",
    "stopping": "stopping",
    "planned": "planned",
    "unavailable": "unavailable",
    "unknown": "unknown",
}


def safe_run_history_label(value: Any) -> str:
    status = safe_browser_string(value, "unknown").lower()
    return RUN_HISTORY_LABELS.get(status, "unknown")


def safe_run_history_rows(value: Any) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else []
    safe_rows: list[dict[str, Any]] = []
    for item in rows[:12]:
        if not isinstance(item, dict):
            continue
        status = safe_browser_string(item.get("status"), "unknown").lower()
        row = {
            "status": status,
            "label": safe_run_history_label(status),
            "details_withheld": True,
        }
        completed_at = safe_browser_string(item.get("completed_at"), "")
        if completed_at:
            row["completed_at"] = completed_at
        safe_rows.append(row)
    return safe_rows


def has_active_runtime(item: dict[str, Any]) -> bool:
    active = item.get("active_run")
    if isinstance(active, dict):
        active_status = str(active.get("status") or active.get("state") or "").lower()
        return active_status in {"running", "active", "stopping"}
    status = str(item.get("status") or item.get("state") or "").lower()
    return status in {"running", "active", "stopping"}


def flow_execution_kind(item: dict[str, Any]) -> str:
    raw = str(item.get("kind") or item.get("type") or "").strip().lower()
    if raw in {"flow", "loop", "cron", "job"}:
        return "cron" if raw == "job" else raw
    identifier = str(item.get("id") or item.get("job_id") or "").lower()
    if "loop" in identifier:
        return "loop"
    if "flow" in identifier:
        return "flow"
    return "cron"


def safe_flow_execution_definition(item: dict[str, Any], *, system: bool = False) -> dict[str, Any]:
    definition_id = safe_browser_string(item.get("id") or item.get("job_id"), "unknown")
    kind = flow_execution_kind(item)
    status = safe_browser_string(item.get("status") or item.get("last_status"), "planned" if system else "unknown").lower()
    if status not in ALLOWED_SOURCE_STATUSES and status not in {"running", "paused", "active", "stopping", "pending_approval"}:
        status = "unknown"
    run_history = safe_run_history_rows(item.get("run_history"))
    active = item.get("active_run") if isinstance(item.get("active_run"), dict) else None
    active_status = safe_browser_string(active.get("status") if active else None, "running" if status == "running" else "")
    is_active = has_active_runtime(item)
    row: dict[str, Any] = {
        "id": definition_id,
        "kind": kind,
        "source": "agentgate" if system else "brain",
        "owner": "system" if system else "user",
        "editable": not system,
        "status": status,
        "metadata_only": True,
        "execution": {
            "status": "planned",
            "available": False,
            "source": "pi-runtime",
            "details_withheld": True,
        },
        "runs": item.get("runs", 0) if isinstance(item.get("runs", 0), int) else 0,
        "history_labels": [row["label"] for row in run_history],
        "run_history": run_history,
        "output": {"status": "unavailable", "raw_withheld": True},
        "actions": [],
    }
    for key in ("schedule", "next_run_at", "next", "last_run_at", "last_run"):
        if isinstance(item.get(key), str):
            public_key = "next_run" if key in {"next_run_at", "next"} else "last_run" if key in {"last_run_at", "last_run"} else key
            row[public_key] = safe_browser_string(item.get(key), "")
    if is_active:
        row["active_run"] = {
            "status": active_status or "running",
            "started_at": safe_browser_string(active.get("started_at") if active else None, "unknown"),
            "cancellable": not system,
        }
    else:
        row["active_run"] = None
    if not system and is_active:
        row["actions"] = [{"name": "cancel", "enabled": True, "route": f"/api/cron/jobs/{quote(definition_id, safe='')}/stop", "method": "POST"}]
    return row


def job_items(payload: Any) -> list[dict[str, Any]]:
    rows = payload if isinstance(payload, list) else payload.get("jobs", payload.get("automations", [])) if isinstance(payload, dict) else []
    return [item for item in rows if isinstance(item, dict)]


def flow_execution_unavailable_payload(exc: HTTPException) -> dict[str, Any]:
    return {
        "metadata_only": True,
        "source_status": source_status_from({"ok": False, "error": exc.detail}, "brain"),
        "runtime": {
            "source": "brain",
            "execution_source_bound": False,
            "flow_loop_engine": "planned",
            "supported_actions": [],
            "details_withheld": True,
        },
        "definitions_status": "planned",
        "definitions": [],
        "planned": flow_loop_runtime_planned(),
        "cancellation": {
            "status": "blocked",
            "source": "brain",
            "route": "/api/cron/jobs/{job_id}/stop",
            "reason": "Cancellation is available only through a real scoped upstream stop route for an active runtime job.",
        },
        "error": safe_browser_error(exc.detail, "brain"),
    }


@app.get("/api/flow-execution", dependencies=[Depends(require_auth)])
async def flow_execution(up: Upstream = Depends(upstream)):
    try:
        jobs = await up.request("brain", "GET", "/api/jobs")
    except HTTPException as exc:
        return flow_execution_unavailable_payload(exc)
    definitions = [
        safe_flow_execution_definition(item)
        for item in job_items(jobs)
        if not (isinstance(item.get("id") or item.get("job_id"), str) and str(item.get("id") or item.get("job_id")) in SYSTEM_BUILTIN_JOB_IDS)
    ]
    return {
        "metadata_only": True,
        "source_status": source_status_from({"ok": True, "data": jobs}, "brain"),
        "runtime": {
            "source": "brain",
            "execution_source_bound": True,
            "flow_loop_engine": "planned",
            "supported_actions": ["job.stop"] if any(has_active_runtime(item) for item in job_items(jobs)) else [],
            "details_withheld": True,
        },
        "definitions_status": "live" if definitions else "empty",
        "definitions": definitions,
        "planned": flow_loop_runtime_planned(),
        "cancellation": {
            "status": "live" if any(has_active_runtime(item) for item in job_items(jobs)) else "planned",
            "source": "brain",
            "route": "/api/cron/jobs/{job_id}/stop",
            "reason": "Only active runtime jobs can be stopped through the scoped Pi adapter route.",
        },
    }


@app.get("/api/flow-execution/{definition_id:path}", dependencies=[Depends(require_auth)])
async def flow_execution_detail(definition_id: str, up: Upstream = Depends(upstream)):
    if is_system_builtin_job(definition_id):
        item = next((row for row in SYSTEM_BUILTIN_JOBS if row["id"] == definition_id), {"id": definition_id})
        return {"definition": safe_flow_execution_definition(item, system=True), "metadata_only": True}
    try:
        jobs = await up.request("brain", "GET", "/api/jobs")
    except HTTPException as exc:
        return JSONResponse(status_code=503, content=flow_execution_unavailable_payload(exc))
    for item in job_items(jobs):
        if str(item.get("id") or item.get("job_id") or "") == definition_id:
            return {"definition": safe_flow_execution_definition(item), "metadata_only": True, "source_status": source_status_from({"ok": True, "data": jobs}, "brain")}
    raise HTTPException(404, "Flow execution definition not found")


@app.get("/api/cron/jobs", dependencies=[Depends(require_auth)])
async def cron_jobs(up: Upstream = Depends(upstream)):
    try:
        jobs = await up.request("brain", "GET", "/api/jobs")
    except HTTPException as exc:
        return {
            "jobs": system_builtin_job_rows(),
            "error": safe_browser_error(exc.detail, "brain"),
            "metadata_only": True,
            "raw_response_withheld": True,
        }
    return {"jobs": safe_automation_rows(jobs, "brain", exclude_ids=SYSTEM_BUILTIN_JOB_IDS) + system_builtin_job_rows(), "metadata_only": True}


def unavailable_flow_history(kind: str) -> dict[str, str]:
    if kind in {"flow", "loop"}:
        return {"status": "unavailable", "reason": "Pi flow/loop history contract not available"}
    return {"status": "planned", "reason": "No runtime history contract available for built-in system jobs"}


def safe_output_summary(status: str) -> dict[str, Any]:
    return {"status": safe_browser_string(status, "planned"), "raw_withheld": True}


def system_builtin_job_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in SYSTEM_BUILTIN_JOBS:
        status = safe_browser_string(item.get("status"), "planned")
        kind = safe_browser_string(item.get("kind"), "cron")
        rows.append({
            "id": safe_browser_string(item.get("id"), "system:unknown"),
            "name": safe_browser_string(item.get("name"), "system built-in job"),
            "owner": "system",
            "editable": False,
            "kind": kind,
            "status": status,
            "schedule": safe_browser_string(item.get("schedule"), "planned"),
            "source": "agentgate",
            "source_ref": safe_doc_source_ref(item.get("source_ref")),
            "metadata_only": True,
            "last_run": None,
            "next_run": None,
            "output": safe_output_summary(status),
            "history": unavailable_flow_history(kind),
        })
    return rows



def validate_job_id(value: Any) -> str:
    if not isinstance(value, str) or not SESSION_ID_RE.fullmatch(value) or browser_unsafe_string(value):
        raise HTTPException(422, "Job id must be a safe source-bound id")
    return value

def is_system_builtin_job(job_id: str) -> bool:
    return job_id in SYSTEM_BUILTIN_JOB_IDS


def locked_system_job_response(job_id: str, action: str) -> dict[str, Any]:
    return {
        "id": safe_browser_string(job_id, "system:unknown"),
        "owner": "system",
        "editable": False,
        "status": "blocked",
        "action": safe_browser_string(action, "updated"),
        "error": {"source": "agentgate", "message": "Built-in system jobs are locked and metadata-only."},
        "metadata_only": True,
        "raw_response_withheld": True,
    }


def safe_automation_rows(value: Any, source: str, exclude_ids: set[str] | None = None) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else value.get("jobs", value.get("automations", [])) if isinstance(value, dict) else []
    safe_rows: list[dict[str, Any]] = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        raw_id = item.get("id") or item.get("job_id")
        if exclude_ids and isinstance(raw_id, str) and raw_id in exclude_ids:
            continue
        row: dict[str, Any] = {
            "id": safe_browser_string(raw_id, f"{source}-{index + 1}"),
            "name": f"{source} automation",
            "status": safe_browser_string(item.get("status") or item.get("last_status"), "unknown"),
            "source": source,
            "owner": "user",
            "editable": True,
            "kind": "automation" if source == "toolgate" else "cron",
            "metadata_only": True,
            "output": {"status": "unavailable", "raw_withheld": True},
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
            "kind": (item.get("kind") or item.get("type")) if str(item.get("kind") or item.get("type") or "").lower() in {"tool", "approval", "run", "action", "event", "error"} else "event",
            "status": normalized_status(item.get("status") or item.get("state")),
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



def safe_toolgate_automation_rows(value: Any) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else value.get("automations", value.get("items", [])) if isinstance(value, dict) else []
    safe_rows: list[dict[str, Any]] = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        row: dict[str, Any] = {
            "id": safe_browser_string(item.get("id") or item.get("automation_id"), f"automation-{index + 1}"),
            "name": "toolgate automation",
            "status": normalized_status(item.get("status") or item.get("state")),
            "source": "toolgate",
            "owner": "user",
            "editable": False,
            "kind": "automation",
            "metadata_only": True,
            "details_withheld": True,
            "output": {"status": "unavailable", "raw_withheld": True},
            "actions": [{"name": "run", "status": "planned", "requires_approval": True}],
        }
        for key in ("schedule", "next_run", "next", "last_run"):
            if isinstance(item.get(key), str):
                row[key] = safe_browser_string(item.get(key), "")
        approval_id = item.get("approval_request_id") or item.get("approval_id") or item.get("request_id")
        if isinstance(approval_id, str):
            safe_approval_id = safe_browser_string(approval_id, "reference withheld")
            row["approval_request_id"] = safe_approval_id
            if safe_approval_id != "reference withheld":
                row["approval_href"] = f"/approvals?source_id={quote(safe_approval_id, safe='')}"
        safe_rows.append(row)
    return safe_rows


def toolgate_source_status(payload: Any) -> dict[str, str]:
    status = source_status(payload, "toolgate")
    return {"status": status["status"], "source": "toolgate"}


def safe_systemgate_collection(payload: Any, *, key: str = "results") -> Any:
    if not isinstance(payload, dict):
        return safe_browser_payload(payload)
    rows = payload.get(key)
    if isinstance(rows, list):
        status = "live" if rows else "empty"
        shaped: dict[str, Any] = {
            key: safe_browser_payload(rows),
            "status": status,
            "source": "systemgate",
            "metadata_only": True,
        }
        if payload.get("error"):
            shaped["warning"] = safe_browser_error(payload.get("error"), "systemgate")
        return shaped
    if payload.get("error"):
        return {"error": safe_browser_error(payload.get("error"), "systemgate")}
    return safe_browser_payload(payload)


@app.get("/api/automations", dependencies=[Depends(require_auth)])
async def automations(up: Upstream = Depends(upstream)):
    async def optional(name: str, path: str):
        try:
            return await up.request(name, "GET", path)
        except HTTPException as exc:
            return {"error": safe_browser_error(exc.detail, name)}
    jobs, toolgate_automations = await asyncio.gather(
        optional("brain", "/api/jobs"),
        optional("toolgate", "/v2/automations"),
    )
    return {
        "jobs": system_builtin_job_rows() + safe_automation_rows(jobs, "brain", exclude_ids=SYSTEM_BUILTIN_JOB_IDS),
        "toolgate_automations": safe_toolgate_automation_rows(toolgate_automations),
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
            return {"error": safe_browser_error(exc.detail, "systemgate")}
    vitals, containers, backups = await asyncio.gather(
        optional("/vitals"),
        optional("/containers"),
        optional("/backups"),
    )
    return {"vitals": safe_browser_payload(vitals), "containers": safe_systemgate_collection(containers), "backups": safe_browser_payload(backups)}


@app.post("/api/cron/jobs", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_cron(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    try:
        result = await up.request("brain", "POST", "/api/jobs", json=payload)
    except HTTPException as exc:
        return {"id": "unknown", "source": "brain", "status": "degraded", "action": "not_confirmed", "error": safe_browser_error(exc.detail, "brain"), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, "created")


@app.patch("/api/cron/jobs/{job_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_cron(job_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    job_id = validate_job_id(job_id)
    if is_system_builtin_job(job_id):
        return JSONResponse(status_code=423, content=locked_system_job_response(job_id, "updated"))
    try:
        result = await up.request("brain", "PATCH", f"/api/jobs/{job_id}", json=payload)
    except HTTPException as exc:
        return {"id": safe_browser_string(job_id, "unknown"), "source": "brain", "status": "degraded", "action": "not_confirmed", "error": safe_browser_error(exc.detail, "brain"), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, "updated")


@app.delete("/api/cron/jobs/{job_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_cron(job_id: str, up: Upstream = Depends(upstream)):
    job_id = validate_job_id(job_id)
    if is_system_builtin_job(job_id):
        return JSONResponse(status_code=423, content=locked_system_job_response(job_id, "deleted"))
    try:
        result = await up.request("brain", "DELETE", f"/api/jobs/{job_id}")
    except HTTPException as exc:
        return {"id": safe_browser_string(job_id, "unknown"), "source": "brain", "status": "degraded", "action": "not_confirmed", "error": safe_browser_error(exc.detail, "brain"), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, "deleted")


@app.post("/api/cron/jobs/{job_id}/{action}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def cron_action(job_id: str, action: Literal["pause", "resume", "run", "stop"], up: Upstream = Depends(upstream)):
    job_id = validate_job_id(job_id)
    if is_system_builtin_job(job_id):
        return JSONResponse(status_code=423, content=locked_system_job_response(job_id, action))
    upstream_id = quote(job_id, safe="")
    if action == "stop":
        try:
            jobs = await up.request("brain", "GET", "/api/jobs")
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"id": safe_browser_string(job_id, "unknown"), "source": "brain", "status": "degraded", "action": "not_confirmed", "requested_action": "stop", "error": safe_browser_error(exc.detail, "brain"), "metadata_only": True, "raw_response_withheld": True})
        matching = next((item for item in job_items(jobs) if str(item.get("id") or item.get("job_id") or "") == job_id), None)
        active = isinstance(matching, dict) and has_active_runtime(matching)
        if not matching:
            raise HTTPException(404, "Job not found")
        if not active:
            raise HTTPException(409, "Job has no active run")
    try:
        result = await up.request("brain", "POST", f"/api/jobs/{upstream_id}/{action}")
    except HTTPException as exc:
        if action == "stop" and exc.status_code in {404, 405, 410, 501}:
            return JSONResponse(status_code=501, content={
                "id": safe_browser_string(job_id, "unknown"),
                "source": "brain",
                "status": "planned",
                "action": "stop_unavailable",
                "requested_action": "stop",
                "error": safe_browser_error(exc.detail, "brain"),
                "metadata_only": True,
                "raw_response_withheld": True,
            })
        return {"id": safe_browser_string(job_id, "unknown"), "source": "brain", "status": "degraded", "action": "not_confirmed", "requested_action": safe_browser_string(action, "updated"), "error": safe_browser_error(exc.detail, "brain"), "metadata_only": True, "raw_response_withheld": True}
    return safe_action_result("brain", result, "stopping" if action == "stop" and isinstance(result, dict) and str(result.get("status") or result.get("state") or "").lower() == "stopping" else "stopped" if action == "stop" else action)


CONKER_AVATAR_PACKAGE = {
    "id": "conker-head",
    "asset": "conker-head-local-svg",
    "emotion_pack": "conker-basic-v1",
    "default_emotion": "smug",
    "emotions": [
        {"id": "neutral", "label": "Neutral", "asset": "conker-head-neutral"},
        {"id": "annoyed", "label": "Annoyed", "asset": "conker-head-annoyed"},
        {"id": "smug", "label": "Smug", "asset": "conker-head-smug"},
        {"id": "focused", "label": "Focused", "asset": "conker-head-focused"},
    ],
}


@app.get("/api/character", dependencies=[Depends(require_auth)])
async def character(store: Database = Depends(db)):
    item = store.row("SELECT * FROM character_profile WHERE id = 'primary'")
    profile = item or {
        "id": "primary",
        "name": "",
        "owner_name": "",
        "personality": "",
        "background": "",
        "boundaries": "",
        "updated_at": "",
    }
    safe_profile = {key: profile.get(key, "") for key in ("id", "name", "owner_name", "personality", "background", "boundaries", "updated_at")}
    return {**safe_profile, "configured": item is not None, "avatar": CONKER_AVATAR_PACKAGE, "context_preview": character_context(safe_profile)}


@app.put("/api/character", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def save_character(payload: CharacterInput, store: Database = Depends(db)):
    item = {"id": "primary", **payload.model_dump(), "speaking_style": "", "avatar_url": None, "updated_at": now()}
    store.execute("""INSERT INTO character_profile (id,name,owner_name,personality,background,speaking_style,boundaries,avatar_url,updated_at) VALUES (:id,:name,:owner_name,:personality,:background,:speaking_style,:boundaries,:avatar_url,:updated_at)
        ON CONFLICT(id) DO UPDATE SET name=:name,owner_name=:owner_name,personality=:personality,background=:background,boundaries=:boundaries,updated_at=:updated_at""", item)
    safe_item = {key: item.get(key, "") for key in ("id", "name", "owner_name", "personality", "background", "boundaries", "updated_at")}
    return {**safe_item, "configured": True, "avatar": CONKER_AVATAR_PACKAGE, "context_preview": character_context(safe_item)}


@app.post("/api/mcp/suggestions", dependencies=[Depends(require_mcp)])
async def mcp_create_suggestion(payload: SuggestionInput, store: Database = Depends(db)):
    data = payload.model_dump()
    data["source"] = "brain"
    return store.create_suggestion(data)


@app.post("/api/mcp/apps", dependencies=[Depends(require_mcp)])
async def mcp_create_app():
    return JSONResponse(status_code=423, content={
        "status": "blocked",
        "source": "toolgate",
        "requires_approval": True,
        "message": "App creation requires ToolGate approval.",
        "metadata_only": True,
    })


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
    return HTMLResponse("<!doctype html><title>AgentGate</title><main>AgentGate dashboard build is not present in this server worktree.</main>")

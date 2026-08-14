from __future__ import annotations

import asyncio
import json
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
    key: str = Field(min_length=1)


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
    name: str = Field(default="Hermes", max_length=120)
    owner_name: str = Field(default="", max_length=120)
    personality: str = Field(default="", max_length=10_000)
    background: str = Field(default="", max_length=10_000)
    speaking_style: str = Field(default="", max_length=5_000)
    boundaries: str = Field(default="", max_length=5_000)
    avatar_url: str | None = Field(default=None, max_length=2_000)


def character_context(item: dict[str, Any]) -> str:
    """Make the local character settings inspectable before any Hermes sync exists."""
    name = item.get("name") or "Hermes"
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
    """Keep approval details useful without exposing credentials in the browser."""
    lowered = key.lower()
    if any(part in lowered for part in ("token", "secret", "password", "authorization", "api_key", "cookie")):
        return "[redacted]"
    if isinstance(value, dict):
        return {str(name): redact_sensitive(item, str(name)) for name, item in value.items()}
    if isinstance(value, list):
        return [redact_sensitive(item) for item in value]
    return value


def verification_view(source: str, item: dict[str, Any]) -> dict[str, Any]:
    payload = item.get("payload") or item.get("summary") or {}
    binding = payload.get("binding") if isinstance(payload, dict) else {}
    return {
        "source": source,
        "source_id": item.get("source_id") or item.get("id"),
        "status": item.get("status", "pending"),
        "title": item.get("title") or (payload.get("title") if isinstance(payload, dict) else None) or "Approval required",
        "details": item.get("details") or (payload.get("message") if isinstance(payload, dict) else None),
        "actor": item.get("actor") or (payload.get("actor") if isinstance(payload, dict) else None),
        "severity": item.get("severity") or (payload.get("risk") if isinstance(payload, dict) else "normal"),
        "created_at": item.get("created_at"),
        "expires_at": item.get("expires_at") or (binding or {}).get("expires_at"),
        "session_id": item.get("session_id"),
        "run_id": item.get("run_id"),
        "action": redact_sensitive({
            "subject_type": payload.get("subject_type"), "subject_id": payload.get("subject_id"),
            "subject_version": payload.get("subject_version") or payload.get("object_version") or payload.get("version"),
            "arguments": payload.get("args"), "binding": {
                "expires_at": (binding or {}).get("expires_at"),
                "args_digest": (binding or {}).get("args_digest"),
                "consumed_at": (binding or {}).get("consumed_at"),
            },
        }) if isinstance(payload, dict) else {},
    }


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
    if not validate_admin_key(payload.key, request.app.state.settings):
        raise HTTPException(401, "Invalid key")
    session_token = issue_session(request.app.state.settings)
    response.set_cookie(COOKIE_NAME, session_token, httponly=True, samesite="strict", max_age=43_200)
    response.set_cookie(CSRF_COOKIE_NAME, issue_csrf_token(session_token, request.app.state.settings), httponly=False, samesite="strict", max_age=43_200)
    return {"authenticated": True}


@app.post("/api/auth/logout", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    response.delete_cookie(CSRF_COOKIE_NAME)
    return {"authenticated": False}


@app.get("/api/auth/session", dependencies=[Depends(require_auth)])
async def session():
    return {"authenticated": True}


@app.get("/api/health/dependencies", dependencies=[Depends(require_auth)])
async def dependency_health(up: Upstream = Depends(upstream)):
    async def check(name: str, path: str):
        try:
            await up.request(name, "GET", path)
            return {"name": name, "status": "online"}
        except HTTPException as exc:
            return {"name": name, "status": "offline", "detail": exc.detail}
    return await asyncio.gather(check("hermes", "/health"), check("toolgate", "/health"), check("memorygate", "/health"), check("systemgate", "/health"))


@app.get("/api/home", dependencies=[Depends(require_auth)])
async def home(request: Request, up: Upstream = Depends(upstream), store: Database = Depends(db)):
    async def optional(name: str, path: str):
        try:
            return await up.request(name, "GET", path)
        except HTTPException as exc:
            return {"error": exc.detail}
    hermes, toolgate, memorygate, chats, jobs, requests = await asyncio.gather(
        optional("hermes", "/health/detailed"), optional("toolgate", "/v2/status"), optional("memorygate", "/health"),
        optional("hermes", "/api/sessions"), optional("hermes", "/api/jobs"), optional("toolgate", "/v2/requests"),
    )
    suggestions = [store.decode(item) for item in store.rows("SELECT * FROM suggestions WHERE status = 'new' ORDER BY created_at DESC LIMIT 3")]
    apps = store.rows("SELECT * FROM apps WHERE pinned = 1 ORDER BY position, name LIMIT 8")
    toolgate_pending = [item for item in requests if isinstance(item, dict) and item.get("kind") == "verification" and item.get("status") == "pending"] if isinstance(requests, list) else []
    hermes_pending = [store.decode(item) for item in store.rows("SELECT * FROM verification_refs WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10")]
    chat_rows = chats if isinstance(chats, list) else chats.get("sessions", chats.get("items", [])) if isinstance(chats, dict) else []
    job_rows = jobs if isinstance(jobs, list) else jobs.get("jobs", []) if isinstance(jobs, dict) else []
    return {
        "health": {"hermes": hermes, "toolgate": toolgate, "memorygate": memorygate}, "suggestions": suggestions,
        "pinned_apps": apps, "pending_verifications": [{"source": "toolgate", "source_id": item.get("id"), **item} for item in toolgate_pending] + hermes_pending,
        "recent_chats": chat_rows[:5], "active_jobs": [item for item in job_rows if not item.get("paused", False)][:5],
    }


@app.get("/api/chats", dependencies=[Depends(require_auth)])
async def chats(limit: int = 100, up: Upstream = Depends(upstream)):
    return await up.request("hermes", "GET", "/api/sessions", params={"limit": min(limit, 100), "offset": 0, "include_children": True})


@app.post("/api/chats", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_chat(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "POST", "/api/sessions", json=payload)


@app.get("/api/chats/{session_id}", dependencies=[Depends(require_auth)])
async def chat(session_id: str, up: Upstream = Depends(upstream)):
    return await up.request("hermes", "GET", f"/api/sessions/{session_id}")


@app.patch("/api/chats/{session_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_chat(session_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "PATCH", f"/api/sessions/{session_id}", json=payload)


@app.delete("/api/chats/{session_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_chat(session_id: str, up: Upstream = Depends(upstream)):
    return await up.request("hermes", "DELETE", f"/api/sessions/{session_id}")


@app.get("/api/chats/{session_id}/messages", dependencies=[Depends(require_auth)])
async def messages(session_id: str, up: Upstream = Depends(upstream)):
    return await up.request("hermes", "GET", f"/api/sessions/{session_id}/messages")


@app.post("/api/chats/{session_id}/fork", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def fork_chat(session_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "POST", f"/api/sessions/{session_id}/fork", json=payload)


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
            response = await client.send(client.build_request("POST", f"{up.base('hermes')}/api/sessions/{session_id}/chat/stream", headers={**up.headers("hermes"), "Accept": "text/event-stream"}, json=body), stream=True)
            if response.is_error:
                yield f"event: run.failed\ndata: {json.dumps({'message': 'Hermes stream failed', 'status': response.status_code})}\n\n".encode()
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
                                "source": "hermes", "source_id": source_id, "run_id": str(approval.get("run_id") or "") or None,
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
            yield b"event: run.failed\ndata: {\"message\":\"Hermes stream disconnected\"}\n\n"
        finally:
            await client.aclose()
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/models", dependencies=[Depends(require_auth)])
async def models(up: Upstream = Depends(upstream)):
    return await up.request("hermes", "GET", "/api/model/options")


@app.get("/api/capabilities", dependencies=[Depends(require_auth)])
async def capabilities(up: Upstream = Depends(upstream)):
    return await up.request("hermes", "GET", "/v1/capabilities")


@app.get("/api/capabilities/{kind}", dependencies=[Depends(require_auth)])
async def capability_kind(kind: Literal["skills", "toolsets"], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "GET", f"/v1/{kind}")


@app.get("/api/verifications", dependencies=[Depends(require_auth)])
async def verifications(store: Database = Depends(db), up: Upstream = Depends(upstream)):
    try:
        toolgate = await up.request("toolgate", "GET", "/v2/requests")
    except HTTPException:
        toolgate = []
    rows = [verification_view("toolgate", item) for item in toolgate if item.get("kind") == "verification"]
    rows.extend(verification_view("hermes", store.decode(item)) for item in store.rows("SELECT * FROM verification_refs ORDER BY created_at DESC"))
    return rows


@app.get("/api/approvals", dependencies=[Depends(require_auth)])
async def approvals(store: Database = Depends(db), up: Upstream = Depends(upstream)):
    return await verifications(store, up)


@app.post("/api/verifications/toolgate/{request_id}/decision", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def decide_toolgate(request_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("toolgate", "POST", f"/v2/requests/{request_id}/decision", json=payload)


@app.post("/api/runs/{run_id}/stop", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def stop_run(run_id: str, up: Upstream = Depends(upstream)):
    return await up.request("hermes", "POST", f"/v1/runs/{run_id}/stop")


@app.post("/api/runs/{run_id}/approval", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def approve_run(run_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "POST", f"/v1/runs/{run_id}/approval", json=payload)


@app.post("/api/verifications/hermes/{source_id}/decision", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def decide_hermes(source_id: str, payload: dict[str, Any], store: Database = Depends(db), up: Upstream = Depends(upstream)):
    item = store.row("SELECT * FROM verification_refs WHERE source = 'hermes' AND source_id = ?", (source_id,))
    if not item or not item.get("run_id"):
        raise HTTPException(404, "Hermes approval is no longer available")
    result = await up.request("hermes", "POST", f"/v1/runs/{item['run_id']}/approval", json=payload)
    store.upsert_verification({"source": "hermes", "source_id": source_id, "run_id": item["run_id"], "session_id": item.get("session_id"), "status": payload.get("decision", "approved"), "summary": store.decode(item).get("summary", {}), "expires_at": item.get("expires_at")})
    return result


@app.get("/api/suggestions", dependencies=[Depends(require_auth)])
async def suggestions(store: Database = Depends(db)):
    return [store.decode(item) for item in store.rows("SELECT * FROM suggestions ORDER BY created_at DESC")]


@app.post("/api/suggestions", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_suggestion(payload: SuggestionInput, store: Database = Depends(db)):
    return store.create_suggestion(payload.model_dump())


@app.patch("/api/suggestions/{suggestion_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_suggestion(suggestion_id: str, payload: dict[str, Any], store: Database = Depends(db)):
    allowed = {key: value for key, value in payload.items() if key in {"status", "title", "summary", "category", "confidence", "urgency"}}
    if not allowed: raise HTTPException(422, "No supported fields")
    assignments = ", ".join(f"{key} = ?" for key in allowed) + ", updated_at = ?"
    store.execute(f"UPDATE suggestions SET {assignments} WHERE id = ?", (*allowed.values(), now(), suggestion_id))
    item = store.row("SELECT * FROM suggestions WHERE id = ?", (suggestion_id,))
    if not item: raise HTTPException(404, "Suggestion not found")
    return store.decode(item)


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
        except HTTPException as exc: return {"error": exc.detail}
    status, tools, automations, services, events = await asyncio.gather(optional("/v2/status"), optional("/v2/tools"), optional("/v2/automations"), optional("/v2/services"), optional("/v2/events?limit=12"))
    return {"status": status, "tools": tools if isinstance(tools, list) else [], "automations": automations if isinstance(automations, list) else [], "services": services if isinstance(services, list) else [], "events": events if isinstance(events, list) else [], "error": status.get("error") if isinstance(status, dict) else None}


@app.get("/api/gates/memorygate", dependencies=[Depends(require_auth)])
async def memorygate_gate(request: Request, up: Upstream = Depends(upstream)):
    agent = request.app.state.settings.memorygate_agent_id
    async def optional(method: str, path: str):
        try: return await up.request("memorygate", method, path)
        except HTTPException as exc: return {"error": exc.detail}
    briefing, memories, observations, patterns = await asyncio.gather(
        optional("GET", f"/briefing/{agent}"), optional("GET", "/memory"),
        optional("GET", "/observation/active"), optional("GET", f"/pattern/active/{agent}"),
    )
    return {
        "briefing": briefing, "memories": memories if isinstance(memories, list) else [],
        "observations": observations if isinstance(observations, list) else [],
        "patterns": patterns if isinstance(patterns, list) else [],
    }


@app.post("/api/gates/memorygate/search", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def memory_search(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("memorygate", "POST", "/memory/search", json=payload)


@app.get("/api/cron/jobs", dependencies=[Depends(require_auth)])
async def cron_jobs(up: Upstream = Depends(upstream)):
    return await up.request("hermes", "GET", "/api/jobs")


@app.get("/api/automations", dependencies=[Depends(require_auth)])
async def automations(up: Upstream = Depends(upstream)):
    async def optional(name: str, path: str):
        try:
            return await up.request(name, "GET", path)
        except HTTPException as exc:
            return {"error": exc.detail}
    jobs, toolgate_automations = await asyncio.gather(
        optional("hermes", "/api/jobs"),
        optional("toolgate", "/v2/automations"),
    )
    return {
        "jobs": jobs if isinstance(jobs, list) else jobs.get("jobs", []) if isinstance(jobs, dict) else [],
        "toolgate_automations": toolgate_automations if isinstance(toolgate_automations, list) else [],
        "errors": {
            "hermes": jobs.get("error") if isinstance(jobs, dict) else None,
            "toolgate": toolgate_automations.get("error") if isinstance(toolgate_automations, dict) else None,
        },
    }


@app.get("/api/system", dependencies=[Depends(require_auth)])
async def system(up: Upstream = Depends(upstream)):
    async def optional(path: str):
        try:
            return await up.request("systemgate", "GET", path)
        except HTTPException as exc:
            return {"error": exc.detail}
    vitals, containers, backups = await asyncio.gather(
        optional("/vitals"),
        optional("/containers"),
        optional("/backups"),
    )
    return {"vitals": vitals, "containers": containers, "backups": backups}


@app.post("/api/cron/jobs", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def create_cron(payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "POST", "/api/jobs", json=payload)


@app.patch("/api/cron/jobs/{job_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def update_cron(job_id: str, payload: dict[str, Any], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "PATCH", f"/api/jobs/{job_id}", json=payload)


@app.delete("/api/cron/jobs/{job_id}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def delete_cron(job_id: str, up: Upstream = Depends(upstream)):
    return await up.request("hermes", "DELETE", f"/api/jobs/{job_id}")


@app.post("/api/cron/jobs/{job_id}/{action}", dependencies=[Depends(require_auth), Depends(require_csrf)])
async def cron_action(job_id: str, action: Literal["pause", "resume", "run"], up: Upstream = Depends(upstream)):
    return await up.request("hermes", "POST", f"/api/jobs/{job_id}/{action}")


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
    data["source"] = "hermes"
    return store.create_suggestion(data)


@app.post("/api/mcp/apps", dependencies=[Depends(require_mcp)])
async def mcp_create_app(payload: AppInput, store: Database = Depends(db)):
    data = payload.model_dump()
    data["source"] = "hermes"
    data["url"] = valid_url(data["url"])
    if data.get("health_url"):
        data["health_url"] = valid_url(data["health_url"])
    return store.create_app(data)


@app.get("/{full_path:path}", include_in_schema=False)
async def dashboard(full_path: str):
    """Serve the production Vite build while keeping API routes above this fallback."""
    dist = Path(__file__).resolve().parents[2] / "dashboard" / "dist"
    candidate = dist / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)
    if (dist / "index.html").exists():
        return FileResponse(dist / "index.html")
    raise HTTPException(503, "Dashboard has not been built. Run npm run build in dashboard/.")

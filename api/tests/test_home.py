from __future__ import annotations

from fastapi import HTTPException
from fastapi.testclient import TestClient


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("agentgate_csrf", "")}


def test_home_aggregates_source_bound_sections_with_partial_failure(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("MEMORYGATE_AGENT_ID", "brain")

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if (name, method, path) == ("brain", "GET", "/health/detailed"):
            return {"status": "ok", "version": "brain-test"}
        if (name, method, path) == ("toolgate", "GET", "/v2/status"):
            return {"status": "ok", "lockdown": False}
        if (name, method, path) == ("memorygate", "GET", "/health"):
            return {"status": "ok", "service": "memorygate"}
        if (name, method, path) == ("brain", "GET", "/api/sessions"):
            return {"sessions": [
                {"id": "chat-1", "title": "First", "preview": "One", "updated_at": "2030-01-01T00:00:00Z"},
                {"id": "chat-2", "title": "Second", "preview": "Two", "updated_at": "2029-01-01T00:00:00Z"},
            ]}
        if (name, method, path) == ("brain", "GET", "/api/jobs"):
            return {"jobs": [
                {"id": "job-1", "name": "Running", "status": "running", "paused": False, "last_status": "success"},
                {"id": "job-2", "name": "Paused", "status": "paused", "paused": True},
            ]}
        if (name, method, path) == ("toolgate", "GET", "/v2/requests"):
            raise HTTPException(503, {"source": "toolgate", "message": "requests down"})
        if (name, method, path) == ("memorygate", "GET", "/briefing/brain"):
            return {"summary": "bounded briefing", "facts": 7}
        if (name, method, path) == ("memorygate", "GET", "/observation/active"):
            return [{"id": "obs-1"}]
        if (name, method, path) == ("memorygate", "GET", "/pattern/active/brain"):
            return [{"id": "pat-1"}, {"id": "pat-2"}]
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        store = app.state.db
        suggestion = store.create_suggestion({"title": "Study", "summary": "Do the safe spike", "source": "brain"})
        app_item = store.create_app({"name": "Pinned", "url": "http://127.0.0.1:9000", "pinned": True})
        brain_approval = store.upsert_verification({"source": "brain", "source_id": "approval-1", "status": "pending", "summary": {"title": "Need owner"}})

        response = client.get("/api/home")

    assert response.status_code == 200
    body = response.json()
    assert body["source_status"]["toolgate_requests"]["status"] == "degraded"
    assert body["source_status"]["brain"]["status"] == "live"
    assert body["source_status"]["memorygate"]["status"] == "live"
    assert body["pinned_apps"][0]["id"] == app_item["id"]
    assert body["suggestions"][0]["id"] == suggestion["id"]
    assert body["pending_verifications"][0]["source_id"] == brain_approval["source_id"]
    assert body["pending_verifications"][0]["title"] == "Need owner"
    assert body["pending_verifications"][0]["action_payload_withheld"] is True
    assert [chat["id"] for chat in body["recent_chats"]] == ["chat-1", "chat-2"]
    assert [job["id"] for job in body["active_jobs"]] == ["job-1"]
    assert body["memory_status"] == {
        "status": "live",
        "source": "memorygate",
        "briefing": "bounded briefing",
        "active_observations": 1,
        "active_patterns": 2,
    }


def test_home_reports_empty_states_without_invented_activity(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in {"/health/detailed", "/v2/status", "/health"}:
            return {"status": "ok"}
        if path == "/api/sessions":
            return {"sessions": []}
        if path == "/api/jobs":
            return {"jobs": []}
        if path == "/v2/requests":
            return []
        if path.startswith("/briefing/"):
            return {}
        if path in {"/observation/active"} or path.startswith("/pattern/active/"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/home")

    body = response.json()
    assert body["summary"] == {
        "pending_approvals": 0,
        "recent_chats": 0,
        "active_jobs": 0,
        "pinned_apps": 0,
        "suggestions": 0,
    }
    assert body["empty_states"]["pending_verifications"] == "empty"
    assert body["empty_states"]["recent_chats"] == "empty"
    assert body["empty_states"]["active_jobs"] == "empty"
    assert body["memory_status"]["status"] == "empty"
    assert body["activity"] == []



def test_home_does_not_expose_raw_toolgate_args_or_health_details(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("MEMORYGATE_AGENT_ID", "brain")

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if (name, method, path) == ("brain", "GET", "/health/detailed"):
            return {"status": "offline", "provider_url": "https://api.openai.com/v1", "host_path": "/home/alexey/.config/provider"}
        if (name, method, path) == ("toolgate", "GET", "/v2/status"):
            return {"status": "degraded", "docker_socket": "/var/run/docker.sock"}
        if (name, method, path) == ("memorygate", "GET", "/health"):
            return {"status": "offline", "message": "dependency unavailable"}
        if (name, method, path) == ("toolgate", "GET", "/v2/requests"):
            return [{"kind": "verification", "status": "pending", "id": "req-1", "payload": {"title": "Run command", "args": {"cmd": "cat /home/alexey/secrets.txt", "prompt": "system prompt text", "path": "/home/alexey/project/.env", "api_key": "sk-test"}, "binding": {"args_digest": "digest"}}}]
        if path == "/api/sessions":
            return {"sessions": []}
        if path == "/api/jobs":
            return {"jobs": []}
        if path.startswith("/briefing/"):
            return {}
        if path in {"/observation/active"} or path.startswith("/pattern/active/"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/home")

    body = response.json()
    assert body["source_status"]["brain"]["status"] == "offline"
    assert body["source_status"]["toolgate"]["status"] == "degraded"
    assert body["source_status"]["memorygate"]["status"] == "offline"
    assert body["health"] == {
        "brain": {"status": "offline", "source": "brain", "metadata_only": True},
        "toolgate": {"status": "degraded", "source": "toolgate", "metadata_only": True},
        "memorygate": {"status": "offline", "source": "memorygate", "metadata_only": True},
    }
    encoded = str(body)
    for unsafe in ("api.openai.com", "/home/alexey", "/var/run/docker.sock", "system prompt", "secrets.txt", ".env", "api_key", "sk-test", "arguments"):
        assert unsafe not in encoded
    assert body["pending_verifications"][0]["action_payload_withheld"] is True



def test_home_projects_chats_jobs_memory_and_brain_approvals_safely(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("MEMORYGATE_AGENT_ID", "brain")

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in {"/health/detailed", "/v2/status", "/health"}:
            return {"status": "ok"}
        if path == "/api/sessions":
            return {"sessions": [{"id": "chat-1", "title": "Chat", "preview": "token: sk-test from /home/alexey/.env", "raw_owner_prompt": "do not leak"}]}
        if path == "/api/jobs":
            return {"jobs": [{"id": "job-1", "name": "Job", "status": "running", "command": "curl https://api.openai.com/v1", "env": {"SECRET": "x"}}]}
        if path == "/v2/requests":
            return []
        if path.startswith("/briefing/"):
            return {"summary": "Memory says password: hunter2 and path /etc/passwd"}
        if path in {"/observation/active"} or path.startswith("/pattern/active/"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        app.state.db.upsert_verification({"source": "brain", "source_id": "approval-raw", "status": "pending", "summary": {"title": "Raw", "message": "see /home/alexey/.env", "args": {"command": "curl https://api.openai.com/v1", "secret": "sk-test"}}})
        response = client.get("/api/home")

    body = response.json()
    encoded = str(body)
    for unsafe in ("token:", "sk-test", "/home/alexey", "raw_owner_prompt", "api.openai.com", "password:", "/etc/passwd", "command", "SECRET", "'args':"):
        assert unsafe not in encoded
    assert body["recent_chats"][0]["preview_withheld"] is True
    assert body["active_jobs"][0]["name"] == "brain automation"
    assert body["memory_status"]["briefing"] == "details withheld"
    assert body["pending_verifications"][0]["action_payload_withheld"] is True


def test_source_status_maps_auth_required_to_blocked():
    from agentgate.main import source_status_from

    assert source_status_from({"ok": True, "data": {"status": "auth_required"}}, "toolgate") == {"status": "blocked", "source": "toolgate"}



def test_home_sanitizes_suggestions_apps_unlabeled_secrets_and_failed_auth(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("MEMORYGATE_AGENT_ID", "brain")

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if (name, path) == ("toolgate", "/v2/status"):
            raise HTTPException(403, {"status": "auth_required", "message": "forbidden /home/alexey/.env"})
        if path in {"/health/detailed", "/health"}:
            return {"status": "ok"}
        if path == "/api/sessions":
            return {"sessions": [{"id": "chat-secret", "title": "sk-proj-abcdefghijklmnop", "preview": "normal"}]}
        if path == "/api/jobs":
            return {"jobs": []}
        if path == "/v2/requests":
            return []
        if path.startswith("/briefing/"):
            return {"summary": "sk-proj-abcdefghijklmnop"}
        if path in {"/observation/active"} or path.startswith("/pattern/active/"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        app.state.db.create_suggestion({"title": "Unsafe", "summary": "run with sk-proj-abcdefghijklmnop", "source": "brain", "evidence": [{"prompt": "hidden prompt", "path": "/home/alexey/.env", "api_key": "sk-test"}], "source_ref": "/home/alexey/raw-ref"})
        app.state.db.create_app({"name": "Provider", "url": "https://api.openai.com/v1", "source": "brain", "health_url": "https://api.anthropic.com/health", "source_ref": "/home/alexey/app-ref", "pinned": True})
        response = client.get("/api/home")

    body = response.json()
    assert body["source_status"]["toolgate"]["status"] == "blocked"
    assert body["recent_chats"][0]["preview_withheld"] is True
    assert body["memory_status"]["briefing"] == "details withheld"
    assert body["suggestions"][0]["summary"] == "Details withheld"
    assert body["pinned_apps"][0]["purpose"] == "not provided"
    encoded = str(body)
    for unsafe in ("sk-proj-", "hidden prompt", "/home/alexey", "api_key", "sk-test", "source_ref", "api.openai.com", "api.anthropic.com"):
        assert unsafe not in encoded

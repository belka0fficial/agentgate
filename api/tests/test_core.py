from __future__ import annotations

from fastapi.testclient import TestClient

from agentgate.db import Database
from agentgate.main import redact_sensitive, verification_view


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("agentgate_csrf", "")}


def test_owner_and_mcp_workflows(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/suggestions").status_code == 401
        assert client.post("/api/auth/login", json={"key": "test-owner-key-1234"}).status_code == 200

        assert client.post("/api/suggestions", json={"title": "Missing token", "summary": "Must be rejected"}).status_code == 403
        suggestion = client.post("/api/suggestions", headers=csrf_headers(client), json={"title": "Hydrate", "summary": "Keep water nearby"}).json()
        assert client.patch(f"/api/suggestions/{suggestion['id']}", headers=csrf_headers(client), json={"status": "saved"}).json()["status"] == "saved"

        app_item = client.post("/api/apps", headers=csrf_headers(client), json={"name": "Local app", "url": "http://127.0.0.1:9000"}).json()
        assert client.patch(f"/api/apps/{app_item['id']}", headers=csrf_headers(client), json={"pinned": True}).json()["pinned"] == 1

        mcp = client.post("/api/mcp/suggestions", headers={"X-AgentGate-MCP-Key": "test-mcp-key-123456"}, json={"title": "Cron finding", "summary": "Something useful"})
        assert mcp.status_code == 200

        profile = client.put("/api/character", headers=csrf_headers(client), json={"name": "Brain", "personality": "calm"}).json()
        assert profile["name"] == "Brain"
        assert "You are Brain" in profile["context_preview"]
        assert "calm" in profile["context_preview"]

        page = client.get("/")
        assert page.status_code == 200
        assert "AgentGate" in page.text


def test_verification_references_are_updated_in_place(tmp_path):
    store = Database(tmp_path)
    store.initialize()
    first = store.upsert_verification({"source": "brain", "source_id": "approval-1", "run_id": "run-1", "status": "pending", "summary": {"title": "Send message"}})
    second = store.upsert_verification({"source": "brain", "source_id": "approval-1", "run_id": "run-1", "status": "approved", "summary": {"title": "Send message"}})

    assert first["id"] == second["id"]
    assert second["status"] == "approved"
    assert len(store.rows("SELECT * FROM verification_refs")) == 1


def test_verification_views_keep_action_context_without_secrets():
    item = verification_view("toolgate", {
        "id": "verify-1", "kind": "verification", "title": "Send payment", "status": "pending",
        "payload": {"subject_type": "tool", "subject_id": "pay", "args": {"amount": 10, "api_key": "do-not-show"},
                    "binding": {"expires_at": "2030-01-01T00:00:00Z", "args_digest": "digest"}},
    })

    assert item["action"]["arguments"]["amount"] == 10
    assert item["action"]["arguments"]["api_key"] == "[redacted]"
    assert redact_sensitive({"password": "hidden"}) == {"password": "[redacted]"}


def test_system_proxy_keeps_systemgate_key_server_side(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("SYSTEMGATE_ADMIN_KEY", "server-only-system-key")

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path))
        if path == "/vitals":
            return {"cpu_percent": 1}
        if path == "/containers":
            return {"results": []}
        if path == "/backups":
            return {"latest": None}
        return {}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/system")

    assert response.status_code == 200
    assert response.json()["vitals"]["cpu_percent"] == 1
    assert calls == [("systemgate", "GET", "/vitals"), ("systemgate", "GET", "/containers"), ("systemgate", "GET", "/backups")]

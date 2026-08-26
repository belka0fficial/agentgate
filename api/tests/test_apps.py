from __future__ import annotations

from fastapi.testclient import TestClient


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("agentgate_csrf", "")}


def login(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
    assert response.status_code == 200


def test_apps_registry_returns_safe_source_bound_metadata(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    with TestClient(app) as client:
        login(client)
        app.state.db.create_app({
            "name": "Safe Notes",
            "description": "Private note project",
            "url": "http://127.0.0.1:9000",
            "health_url": "http://127.0.0.1:9000/health",
            "status": "available",
            "source": "brain",
            "source_ref": "app-registry:notes",
            "pinned": True,
        })

        response = client.get("/api/apps")

    assert response.status_code == 200
    body = response.json()
    assert body["metadata_only"] is True
    assert body["source_status"] == {"status": "unknown", "source": "agentgate-local-registry"}
    assert body["apps"] == [
        {
            "id": body["apps"][0]["id"],
            "name": "Safe Notes",
            "purpose": "Private note project",
            "status": "available",
            "source": "brain",
            "source_ref": "app-registry:notes",
            "pinned": True,
            "metadata_only": True,
            "lifecycle": {
                "available": False,
                "status": "planned",
                "source": "toolgate",
                "reason": "No approved ToolGate app lifecycle contract is available.",
                "actions": [],
            },
        }
    ]
    encoded = str(body)
    for unsafe in ("127.0.0.1", "health", "http://", "url", "health_url", "command", "env", "docker", "provider_url"):
        assert unsafe not in encoded


def test_apps_detail_and_lifecycle_are_approval_bound(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    with TestClient(app) as client:
        login(client)
        item = app.state.db.create_app({
            "name": "Worker Portal",
            "description": "Inspect worker projects",
            "url": "http://localhost:5173",
            "source": "brain",
            "source_ref": "opaque-project-1",
        })

        detail = client.get(f"/api/apps/{item['id']}")
        create_plan = client.post("/api/apps", headers=csrf_headers(client), json={"name": "New", "url": "http://localhost:3000"})
        start = client.post(f"/api/apps/{item['id']}/start", headers=csrf_headers(client))
        restart = client.post(f"/api/apps/{item['id']}/restart", headers=csrf_headers(client))

    assert detail.status_code == 200
    assert detail.json()["app"]["source_ref"] == "opaque-project-1"
    assert detail.json()["app"]["purpose"] == "Inspect worker projects"
    assert create_plan.status_code == 200
    assert create_plan.json()["requires_approval"] is True
    assert create_plan.json()["status"] == "pending_approval"
    assert create_plan.json()["source"] == "toolgate"
    assert start.status_code == 501
    assert start.json()["status"] == "planned"
    assert restart.status_code == 501
    assert restart.json()["status"] == "planned"
    encoded = str({"detail": detail.json(), "create": create_plan.json(), "start": start.json()})
    for unsafe in ("localhost", "http://", "url", "command", "raw", "args"):
        assert unsafe not in encoded

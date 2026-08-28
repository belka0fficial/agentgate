from fastapi.testclient import TestClient


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("agentgate_csrf", "")}


def configured_client(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv(
        "AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890"
    )
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    from agentgate.main import app

    return TestClient(app)


def test_setup_endpoints_require_owner_auth_and_csrf(monkeypatch, tmp_path):
    with configured_client(monkeypatch, tmp_path) as client:
        assert client.get('/api/setup/status').status_code == 401
        assert client.get('/api/owner/profile').status_code == 401
        client.post('/api/auth/login', json={'key': 'test-owner-key-1234'})
        assert client.put('/api/owner/profile', json={'display_name': 'Alex', 'username': 'alex'}).status_code == 403
        assert client.post('/api/setup/steps/companion/defer').status_code == 403


def test_setup_status_tracks_required_identity_and_optional_companion(monkeypatch, tmp_path):
    with configured_client(monkeypatch, tmp_path) as client:
        assert client.post(
            "/api/auth/login", json={"key": "test-owner-key-1234"}
        ).status_code == 200
        body = client.get("/api/setup/status").json()
        assert body["status"] == "incomplete"
        assert body["next_required_step"] == "identity"
        assert body["steps"] == [
            {"id": "password", "status": "configured", "required": True},
            {"id": "identity", "status": "missing", "required": True},
            {"id": "companion", "status": "missing", "required": False},
        ]
        encoded = str(body).lower()
        for forbidden in ("verifier", "credential", "owner_token", "csrf_token"):
            assert forbidden not in encoded


def test_owner_profile_validation_and_persistence(monkeypatch, tmp_path):
    with configured_client(monkeypatch, tmp_path) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        headers = csrf_headers(client)
        invalid = client.put(
            "/api/owner/profile",
            headers=headers,
            json={"display_name": "Alex", "username": "Not valid!"},
        )
        assert invalid.status_code == 422
        saved = client.put(
            "/api/owner/profile",
            headers=headers,
            json={"display_name": "Alex Belka", "username": "alexey"},
        ).json()
        assert saved["configured"] is True
        assert saved["display_name"] == "Alex Belka"
        assert saved["username"] == "alexey"
        assert client.get("/api/setup/status").json()["next_required_step"] is None


def test_companion_can_be_deferred_without_creating_profile(monkeypatch, tmp_path):
    with configured_client(monkeypatch, tmp_path) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        headers = csrf_headers(client)
        deferred = client.post(
            "/api/setup/steps/companion/defer", headers=headers
        ).json()
        assert deferred["status"] == "deferred"
        assert client.get("/api/character").json()["configured"] is False
        steps = client.get("/api/setup/status").json()["steps"]
        assert next(step for step in steps if step["id"] == "companion")["status"] == "deferred"

        saved = client.put(
            "/api/character",
            headers=headers,
            json={
                "name": "My Companion",
                "owner_name": "Alex",
                "personality": "Direct and curious",
                "background": "Personal operating companion",
                "boundaries": "ToolGate owns permissions",
            },
        )
        assert saved.status_code == 200
        steps = client.get("/api/setup/status").json()["steps"]
        assert next(step for step in steps if step["id"] == "companion")["status"] == "configured"

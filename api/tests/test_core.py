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

    assert "arguments" not in item["action"]
    assert item["action"]["binding"]["args_digest"] == "digest"
    assert item["action_payload_withheld"] is True
    assert redact_sensitive({"password": "hidden"}) == {}


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



def test_memorygate_overview_redacts_browser_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        if path == "/memory":
            return [
                {
                    "id": "m1",
                    "title": "Safe title",
                    "kind": "fact",
                    "confidence": "high",
                    "source_uri": "file:///home/alexeybe1kin/private/memory.json",
                    "raw_args": {"api_key": "sk-test", "command": "deploy --token SECRET"},
                    "evidence": [
                        {"label": "provider", "url": "https://api.anthropic.com/v1/messages", "raw_args": {"token": "SECRET"}},
                        {"label": "safe-note", "ref": "memory-note-1"},
                    ],
                }
            ]
        if path == "/observation/active":
            return []
        if path.startswith("/pattern/active"):
            return []
        if path.startswith("/briefing/"):
            raise HTTPException(502, {"source": "memorygate", "message": "failed at https://api.anthropic.com/v1/messages using /var/run/docker.sock and /etc/passwd"})
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/gates/memorygate")

    assert response.status_code == 200
    payload = response.json()
    encoded = str(payload)
    for unsafe in (
        "api.anthropic.com",
        "/home/alexeybe1kin",
        "/var/run/docker.sock",
        "/etc/passwd",
        "file://",
        "sk-test",
        "SECRET",
        "raw_args",
        "source_uri",
        "command",
        "token",
    ):
        assert unsafe not in encoded
    assert payload["briefing"] == {"available": False, "source": "memorygate", "error": {"source": "memorygate", "message": "source unavailable"}, "metadata_only": True, "content_withheld": True}
    assert payload["errors"] == {"briefing": {"source": "memorygate", "message": "source unavailable"}}
    assert payload["memories"] == [
        {
            "id": "m1",
            "title": "Safe title",
            "kind": "fact",
            "confidence": "high",
            "evidence": [{"label": "provider"}, {"label": "safe-note", "ref": "memory-note-1"}],
        }
    ]



def test_system_overview_redacts_upstream_error_details(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "systemgate"
        raise HTTPException(502, {"source": "systemgate", "message": "failed at https://api.anthropic.com/v1/messages using /var/run/docker.sock and /home/alexeybe1kin/private"})

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/system")

    assert response.status_code == 200
    payload = response.json()
    encoded = str(payload)
    for unsafe in ("api.anthropic.com", "/var/run/docker.sock", "/home/alexeybe1kin", "https://"):
        assert unsafe not in encoded
    assert payload == {
        "vitals": {"error": {"source": "systemgate", "message": "source unavailable"}},
        "containers": {"error": {"source": "systemgate", "message": "source unavailable"}},
        "backups": {"error": {"source": "systemgate", "message": "source unavailable"}},
    }



def test_verification_routes_redact_toolgate_action_arguments(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    toolgate_request = {
        "kind": "verification",
        "id": "verify-danger",
        "status": "pending",
        "title": "Run cat /etc/passwd",
        "payload": {
            "title": "Use provider https://api.anthropic.com/v1/messages",
            "message": "hidden prompt says use /home/alexeybe1kin/.ssh/id_rsa",
            "subject_type": "tool",
            "subject_id": "shell",
            "args": {
                "command": "cat /etc/passwd",
                "prompt": "hidden prompt text",
                "path": "/home/alexeybe1kin/.ssh/id_rsa",
                "url": "https://api.anthropic.com/v1/messages",
                "api_key": "sk-test",
                "safe": "summary only",
            },
            "binding": {"args_digest": "digest", "expires_at": "2030-01-01T00:00:00Z"},
        },
    }

    async def fake_request(name, method, path, **kwargs):
        if name == "toolgate" and path == "/v2/requests":
            return [toolgate_request]
        if path in ("/health/detailed", "/v2/status", "/health"):
            return {"status": "ok"}
        if path in ("/api/sessions", "/api/jobs"):
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        verifications = client.get("/api/verifications")
        home = client.get("/api/home")

    assert verifications.status_code == 200
    assert home.status_code == 200
    encoded = str({"verifications": verifications.json(), "home": home.json()})
    for unsafe in (
        "cat /etc/passwd",
        "hidden prompt text",
        "api.anthropic.com",
        "/home/alexeybe1kin",
        "id_rsa",
        "sk-test",
        "https://",
    ):
        assert unsafe not in encoded
    assert "summary only" not in encoded
    assert "arguments" not in encoded
    assert "digest" in encoded



def test_toolgate_overview_redacts_top_level_status_error(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    unsafe_message = "failed at https://api.anthropic.com/v1 using /etc/passwd " + "tok" + "en=SECRET"

    async def fake_request(name, method, path, **kwargs):
        assert name == "toolgate"
        if path == "/v2/status":
            return {"error": {"source": "toolgate", "message": unsafe_message}}
        return []

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/gates/toolgate")

    assert response.status_code == 200
    encoded = str(response.json())
    for unsafe in ("api.anthropic.com", "/etc/passwd", "SECRET", "https://", "tok" + "en="):
        assert unsafe not in encoded
    assert response.json()["error"] == {"source": "toolgate", "message": "source unavailable"}


def test_verification_view_redacts_unsafe_identifiers(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "toolgate"
        return [
            {
                "kind": "verification",
                "id": "https://api.anthropic.com/v1/messages",
                "source_id": "/home/alexeybe1kin/private",
                "session_id": "/etc/passwd",
                "run_id": "/var/run/docker.sock",
                "expires_at": "file:///home/alexeybe1kin/secret",
                "status": "pending",
                "payload": {"subject_type": "tool", "subject_id": "safe-tool", "binding": {"args_digest": "digest"}},
            }
        ]

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/verifications")

    assert response.status_code == 200
    encoded = str(response.json())
    for unsafe in ("api.anthropic.com", "/home/alexeybe1kin", "/etc/passwd", "/var/run/docker.sock", "file://"):
        assert unsafe not in encoded
    item = response.json()[0]
    assert item["source_id"] == "reference withheld"
    assert item["session_id"] == "reference withheld"
    assert item["run_id"] == "reference withheld"
    assert item["expires_at"] == "reference withheld"


def test_memory_search_redacts_browser_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        assert path == "/memory/search"
        return {
            "results": [
                {
                    "id": "m1",
                    "title": "Safe memory",
                    "kind": "fact",
                    "confidence": "high",
                    "source_uri": "file:///home/alexeybe1kin/private/memory.json",
                    "raw_args": {"command": "cat /etc/passwd", "api_key": "sk-test"},
                    "evidence": [{"label": "provider", "url": "https://api.anthropic.com/v1/messages"}],
                }
            ],
            "total": 1,
        }

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.post("/api/gates/memorygate/search", headers=csrf_headers(client), json={"query": "safe"})

    assert response.status_code == 200
    encoded = str(response.json())
    for unsafe in ("api.anthropic.com", "/home/alexeybe1kin", "file://", "raw_args", "cat /etc/passwd", "sk-test", "api_key"):
        assert unsafe not in encoded
    assert response.json()["results"][0]["title"] == "Safe memory"



def test_memorygate_overview_omits_raw_content_entities_and_secret_shaped_strings(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    standalone_key = "sk-" + "abc123456789private"

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        if path == "/memory":
            return [
                {
                    "id": "m2",
                    "content": "RAW MEMORY BODY: owner private episode details, unbounded text",
                    "kind": "fact",
                    "confidence": "high",
                    "evidence": [{"label": standalone_key, "ref": "safe-ref"}],
                    "entities": [{"name": "owner", "private_note": "full raw memory narrative"}],
                }
            ]
        if path == "/observation/active":
            return []
        if path.startswith("/pattern/active"):
            return []
        if path.startswith("/briefing/"):
            return {}
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/gates/memorygate")

    assert response.status_code == 200
    payload = response.json()
    encoded = str(payload)
    for unsafe in ("RAW MEMORY BODY", "private episode", "private_note", "full raw memory narrative", standalone_key):
        assert unsafe not in encoded
    assert payload["memories"][0]["title"] == "Untitled memory"
    assert payload["memories"][0]["entities"] == [{"name": "owner"}]
    assert payload["memories"][0]["evidence"] == [{"label": "reference withheld", "ref": "safe-ref"}]


def test_memorygate_search_omits_raw_content_and_entities(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        assert path == "/memory/search"
        return {"results": [{"id": "m3", "content": "RAW SEARCH MEMORY", "entities": [{"name": "owner", "details": "private"}]}]}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.post("/api/gates/memorygate/search", headers=csrf_headers(client), json={"query": "owner"})

    assert response.status_code == 200
    encoded = str(response.json())
    assert "RAW SEARCH MEMORY" not in encoded
    assert "private" not in encoded
    assert response.json()["results"][0]["title"] == "Untitled memory"



def test_verification_view_omits_harmless_looking_broad_arguments():
    item = verification_view("toolgate", {
        "id": "verify-safe-looking",
        "kind": "verification",
        "status": "pending",
        "payload": {
            "subject_type": "tool",
            "subject_id": "message-send",
            "args": {
                "recipient": "owner@example.local",
                "body": "Private message content: meet at 9, internal decision notes",
                "reason": "Looks harmless but is still a broad tool argument",
            },
            "binding": {"args_digest": "digest", "expires_at": "2030-01-01T00:00:00Z"},
        },
    })

    encoded = str(item)
    assert "Private message content" not in encoded
    assert "owner@example.local" not in encoded
    assert "broad tool argument" not in encoded
    assert "arguments" not in item["action"]
    assert item["action"]["binding"]["args_digest"] == "digest"



def test_browser_redaction_catches_provider_hosts_without_scheme_and_colon_secrets():
    from agentgate.main import safe_browser_string, safe_memory_record

    for unsafe in (
        "provider host api.anthropic.com/v1/messages",
        "provider host api.openai.com/v1/responses",
        "inline token: SECRET123",
        "inline password: hunter2",
        "inline secret: hidden",
        "Authorization: Bearer SECRET123",
    ):
        assert safe_browser_string(unsafe) == "reference withheld"

    record = safe_memory_record({
        "id": "unsafe",
        "title": "token: SECRET123",
        "kind": "fact",
        "confidence": "high",
        "evidence": [{"label": "api.anthropic.com/v1/messages", "ref": "safe-ref"}],
    }, 0)
    assert str(record).count("reference withheld") >= 2
    assert "SECRET123" not in str(record)
    assert "api.anthropic.com" not in str(record)



def test_owner_session_contract_matches_dashboard(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    with TestClient(app) as client:
        login = client.post("/api/auth/login", json={"owner_token": "test-owner-key-1234"})
        assert login.status_code == 200
        payload = login.json()
        assert payload["owner_authenticated"] is True
        assert payload["authenticated"] is True
        assert payload["csrf_token"]
        assert payload["credentials_included"] is False
        assert payload["token_included"] is False
        session = client.get("/api/auth/session").json()
        assert session["owner_authenticated"] is True
        assert session["csrf_token"] == payload["csrf_token"]
        suggestion = client.post(
            "/api/suggestions",
            headers={"X-CSRF-Token": payload["csrf_token"]},
            json={"title": "CSRF", "summary": "Header contract works"},
        )
        assert suggestion.status_code == 200



def test_dependency_health_preserves_source_statuses(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if name == "brain":
            return {"status": "ok"}
        if name == "memorygate":
            return {"status": "degraded", "detail": "warming cache"}
        if name == "toolgate":
            raise HTTPException(401, {"message": "auth_required", "url": "https://api.anthropic.com/v1/messages"})
        if name == "systemgate":
            return {"status": "offline"}
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/health/dependencies")

    assert response.status_code == 200
    by_name = {item["name"]: item for item in response.json()}
    assert by_name["brain"]["status"] == "live"
    assert by_name["memorygate"]["status"] == "degraded"
    assert by_name["toolgate"]["status"] == "auth_required"
    assert by_name["systemgate"]["status"] == "offline"
    assert "api.anthropic.com" not in str(by_name["toolgate"])



def test_dependency_health_preserves_explicit_unknown_status(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        return {"status": "unknown"}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/health/dependencies")

    assert response.status_code == 200
    assert {item["status"] for item in response.json()} == {"unknown"}



def test_home_suggestions_are_browser_sanitized(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in ("/health/detailed", "/v2/status", "/health"):
            return {"status": "ok"}
        if path in ("/api/sessions", "/api/jobs", "/v2/requests"):
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        client.post(
            "/api/mcp/suggestions",
            headers={"X-AgentGate-MCP-Key": "test-mcp-key-123456"},
            json={
                "title": "provider api.anthropic.com/v1/messages",
                "summary": "token: SECRET and /etc/passwd",
                "source_ref": "file:///home/alexeybe1kin/private",
                "evidence": [{"url": "api.openai.com/v1/responses", "host_path": "/var/run/docker.sock"}],
            },
        )
        response = client.get("/api/home")

    assert response.status_code == 200
    encoded = str(response.json())
    for unsafe in ("api.anthropic.com", "SECRET", "/etc/passwd", "file:///home", "api.openai.com", "/var/run/docker.sock"):
        assert unsafe not in encoded
    assert "metadata_only" in encoded
    assert "Suggestion" in encoded or "Details withheld" in encoded


def test_automations_and_toolgate_overview_omit_broad_args(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if name == "brain" and path == "/api/jobs":
            return [{"id": "j1", "prompt": "hidden prompt token: SECRET /home/private", "command": "cat /etc/passwd"}]
        if name == "toolgate" and path == "/v2/automations":
            return [{"id": "a1", "args": {"recipient": "owner@example.local", "body": "private broad arg"}, "raw_args": {"api_key": "sk-test"}}]
        if name == "toolgate" and path == "/v2/tools":
            return [{"id": "t1", "arguments": {"body": "private message"}}]
        if name == "toolgate" and path == "/v2/services":
            return []
        if name == "toolgate" and path.startswith("/v2/events"):
            return [{"parameters": {"prompt": "tool prompt private"}}]
        if name == "toolgate" and path == "/v2/status":
            return {"status": "ok"}
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        automations = client.get("/api/automations")
        toolgate = client.get("/api/gates/toolgate")

    assert automations.status_code == 200
    assert toolgate.status_code == 200
    encoded = str({"automations": automations.json(), "toolgate": toolgate.json()})
    for unsafe in ("hidden prompt", "SECRET", "/home/private", "cat /etc/passwd", "owner@example.local", "private broad arg", "sk-test", "private message", "tool prompt private"):
        assert unsafe not in encoded
    for unsafe_key in ("args", "arguments", "parameters", "raw_args", "command", "prompt"):
        assert unsafe_key not in encoded


def test_safe_memory_records_accepts_wrapped_result_shapes():
    from agentgate.main import safe_memory_records

    for key in ("results", "items", "memories", "observations", "patterns", "matches"):
        records = safe_memory_records({key: [{"id": key, "title": "Safe", "kind": "fact", "confidence": "high"}]})
        assert records and records[0]["id"] == key



def test_dependency_health_treats_missing_or_unrecognized_status_as_unknown(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    payloads = iter([{}, {"status": ""}, None, []])

    async def fake_request(name, method, path, **kwargs):
        return next(payloads)

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/health/dependencies")

    assert response.status_code == 200
    assert [item["status"] for item in response.json()] == ["unknown", "unknown", "unknown", "unknown"]



def test_cron_jobs_endpoint_redacts_browser_payloads(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "brain"
        assert path == "/api/jobs"
        return [{"id": "j1", "prompt": "hidden prompt token: SECRET /home/private", "last_output": "api.openai.com /etc/passwd"}]

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/cron/jobs")

    assert response.status_code == 200
    encoded = str(response.json())
    for unsafe in ("hidden prompt", "SECRET", "/home/private", "api.openai.com", "/etc/passwd"):
        assert unsafe not in encoded
    for unsafe_key in ("prompt", "last_output"):
        assert unsafe_key not in encoded



def test_cron_mutation_responses_are_browser_sanitized(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        return {"id": "j1", "prompt": "hidden prompt token: SECRET /home/private", "last_output": "api.openai.com /etc/passwd", "output": "api.anthropic.com", "command": "cat /etc/passwd", "args": {"api_key": "sk-test"}}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        headers = csrf_headers(client)
        app.state.upstream.request = fake_request
        responses = [
            client.post("/api/cron/jobs", headers=headers, json={"name": "j"}),
            client.patch("/api/cron/jobs/j1", headers=headers, json={"name": "j"}),
            client.post("/api/cron/jobs/j1/run", headers=headers),
            client.delete("/api/cron/jobs/j1", headers=headers),
        ]

    for response in responses:
        assert response.status_code == 200
        encoded = str(response.json())
        for unsafe in ("hidden prompt", "SECRET", "/home/private", "api.openai.com", "api.anthropic.com", "/etc/passwd", "cat /etc/passwd", "sk-test"):
            assert unsafe not in encoded
        for unsafe_key in ("prompt", "last_output", "output", "command", "args", "api_key"):
            assert unsafe_key not in encoded


def test_safe_browser_payload_omits_unsafe_dict_keys():
    from agentgate.main import safe_browser_payload

    payload = {
        "https://api.anthropic.com/v1/messages": {"status": "offline"},
        "/var/run/docker.sock": "present",
        "safe": {"/home/alexeybe1kin/private": "nested", "status": "ok"},
    }
    result = safe_browser_payload(payload)
    encoded = str(result)
    assert "api.anthropic.com" not in encoded
    assert "/var/run/docker.sock" not in encoded
    assert "/home/alexeybe1kin/private" not in encoded
    assert result == {"safe": {"status": "ok"}}



def test_model_gateway_routes_return_json_not_dashboard_html(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "brain"
        assert path == "/api/model/options"
        return {
            "providers": [{"id": "local", "name": "Local", "status": "ok", "configured": True, "models_visible": True, "model_count": 1}],
            "models": [{"id": "local-small", "provider": "local", "model": "small"}],
            "gateway": {"id": "local", "status": "ok"},
        }

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        providers = client.get("/api/model/providers")
        candidates = client.get("/api/model/gateway-candidates")
        missing = client.get("/api/model/not-real")

    assert providers.status_code == 200
    assert providers.headers["content-type"].startswith("application/json")
    assert providers.json()["providers"][0]["id"] == "local"
    assert candidates.status_code == 200
    assert candidates.headers["content-type"].startswith("application/json")
    assert candidates.json()["candidate_count"] == 1
    assert missing.status_code == 404
    assert missing.headers["content-type"].startswith("application/json")
    assert "html" not in missing.text.lower()



def test_automations_endpoint_uses_metadata_only_rows(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if name == "brain":
            return [{"id": "j1", "name": "Daily", "description": "Owner private prompt: meet at 9", "summary": "token: SECRET", "prompt": "hidden", "last_output": "/etc/passwd", "status": "ok"}]
        if name == "toolgate":
            return [{"id": "a1", "name": "Private tool name", "title": "Private tool title: owner@example.local", "description": "private message to owner@example.local", "args": {"body": "secret"}, "status": "degraded"}]
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/automations")

    assert response.status_code == 200
    encoded = str(response.json())
    for unsafe in ("Private owner name", "Private owner title", "Owner private prompt", "meet at 9", "token SECRET", "token: SECRET", "hidden", "/etc/passwd", "Private tool name", "Private tool title", "private message", "owner@example.local", "secret"):
        assert unsafe not in encoded
    for unsafe_key in ("description", "summary", "prompt", "last_output", "args", "title"):
        assert unsafe_key not in encoded
    assert response.json()["jobs"][0]["name"] == "brain automation"
    assert response.json()["toolgate_automations"][0]["name"] == "toolgate automation"


def test_dependency_health_returns_canonical_live_status():
    from agentgate.main import dependency_status_from_payload

    for status in ("ok", "live"):
        assert dependency_status_from_payload({"status": status}) == "live"
    for status in ("online", "healthy", "ready", "success"):
        assert dependency_status_from_payload({"status": status}) == "unknown"



def test_safe_automation_rows_uses_source_authored_names_only():
    from agentgate.main import safe_automation_rows

    rows = safe_automation_rows([
        {"id": "j1", "name": "Private owner name", "title": "Private owner title: meet at 9", "status": "ok"},
        {"id": "j2", "name": "Safe-looking but still runtime text", "status": "ok"},
    ], "brain")
    assert rows == [
        {"id": "j1", "name": "brain automation", "status": "ok", "source": "brain"},
        {"id": "j2", "name": "brain automation", "status": "ok", "source": "brain"},
    ]



def test_models_endpoint_is_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert (name, method, path) == ("brain", "GET", "/api/model/options")
        return {"providers": [{"id": "openai", "name": "OpenAI", "base_url": "https://api.openai.com/v1", "api_key": "sk-test", "headers": {"X-API-Key": "AIzaSyDUMMYSECRET1234567890"}, "auth_headers": {"api-key": "plain-provider-secret"}, "x-goog-api-key": "AIzaSyANOTHERSECRET1234567890"}], "models": [{"id": "gpt", "provider": "openai", "secret": "hidden", "headers": {"Authorization": "Bearer hidden"}}]}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/models")

    assert response.status_code == 200
    encoded = str(response.json())
    assert "https://api.openai.com/v1" not in encoded
    assert "api_key" not in encoded
    assert "sk-test" not in encoded
    assert "secret" not in encoded
    assert "hidden" not in encoded
    for unsafe in ("headers", "X-API-Key", "AIzaSyDUMMYSECRET1234567890", "auth_headers", "api-key", "plain-provider-secret", "x-goog-api-key", "AIzaSyANOTHERSECRET1234567890", "Authorization", "Bearer hidden"):
        assert unsafe not in encoded
    assert response.json()["runtime_note"] == "source-bound model metadata only"


def test_agents_endpoint_returns_safe_metadata(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert (name, method, path) == ("brain", "GET", "/api/agents")
        return {"agents": [{"id": "agent-1", "name": "Conker", "system_prompt": "private", "api_key": "sk-test", "status": "live"}]}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/agents")

    assert response.status_code == 200
    encoded = str(response.json())
    assert "system_prompt" not in encoded
    assert "private" not in encoded
    assert "api_key" not in encoded
    assert "sk-test" not in encoded
    assert response.json()["agents"] == [{"id": "agent-1", "name": "Conker", "label": "Conker", "status": "live", "source": "brain"}]



def test_model_providers_endpoint_redacts_header_style_provider_keys(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert (name, method, path) == ("brain", "GET", "/api/model/options")
        return {"providers": [{"id": "gemini", "headers": {"X-API-Key": "AIzaSyDUMMYSECRET1234567890"}, "auth_headers": {"api-key": "plain-provider-secret"}}]}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/model/providers")

    assert response.status_code == 200
    encoded = str(response.json())
    for unsafe in ("headers", "X-API-Key", "AIzaSyDUMMYSECRET1234567890", "auth_headers", "api-key", "plain-provider-secret"):
        assert unsafe not in encoded



def test_verification_view_matches_dashboard_approval_contract():
    from agentgate.main import safe_browser_string, verification_view

    assert safe_browser_string("auth_headers api-key plain-provider-secret") == "reference withheld"
    assert safe_browser_string("api-key=plain-provider-secret") == "reference withheld"
    item = verification_view("toolgate", {
        "source_id": "approval-1",
        "status": "pending",
        "severity": "high",
        "created_at": "2030-01-01T00:00:00Z",
        "payload": {
            "title": "Approve tool",
            "message": "Metadata only",
            "subject_type": "tool",
            "subject_id": "message-send",
            "subject_version": "v1",
            "args": {"body": "private"},
            "binding": {"args_digest": "digest-123", "expires_at": "2030-01-02T00:00:00Z"},
        },
    })
    assert item["id"] == "approval-1"
    assert item["binding"] == {"type": "tool", "id": "message-send", "version": "v1", "digest": "digest-123"}
    assert "arguments" not in item["action"]
    assert "private" not in str(item)



def test_approval_mutation_responses_are_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        return {
            "status": "approved",
            "args": {"command": "cat /etc/passwd", "api_key": "sk-test", "prompt": "private prompt"},
            "message": "hidden prompt token: SECRET",
            "provider_url": "https://api.anthropic.com/v1/messages",
            "path": "/home/alexeybe1kin/private",
        }

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        headers = csrf_headers(client)
        app.state.upstream.request = fake_request
        responses = [
            client.post("/api/verifications/toolgate/req-1/decision", headers=headers, json={"decision": "approved"}),
            client.post("/api/runs/run-1/approval", headers=headers, json={"decision": "approved"}),
            client.post("/api/runs/run-1/stop", headers=headers, json={}),
        ]

    for response in responses:
        assert response.status_code == 200
        encoded = str(response.json())
        for unsafe in ("cat /etc/passwd", "sk-test", "private prompt", "hidden prompt", "SECRET", "api.anthropic.com", "https://", "/home/alexeybe1kin", "args", "api_key", "command", "provider_url"):
            assert unsafe not in encoded
        assert response.json()["metadata_only"] is True
        assert response.json()["raw_response_withheld"] is True



def test_dependency_health_uses_toolgate_v2_status(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if name == "toolgate" and path == "/v2/status":
            return {"status": "ok"}
        if name == "toolgate" and path == "/health":
            raise HTTPException(404, "not found")
        return {"status": "ok"}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/health/dependencies")

    assert response.status_code == 200
    by_name = {item["name"]: item for item in response.json()}
    assert by_name["toolgate"]["status"] == "live"



def test_suggestions_endpoint_returns_safe_envelope(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    unsafe_payload = {
        "title": "provider token: SECRET",
        "summary": "run cat /etc/passwd against https://api.anthropic.com/v1/messages",
        "category": "api.openai.com/v1/responses",
        "urgency": "high",
        "source_ref": "file:///home/alexeybe1kin/private",
        "evidence": [{"url": "api.openai.com/v1/responses", "host_path": "/var/run/docker.sock"}],
    }
    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        mcp = client.post("/api/mcp/suggestions", headers={"X-AgentGate-MCP-Key": "test-mcp-key-123456"}, json=unsafe_payload)
        assert mcp.status_code == 200
        response = client.get("/api/suggestions")
        created = client.post("/api/suggestions", headers=csrf_headers(client), json=unsafe_payload)

    assert response.status_code == 200
    assert "suggestions" in response.json()
    for payload in (response.json(), created.json()):
        encoded = str(payload)
        for unsafe in ("SECRET", "cat /etc/passwd", "api.anthropic.com", "api.openai.com", "https://", "file://", "/home/alexeybe1kin", "/var/run/docker.sock", "source_ref", "evidence"):
            assert unsafe not in encoded



def test_suggestions_preserve_source_confidence_metadata(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in ("/health/detailed", "/v2/status", "/health"):
            return {"status": "ok"}
        if path in ("/api/sessions", "/api/jobs", "/v2/requests"):
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        created = client.post(
            "/api/suggestions",
            headers=csrf_headers(client),
            json={"title": "Safe suggestion", "summary": "Safe summary", "confidence": "high"},
        ).json()
        listed = client.get("/api/suggestions").json()["suggestions"][0]
        home = client.get("/api/home").json()["suggestions"][0]
        patched = client.patch(f"/api/suggestions/{created['id']}", headers=csrf_headers(client), json={"status": "saved"}).json()

    for row in (created, listed, home, patched):
        assert row["confidence"] == 90
        assert row["confidence_label"] == "high"
        assert "0%" not in str(row)



def test_home_active_jobs_are_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in ("/health/detailed", "/v2/status", "/health"):
            return {"status": "ok"}
        if path == "/api/sessions" or path == "/v2/requests":
            return []
        if path == "/api/jobs":
            return [
                {
                    "id": "job-1",
                    "status": "running",
                    "title": "private title token: SECRET",
                    "description": "run /etc/passwd against api.openai.com/v1/responses",
                    "summary": "private output /home/alexeybe1kin/private",
                    "prompt": "hidden prompt",
                    "last_output": "hidden output",
                    "schedule": "every 1h",
                    "paused": False,
                }
            ]
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/home")

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_jobs"][0]["name"] == "brain automation"
    assert payload["active_jobs"][0]["status"] == "running"
    assert payload["active_jobs"][0]["schedule"] == "every 1h"
    encoded = str(payload)
    for unsafe in ("SECRET", "/etc/passwd", "api.openai.com", "/home/alexeybe1kin", "hidden prompt", "hidden output", "private title", "private output"):
        assert unsafe not in encoded



def test_browser_redaction_catches_broad_absolute_host_paths():
    from agentgate.main import safe_browser_payload, safe_browser_string

    unsafe_values = [
        "/opt/agentgate/private/config.yaml",
        "stored at /srv/agentgate/data/memory.db",
        "mount /mnt/secrets/key",
        "read /proc/self/environ",
        "tmp secret /dev/shm/key",
        "mac path /Volumes/Backup/private",
        r"windows C:\ProgramData\AgentGate\secret.env",
        "windows D:/Projects/AgentGate/private.env",
    ]
    for value in unsafe_values:
        assert safe_browser_string(value) == "reference withheld"

    payload = {value: {"status": "ok"} for value in unsafe_values}
    payload["safe"] = {"status": "ok", "path": "/opt/agentgate/private/config.yaml"}
    result = safe_browser_payload(payload)
    encoded = str(result)
    for value in unsafe_values:
        assert value not in encoded
    assert result == {"safe": {"status": "ok", "path": "reference withheld"}}



def test_cron_mutations_are_metadata_only_for_output_aliases(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "brain"
        return {
            "id": "job-1",
            "status": "ok",
            "result": "private execution result: meet bank at 9",
            "stdout": "owner private stdout",
            "stderr": "owner private stderr",
            "message": "job prompt was transfer funds",
            "detail": "private detail",
            "log": "private log",
            "logs": ["private logs"],
        }

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        responses = [
            client.post("/api/cron/jobs", headers=csrf_headers(client), json={"name": "x"}),
            client.patch("/api/cron/jobs/job-1", headers=csrf_headers(client), json={"paused": True}),
            client.delete("/api/cron/jobs/job-1", headers=csrf_headers(client)),
            client.post("/api/cron/jobs/job-1/run", headers=csrf_headers(client)),
        ]

    for response in responses:
        assert response.status_code == 200
        payload = response.json()
        assert payload["metadata_only"] is True
        assert payload["raw_response_withheld"] is True
        encoded = str(payload)
        for unsafe in ("private execution", "stdout", "stderr", "transfer funds", "private detail", "private log", "private logs", "result", "message"):
            assert unsafe not in encoded


def test_toolgate_events_are_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path == "/v2/status":
            return {"status": "ok"}
        if path == "/v2/events?limit=12":
            return [
                {
                    "id": "e1",
                    "kind": "verification",
                    "status": "pending",
                    "message": "hidden owner prompt: meet bank at 9",
                    "result": "safe-looking private tool output",
                    "stdout": "private stdout",
                    "stderr": "private stderr",
                    "metadata": {"target": "owner@example.local"},
                    "binding": {"args_digest": "digest"},
                }
            ]
        return []

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/gates/toolgate")

    assert response.status_code == 200
    event = response.json()["events"][0]
    assert event["metadata_only"] is True
    assert event["details_withheld"] is True
    assert event["args_digest"] == "digest"
    encoded = str(response.json())
    for unsafe in ("hidden owner prompt", "meet bank", "private tool output", "private stdout", "private stderr", "owner@example.local", "message", "result", "target"):
        assert unsafe not in encoded



def test_toolgate_automations_are_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path == "/v2/status":
            return {"status": "ok"}
        if path == "/v2/automations":
            return [
                {
                    "id": "a1",
                    "name": "private automation",
                    "title": "owner private title",
                    "description": "Owner private instruction: meet bank at 9",
                    "summary": "hidden summary",
                    "prompt": "hidden prompt",
                    "args": {"body": "private args"},
                    "result": "private result",
                }
            ]
        return []

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/gates/toolgate")

    assert response.status_code == 200
    automation = response.json()["automations"][0]
    assert automation["name"] == "toolgate automation"
    encoded = str(response.json())
    for unsafe in ("private automation", "owner private", "meet bank", "hidden summary", "hidden prompt", "private args", "private result", "description", "prompt", "args", "result"):
        assert unsafe not in encoded


def test_cron_routes_sanitize_upstream_error_details(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        raise HTTPException(
            502,
            {
                "source": "brain",
                "message": "failed hidden prompt token: SECRET /home/alexeybe1kin/private https://api.openai.com/v1",
                "result": "private result",
                "stdout": "private stdout",
                "stderr": "private stderr",
                "metadata": {"target": "owner@example.local"},
            },
        )

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        responses = [
            client.get("/api/cron/jobs"),
            client.post("/api/cron/jobs", headers=csrf_headers(client), json={"name": "x"}),
            client.patch("/api/cron/jobs/job-1", headers=csrf_headers(client), json={"paused": True}),
            client.delete("/api/cron/jobs/job-1", headers=csrf_headers(client)),
            client.post("/api/cron/jobs/job-1/run", headers=csrf_headers(client)),
        ]

    for response in responses:
        assert response.status_code == 200
        payload = response.json()
        assert payload["metadata_only"] is True
        assert payload["raw_response_withheld"] is True
        encoded = str(payload)
        for unsafe in ("hidden prompt", "SECRET", "/home/alexeybe1kin/private", "api.openai.com", "private result", "private stdout", "private stderr", "owner@example.local", "result", "stdout", "stderr", "target"):
            assert unsafe not in encoded



def test_error_and_approval_redaction_catches_plain_hidden_prompt_text(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app, safe_browser_error, safe_browser_string, verification_view

    assert safe_browser_string("hidden prompt: meet owner at bank at 9pm") == "reference withheld"
    assert safe_browser_error({"source": "brain", "message": "failed hidden prompt: meet owner at bank at 9pm"}) == {"source": "brain", "message": "source unavailable"}
    view = verification_view("toolgate", {"payload": {"message": "hidden prompt: meet owner at 9pm", "title": "private owner instruction"}})
    encoded_view = str(view)
    assert "hidden prompt" not in encoded_view
    assert "meet owner" not in encoded_view
    assert "private owner" not in encoded_view

    async def fake_request(name, method, path, **kwargs):
        raise HTTPException(502, {"source": "brain", "message": "failed hidden prompt: meet owner at bank at 9pm"})

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/cron/jobs")

    assert response.status_code == 200
    payload = response.json()
    assert payload["error"] == {"source": "brain", "message": "source unavailable"}
    encoded = str(payload)
    assert "hidden prompt" not in encoded
    assert "meet owner" not in encoded
    assert "bank at 9pm" not in encoded



def test_home_recent_chats_are_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in ("/health/detailed", "/v2/status", "/health"):
            return {"status": "ok"}
        if path == "/api/sessions":
            return {
                "sessions": [
                    {
                        "id": "session-1",
                        "title": "RAW_OWNER_PROMPT private title",
                        "preview": "RAW_OWNER_PROMPT summarize private medical note",
                        "content": "hidden prompt: meet owner at bank",
                        "message_count": 3,
                        "updated_at": "2030-01-01T00:00:00Z",
                    }
                ]
            }
        if path in ("/api/jobs", "/v2/requests"):
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/home")

    assert response.status_code == 200
    row = response.json()["recent_chats"][0]
    assert row["id"] == "session-1"
    assert row["metadata_only"] is True
    assert row["preview_withheld"] is True
    assert row["message_count"] == 3
    encoded = str(response.json())
    for unsafe in ("RAW_OWNER_PROMPT", "private medical", "private title", "hidden prompt", "meet owner", "title':", "preview':", "content':"):
        assert unsafe not in encoded



def test_memory_search_error_is_generic(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        assert path == "/memory/search"
        raise HTTPException(502, {"source": "memorygate", "message": "private medical note: owner takes DrugX; RAW_OWNER_PROMPT do not show"})

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.post("/api/gates/memorygate/search", headers=csrf_headers(client), json={"query": "owner"})

    assert response.status_code == 200
    assert response.json() == {"error": {"source": "memorygate", "message": "source unavailable"}}
    encoded = str(response.json())
    for unsafe in ("private medical", "DrugX", "RAW_OWNER_PROMPT", "do not show"):
        assert unsafe not in encoded



def test_memory_search_returned_error_envelopes_are_generic(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    private_error = {"source": "memorygate", "message": "private medical note: owner takes DrugX; RAW_OWNER_PROMPT do not show"}

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        assert path == "/memory/search"
        return {"error": private_error, "errors": {"memories": private_error}, "results": []}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.post("/api/gates/memorygate/search", headers=csrf_headers(client), json={"query": "owner"})

    assert response.status_code == 200
    assert response.json()["error"] == {"source": "memorygate", "message": "source unavailable"}
    assert response.json()["errors"] == {"memories": {"source": "memorygate", "message": "source unavailable"}}
    encoded = str(response.json())
    for unsafe in ("private medical", "DrugX", "RAW_OWNER_PROMPT", "do not show"):
        assert unsafe not in encoded



def test_memorygate_overview_error_envelopes_are_generic(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    private_error = {"source": "memorygate", "message": "owner takes DrugX for private medical condition"}

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        if path.startswith("/briefing/") or path == "/memory":
            return {"error": private_error}
        if path == "/observation/active" or path.startswith("/pattern/active"):
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/gates/memorygate")

    assert response.status_code == 200
    assert response.json()["errors"]["briefing"] == {"source": "memorygate", "message": "source unavailable"}
    assert response.json()["errors"]["memories"] == {"source": "memorygate", "message": "source unavailable"}
    encoded = str(response.json())
    for unsafe in ("DrugX", "private medical", "owner takes"):
        assert unsafe not in encoded



def test_memorygate_overview_briefing_is_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "memorygate"
        if path.startswith("/briefing/"):
            return {"summary": "Patient started DrugX for private medical condition", "errors": {"medical": "DrugX private medical prose"}}
        if path in ("/memory", "/observation/active") or path.startswith("/pattern/active"):
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        response = client.get("/api/gates/memorygate")

    assert response.status_code == 200
    assert response.json()["briefing"] == {"available": False, "source": "memorygate", "error": {"source": "memorygate", "message": "source unavailable"}, "metadata_only": True, "content_withheld": True}
    encoded = str(response.json())
    for unsafe in ("Patient started", "DrugX", "private medical", "medical prose"):
        assert unsafe not in encoded



def test_browser_redaction_drops_common_output_env_path_aliases():
    payload = {
        "safe": "kept",
        "env": {"OPENAI_API_KEY": "sk-test"},
        "environment": {"PATH": "/home/alexeybe1kin/bin"},
        "environ": {"SECRET": "value"},
        "stdout": "private tool output",
        "stderr": "private error output",
        "result": "raw tool result",
        "log": "secret log",
        "logs": ["secret logs"],
        "cwd": "/home/alexeybe1kin/project",
        "working_dir": "/home/alexeybe1kin/project",
        "workdir": "/home/alexeybe1kin/project",
        "filesystem_path": "/etc/passwd",
        "socket_path": "/var/run/docker.sock",
        "docker_socket": "/var/run/docker.sock",
        "provider_url": "https://api.openai.com/v1/chat/completions",
        "base_url": "https://openrouter.ai/api/v1",
        "endpoint_url": "https://api.anthropic.com/v1/messages",
        "upstream_url": "https://generativelanguage.googleapis.com/v1beta/models",
        "hidden_prompt": "RAW_OWNER_PROMPT do not show",
        "system_prompt": "system instruction",
        "instructions": "private instruction",
    }

    redacted = redact_sensitive(payload)

    assert redacted == {"safe": "kept"}


def test_capabilities_are_source_bound_and_metadata_only(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if (name, path) == ("brain", "/v1/capabilities"):
            return {"status": "ok", "provider_url": "https://api.openai.com/v1"}
        if (name, path) == ("toolgate", "/v2/status"):
            return {"status": "ok", "docker_socket": "/var/run/docker.sock"}
        if (name, path) == ("toolgate", "/v2/tools"):
            return {"tools": [{"id": "shell", "name": "Shell", "status": "connected", "args": {"cmd": "cat /home/alexey/.env"}, "env": {"TOKEN": "sk-test"}}]}
        if (name, path) == ("brain", "/v1/toolsets"):
            return {"toolsets": [{"id": "web", "name": "Web", "prompt": "hidden prompt"}]}
        if (name, path) == ("brain", "/v1/skills"):
            return {"skills": [{"id": "skill-1", "name": "Research", "path": "/home/alexey/skills/research"}]}
        if (name, path) == ("toolgate", "/v2/automations"):
            return [{"id": "auto-1", "name": "Lights", "command": "curl https://api.anthropic.com"}]
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert body["metadata_only"] is True
    assert body["counts"] == {"tools": 1, "toolsets": 1, "skills": 1, "automations": 1}
    assert body["tools"][0] == {"id": "tools-0", "name": "Shell", "status": "unknown", "source": "toolgate", "kind": "tools", "metadata_only": True, "details_withheld": True}
    encoded = str(body)
    for unsafe in ("api.openai.com", "api.anthropic.com", "/home/alexey", "/var/run/docker.sock", "TOKEN", "sk-test", "hidden prompt", "cmd", "args", "env", "command", "provider_url"):
        assert unsafe not in encoded


def test_capabilities_do_not_invent_live_status_from_empty_source(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        return {}

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert body["sources"]["brain"]["status"] == "unknown"
    assert body["sources"]["toolgate"]["status"] == "unknown"


def test_capabilities_withhold_path_like_item_identity_fields(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if (name, path) == ("brain", "/v1/capabilities"):
            return {"status": "ok"}
        if (name, path) == ("toolgate", "/v2/status"):
            return {"status": "ok"}
        if (name, path) == ("toolgate", "/v2/tools"):
            return {"tools": [{"id": r"D:\agentgate\logs\stdout.log", "name": r"D:\agentgate\prompts\owner.txt", "status": "connected"}]}
        if (name, path) == ("brain", "/v1/toolsets"):
            return {"toolsets": []}
        if (name, path) == ("brain", "/v1/skills"):
            return {"skills": []}
        if (name, path) == ("toolgate", "/v2/automations"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert body["tools"][0]["id"] == "tools-0"
    assert body["tools"][0]["name"] == "reference withheld"
    encoded = str(body)
    assert "D:" not in encoded
    assert "stdout.log" not in encoded
    assert "owner.txt" not in encoded


def test_capabilities_degrade_when_inventory_endpoint_fails(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in {"/v1/capabilities", "/v2/status"}:
            return {"status": "ok"}
        raise HTTPException(status_code=503, detail="raw upstream failure")

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert body["sources"]["brain"]["status"] == "degraded"
    assert body["sources"]["toolgate"]["status"] == "degraded"
    assert body["section_statuses"] == {"tools": "degraded", "toolsets": "degraded", "skills": "degraded", "automations": "degraded"}
    assert "raw upstream failure" not in str(body)


def test_capabilities_withhold_provider_hosts_and_secret_shaped_identity_fields(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    bad_names = [
        "api.mistral.ai/v1",
        "AKIAIOSFODNN7EXAMPLE",
        "github_pat_1234567890abcdef",
        "glpat-1234567890abcdef",
        "hf_1234567890abcdef",
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
        "AIzaSyDUMMYDUMMYDUMMYDUMMY",
        "glpat-...cdef",
        "AKIAIO...MPLE",
        "github...cdef",
        "eyJhbG...ture",
        "sk-...test",
    ]

    async def fake_request(name, method, path, **kwargs):
        if path in {"/v1/capabilities", "/v2/status"}:
            return {"status": "ok"}
        if (name, path) == ("toolgate", "/v2/tools"):
            return {"tools": [{"id": value, "name": value, "status": "offline"} for value in bad_names]}
        if (name, path) == ("brain", "/v1/toolsets"):
            return {"toolsets": [{"id": "stale-toolset", "name": "Stale Toolset", "status": "stale"}]}
        if (name, path) == ("brain", "/v1/skills"):
            return {"skills": [{"id": "planned-skill", "name": "Planned Skill", "status": "planned"}]}
        if (name, path) == ("toolgate", "/v2/automations"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    encoded = str(body)
    for bad in bad_names:
        assert bad not in encoded
    assert {item["name"] for item in body["tools"]} == {"reference withheld"}
    assert {item["status"] for item in body["tools"]} == {"offline"}
    assert body["toolsets"][0]["status"] == "stale"
    assert body["skills"][0]["status"] == "planned"


def test_capabilities_withheld_item_ids_are_unique_surrogates(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in {"/v1/capabilities", "/v2/status"}:
            return {"status": "ok"}
        if (name, path) == ("toolgate", "/v2/tools"):
            return {"tools": [{"id": r"D:\logs\stdout.log", "name": r"D:\prompts\owner.txt"}, {"id": "api.mistral.ai/v1", "name": "api.mistral.ai/v1"}]}
        if (name, path) == ("brain", "/v1/toolsets"):
            return {"toolsets": []}
        if (name, path) == ("brain", "/v1/skills"):
            return {"skills": []}
        if (name, path) == ("toolgate", "/v2/automations"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert [item["id"] for item in body["tools"]] == ["tools-0", "tools-1"]
    assert len({item["id"] for item in body["tools"]}) == 2


def test_capabilities_section_statuses_distinguish_empty_from_degraded(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from fastapi import HTTPException
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in {"/v1/capabilities", "/v2/status"}:
            return {"status": "ok"}
        if (name, path) == ("toolgate", "/v2/tools"):
            raise HTTPException(status_code=503, detail="tool source down")
        if (name, path) == ("brain", "/v1/toolsets"):
            return {"toolsets": []}
        if (name, path) == ("brain", "/v1/skills"):
            return {"skills": [{"id": "planned-skill", "name": "Planned Skill", "status": "planned"}]}
        if (name, path) == ("toolgate", "/v2/automations"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert body["section_statuses"]["tools"] == "degraded"
    assert body["section_statuses"]["toolsets"] == "empty"
    assert body["section_statuses"]["skills"] == "live"
    assert body["skills"][0]["status"] == "planned"
    assert "tool source down" not in str(body)


def test_capabilities_duplicate_upstream_ids_get_unique_surrogates(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in {"/v1/capabilities", "/v2/status"}:
            return {"status": "ok"}
        if (name, path) == ("toolgate", "/v2/tools"):
            return {"tools": [{"id": "shell", "name": "Shell"}, {"id": "shell", "name": "Shell"}]}
        if (name, path) == ("brain", "/v1/toolsets"):
            return {"toolsets": [], "items": [{"id": "fallback", "name": "Should not appear"}]}
        if (name, path) == ("brain", "/v1/skills"):
            return {"skills": []}
        if (name, path) == ("toolgate", "/v2/automations"):
            return []
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert [item["id"] for item in body["tools"]] == ["tools-0", "tools-1"]
    assert body["toolsets"] == []


def test_capabilities_section_status_honors_explicit_collection_status(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path == "/v1/capabilities":
            return {"status": "ok"}
        if path == "/v2/status":
            return {"status": "ok"}
        if path == "/v2/tools":
            return {"status": "degraded", "tools": [{"id": "safe", "name": "Safe", "status": "degraded"}]}
        if path == "/v1/toolsets":
            return {"status": "offline", "toolsets": [{"id": "safe", "name": "Safe", "status": "offline"}]}
        if path == "/v1/skills":
            return {"status": "stale", "skills": [{"id": "safe", "name": "Safe", "status": "stale"}]}
        if path == "/v2/automations":
            return {"status": "blocked", "automations": [{"id": "safe", "name": "Safe", "status": "blocked"}]}
        raise AssertionError((name, method, path))

    with TestClient(app) as client:
        client.post("/api/auth/login", json={"key": "test-owner-key-1234"})
        app.state.upstream.request = fake_request
        body = client.get("/api/capabilities").json()

    assert body["section_statuses"] == {"tools": "degraded", "toolsets": "offline", "skills": "stale", "automations": "blocked"}

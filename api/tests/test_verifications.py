from __future__ import annotations

from fastapi.testclient import TestClient


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("agentgate_csrf", "")}


def login(client: TestClient) -> None:
    assert client.post("/api/auth/login", json={"key": "test-owner-key-1234"}).status_code == 200


def test_verifications_center_returns_only_real_pending_and_unavailable_history(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert (name, method, path) == ("toolgate", "GET", "/v2/requests")
        return [
            {
                "kind": "verification",
                "status": "pending",
                "id": "tg/live id",
                "title": "Safe title",
                "severity": "high",
                "payload": {
                    "message": "Review digest only",
                    "subject_type": "tool",
                    "subject_id": "mail.send",
                    "subject_version": "v2",
                    "args": {"prompt": "hidden", "api_key": "secret"},
                    "binding": {
                        "args_digest": "sha256:abc",
                        "expires_at": "2030-01-01T00:00:00Z",
                    },
                },
            },
            {
                "kind": "verification",
                "status": "approved",
                "id": "tg-old",
                "title": "Must not become retained history",
            },
        ]

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        app.state.db.upsert_verification({
            "source": "brain",
            "source_id": "brain-pending",
            "run_id": "run-1",
            "status": "pending",
            "summary": {"title": "Brain approval", "binding": {"args_digest": "sha256:def"}},
        })
        app.state.db.upsert_verification({
            "source": "brain",
            "source_id": "brain-approved",
            "run_id": "run-2",
            "status": "approved",
            "summary": {"title": "Do not show as history"},
        })
        response = client.get("/api/verifications")

    assert response.status_code == 200
    body = response.json()
    assert body["metadata_only"] is True
    assert body["history"]["available"] is False
    assert body["history"]["status"] == "unavailable"
    assert body["history"]["items"] == []
    assert body["history"]["reason"] == "No real source-bound approval history query contract is available."
    assert [(row["source"], row["source_id"]) for row in body["pending"]] == [
        ("toolgate", "tg/live id"),
        ("brain", "brain-pending"),
    ]
    encoded = str(body)
    for unsafe in ("hidden", "api_key", "secret", "prompt", "tg-old", "brain-approved"):
        assert unsafe not in encoded
    assert body["pending"][0]["severity"] == "high"
    assert body["pending"][0]["expires_at"] == "2030-01-01T00:00:00Z"
    assert body["pending"][0]["binding"]["digest"] == "sha256:abc"


def test_toolgate_decision_is_source_bound_and_csrf_protected(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path, kwargs.get("json")))
        assert name == "toolgate"
        assert method == "POST"
        assert path == "/v2/requests/tg%2Flive%20id/decision"
        return {"status": "rejected", "raw_args": {"secret": "nope"}}

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        missing_csrf = client.post("/api/verifications/toolgate/tg%2Flive%20id/decision", json={"decision": "rejected"})
        response = client.post(
            "/api/verifications/toolgate/tg%2Flive%20id/decision",
            headers=csrf_headers(client),
            json={"decision": "rejected"},
        )

    assert missing_csrf.status_code == 403
    assert response.status_code == 200
    assert calls == [("toolgate", "POST", "/v2/requests/tg%2Flive%20id/decision", {"decision": "rejected"})]
    body = response.json()
    assert body == {
        "source": "toolgate",
        "id": "tg/live id",
        "source_id": "tg/live id",
        "status": "rejected",
        "decision": "rejected",
        "metadata_only": True,
        "raw_response_withheld": True,
    }
    assert "secret" not in str(body)

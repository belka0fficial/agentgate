from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from fastapi.testclient import TestClient


def login(client: TestClient) -> None:
    assert client.post("/api/auth/login", json={"key": "test-owner-key-1234"}).status_code == 200


def prepare_env(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("MEMORYGATE_AGENT_ID", "brain")


def test_attention_summary_uses_only_real_source_bound_states(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path))
        if (name, path) == ("brain", "/health/detailed"):
            return {"status": "ok", "provider_url": "https://api.openai.com/v1"}
        if (name, path) == ("toolgate", "/v2/status"):
            return {"status": "degraded", "docker_socket": "/var/run/docker.sock"}
        if (name, path) == ("memorygate", "/health"):
            return {"status": "offline", "message": "failed at /home/alexey/private"}
        if (name, path) == ("systemgate", "/health"):
            return {"status": "stale"}
        if (name, path) == ("toolgate", "/v2/requests"):
            return [
                {
                    "kind": "verification",
                    "status": "pending",
                    "id": "tg-1",
                    "payload": {
                        "title": "Approve safe action",
                        "message": "hidden prompt token: SECRET",
                        "subject_type": "tool",
                        "subject_id": "notify.owner",
                        "binding": {"args_digest": "digest-1"},
                        "args": {"body": "private body", "api_key": "sk-test"},
                    },
                }
            ]
        if (name, path) == ("brain", "/api/jobs"):
            return {
                "jobs": [
                    {
                        "id": "job-failed",
                        "name": "Private owner job",
                        "status": "failed",
                        "last_status": "failed",
                        "last_run_at": datetime.now(timezone.utc).isoformat(),
                        "run_history": [
                            {"status": "failed", "stderr": "private stderr", "output": "hidden output"},
                            {"status": "ok", "output": "private success"},
                        ],
                        "prompt": "hidden prompt",
                        "provider_url": "https://api.anthropic.com/v1/messages",
                    },
                    {"id": "job-ok", "status": "ok", "run_history": [{"status": "ok"}]},
                ]
            }
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        app.state.db.create_suggestion({"title": "Safe suggestion", "summary": "Consider a safe spike", "source": "brain", "confidence": "high"})
        app.state.db.upsert_verification({"source": "brain", "source_id": "brain-approval", "run_id": "run-1", "status": "pending", "summary": {"title": "Brain approval", "message": "private prompt"}})
        response = client.get("/api/attention")

    assert response.status_code == 200
    body = response.json()
    assert calls == [
        ("brain", "GET", "/health/detailed"),
        ("toolgate", "GET", "/v2/status"),
        ("memorygate", "GET", "/health"),
        ("systemgate", "GET", "/health"),
        ("toolgate", "GET", "/v2/requests"),
        ("brain", "GET", "/api/jobs"),
    ]
    assert body["metadata_only"] is True
    assert body["status"] == "degraded"
    assert body["summary"] == {
        "pending_approvals": 2,
        "degraded_dependencies": 3,
        "failed_recent_jobs": 1,
        "new_suggestions": 1,
    }
    assert [item["kind"] for item in body["items"]] == [
        "pending_approval",
        "pending_approval",
        "degraded_dependency",
        "degraded_dependency",
        "degraded_dependency",
        "failed_recent_job",
        "new_suggestion",
    ]
    assert body["items"][0]["href"] == "/approvals?source=toolgate&source_id=tg-1"
    assert body["items"][1]["href"] == "/approvals?source=brain&source_id=brain-approval"
    assert body["items"][5]["href"] == "/flow-execution/job-failed"
    assert body["items"][6]["href"] == "/suggestions"
    assert body["notifications"] == {
        "status": "planned",
        "source": "agentgate",
        "delivery": [],
        "reason": "No durable browser push or background delivery notification contract is available.",
    }
    encoded = str(body)
    for unsafe in (
        "api.openai.com",
        "api.anthropic.com",
        "/var/run/docker.sock",
        "/home/alexey",
        "hidden prompt",
        "SECRET",
        "private body",
        "private prompt",
        "sk-test",
        "Private owner job",
        "private stderr",
        "hidden output",
        "provider_url",
        "prompt",
        "args",
        "api_key",
        "stderr",
        "output",
    ):
        assert unsafe not in encoded


def test_attention_reports_empty_and_planned_notifications_without_fake_alerts(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        if path in {"/health/detailed", "/v2/status", "/health"}:
            return {"status": "ok"}
        if path == "/v2/requests":
            return []
        if path == "/api/jobs":
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.get("/api/attention")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "empty"
    assert body["summary"] == {
        "pending_approvals": 0,
        "degraded_dependencies": 0,
        "failed_recent_jobs": 0,
        "new_suggestions": 0,
    }
    assert body["items"] == []
    assert body["empty_state"] == "empty"
    assert body["notifications"]["status"] == "planned"


def test_attention_degrades_when_sources_are_unavailable_without_faking_counts(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        raise HTTPException(503, {"source": name, "message": "failed hidden prompt using https://api.openai.com/v1 and /etc/passwd"})

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.get("/api/attention")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["summary"] == {
        "pending_approvals": 0,
        "degraded_dependencies": 6,
        "failed_recent_jobs": 0,
        "new_suggestions": 0,
    }
    assert body["source_status"]["toolgate_requests"]["status"] == "degraded"
    assert body["source_status"]["brain_jobs"]["status"] == "degraded"
    assert all(item["kind"] == "degraded_dependency" for item in body["items"])
    encoded = str(body)
    for unsafe in ("hidden prompt", "api.openai.com", "https://", "/etc/passwd"):
        assert unsafe not in encoded

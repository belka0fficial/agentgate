from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = REPO_ROOT / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))


def prepare_env(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("MEMORYGATE_AGENT_ID", "brain")


def login(client: TestClient) -> dict[str, Any]:
    response = client.post("/api/auth/login", json={"owner_token": "test-owner-key-1234"})
    assert response.status_code == 200
    body = response.json()
    assert body["owner_authenticated"] is True
    assert body["credentials_included"] is False
    assert body["token_included"] is False
    assert body["csrf_token"]
    return {"X-CSRF-Token": body["csrf_token"]}


def assert_no_browser_secrets(payload: Any) -> None:
    encoded = str(payload)
    for unsafe in (
        "hidden prompt",
        "RAW_OWNER_PROMPT",
        "sk-test",
        "api.openai.com",
        "api.anthropic.com",
        "https://",
        "/home/alexey",
        "/etc/passwd",
        "/var/run/docker.sock",
        "Authorization",
        "Bearer",
        "raw_args",
        "provider_url",
        "stdout",
        "stderr",
    ):
        assert unsafe not in encoded


def test_acceptance_owner_login_logout_and_partial_dependency_failure(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)
    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert method == "GET"
        if name == "brain":
            return {"status": "ok", "provider_url": "https://api.openai.com/v1"}
        if name == "toolgate":
            raise HTTPException(401, {"message": "Authorization: Bearer sk-test"})
        if name == "memorygate":
            raise HTTPException(503, {"message": "timeout at /home/alexey/.env"})
        if name == "systemgate":
            return {"status": "stale", "docker_socket": "/var/run/docker.sock"}
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        assert client.get("/api/health").json()["process_only"] is True
        assert client.get("/api/health/dependencies").status_code == 401
        csrf = login(client)
        app.state.upstream.request = fake_request
        dependencies = client.get("/api/health/dependencies")
        assert dependencies.status_code == 200
        assert client.post("/api/auth/logout").status_code == 403
        logout = client.post("/api/auth/logout", headers=csrf)
        assert logout.status_code == 200
        assert logout.json()["owner_authenticated"] is False
        assert client.get("/api/auth/session").status_code == 401

    body = dependencies.json()
    assert [item["name"] for item in body] == ["brain", "toolgate", "memorygate", "systemgate"]
    assert {item["name"]: item["status"] for item in body} == {
        "brain": "live",
        "toolgate": "blocked",
        "memorygate": "offline",
        "systemgate": "stale",
    }
    assert_no_browser_secrets(body)


def test_acceptance_chat_stream_fork_stop_and_verification_decisions_are_source_bound(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)
    from agentgate.main import app

    calls = []

    class FakeResponse:
        is_error = False

        async def aiter_lines(self):
            yield "event: approval.required"
            yield "data: " + json.dumps(
                {
                    "approval_id": "approval-1",
                    "run_id": "run-1",
                    "subject_type": "tool",
                    "subject_id": "mail.send",
                    "subject_version": "v1",
                    "args_digest": "sha256:abc",
                    "args": {"body": "private", "api_key": "sk-test"},
                    "message": "hidden prompt",
                    "provider_url": "https://api.openai.com/v1",
                }
            )
            yield ""
            yield "event: message"
            yield "data: " + json.dumps({"delta": "hello", "stdout": "private stdout"})
            yield ""

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        def build_request(self, method, url, **kwargs):
            calls.append(("stream-build", method, url, kwargs.get("json")))
            return object()

        async def send(self, request, stream=False):
            calls.append(("stream-send", stream))
            return FakeResponse()

        async def aclose(self):
            calls.append(("stream-close",))

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path, kwargs.get("json")))
        if path == "/api/sessions/chat-1/fork":
            return {
                "id": "fork-1",
                "session_id": "fork-1",
                "status": "created",
                "messages": [{"content": "private"}],
                "provider_url": "https://api.openai.com/v1",
            }
        if path == "/v2/requests/tg-1/decision":
            return {"id": "tg-1", "status": "approved", "raw_args": {"api_key": "sk-test"}}
        if path == "/v1/runs/run-1/approval":
            return {"id": "run-1", "status": "approved", "stdout": "private stdout"}
        if path == "/v1/runs/run-1/stop":
            return {"id": "run-1", "status": "stopped", "stderr": "private stderr"}
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        csrf = login(client)
        app.state.upstream.request = fake_request
        stream = client.post(
            "/api/chats/chat-1/stream",
            headers=csrf,
            json={"input": "hello", "intensity": "high", "memory_incognito": True},
        )
        fork = client.post("/api/chats/chat-1/fork", headers=csrf, json={"from_message_id": "message-1"})
        toolgate_decision = client.post("/api/verifications/toolgate/tg-1/decision", headers=csrf, json={"decision": "approved"})
        brain_decision = client.post("/api/verifications/brain/approval-1/decision", headers=csrf, json={"decision": "approved"})
        invalid_brain_decision = client.post("/api/verifications/brain/approval-1/decision", headers=csrf, json={"decision": "maybe"})
        stop = client.post("/api/runs/run-1/stop", headers=csrf)

    assert stream.status_code == 200
    assert fork.status_code == 200
    assert toolgate_decision.status_code == 200
    assert brain_decision.status_code == 200
    assert invalid_brain_decision.status_code == 422
    assert stop.status_code == 200
    assert ("brain", "POST", "/v1/runs/run-1/approval", {"decision": "maybe"}) not in calls
    assert calls[0][3] == {
        "input": "hello",
        "model_options": {"reasoning_effort": "high"},
        "instructions": "Do not create, update, or persist long-term memory for this turn.",
    }
    assert "event: approval.required" in stream.text
    assert "sha256:abc" in stream.text
    assert "hello" in stream.text
    for payload in (stream.text, fork.json(), toolgate_decision.json(), brain_decision.json(), stop.json()):
        assert_no_browser_secrets(payload)


def test_acceptance_cron_mutation_lock_actions_apps_attention_pwa_and_restart_preserve_local_data(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)
    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path, kwargs.get("json")))
        if name == "brain" and path == "/api/jobs" and method == "GET":
            return [
                {"id": "owner-job", "status": "running", "active_run": {"status": "running"}},
                {"id": "system:flow-improvement-review", "name": "duplicate"},
            ]
        if name == "brain" and path == "/api/jobs/owner-job/run":
            return {"id": "owner-job", "status": "running", "stdout": "private stdout"}
        if name == "brain" and path == "/api/jobs/owner-job/stop":
            return {"id": "owner-job", "status": "stopping", "stderr": "private stderr"}
        if name == "brain" and path == "/health/detailed":
            return {"status": "ok"}
        if name == "toolgate" and path == "/v2/status":
            return {"status": "degraded", "docker_socket": "/var/run/docker.sock"}
        if name == "memorygate" and path == "/health":
            return {"status": "ok"}
        if name == "systemgate" and path == "/health":
            return {"status": "offline"}
        if name == "toolgate" and path == "/v2/requests":
            return []
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as first_client:
        csrf = login(first_client)
        app.state.upstream.request = fake_request
        suggestion = first_client.post(
            "/api/suggestions",
            headers=csrf,
            json={"title": "Safe suggestion", "summary": "Safe summary", "confidence": "high"},
        ).json()
        registered = app.state.db.create_app(
            {
                "name": "Local Tools",
                "description": "Pinned local control plane",
                "url": "http://127.0.0.1:9000",
                "status": "unknown",
                "source": "brain",
                "source_ref": "app-registry:local-tools",
                "pinned": False,
            }
        )
        pinned = first_client.patch(f"/api/apps/{registered['id']}", headers=csrf, json={"pinned": True, "position": 1})
        system_run = first_client.post("/api/cron/jobs/system:flow-improvement-review/run", headers=csrf)
        owner_run = first_client.post("/api/cron/jobs/owner-job/run", headers=csrf)
        owner_stop = first_client.post("/api/cron/jobs/owner-job/stop", headers=csrf)
        attention = first_client.get("/api/attention")
        api_miss = first_client.get("/api/not-real")
        shell = first_client.get("/not-an-api-route")

    assert pinned.status_code == 200
    assert pinned.json()["app"]["pinned"] is True
    assert system_run.status_code == 423
    assert owner_run.status_code == 200
    assert owner_stop.status_code == 200
    assert attention.status_code == 200
    assert attention.json()["status"] == "degraded"
    assert api_miss.status_code == 404
    assert api_miss.headers["content-type"].startswith("application/json")
    assert "AgentGate" in shell.text
    assert_no_browser_secrets({"pinned": pinned.json(), "cron": [system_run.json(), owner_run.json(), owner_stop.json()], "attention": attention.json()})

    with TestClient(app) as restarted_client:
        restarted_csrf = login(restarted_client)
        restarted_apps = restarted_client.get("/api/apps")
        restarted_suggestions = restarted_client.get("/api/suggestions")
        repinned = restarted_client.patch(f"/api/apps/{registered['id']}", headers=restarted_csrf, json={"pinned": False})

    assert restarted_apps.status_code == 200
    assert restarted_suggestions.status_code == 200
    assert [app_row["id"] for app_row in restarted_apps.json()["apps"]] == [registered["id"]]
    assert restarted_apps.json()["apps"][0]["pinned"] is True
    assert restarted_suggestions.json()["suggestions"][0]["id"] == suggestion["id"]
    assert repinned.json()["app"]["pinned"] is False
    assert_no_browser_secrets(restarted_apps.json())

from __future__ import annotations

from fastapi import HTTPException
from fastapi.testclient import TestClient


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("agentgate_csrf", "")}


def login(client: TestClient) -> None:
    assert client.post("/api/auth/login", json={"key": "test-owner-key-1234"}).status_code == 200


def prepare_env(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))


def test_flow_execution_overview_is_source_bound_metadata_only(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert name == "brain"
        assert (method, path) == ("GET", "/api/jobs")
        return {
            "jobs": [
                {
                    "id": "flow-daily",
                    "kind": "flow",
                    "status": "running",
                    "schedule": "0 9 * * *",
                    "next_run_at": "2030-01-02T09:00:00Z",
                    "last_run_at": "2030-01-01T09:00:00Z",
                    "runs": 3,
                    "history": "--sfb",
                    "run_history": [
                        {"status": "ok", "output_summary": "secret output", "stdout": "private stdout", "completed_at": "2030-01-01T09:00:00Z"},
                        {"status": "failed", "error": "failed at https://api.openai.com/v1 using /home/alexeybe1kin/private", "stderr": "private stderr"},
                        {"status": "blocked", "prompt": "hidden prompt", "args": {"api_key": "sk-test"}},
                    ],
                    "active_run": {"status": "running", "run_id": "raw-run-id", "started_at": "2030-01-01T09:00:00Z"},
                    "prompt": "hidden prompt token: SECRET /etc/passwd",
                    "provider_url": "https://api.anthropic.com/v1/messages",
                },
                {
                    "id": "loop-review",
                    "kind": "loop",
                    "status": "paused",
                    "runs": 0,
                    "history": "------------",
                },
            ]
        }

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.get("/api/flow-execution")

    assert response.status_code == 200
    body = response.json()
    assert body["metadata_only"] is True
    assert body["source_status"] == {"status": "live", "source": "brain"}
    assert body["definitions_status"] == "live"
    assert body["runtime"]["source"] == "brain"
    assert body["runtime"]["execution_source_bound"] is True
    assert body["runtime"]["flow_loop_engine"] == "planned"
    assert body["runtime"]["supported_actions"] == ["job.stop"]
    assert [item["id"] for item in body["definitions"]] == ["flow-daily", "loop-review"]
    assert body["definitions"][0]["kind"] == "flow"
    assert body["definitions"][0]["active_run"] == {"status": "running", "started_at": "2030-01-01T09:00:00Z", "cancellable": True}
    assert body["definitions"][0]["history_labels"] == ["success", "failed", "blocked"]
    assert body["definitions"][0]["run_history"][0] == {"status": "ok", "label": "success", "completed_at": "2030-01-01T09:00:00Z", "details_withheld": True}
    assert body["definitions"][1]["history_labels"] == []
    encoded = str(body)
    for unsafe in (
        "secret output",
        "stdout",
        "stderr",
        "hidden prompt",
        "SECRET",
        "/etc/passwd",
        "/home/alexeybe1kin",
        "api.openai.com",
        "api.anthropic.com",
        "https://",
        "raw-run-id",
        "provider_url",
        "args",
        "api_key",
        "sk-test",
    ):
        assert unsafe not in encoded


def test_flow_execution_reports_planned_when_runtime_contract_unavailable(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert (name, method, path) == ("brain", "GET", "/api/jobs")
        raise HTTPException(404, {"source": "brain", "message": "no route /api/jobs; provider https://api.openai.com/v1"})

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.get("/api/flow-execution")

    assert response.status_code == 200
    body = response.json()
    assert body["source_status"]["status"] == "degraded"
    assert body["definitions_status"] == "planned"
    assert body["definitions"] == []
    assert body["planned"]["flow_execution"]["status"] == "planned"
    assert body["planned"]["loop_execution"]["status"] == "planned"
    assert body["cancellation"]["status"] == "blocked"
    assert body["cancellation"]["route"] == "/api/cron/jobs/{job_id}/stop"
    assert "api.openai.com" not in str(body)
    assert "https://" not in str(body)


def test_flow_execution_detail_redacts_history_and_exposes_actions(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        assert (name, method, path) == ("brain", "GET", "/api/jobs")
        return [
            {
                "id": "job-1",
                "kind": "cron",
                "status": "running",
                "schedule": "*/30 * * * *",
                "runs": 2,
                "run_history": [{"status": "stopped", "output_summary": "owner private output", "completed_at": "2030-01-01T00:00:00Z"}],
                "active_run": {"status": "running", "run_id": "raw-run", "started_at": "2030-01-01T00:00:00Z"},
            }
        ]

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.get("/api/flow-execution/job-1")

    assert response.status_code == 200
    body = response.json()
    assert body["metadata_only"] is True
    assert body["definition"]["id"] == "job-1"
    assert body["definition"]["actions"] == [{"name": "cancel", "enabled": True, "route": "/api/cron/jobs/job-1/stop", "method": "POST"}]
    assert body["definition"]["history_labels"] == ["stopped"]
    assert "owner private output" not in str(body)
    assert "raw-run" not in str(body)


def test_flow_execution_detail_for_builtin_system_job_is_locked(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path))
        return []

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.get("/api/flow-execution/system:flow-improvement-review")

    assert calls == []
    assert response.status_code == 200
    body = response.json()
    assert body["definition"]["id"] == "system:flow-improvement-review"
    assert body["definition"]["owner"] == "system"
    assert body["definition"]["editable"] is False
    assert body["definition"]["actions"] == []
    assert body["definition"]["execution"]["status"] == "planned"
    assert body["definition"]["execution"]["available"] is False


def test_cron_job_stop_uses_real_scoped_route_and_sanitizes_response(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path))
        if method == "GET":
            return [{"id": "job-1", "status": "running", "active_run": {"status": "running"}}]
        return {
            "job_id": "job-1",
            "status": "stopping",
            "active_run": {"status": "stopping", "run_id": "raw-run", "stdout": "private stdout"},
            "provider_url": "https://api.openai.com/v1",
        }

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.post("/api/cron/jobs/job-1/stop", headers=csrf_headers(client))

    assert response.status_code == 200
    assert calls == [("brain", "GET", "/api/jobs"), ("brain", "POST", "/api/jobs/job-1/stop")]
    assert response.json() == {
        "id": "job-1",
        "source": "brain",
        "status": "stopping",
        "action": "stopping",
        "metadata_only": True,
        "raw_response_withheld": True,
    }
    assert "raw-run" not in str(response.json())
    assert "api.openai.com" not in str(response.json())


def test_cron_job_stop_does_not_fake_cancellation_when_route_missing(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    async def fake_request(name, method, path, **kwargs):
        raise HTTPException(404, {"source": "brain", "message": "missing /api/jobs/job-1/stop at https://api.openai.com/v1"})

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.post("/api/cron/jobs/job-1/stop", headers=csrf_headers(client))

    assert response.status_code == 404
    body = response.json()
    assert body["status"] == "degraded"
    assert body["action"] == "not_confirmed"
    assert body["metadata_only"] is True
    assert body["raw_response_withheld"] is True
    assert "api.openai.com" not in str(body)
    assert "https://" not in str(body)


def test_cron_job_stop_keeps_builtin_system_jobs_locked(monkeypatch, tmp_path):
    prepare_env(monkeypatch, tmp_path)

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path))
        return {"status": "stopping"}

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.post("/api/cron/jobs/system:technology-radar-global/stop", headers=csrf_headers(client))

    assert calls == []
    assert response.status_code == 423
    assert response.json()["status"] == "blocked"
    assert response.json()["owner"] == "system"



def test_terminal_active_run_is_not_stoppable():
    from agentgate.main import has_active_runtime
    assert has_active_runtime({"active_run": {"status": "completed"}}) is False
    assert has_active_runtime({"active_run": {"status": "failed"}}) is False
    assert has_active_runtime({"active_run": {"status": "stopping"}}) is True

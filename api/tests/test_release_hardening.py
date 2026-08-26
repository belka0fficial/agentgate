from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = REPO_ROOT / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from fastapi import HTTPException
from fastapi.testclient import TestClient


ALLOWED_SOURCE_STATUSES = {"live", "degraded", "offline", "stale", "blocked", "empty", "planned", "unknown"}


def login(client: TestClient) -> None:
    assert client.post("/api/auth/login", json={"key": "test-owner-key-1234"}).status_code == 200


def configured_app(monkeypatch, tmp_path):
    monkeypatch.setenv("AGENTGATE_ADMIN_KEY", "test-owner-key-1234")
    monkeypatch.setenv("AGENTGATE_SESSION_SECRET", "test-session-secret-12345678901234567890")
    monkeypatch.setenv("AGENTGATE_MCP_KEY", "test-mcp-key-123456")
    monkeypatch.setenv("AGENTGATE_DATA_DIR", str(tmp_path))
    from agentgate.main import app

    return app


def test_process_health_is_process_only_not_dependency_theatre(monkeypatch, tmp_path):
    app = configured_app(monkeypatch, tmp_path)

    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "live"
    assert body["service"] == "agentgate"
    assert body["process_only"] is True
    assert body["dependencies_checked"] is False
    assert body["dependency_health_route"] == "/api/health/dependencies"


def test_dependency_health_contract_is_deterministic_for_partial_outage(monkeypatch, tmp_path):
    app = configured_app(monkeypatch, tmp_path)

    async def fake_request(name, method, path, **kwargs):
        assert method == "GET"
        if name == "brain":
            return {"status": "ok", "provider_url": "https://api.openai.com/v1"}
        if name == "toolgate":
            raise HTTPException(403, {"source": "toolgate", "message": "Authorization: Bearer sk-test forbidden"})
        if name == "memorygate":
            raise HTTPException(503, {"source": "memorygate", "message": "timeout /home/alexey/.env"})
        if name == "systemgate":
            return {"status": "unavailable"}
        raise AssertionError(name)

    with TestClient(app) as client:
        login(client)
        app.state.upstream.request = fake_request
        response = client.get("/api/health/dependencies")

    assert response.status_code == 200
    body = response.json()
    assert [item["name"] for item in body] == ["brain", "toolgate", "memorygate", "systemgate"]
    statuses = {item["name"]: item["status"] for item in body}
    assert statuses == {
        "brain": "live",
        "toolgate": "blocked",
        "memorygate": "offline",
        "systemgate": "offline",
    }
    assert set(statuses.values()) <= ALLOWED_SOURCE_STATUSES
    encoded = str(body)
    for unsafe in ("Authorization", "Bearer", "sk-test", "/home/alexey", ".env", "api.openai.com"):
        assert unsafe not in encoded


def test_release_operations_doc_covers_backup_restore_upgrade_startup_and_scans():
    doc_path = REPO_ROOT / "docs" / "operations" / "release-hardening.md"
    assert doc_path.exists()
    text = doc_path.read_text(encoding="utf-8").lower()
    for required in (
        "backup",
        "restore",
        "upgrade",
        "migration",
        "rollback",
        "safe production startup",
        "health verification",
        "partial failure",
        "static scan",
        "secret scan",
    ):
        assert required in text
    assert "do not claim live" in text
    assert "source-bound" in text


def test_static_boundary_scan_tool_fails_on_browser_secret_and_passes_clean_fixture(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    assert script.exists()

    clean = tmp_path / "clean.js"
    clean.write_text("const status = 'degraded'; const details_withheld = true;\n", encoding="utf-8")
    clean_run = subprocess.run([sys.executable, str(script), str(clean)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert clean_run.returncode == 0, clean_run.stdout + clean_run.stderr
    assert "0 findings" in clean_run.stdout

    leaked = tmp_path / "leaked.js"
    leaked.write_text("window.__AGENTGATE_ADMIN_KEY='sk-test'; fetch('https://api.openai.com/v1');\n", encoding="utf-8")
    leaked_run = subprocess.run([sys.executable, str(script), str(leaked)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert leaked_run.returncode == 1
    assert "[redacted]" in leaked_run.stdout
    assert "provider upstream URL" in leaked_run.stdout



def test_static_boundary_scan_fails_closed_for_missing_or_oversized_targets(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    missing = subprocess.run([sys.executable, str(script), str(tmp_path / "missing.js")], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert missing.returncode == 2
    oversized = tmp_path / "large.js"
    oversized.write_bytes(b"x" * 5_000_001)
    large_run = subprocess.run([sys.executable, str(script), str(oversized)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert large_run.returncode == 1
    assert "oversized-file" in large_run.stdout


def test_static_boundary_scan_detects_generic_key_and_mistral_provider(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    leaked = tmp_path / "leaked.js"
    leaked.write_text("OPENAI_API_KEY=abc123456789; fetch('https://api.mistral.ai/v1');\n", encoding="utf-8")
    result = subprocess.run([sys.executable, str(script), str(leaked)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert result.returncode == 1
    assert "generic API key assignment" in result.stdout
    assert "provider upstream URL" in result.stdout


def test_dependency_auth_required_payload_is_blocked(monkeypatch):
    from agentgate.main import dependency_status_from_payload
    assert dependency_status_from_payload({"status": "auth_required"}) == "blocked"



def test_static_boundary_scan_fails_closed_for_unreadable_text(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    malformed = tmp_path / "malformed.js"
    malformed.write_bytes(b"\xffOPENAI_API_KEY=abc123456789")
    result = subprocess.run([sys.executable, str(script), str(malformed)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert result.returncode == 1
    assert "unreadable-file" in result.stdout



def test_static_boundary_scan_does_not_print_secret_excerpts(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    leaked = tmp_path / "leaked.js"
    leaked.write_text("OPENAI_API_KEY=abc123456789;\n", encoding="utf-8")
    result = subprocess.run([sys.executable, str(script), str(leaked)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert result.returncode == 1
    assert "abc123456789" not in result.stdout
    assert "[redacted]" in result.stdout


def test_static_boundary_scan_rejects_explicit_unsupported_file(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    binary = tmp_path / "artifact.bin"
    binary.write_bytes(b"\xff" + b"OPENAI_API_KEY=abc123456789")
    result = subprocess.run([sys.executable, str(script), str(binary)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert result.returncode == 1
    assert "unscannable-file" in result.stdout



def test_static_boundary_scan_reports_explicit_match_once(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    leaked = tmp_path / "leaked.js"
    leaked.write_text("OPENAI_API_KEY=abc123456789;\n", encoding="utf-8")
    result = subprocess.run([sys.executable, str(script), str(leaked)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert result.returncode == 1
    assert result.stdout.count("generic API key assignment") == 1



def test_static_boundary_scan_deduplicates_overlapping_targets_and_hides_paths(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    nested = tmp_path / "private-secret-directory"
    nested.mkdir()
    leaked = nested / "secret-name.js"
    leaked.write_text("OPENAI_API_KEY=abc123456789;\n", encoding="utf-8")
    result = subprocess.run([sys.executable, str(script), str(tmp_path), str(nested)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert result.returncode == 1
    assert result.stdout.count("generic API key assignment") == 1
    assert str(tmp_path) not in result.stdout
    assert "private-secret-directory" not in result.stdout
    assert "secret-name.js" not in result.stdout



def test_static_boundary_scan_deduplicates_explicit_targets_and_hides_missing_paths(tmp_path):
    script = REPO_ROOT / "scripts" / "security" / "static-boundary-scan.py"
    leaked = tmp_path / "leaked.js"
    leaked.write_text("OPENAI_API_KEY=abc123456789;\n", encoding="utf-8")
    result = subprocess.run([sys.executable, str(script), str(leaked), str(leaked)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert result.returncode == 1
    assert result.stdout.count("generic API key assignment") == 1
    missing = tmp_path / "private-missing-secret.js"
    missing_result = subprocess.run([sys.executable, str(script), str(missing)], cwd=REPO_ROOT, text=True, capture_output=True, check=False)
    assert missing_result.returncode == 2
    assert str(missing) not in missing_result.stdout
    assert "1 target(s) missing" in missing_result.stdout

from fastapi.testclient import TestClient
from test_core import csrf_headers


def test_character_appearance_metadata_persists_without_exposing_asset_bytes(monkeypatch, tmp_path):
    monkeypatch.setenv('AGENTGATE_ADMIN_KEY', 'test-owner-key-1234')
    monkeypatch.setenv('AGENTGATE_SESSION_SECRET', 'test-session-secret-12345678901234567890')
    monkeypatch.setenv('AGENTGATE_MCP_KEY', 'test-mcp-key-123456')
    monkeypatch.setenv('AGENTGATE_DATA_DIR', str(tmp_path))
    from agentgate.main import app

    with TestClient(app) as client:
        assert client.post('/api/auth/login', json={'key': 'test-owner-key-1234'}).status_code == 200
        response = client.put('/api/character', headers=csrf_headers(client), json={
            'name': 'Research Agent', 'owner_name': 'Alex', 'description': 'Researches carefully', 'personality': 'Direct',
            'background': '', 'boundaries': 'Approval-gated', 'reasoning_level': 'high', 'appearance': {
                'age': 'unknown', 'gender': 'unknown', 'pronouns': 'unknown',
                'species': 'unknown', 'build': 'unknown', 'height': 'unknown',
                'hair': 'unknown', 'eyes': 'unknown',
            }, 'avatar_label': '', 'emotion_pack': '',
        })
        assert response.status_code == 200
        assert response.json()['appearance']['age'] == 'unknown'
        assert response.json()['description'] == 'Researches carefully'
        assert response.json()['reasoning_level'] == 'high'
        assert 'avatar_data' not in response.json()
        loaded = client.get('/api/character').json()
        assert loaded['appearance']['species'] == 'unknown'
        assert loaded['description'] == 'Researches carefully'
        assert loaded['reasoning_level'] == 'high'
        assert 'avatar_data' not in loaded


def test_character_name_is_required_and_appearance_response_is_sanitized(monkeypatch, tmp_path):
    monkeypatch.setenv('AGENTGATE_ADMIN_KEY', 'test-owner-key-1234')
    monkeypatch.setenv('AGENTGATE_SESSION_SECRET', 'test-session-secret-12345678901234567890')
    monkeypatch.setenv('AGENTGATE_MCP_KEY', 'test-mcp-key-123456')
    monkeypatch.setenv('AGENTGATE_DATA_DIR', str(tmp_path))
    from agentgate.main import app

    with TestClient(app) as client:
        client.post('/api/auth/login', json={'key': 'test-owner-key-1234'})
        headers = csrf_headers(client)
        empty = client.put('/api/character', headers=headers, json={'name': ''})
        assert empty.status_code == 422
        whitespace = client.put('/api/character', headers=headers, json={'name': '   '})
        assert whitespace.status_code == 422
        response = client.put('/api/character', headers=headers, json={
            'name': 'Safe Agent', 'appearance': {'notes': '/etc/passwd'},
        })
        assert response.status_code == 200
        encoded = str(response.json())
        assert '/etc/passwd' not in encoded
        assert 'reference withheld' in encoded

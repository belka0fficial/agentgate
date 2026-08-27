from fastapi.testclient import TestClient


def csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.cookies.get('agentgate_csrf')
    assert token
    return {'X-CSRF-Token': token}


def test_stream_chat_uses_accepted_text_contract(monkeypatch, tmp_path):
    monkeypatch.setenv('AGENTGATE_ADMIN_KEY', 'test-owner-key-1234')
    monkeypatch.setenv('AGENTGATE_SESSION_SECRET', 'test-session-secret-12345678901234567890')
    monkeypatch.setenv('AGENTGATE_MCP_KEY', 'test-mcp-key-123456')
    monkeypatch.setenv('AGENTGATE_DATA_DIR', str(tmp_path))

    import httpx
    from agentgate.main import app

    captured = {}

    class FakeResponse:
        is_error = False

        async def aiter_lines(self):
            yield 'event: done'
            yield 'data: {}'
            yield ''

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        def build_request(self, method, url, **kwargs):
            captured['method'] = method
            captured['url'] = url
            captured['json'] = kwargs.get('json')
            return object()

        async def send(self, request, stream=False):
            captured['stream'] = stream
            return FakeResponse()

        async def aclose(self):
            pass

    monkeypatch.setattr(httpx, 'AsyncClient', FakeAsyncClient)

    with TestClient(app) as client:
        client.post('/api/auth/login', json={'key': 'test-owner-key-1234'})
        response = client.post(
            '/api/chats/chat-1/stream',
            headers=csrf_headers(client),
            json={'input': 'hello', 'intensity': 'high', 'memory_incognito': True},
        )

    assert response.status_code == 200
    assert captured['method'] == 'POST'
    assert captured['json'] == {
        'input': 'hello',
        'model_options': {'reasoning_effort': 'high'},
        'instructions': 'Do not create, update, or persist long-term memory for this turn.',
    }



def test_chat_messages_preserve_conversation_content_but_withhold_trace_details():
    from agentgate.main import safe_chat_messages

    payload = safe_chat_messages({
        "messages": [{
            "id": "message-1",
            "role": "agent",
            "content": "See https://example.com and /tmp/report.txt.",
            "trace": [{"tool": "shell", "args": "cat /etc/passwd", "result": "private stdout", "duration_ms": 12}],
        }]
    })

    assert payload["messages"][0]["content"] == "See https://example.com and /tmp/report.txt."
    assert payload["messages"][0]["trace"] == [{"tool": "shell", "duration_ms": 12, "details_withheld": True}]



def test_chat_session_routes_sanitize_and_encode_source_bound_ids(monkeypatch, tmp_path):
    monkeypatch.setenv('AGENTGATE_ADMIN_KEY', 'test-owner-key-1234')
    monkeypatch.setenv('AGENTGATE_SESSION_SECRET', 'test-session-secret-12345678901234567890')
    monkeypatch.setenv('AGENTGATE_MCP_KEY', 'test-mcp-key-123456')
    monkeypatch.setenv('AGENTGATE_DATA_DIR', str(tmp_path))

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path, kwargs))
        if method == 'GET' and path == '/api/sessions':
            return {
                'status': 'live',
                'sessions': [
                    {
                        'id': 'brain:session-1',
                        'title': 'Safe title',
                        'preview': 'Uses /home/alexey/private and https://api.openai.com/v1',
                        'updated_at': '2026-08-26T10:00:00Z',
                        'message_count': 2,
                        'model': 'codex-mini',
                        'mode': 'operator',
                        'raw_prompt': 'do not show',
                    },
                    {'id': '../bad', 'title': 'bad'},
                ],
            }
        if method == 'GET' and path == '/api/sessions/brain%3Asession-1':
            return {'id': 'brain:session-1', 'title': 'Safe title', 'status': 'live'}
        if method == 'GET' and path == '/api/sessions/brain%3Asession-1/messages':
            return {'messages': []}
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post('/api/auth/login', json={'key': 'test-owner-key-1234'})
        app.state.upstream.request = fake_request
        listing = client.get('/api/chats').json()
        detail = client.get('/api/chats/brain:session-1').json()
        missing = client.get('/api/chats/bad%5Cid')

    assert listing['status'] == 'live'
    assert listing['source_status'] == {'source': 'brain', 'status': 'live'}
    assert [row['id'] for row in listing['sessions']] == ['brain:session-1']
    assert listing['sessions'][0]['preview'] == 'reference withheld'
    assert 'raw_prompt' not in str(listing)
    assert detail['session']['id'] == 'brain:session-1'
    assert missing.status_code == 422
    assert calls[1][2] == '/api/sessions/brain%3Asession-1'


def test_chat_mutations_validate_patch_and_delete_confirmation(monkeypatch, tmp_path):
    monkeypatch.setenv('AGENTGATE_ADMIN_KEY', 'test-owner-key-1234')
    monkeypatch.setenv('AGENTGATE_SESSION_SECRET', 'test-session-secret-12345678901234567890')
    monkeypatch.setenv('AGENTGATE_MCP_KEY', 'test-mcp-key-123456')
    monkeypatch.setenv('AGENTGATE_DATA_DIR', str(tmp_path))

    from agentgate.main import app

    calls = []

    async def fake_request(name, method, path, **kwargs):
        calls.append((name, method, path, kwargs))
        if method == 'POST' and path == '/api/sessions':
            assert kwargs['json'] == {'title': 'New AgentGate conversation', 'agent_id': 'agent_pi_operator'}
            return {'id': 'created-1', 'title': 'New AgentGate conversation'}
        if method == 'PATCH' and path == '/api/sessions/brain%3Asession-1':
            assert kwargs['json'] == {'title': 'Renamed'}
            return {'id': 'brain:session-1', 'title': 'Renamed'}
        if method == 'DELETE' and path == '/api/sessions/brain%3Asession-1':
            assert kwargs['params'] == {'confirm_source': 'brain'}
            assert kwargs['json'] == {'confirm_source': 'brain', 'confirm_session_id': 'brain:session-1'}
            return {'id': 'brain:session-1', 'status': 'deleted'}
        raise AssertionError((name, method, path, kwargs))

    with TestClient(app) as client:
        client.post('/api/auth/login', json={'key': 'test-owner-key-1234'})
        app.state.upstream.request = fake_request
        headers = csrf_headers(client)
        assert client.post('/api/chats', headers=headers, json={'title': 'New AgentGate conversation', 'agent_id': 'agent_pi_operator'}).json()['session']['id'] == 'created-1'
        assert client.patch('/api/chats/brain:session-1', headers=headers, json={'title': 'Renamed', 'raw_prompt': 'do not send'}).json()['session']['title'] == 'Renamed'
        bad = client.request('DELETE', '/api/chats/brain:session-1', headers=headers, json={'confirm_source': 'brain', 'confirm_session_id': 'wrong'})
        assert bad.status_code == 422
        deleted = client.request('DELETE', '/api/chats/brain:session-1', headers=headers, json={'confirm_source': 'brain', 'confirm_session_id': 'brain:session-1'}).json()

    assert deleted == {'metadata_only': True, 'source': 'brain', 'id': 'brain:session-1', 'status': 'deleted'}

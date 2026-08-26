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

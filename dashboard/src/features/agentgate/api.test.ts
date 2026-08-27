import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginAgentGateOwner, postAgentGate } from './api'

afterEach(() => {
  vi.restoreAllMocks()
  document.cookie = 'agentgate_csrf=; Max-Age=0; path=/'
})

describe('AgentGate API helpers', () => {
  it('posts the backend login key field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await loginAgentGateOwner('owner-secret')

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      key: 'owner-secret',
    })
  })

  it('sends the readable CSRF cookie on write requests', async () => {
    document.cookie = 'agentgate_csrf=csrf-cookie-value; path=/'
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'paused' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await postAgentGate('/api/cron/jobs/job-1/pause')

    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-Token']).toBe(
      'csrf-cookie-value'
    )
  })

  it('turns structured backend errors into readable text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ detail: { source: 'brain', status: 'blocked' } }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(postAgentGate('/api/chats')).rejects.toThrow('brain blocked')
  })

  it('does not request CSRF before first-run owner setup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ owner_authenticated: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { setupAgentGateOwner } = await import('./api')
    await setupAgentGateOwner('new-owner-password')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/bootstrap')
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-Token']).toBeUndefined()
  })
})

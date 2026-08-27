import { describe, expect, it } from 'vitest'
import type { ChatMessage, ChatSession } from './api'
import {
  chatActionAvailability,
  filterAndSortChatSessions,
  forkPayloadForMessage,
  safeChatUiError,
  streamChatBody,
} from './chat-controls-model'

const sessions: ChatSession[] = [
  {
    id: 'alpha',
    title: 'Release room',
    preview: 'Ship checklist',
    updated_at: '2026-08-26T08:00:00Z',
    message_count: 4,
    model: 'codex',
    mode: 'operator',
  },
  {
    id: 'beta',
    title: 'Memory audit',
    preview: 'Evidence cleanup',
    updated_at: '2026-08-26T10:00:00Z',
    message_count: 1,
    model: 'hermes',
    mode: 'incognito',
  },
]

const ownerMessage: ChatMessage = {
  id: 'msg-owner',
  role: 'owner',
  content: 'Please revise this',
  created_at: '2026-08-26T08:05:00Z',
}

const agentMessage: ChatMessage = {
  id: 'msg-agent',
  role: 'agent',
  content: 'Draft answer',
  created_at: '2026-08-26T08:06:00Z',
}

describe('chat text controls model', () => {
  it('filters /api/chats sessions without inventing counts', () => {
    const rows = filterAndSortChatSessions(sessions, {
      query: 'audit evidence',
      sort: 'updated-desc',
    })

    expect(rows).toEqual([sessions[1]])
    expect(rows[0].message_count).toBe(1)
  })

  it('sorts by existing source fields only', () => {
    expect(
      filterAndSortChatSessions(sessions, { query: '', sort: 'title-asc' }).map(
        (row) => row.id
      )
    ).toEqual(['beta', 'alpha'])
    expect(
      filterAndSortChatSessions(sessions, {
        query: '',
        sort: 'turns-desc',
      }).map((row) => row.id)
    ).toEqual(['alpha', 'beta'])
  })

  it('builds stream payloads from the accepted backend contract', () => {
    expect(
      streamChatBody('hello', {
        memoryIncognito: true,
        reasoning: 'high',
        agentId: 'agent_researcher',
      })
    ).toEqual({
      input: 'hello',
      agent_id: 'agent_researcher',
      intensity: 'high',
      memory_incognito: true,
    })

    expect(
      JSON.stringify(
        streamChatBody('hello', { memoryIncognito: false, reasoning: 'medium' })
      )
    ).not.toContain('memory_enabled')
  })

  it('uses the real fork route payload instead of synthetic ids', () => {
    expect(forkPayloadForMessage(ownerMessage)).toEqual({
      through_message_id: 'msg-owner',
      prefill: 'Please revise this',
    })
    expect(forkPayloadForMessage(agentMessage)).toEqual({
      through_message_id: 'msg-agent',
    })
  })

  it('marks unavailable message actions explicitly', () => {
    expect(chatActionAvailability('copy', agentMessage)).toMatchObject({
      available: true,
      status: 'live',
    })
    expect(chatActionAvailability('regenerate', agentMessage)).toEqual({
      available: false,
      status: 'planned',
      reason: 'No verified regenerate route is exposed by AgentGate yet.',
    })
    expect(chatActionAvailability('share', agentMessage)).toEqual({
      available: false,
      status: 'planned',
      reason: 'Sharing is unavailable until a backend contract exists.',
    })
    expect(chatActionAvailability('file-attachment')).toEqual({
      available: false,
      status: 'planned',
      reason: 'File attachments need a versioned content-parts contract.',
    })
    expect(chatActionAvailability('selected-reply', agentMessage)).toEqual({
      available: false,
      status: 'planned',
      reason:
        'Selected-text reply needs a backend message-span schema before persistence.',
    })
  })

  it('parses safe markdown without raw HTML or unsafe links', async () => {
    const { safeMarkdownBlocks } = await import('./chat-controls-model')
    expect(
      safeMarkdownBlocks(
        'Visit https://example.com, ignore <script>x</script> and `code`.\n\n```ts\nconst x = 1\n```'
      )
    ).toEqual([
      {
        kind: 'paragraph',
        parts: [
          { kind: 'text', text: 'Visit ' },
          {
            kind: 'link',
            text: 'https://example.com',
            href: 'https://example.com',
          },
          { kind: 'text', text: ', ignore <script>x</script> and ' },
          { kind: 'code', text: 'code' },
          { kind: 'text', text: '.' },
        ],
      },
      { kind: 'codeBlock', language: 'ts', text: 'const x = 1' },
    ])
  })

  it('derives model choices only from source-bound backend metadata', async () => {
    const { chatModelChoices } = await import('./chat-controls-model')
    expect(
      chatModelChoices({
        models: [
          { id: 'safe-model', provider: 'brain', status: 'live' },
          { model: 'fallback-model', provider_id: 'pi', status: 'unknown' },
          { id: 'bad/path', provider: 'brain' },
        ],
      })
    ).toEqual([
      {
        label: 'safe-model',
        value: 'safe-model',
        provider: 'brain',
        status: 'live',
      },
      {
        label: 'fallback-model',
        value: 'fallback-model',
        provider: 'pi',
        status: 'unknown',
      },
    ])
  })

  it('keeps UI errors browser-safe', () => {
    expect(
      safeChatUiError(
        new Error(
          'failed at https://api.openai.com/v1 using /home/alexey/private'
        )
      )
    ).toBe('Chat action failed. Check the source status and try again.')
  })
})

describe('chat model availability', () => {
  it('filters model choices to explicitly live source rows', async () => {
    const { chatModelChoices } = await import('./chat-controls-model')
    expect(
      chatModelChoices({
        models: [
          { id: 'live-model', status: 'live' },
          { id: 'offline-model', status: 'offline' },
          { id: 'unknown-model', status: 'unknown' },
        ],
      })
        .filter((item) => item.status === 'live')
        .map((item) => item.value)
    ).toEqual(['live-model'])
  })
})

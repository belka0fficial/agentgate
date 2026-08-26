import type { ChatMessage, ChatSession } from './api'

export type ChatSort =
  | 'updated-desc'
  | 'updated-asc'
  | 'title-asc'
  | 'turns-desc'

export type ChatControlStatus = 'live' | 'planned' | 'unavailable'

export type ChatAction =
  | 'copy'
  | 'fork'
  | 'regenerate'
  | 'selected-reply'
  | 'selected-memory'

export type ChatActionAvailability = {
  available: boolean
  status: ChatControlStatus
  reason?: string
}

export function filterAndSortChatSessions(
  sessions: ChatSession[],
  options: { query: string; sort: ChatSort }
) {
  const queryTerms = options.query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)

  const filtered = queryTerms.length
    ? sessions.filter((session) => {
        const haystack = [
          session.title,
          session.preview,
          session.model,
          session.mode,
          session.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return queryTerms.every((term) => haystack.includes(term))
      })
    : [...sessions]

  return filtered.sort((left, right) => {
    if (options.sort === 'title-asc') {
      return left.title.localeCompare(right.title)
    }
    if (options.sort === 'turns-desc') {
      return (right.message_count ?? -1) - (left.message_count ?? -1)
    }
    const leftTime = Date.parse(left.updated_at) || 0
    const rightTime = Date.parse(right.updated_at) || 0
    return options.sort === 'updated-asc'
      ? leftTime - rightTime
      : rightTime - leftTime
  })
}

export function streamChatBody(
  input: string,
  options: {
    memoryIncognito: boolean
    reasoning: string
    model?: string
    provider?: string
  }
) {
  return {
    input,
    ...(options.provider ? { provider: options.provider } : {}),
    ...(options.model ? { model: options.model } : {}),
    ...(options.reasoning && options.reasoning !== 'medium'
      ? { intensity: options.reasoning }
      : {}),
    ...(options.memoryIncognito ? { memory_incognito: true } : {}),
  }
}

export function forkPayloadForMessage(message: ChatMessage) {
  return {
    through_message_id: message.id,
    ...(message.role === 'owner' && message.content.trim()
      ? { prefill: message.content }
      : {}),
  }
}

export function chatActionAvailability(
  action: ChatAction,
  _message?: ChatMessage
): ChatActionAvailability {
  if (action === 'copy' || action === 'fork') {
    return { available: true, status: 'live' }
  }
  if (action === 'regenerate') {
    return {
      available: false,
      status: 'planned',
      reason: 'No verified regenerate route is exposed by AgentGate yet.',
    }
  }
  if (action === 'selected-reply') {
    return {
      available: false,
      status: 'planned',
      reason:
        'Selected-text reply needs a backend message-span schema before persistence.',
    }
  }
  return {
    available: false,
    status: 'planned',
    reason:
      'Memory capture from selected text needs a feedback/memory approval contract.',
  }
}

export function safeChatUiError(_error: unknown) {
  return 'Chat action failed. Check the source status and try again.'
}

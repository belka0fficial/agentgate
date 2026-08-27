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
  | 'share'
  | 'file-attachment'
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
    agentId?: string
  }
) {
  return {
    input,
    ...(options.provider ? { provider: options.provider } : {}),
    ...(options.model ? { model: options.model } : {}),
    ...(options.agentId ? { agent_id: options.agentId } : {}),
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
  if (action === 'share') {
    return {
      available: false,
      status: 'planned',
      reason: 'Sharing is unavailable until a backend contract exists.',
    }
  }
  if (action === 'file-attachment') {
    return {
      available: false,
      status: 'planned',
      reason: 'File attachments need a versioned content-parts contract.',
    }
  }
  return {
    available: false,
    status: 'planned',
    reason:
      'Memory capture from selected text needs a feedback/memory approval contract.',
  }
}

export type MarkdownInlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'code'; text: string }

export type MarkdownBlock =
  | { kind: 'paragraph'; parts: MarkdownInlinePart[] }
  | { kind: 'codeBlock'; language: string; text: string }

const safeIdentifierPattern = /^[A-Za-z0-9._:-]{1,120}$/
const safeMarkdownLanguagePattern = /^[A-Za-z0-9_+-]{0,24}$/
const httpUrlPattern = /^https?:\/\/[^\s<>()]+$/i
const tokenPattern = /(`[^`\n]+`|https?:\/\/[^\s<>()]+)/gi

export function safeMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  let paragraph: string[] = []
  let codeLines: string[] | null = null
  let codeLanguage = ''

  function flushParagraph() {
    const text = paragraph.join('\n').trim()
    paragraph = []
    if (text) blocks.push({ kind: 'paragraph', parts: safeMarkdownParts(text) })
  }

  for (const line of lines) {
    const fence = line.match(/^```\s*([^`]*)\s*$/)
    if (fence) {
      if (codeLines) {
        blocks.push({
          kind: 'codeBlock',
          language: codeLanguage,
          text: codeLines.join('\n'),
        })
        codeLines = null
        codeLanguage = ''
      } else {
        flushParagraph()
        const language = fence[1]?.trim() ?? ''
        codeLanguage = safeMarkdownLanguagePattern.test(language)
          ? language
          : ''
        codeLines = []
      }
      continue
    }

    if (codeLines) {
      codeLines.push(line)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      continue
    }
    paragraph.push(line)
  }

  if (codeLines) {
    blocks.push({
      kind: 'codeBlock',
      language: codeLanguage,
      text: codeLines.join('\n'),
    })
  }
  flushParagraph()
  return blocks
}

export function safeMarkdownParts(text: string): MarkdownInlinePart[] {
  const parts: MarkdownInlinePart[] = []
  let lastIndex = 0
  for (const match of text.matchAll(tokenPattern)) {
    if (match.index === undefined) continue
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', text: text.slice(lastIndex, match.index) })
    }
    const token = match[0]
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push({ kind: 'code', text: token.slice(1, -1) })
    } else if (httpUrlPattern.test(token)) {
      const trailing = token.match(/[.,;:!?]+$/)?.[0] ?? ''
      const href = trailing ? token.slice(0, -trailing.length) : token
      parts.push({ kind: 'link', text: href, href })
      if (trailing) parts.push({ kind: 'text', text: trailing })
    } else {
      parts.push({ kind: 'text', text: token })
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', text: text.slice(lastIndex) })
  }
  const coalesced: MarkdownInlinePart[] = []
  for (const part of parts.length ? parts : [{ kind: 'text' as const, text }]) {
    const previous = coalesced[coalesced.length - 1]
    if (previous?.kind === 'text' && part.kind === 'text') {
      previous.text += part.text
    } else {
      coalesced.push(part)
    }
  }
  return coalesced
}

export type ChatModelChoice = {
  label: string
  value: string
  provider?: string
  status:
    | ChatControlStatus
    | 'unknown'
    | 'degraded'
    | 'offline'
    | 'stale'
    | 'blocked'
    | 'empty'
}

export function chatModelChoices(payload: unknown): ChatModelChoice[] {
  const rows =
    payload && typeof payload === 'object' && 'models' in payload
      ? (payload as { models?: unknown }).models
      : payload
  if (!Array.isArray(rows)) return []

  return rows
    .map((item): ChatModelChoice | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const value = stringValue(row.id) || stringValue(row.model)
      if (!value || !safeIdentifierPattern.test(value)) return null
      const provider = stringValue(row.provider) || stringValue(row.provider_id)
      if (provider && !safeIdentifierPattern.test(provider)) return null
      const status = stringValue(row.status) || 'unknown'
      return {
        label: stringValue(row.name) || value,
        value,
        ...(provider ? { provider } : {}),
        status: sourceStatus(status),
      }
    })
    .filter((item): item is ChatModelChoice => Boolean(item))
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function sourceStatus(value: string): ChatModelChoice['status'] {
  return [
    'live',
    'planned',
    'unavailable',
    'unknown',
    'degraded',
    'offline',
    'stale',
    'blocked',
    'empty',
  ].includes(value)
    ? (value as ChatModelChoice['status'])
    : 'unknown'
}

export function safeChatUiError(_error: unknown) {
  return 'Chat action failed. Check the source status and try again.'
}

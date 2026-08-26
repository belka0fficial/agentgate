export type MemoryState = 'fact' | 'pattern' | 'theory' | 'unknown'

export type MemoryRecord = {
  id: string
  title: string
  kind: string
  confidence: string
  updated_at?: string
  source?: string
  evidence: string[]
  linkedEntities: string[]
  state: MemoryState
}

export type MemoryDetail = {
  claim: string
  evidence: string[]
  source: string
  linkedEntities: string[]
}

export type MemoryOverviewState = 'live' | 'degraded' | 'empty' | 'unknown'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []
  if (Array.isArray(value.results)) return value.results
  if (Array.isArray(value.items)) return value.items
  return [value.memories, value.observations, value.patterns]
    .filter(Array.isArray)
    .flat()
}

function deriveState(kind: string, confidence: string): MemoryState {
  const label = `${kind} ${confidence}`.toLowerCase()
  if (label.includes('pattern')) return 'pattern'
  if (label.includes('theory') || label.includes('hypothesis')) return 'theory'
  if (confidence.toLowerCase() === 'high' || kind.toLowerCase() === 'fact')
    return 'fact'
  return 'unknown'
}

function looksSensitiveReference(value: string) {
  const lowered = value.toLowerCase()
  const trimmed = value.trim()
  return (
    lowered.includes('http://') ||
    lowered.includes('https://') ||
    lowered.includes('file://') ||
    lowered.includes('/home/') ||
    lowered.includes('/users/') ||
    lowered.includes('/var/') ||
    lowered.includes('/etc/') ||
    lowered.includes('/root/') ||
    lowered.includes('/run/') ||
    lowered.includes('/tmp/') ||
    lowered.includes('\\users\\') ||
    lowered.includes('c:/users/') ||
    lowered.includes('c:\\users\\') ||
    lowered.includes('.sock') ||
    lowered.includes('bearer ') ||
    lowered.includes('bearer:') ||
    lowered.includes('authorization:') ||
    lowered.includes('api key:') ||
    lowered.includes('api_key:') ||
    lowered.includes('token=') ||
    lowered.includes('token:') ||
    lowered.includes('password=') ||
    lowered.includes('password:') ||
    lowered.includes('secret=') ||
    lowered.includes('secret:') ||
    /\b[a-z0-9-]+(\.[a-z0-9-]+)+(?:\/[^\s]*)?/.test(lowered) ||
    trimmed.startsWith('sk-') ||
    trimmed.startsWith('sk_proj_') ||
    trimmed.startsWith('sk-proj-') ||
    trimmed.startsWith('sk_')
  )
}

function safeSourceText(value: unknown, fallback = 'not provided') {
  if (typeof value !== 'string' || !value.trim()) return fallback
  return looksSensitiveReference(value) ? 'reference withheld' : value
}

function evidenceLine(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return safeSourceText(value)
  if (!isRecord(value)) return null
  const label = safeSourceText(
    value.label ?? value.name ?? value.source ?? value.kind,
    'source'
  )
  const ref = safeSourceText(value.ref ?? value.id ?? value.title, '')
  return ref ? `${label}: ${ref}` : label
}

function listStrings(value: unknown): string[] {
  return asArray(value)
    .map(evidenceLine)
    .filter((item): item is string => Boolean(item))
}

export function normalizeMemoryRecords(payload: unknown): MemoryRecord[] {
  return asArray(payload)
    .filter(isRecord)
    .map((item, index) => {
      const title = safeSourceText(
        item.title ?? item.claim ?? item.summary,
        'Untitled memory'
      )
      const kind = safeSourceText(item.kind ?? item.type, 'unknown')
      const confidence = safeSourceText(
        item.confidence ?? item.state,
        'unknown'
      )
      return {
        id: safeSourceText(item.id ?? item.memory_id, `memory-${index + 1}`),
        title,
        kind,
        confidence,
        updated_at:
          typeof item.updated_at === 'string'
            ? safeSourceText(item.updated_at)
            : undefined,
        source: safeSourceText(item.source ?? item.source_uri, 'unknown'),
        evidence: [
          ...listStrings(item.evidence),
          ...listStrings(item.sources),
          ...listStrings(item.source_refs),
        ],
        linkedEntities: listStrings(item.entities ?? item.linked_entities),
        state: deriveState(kind, confidence),
      }
    })
}

export function buildMemoryDetail(memory: MemoryRecord): MemoryDetail {
  return {
    claim: memory.title,
    evidence: memory.evidence.length
      ? memory.evidence
      : ['Source detail not provided by MemoryGate overview.'],
    source: memory.source ?? 'unknown',
    linkedEntities: memory.linkedEntities,
  }
}

function safeErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return safeSourceText(value)
  if (!isRecord(value)) return null
  const message = value.message ?? value.detail ?? value.error
  if (typeof message === 'string' && message.trim())
    return safeSourceText(message)
  return 'source unavailable'
}

export function memoryOverviewErrors(payload: unknown): string[] {
  if (!isRecord(payload)) return []
  const topLevel = safeErrorMessage(payload.error)
  if (topLevel) return [topLevel]
  const errors = payload.errors
  if (!isRecord(errors)) return []
  return Object.entries(errors)
    .map(([section, value]) => {
      const message = safeErrorMessage(value)
      return message ? `${section}: ${message}` : null
    })
    .filter((item): item is string => Boolean(item))
}

export function memoryOverviewState(
  payload: unknown,
  records: MemoryRecord[]
): MemoryOverviewState {
  if (memoryOverviewErrors(payload).length) return 'degraded'
  if (records.length) return 'live'
  if (payload === undefined) return 'unknown'
  return 'empty'
}

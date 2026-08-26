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
  evidenceCount?: number
  contentWithheld?: boolean
  state: MemoryState
}

export type MemoryDetail = {
  claim: string
  evidence: string[]
  source: string
  linkedEntities: string[]
}

export type MemoryOverviewState =
  | 'live'
  | 'degraded'
  | 'offline'
  | 'stale'
  | 'blocked'
  | 'empty'
  | 'planned'
  | 'unknown'

export type SourceStatus = { status?: string; source?: string }

export type MemorySectionSummary = {
  id: 'facts' | 'theories' | 'context' | 'watch' | 'evidence' | 'search'
  title: string
  status: MemoryOverviewState
  count: number
  source: string
  detail: string
}

const allowedStatuses = new Set<MemoryOverviewState>([
  'live',
  'degraded',
  'offline',
  'stale',
  'blocked',
  'empty',
  'planned',
  'unknown',
])

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

export function normalizeMemoryRecords(payload: unknown): MemoryRecord[] {
  return asArray(payload)
    .filter(isRecord)
    .map((item, index) => {
      const title = `Memory record ${index + 1}`
      const kind = safeSourceText(item.kind ?? item.type, 'unknown')
      const confidence = safeSourceText(
        item.confidence ?? item.state,
        'unknown'
      )
      return {
        id: `memory-${index + 1}`,
        title,
        kind,
        confidence,
        updated_at:
          typeof item.updated_at === 'string'
            ? safeSourceText(item.updated_at)
            : undefined,
        source: safeSourceText(item.source ?? item.source_uri, 'unknown'),
        evidence: [],
        evidenceCount:
          typeof item.evidence_count === 'number'
            ? item.evidence_count
            : Array.isArray(item.evidence)
              ? item.evidence.length
              : 0,
        linkedEntities: [],
        contentWithheld: true,
        state: deriveState(kind, confidence),
      }
    })
}

export function buildMemoryDetail(memory: MemoryRecord): MemoryDetail {
  return {
    claim: memory.title,
    evidence: memory.evidenceCount
      ? [`${memory.evidenceCount} evidence references; details withheld.`]
      : ['Evidence details withheld by MemoryGate.'],
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

function normalizeSourceStatus(value: unknown): MemoryOverviewState {
  if (!isRecord(value)) return 'unknown'
  const raw = typeof value.status === 'string' ? value.status.toLowerCase() : ''
  if (raw === 'ok') return 'live'
  if (raw === 'connected' || raw === 'healthy' || raw === 'online')
    return 'unknown'
  return allowedStatuses.has(raw as MemoryOverviewState)
    ? (raw as MemoryOverviewState)
    : 'unknown'
}

function sourceStatusFor(
  payload: unknown,
  key: string
): SourceStatus | undefined {
  if (!isRecord(payload) || !isRecord(payload.source_status)) return undefined
  const value = payload.source_status[key]
  return isRecord(value) ? (value as SourceStatus) : undefined
}

function sectionStatus(payload: unknown, key: string): MemoryOverviewState {
  const explicit = sourceStatusFor(payload, key)
  return explicit ? normalizeSourceStatus(explicit) : 'unknown'
}

function sectionSource(payload: unknown, key: string) {
  const explicit = sourceStatusFor(payload, key)
  return safeSourceText(explicit?.source, 'memorygate')
}

export function memorySectionSummaries(
  payload: unknown
): MemorySectionSummary[] {
  const records = normalizeMemoryRecords(payload)
  const facts = records.filter((record) => record.state === 'fact')
  const theories = records.filter((record) => record.state === 'theory')
  const context = records.filter(
    (record) =>
      record.kind.toLowerCase() === 'context' ||
      record.kind.toLowerCase() === 'observation'
  )
  const watch = records.filter(
    (record) =>
      record.kind.toLowerCase() === 'watch' ||
      record.kind.toLowerCase() === 'watch_item'
  )
  const evidenceCount = records.reduce(
    (count, record) => count + (record.evidenceCount ?? 0),
    0
  )

  return [
    {
      id: 'facts',
      title: 'Facts',
      status: sectionStatus(payload, 'memories'),
      count: facts.length,
      source: sectionSource(payload, 'memories'),
      detail: facts.length
        ? `${facts.length} fact records · metadata only`
        : 'No fact records returned by MemoryGate overview.',
    },
    {
      id: 'theories',
      title: 'Theories',
      status: sectionStatus(payload, 'memories'),
      count: theories.length,
      source: sectionSource(payload, 'memories'),
      detail: theories.length
        ? `${theories.length} theory records · metadata only`
        : 'No theory records returned by MemoryGate overview.',
    },
    {
      id: 'context',
      title: 'Context',
      status: sectionStatus(payload, 'observations'),
      count: context.length,
      source: sectionSource(payload, 'observations'),
      detail: context.length
        ? `${context.length} context records · metadata only`
        : 'No context records returned by MemoryGate overview.',
    },
    {
      id: 'watch',
      title: 'Watch items',
      status: sectionStatus(payload, 'patterns'),
      count: watch.length,
      source: sectionSource(payload, 'patterns'),
      detail: watch.length
        ? `${watch.length} watch records · metadata only`
        : 'No watch records returned by MemoryGate overview.',
    },
    {
      id: 'evidence',
      title: 'Evidence lineage',
      status: sectionStatus(payload, 'memories'),
      count: evidenceCount,
      source: 'memorygate',
      detail: evidenceCount
        ? `${evidenceCount} evidence references · raw evidence withheld`
        : 'No evidence references returned by MemoryGate overview.',
    },
    {
      id: 'search',
      title: 'Search contract',
      status:
        isRecord(payload) && isRecord(payload.search)
          ? normalizeSourceStatus(payload.search)
          : 'planned',
      count: 0,
      source: 'memorygate',
      detail:
        'Search route available: POST /api/gates/memorygate/search returns sanitized metadata only.',
    },
  ]
}

export function memoryOverviewState(
  payload: unknown,
  records: MemoryRecord[]
): MemoryOverviewState {
  if (memoryOverviewErrors(payload).length) return 'degraded'
  if (isRecord(payload) && isRecord(payload.source_status)) {
    const statuses = Object.values(payload.source_status).map(
      normalizeSourceStatus
    )
    if (statuses.includes('blocked')) return 'blocked'
    if (statuses.includes('offline')) return 'offline'
    if (statuses.includes('degraded')) return 'degraded'
    if (statuses.includes('stale')) return 'stale'
    if (statuses.includes('unknown')) return 'unknown'
    if (statuses.includes('planned')) return 'planned'
    if (statuses.length && statuses.every((status) => status === 'empty'))
      return 'empty'
    if (statuses.length && statuses.every((status) => status === 'live'))
      return records.length ? 'live' : 'empty'
  }
  if (records.length) return 'live'
  if (payload === undefined) return 'unknown'
  return 'empty'
}

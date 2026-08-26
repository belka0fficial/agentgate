export type Job = {
  id: string
  name?: string
  status?: string
  paused?: boolean
  schedule?: string
  next_run?: string | null
  last_run?: string | null
  last_status?: string
  source?: string
  source_ref?: string
  owner?: 'system' | 'user' | string
  editable?: boolean
  kind?: 'cron' | 'flow' | 'loop' | 'automation' | string
  metadata_only?: boolean
  output_withheld?: boolean
  output?: { status?: string; raw_withheld?: boolean }
  history?: { status?: string; reason?: string }
  requires_approval?: boolean
  approval_request_id?: string
  approval_id?: string
  request_id?: string
}

export type Automation = {
  id: string
  name?: string
  status?: string
  source?: string
  metadata_only?: boolean
  details_withheld?: boolean
}

export type JobsResponse = {
  jobs?: Job[]
  status?: string
  error?: { message?: string }
}

export type AutomationsResponse = {
  jobs?: Job[]
  toolgate_automations?: Automation[]
  errors?: {
    brain?: { message?: string } | null
    toolgate?: { message?: string } | null
  }
  metadata_only?: boolean
}

export function normalizeJobsResponse(
  payload: JobsResponse | Job[] | undefined
): Job[] {
  if (Array.isArray(payload)) return payload
  return payload?.jobs ?? []
}

export function jobStatus(item: Job) {
  if (item.paused) return 'paused'
  return item.status ?? item.last_status ?? 'unknown'
}

export function isLockedSystemJob(item: Job) {
  return item.owner === 'system' || item.editable === false
}

export function jobActionsEnabled(item: Job) {
  return !isLockedSystemJob(item)
}

export function canRenderJobControls(item: Job) {
  return jobActionsEnabled(item)
}

export function safeJobHistoryLabel(item: Job) {
  const status = item.history?.status
  if (status === 'unavailable') return 'History unavailable'
  if (status === 'planned') return 'History planned'
  return status ?? 'History unknown'
}

export type SourceStatus = { status?: string; source?: string }
export type ToolGateOverviewPayload = {
  source_status?: Record<string, SourceStatus>
  tools?: unknown[]
  automations?: Job[]
  events?: {
    id?: string
    kind?: string
    status?: string
    args_digest?: string
  }[]
}

const allowedSourceStatuses = new Set([
  'live',
  'degraded',
  'offline',
  'stale',
  'blocked',
  'empty',
  'planned',
  'unknown',
])

function normalizeSourceStatus(status: string | undefined) {
  const raw = (status ?? '').toLowerCase()
  if (raw === 'ok') return 'live'
  if (raw === 'connected' || raw === 'healthy' || raw === 'online')
    return 'unknown'
  return allowedSourceStatuses.has(raw) ? raw : 'unknown'
}

function safeCatalogName(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value.trim()) return fallback
  if (/https?:\/\//i.test(value) || /file:\/\//i.test(value))
    return 'reference withheld'
  if (/[\\/=@]/.test(value)) return 'reference withheld'
  if (/api\.[a-z0-9.-]+/i.test(value)) return 'reference withheld'
  if (/token:|secret:|password:|authorization:/i.test(value))
    return 'reference withheld'
  return value
}

function safeStatus(value: unknown) {
  return normalizeSourceStatus(typeof value === 'string' ? value : undefined)
}

function safeItems(items: unknown[] | undefined, kind: string) {
  return (items ?? [])
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object' && !Array.isArray(item))
    )
    .map((item, index) => ({
      id: `${kind}-${index}`,
      name: safeCatalogName(item.name ?? item.title ?? item.id, `${kind} item`),
      status: safeStatus(item.status ?? item.state),
      source: 'toolgate',
      kind,
      metadata_only: true,
      details_withheld: true,
    }))
}

export function normalizeToolGateOverview(payload: ToolGateOverviewPayload) {
  const sourceStatus = payload.source_status ?? {}
  const sources = ['status', 'tools', 'automations', 'services', 'events']
    .filter((key) => sourceStatus[key])
    .map((key) => ({
      id: key,
      source: sourceStatus[key]?.source ?? 'toolgate',
      status: normalizeSourceStatus(sourceStatus[key]?.status),
    }))
  const automations = (payload.automations ?? []).map((item, index) => {
    const approvalId =
      typeof (item as Job & { approval_request_id?: unknown })
        .approval_request_id === 'string'
        ? (item as Job & { approval_request_id?: string }).approval_request_id
        : undefined
    return {
      id: safeCatalogName(item.id, `automation-${index}`),
      name: 'toolgate automation',
      status: safeStatus(item.status),
      schedule: safeCatalogName(item.schedule, '—'),
      source: 'toolgate',
      metadata_only: true,
      details_withheld: true,
      approvalHref: approvalId
        ? `/approvals?source_id=${encodeURIComponent(approvalId)}`
        : undefined,
      actionsEnabled: false,
    }
  })
  const events = (payload.events ?? []).map((item, index) => ({
    id: safeCatalogName(item.id, `event-${index}`),
    kind: safeCatalogName(item.kind, 'event'),
    status: safeStatus(item.status),
    source: 'toolgate',
    metadata_only: true,
    details_withheld: true,
    ...(typeof item.args_digest === 'string'
      ? { args_digest: safeCatalogName(item.args_digest, 'reference withheld') }
      : {}),
  }))
  return {
    sources,
    tools: safeItems(payload.tools, 'tools'),
    automations,
    events,
  }
}

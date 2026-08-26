export type AppLifecycle = {
  available?: boolean
  status?: string
  source?: string
  reason?: string
  actions?: string[]
}

export type AppProject = {
  id: string
  name: string
  purpose?: string
  status?: string
  source?: string
  source_ref?: string
  local_ref?: string
  pinned?: boolean
  lifecycle?: AppLifecycle
  metadata_only?: boolean
}

export type AppsResponse = {
  apps?: AppProject[]
  source_status?: { status?: string; source?: string }
  metadata_only?: boolean
  creation?: {
    status?: string
    source?: string
    requires_approval?: boolean
    reason?: string
  }
}

const SAFE_APP_KEYS = new Set([
  'id',
  'name',
  'purpose',
  'status',
  'source',
  'source_ref',
  'local_ref',
  'pinned',
  'lifecycle',
  'metadata_only',
])

const SAFE_LIFECYCLE_KEYS = new Set([
  'available',
  'status',
  'source',
  'reason',
  'actions',
])

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function safeLifecycle(value: unknown): AppLifecycle {
  if (!value || typeof value !== 'object') {
    return { available: false, status: 'planned', actions: [] }
  }
  const source = value as Record<string, unknown>
  const lifecycle: AppLifecycle = {}
  for (const key of SAFE_LIFECYCLE_KEYS) {
    const item = source[key]
    if (key === 'available') lifecycle.available = Boolean(item)
    else if (key === 'actions' && Array.isArray(item)) {
      lifecycle.actions = item.filter(
        (action): action is string => typeof action === 'string'
      )
    } else if (typeof item === 'string') {
      lifecycle[key as 'status' | 'source' | 'reason'] = item
    }
  }
  return lifecycle
}

export function normalizeAppsResponse(payload: unknown): AppProject[] {
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as AppsResponse).apps)
      ? ((payload as AppsResponse).apps ?? [])
      : []

  return rows
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object'
    )
    .map((item, index) => {
      const source: Record<string, unknown> = {}
      for (const key of SAFE_APP_KEYS) source[key] = item[key]
      return {
        id: stringOrUndefined(source.id) ?? `app-${index + 1}`,
        name: stringOrUndefined(source.name) ?? 'App',
        purpose: stringOrUndefined(source.purpose),
        status: [
          'live',
          'degraded',
          'offline',
          'stale',
          'blocked',
          'empty',
          'planned',
          'unknown',
        ].includes(stringOrUndefined(source.status) ?? '')
          ? stringOrUndefined(source.status)
          : 'unknown',
        source: stringOrUndefined(source.source) ?? 'agentgate-local-registry',
        source_ref: stringOrUndefined(source.source_ref),
        local_ref: stringOrUndefined(source.local_ref),
        pinned: Boolean(source.pinned),
        lifecycle: safeLifecycle(source.lifecycle),
        metadata_only: source.metadata_only !== false,
      }
    })
}

export function appActionEnabled(app: AppProject, action: string) {
  return Boolean(
    app.lifecycle?.available && app.lifecycle.actions?.includes(action)
  )
}

export function appActionsEnabled(app: AppProject) {
  return Boolean(
    app.lifecycle?.available && app.lifecycle.actions?.some(Boolean)
  )
}

export function appStatusLabel(app: AppProject) {
  return `${app.status ?? 'unknown'} from ${app.source ?? 'unknown'}`
}

export function lifecycleStatus(app: AppProject) {
  if (appActionsEnabled(app)) return app.lifecycle?.status ?? 'live'
  return app.lifecycle?.status ?? 'planned'
}

export type Approval = {
  id: string
  source: string
  source_id: string
  status: string
  severity: 'high' | 'medium' | 'low'
  title: string
  details: string
  binding: { type: string; id: string; version: string; digest: string }
  action?: Record<string, unknown>
  created_at: string
  expires_at?: string
  action_payload_withheld?: boolean
}

export type ChatSession = {
  id: string
  title: string
  preview: string
  updated_at: string
  status?: string
  source?: string
  source_id?: string
  message_count?: number
  model?: string
  mode?: string
}

export type ChatMutationResult = {
  session?: ChatSession | null
  id?: string
  status: string
  source: string
  metadata_only?: boolean
}

export type ToolTrace = {
  tool: string
  duration_ms?: number | null
  details_withheld: boolean
}

export type ChatMessage = {
  id: string
  role: 'owner' | 'agent' | string
  content: string
  created_at: string
  trace?: ToolTrace[]
  agent_id?: string
  team_id?: string | null
  status?: string
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  if (text && !isJson) {
    throw new Error(
      `Expected JSON response from ${response.url || 'AgentGate API'}`
    )
  }
  const payload = text && isJson ? JSON.parse(text) : text

  if (!response.ok) {
    const detail =
      typeof payload === 'object' && payload && 'detail' in payload
        ? (payload as { detail?: unknown }).detail
        : undefined
    const message = readableErrorMessage(detail, response.status)
    throw new Error(message)
  }

  return (payload || {}) as T
}

function readableErrorMessage(detail: unknown, status: number) {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (typeof detail === 'object' && detail) {
    const record = detail as Record<string, unknown>
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message
    }
    if (typeof record.status === 'string' && record.source) {
      return `${record.source} ${record.status}`
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error
    }
  }
  return `Request failed: ${status}`
}

export async function getAgentGate<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  return parseResponse<T>(response)
}

export type BootstrapStatus = {
  status: 'configured' | 'setup_required'
  setup_required: boolean
  auth_mode: string
  metadata_only?: boolean
}

export type BootstrapResult = OwnerSession & { setup_completed?: boolean }

export type OwnerSession = {
  status: string
  owner_authenticated: boolean
  auth_mode?: string
  token_storage?: string
  csrf_required?: boolean
  csrf_token?: string | null
  session_expires_at?: string | null
  metadata_only?: boolean
  credentials_included?: boolean
  token_included?: boolean
}

let cachedCsrfToken: string | null = null

function readableCsrfCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )agentgate_csrf=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

async function getCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken
  const cookieToken = readableCsrfCookie()
  if (cookieToken) {
    cachedCsrfToken = cookieToken
    return cachedCsrfToken
  }
  const session = await getAgentGate<{ csrf_token?: string | null }>(
    '/api/auth/session'
  )
  cachedCsrfToken = session.csrf_token ?? null
  return cachedCsrfToken
}

export async function postAgentGate<T>(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  return mutateAgentGate<T>('POST', path, body, headers)
}

export async function patchAgentGate<T>(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  return mutateAgentGate<T>('PATCH', path, body, headers)
}

export async function deleteAgentGate<T>(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  return mutateAgentGate<T>('DELETE', path, body, headers)
}

export async function putAgentGate<T>(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  return mutateAgentGate<T>('PUT', path, body, headers)
}

async function mutateAgentGate<T>(
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  const csrfToken =
    path === '/api/auth/login' || path === '/api/auth/bootstrap'
      ? null
      : await getCsrfToken()
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
  })
  const parsed = await parseResponse<T>(response)
  if (path === '/api/auth/login') {
    const maybeSession = parsed as { csrf_token?: string | null }
    cachedCsrfToken = maybeSession.csrf_token ?? null
  }
  return parsed
}

export async function getOwnerBootstrap() {
  return getAgentGate<BootstrapStatus>('/api/auth/bootstrap')
}

export async function setupAgentGateOwner(ownerToken: string) {
  return postAgentGate<BootstrapResult>('/api/auth/bootstrap', {
    key: ownerToken,
  })
}

export async function loginAgentGateOwner(ownerToken: string) {
  return postAgentGate<OwnerSession>('/api/auth/login', {
    key: ownerToken,
  })
}

export async function logoutAgentGateOwner() {
  const result = await postAgentGate<OwnerSession>('/api/auth/logout')
  cachedCsrfToken = null
  return result
}

export type GatewayHealth = {
  status: string
  service: string
  pi?: string
  owner_auth?: string
}

export type DependencyHealth = {
  name: string
  status: string
  detail?: { source?: string; message?: string } | string
}

export type CharacterProfile = {
  id: string
  name: string
  owner_name?: string
  personality?: string
  background?: string
  boundaries?: string
  updated_at?: string
  configured?: boolean
  avatar?: {
    id: string
    asset: string
    emotion_pack: string
    default_emotion: string
    emotions: { id: string; label: string; asset: string }[]
  }
}

export function getCharacterProfile() {
  return getAgentGate<CharacterProfile>('/api/character')
}

export type ModelProvider = {
  id: string
  name: string
  kind: string
  status: string
  configured: boolean
  models_visible: boolean
  model_count?: number
  models_status?: string | null
  risk?: string
  policy?: string
  privacy?: string
  setup_hint?: string
}

export type ModelGatewayCandidates = {
  gateway?: ModelProvider & {
    auth_status?: string
    setup_hint?: string
  }
  candidates?: {
    id: string
    name?: string
    provider?: string
    model?: string
    status?: string
    policy?: string
    risk?: string
    note?: string
  }[]
  candidate_count?: number
  setup?: {
    schema?: string
    provider?: string
    required_env?: string[]
    accepted_key_env?: string[]
    configured?: Record<string, boolean | string | number>
    next_steps?: string[]
    blockers?: string[]
    safety?: Record<string, boolean | string>
  }
  runtime_note?: string
}

export type ModelRouteProbe = {
  provider: string
  model: string
  status: string
  model_visible: boolean
  provider_status: string
  configured: boolean
  risk: string
  policy: string
  note: string
  label?: string
}

export type ModelRoutePlan = {
  agent_id: string
  schema: string
  routes: ModelRouteProbe[]
  fallback_policy?: {
    status: string
    automatic_fallback: boolean
    max_hops?: number
    trigger_classes?: string[]
    blocked_reasons?: string[]
    note?: string
  }
  safe_metadata_only: boolean
  automatic_fallback_enabled: boolean
}

export type ModelRouteSaveResult = {
  status: 'applied' | 'unchanged' | 'pending_approval' | string
  request_id?: string
  proposal_id?: string
  approval_reasons?: string[]
  requires_approval: boolean
  safe_metadata_only: boolean
  route_plan?: ModelRoutePlan
  route_summary?: unknown
  agent?: unknown
}

export type ModelSummary = {
  runtime?: { id: string; status: string; provider_count: number }
  default_route?: {
    agent_id: string
    agent_name: string
    primary_provider: string
    primary_model: string
    fallback_provider: string
    fallback_model: string
  }
  providers?: Pick<
    ModelProvider,
    | 'id'
    | 'name'
    | 'kind'
    | 'status'
    | 'configured'
    | 'models_visible'
    | 'model_count'
    | 'models_status'
  >[]
}

export async function getOwnerSession() {
  return getAgentGate<OwnerSession>('/api/auth/session')
}

export async function getGatewayHealth() {
  return getAgentGate<GatewayHealth>('/api/health')
}

export async function getDependencyHealth() {
  return getAgentGate<DependencyHealth[]>('/api/health/dependencies')
}

export async function getModelProviders() {
  return getAgentGate<{ providers: ModelProvider[] }>('/api/model/providers')
}

export async function getModelGatewayCandidates() {
  return getAgentGate<ModelGatewayCandidates>('/api/model/gateway-candidates')
}

export async function checkModelRoute(provider: string, model: string) {
  return postAgentGate<ModelRouteProbe>('/api/model/route-check', {
    provider,
    model,
  })
}

export async function planModelRoute(payload: {
  agent_id?: string
  primary_provider: string
  primary_model: string
  fallback_provider: string
  fallback_model: string
}) {
  return postAgentGate<ModelRoutePlan>('/api/model/route-plan', payload)
}

export async function saveModelRoute(
  agentId: string,
  payload: {
    primary_provider: string
    primary_model: string
    fallback_provider: string
    fallback_model: string
    reason: string
  }
) {
  return postAgentGate<ModelRouteSaveResult>(
    `/api/model/routes/${encodeURIComponent(agentId)}/save`,
    payload
  )
}

export const relativeTime = (value?: string) => {
  if (!value) return 'not yet'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'unknown'
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 2880) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / 1440)}d ago`
}

export function changeAgentGateOwnerPassword(
  current_key: string,
  new_key: string
) {
  return putAgentGate<OwnerSession>('/api/auth/password', {
    current_key,
    new_key,
  })
}

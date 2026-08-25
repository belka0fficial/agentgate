export type Approval = {
  id: string
  source: string
  severity: 'high' | 'medium' | 'low'
  title: string
  details: string
  binding: { type: string; id: string; version: string; digest: string }
  created_at: string
}

export type DecidedApproval = Approval & {
  decision: 'approved' | 'rejected'
  decided_at: string
  decided_by: string
}

export type ChatSession = {
  id: string
  title: string
  preview: string
  updated_at: string
  message_count?: number
  model?: string
  mode?: string
}

export type ToolTrace = {
  tool: string
  args: string
  duration_ms: number
  result: string
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
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = text && isJson ? JSON.parse(text) : text

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'detail' in payload
        ? String((payload as { detail?: unknown }).detail)
        : `Request failed: ${response.status}`
    throw new Error(message)
  }

  return (payload || {}) as T
}

export async function getAgentGate<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  return parseResponse<T>(response)
}

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

async function getCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken
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
  const csrfToken = path === '/api/auth/login' ? null : await getCsrfToken()
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(csrfToken ? { 'x-agentgate-csrf': csrfToken } : {}),
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

export async function loginAgentGateOwner(ownerToken: string) {
  return postAgentGate<OwnerSession>('/api/auth/login', { owner_token: ownerToken })
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
    'id' | 'name' | 'kind' | 'status' | 'configured' | 'models_visible' | 'model_count' | 'models_status'
  >[]
}

export async function getOwnerSession() {
  return getAgentGate<OwnerSession>('/api/auth/session')
}

export async function getGatewayHealth() {
  return getAgentGate<GatewayHealth>('/health/detailed')
}

export async function getModelProviders() {
  return getAgentGate<{ providers: ModelProvider[] }>('/api/model/providers')
}

export async function getModelGatewayCandidates() {
  return getAgentGate<ModelGatewayCandidates>('/api/model/gateway-candidates')
}

export async function deleteAgentGate<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  return parseResponse<T>(response)
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

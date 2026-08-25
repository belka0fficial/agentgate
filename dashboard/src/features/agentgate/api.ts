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
  return postAgentGate<{
    status: string
    owner_authenticated: boolean
    csrf_token?: string | null
  }>('/api/auth/login', { owner_token: ownerToken })
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

import { mockSystemData } from './mockData'

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) { super(message) }
}

export function csrfHeaders(): Record<string, string> {
  const token = document.cookie.split('; ').find((part) => part.startsWith('agentgate_csrf='))?.split('=').slice(1).join('')
  return token ? { 'X-CSRF-Token': decodeURIComponent(token) } : {}
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (import.meta.env.DEV && import.meta.env.VITE_AGENTGATE_MOCK_SYSTEM === '1' && method === 'GET' && path === '/api/system') {
    return mockSystemData as T
  }

  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : csrfHeaders()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new ApiError(response.status, typeof data?.detail === 'string' ? data.detail : data?.detail?.message || 'Request failed', data)
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body),
  patch: <T>(path: string, body?: unknown) => request<T>(path, 'PATCH', body),
  put: <T>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
  del: <T>(path: string) => request<T>(path, 'DELETE'),
}

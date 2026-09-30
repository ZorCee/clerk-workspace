const TOKEN_KEY = 'wenshi-token'

export function getToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export async function api(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(url, { ...init, headers })
}

export async function apiJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await api(url, init)
  const data = await res.json() as T & { error?: string }
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

import axios from 'axios'
import router from '@/router'
import { gatewayBaseUrl } from '@/services/endpoints'
import { clearAuthenticationStorage } from '@/services/authStorage'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
    _authGeneration?: number
    _refreshGeneration?: number
  }
}

const gatewayUrl = axios.create({ baseURL: gatewayBaseUrl, timeout: 15000, withCredentials: true })
const publicClient = axios.create({ baseURL: gatewayBaseUrl, timeout: 15000, withCredentials: true })
let refreshPromise: Promise<void> | null = null
let authGeneration = 0
let refreshGeneration = 0
let recoveryStopped = false
let accessExpiresAt: number | null = null
let sessionId: string | null = null

const onExpired = () => {
  ++authGeneration
  recoveryStopped = true
  accessExpiresAt = null
  sessionId = null
}
const onEstablished = (event: Event) => {
  const session = (event as CustomEvent<{ sessionId: string; accessExpiresAt?: number }>).detail
  if (session.sessionId !== sessionId || recoveryStopped) { ++authGeneration; accessExpiresAt = null }
  sessionId = session.sessionId
  recoveryStopped = false
  if (typeof session.accessExpiresAt === 'number') accessExpiresAt = Math.max(accessExpiresAt ?? 0, session.accessExpiresAt)
  scheduleRefresh()
}

// Refresh about a minute before the access token expires while the tab is visible, so opening a page after a pause
// does not start with a rejected request. A hidden tab (or a sleeping laptop) refreshes as soon as it is visible again.
const REFRESH_AHEAD_MS = 60_000
let refreshTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRefresh() {
  if (refreshTimer !== null) clearTimeout(refreshTimer)
  refreshTimer = null
  if (accessExpiresAt === null || recoveryStopped) return
  const delay = accessExpiresAt - REFRESH_AHEAD_MS - Date.now()
  if (delay <= 0) return
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    if (document.visibilityState !== 'hidden') void recoverAccess().catch(() => { /* handled by the next request */ })
  }, Math.min(delay, 2_147_000_000))
}
const refreshOnReturn = () => {
  if (document.visibilityState === 'hidden' || recoveryStopped || accessExpiresAt === null) return
  if (accessExpiresAt - Date.now() <= REFRESH_AHEAD_MS) void recoverAccess().catch(() => { /* handled by the next request */ })
}
document.addEventListener('visibilitychange', refreshOnReturn)
window.addEventListener('auth:expired', onExpired)
window.addEventListener('auth:established', onEstablished)
if (import.meta.hot) import.meta.hot.dispose(() => {
  onExpired()
  if (refreshTimer !== null) clearTimeout(refreshTimer)
  document.removeEventListener('visibilitychange', refreshOnReturn)
  window.removeEventListener('auth:expired', onExpired)
  window.removeEventListener('auth:established', onEstablished)
})

const expireSession = async () => {
  if (recoveryStopped) return
  window.dispatchEvent(new Event('auth:expired'))
  clearAuthenticationStorage()
  if (router.currentRoute.value.path !== '/login') await router.replace('/login')
}

/**
 * An explicit session check (page load, returning to the app, opening a private page) may recover a session that an
 * earlier failure gave up on: e.g. a refresh that failed while the network or the auth database was down. Without
 * this the tab kept showing "please log in" until F5 although the cookies were still valid.
 */
export function resumeAuthRecovery() {
  recoveryStopped = false
}

// A refresh that fails because the network or the auth service is briefly unavailable is retried before giving up;
// only a 401 (no longer valid) ends the session.
const REFRESH_RETRY_DELAYS_MS = [400, 1200]
const transient = (error: unknown) => !axios.isAxiosError(error) || !error.response || error.response.status >= 500

// Initialization, HTTP retries and socket handshakes share the same refresh.
export function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise
  if (recoveryStopped) return Promise.reject(new Error('Authentication recovery stopped'))
  const generation = authGeneration
  const attempt = async (retry: number): Promise<void> => {
    try {
      const response = await publicClient.post<{ accessExpiresAt?: number }>('/api/auth/refresh')
      if (generation !== authGeneration || recoveryStopped) throw new Error('Authentication changed during refresh')
      ++refreshGeneration
      accessExpiresAt = response.data?.accessExpiresAt ?? null
      scheduleRefresh()
    } catch (error) {
      if (retry >= REFRESH_RETRY_DELAYS_MS.length || !transient(error) || !axios.isAxiosError(error)) throw error
      await new Promise(resolve => setTimeout(resolve, REFRESH_RETRY_DELAYS_MS[retry]))
      if (generation !== authGeneration || recoveryStopped) throw error
      return attempt(retry + 1)
    }
  }
  const pending = attempt(0).finally(() => { if (refreshPromise === pending) refreshPromise = null })
  refreshPromise = pending
  return pending
}

async function recoverAccess() {
  const generation = authGeneration
  try { await refreshAccessToken() }
  catch (error) {
    if (generation === authGeneration && axios.isAxiosError(error) && error.response?.status === 401) await expireSession()
    throw error
  }
}

gatewayUrl.interceptors.request.use(async config => {
  config._authGeneration ??= authGeneration
  config._refreshGeneration ??= refreshGeneration
  const path = config.url || ''
  const authAction = path.startsWith('/api/auth/') && !['/api/auth/checkLogin', '/api/auth/activity'].includes(path)
  if (!authAction && !config._retry && !recoveryStopped && accessExpiresAt !== null && accessExpiresAt <= Date.now() + 15000) {
    await recoverAccess()
    config._refreshGeneration = refreshGeneration
  }
  return config
})

gatewayUrl.interceptors.response.use(response => response, async error => {
  const request = error.config
  if (!request || error.response?.status !== 401) throw error
  const path = request.url || ''
  if (path.startsWith('/api/auth/') && !['/api/auth/checkLogin', '/api/auth/activity'].includes(path)) throw error
  if (request._authGeneration !== authGeneration || recoveryStopped) throw error
  // Refresh cannot repair a revoked session or an API that rejects the new token.
  if (request._retry || error.response.headers?.['x-auth-failure'] === 'session-invalid') {
    await expireSession()
    throw error
  }
  request._retry = true
  // A late 401 from an old request reuses cookies refreshed by another request.
  if ((request._refreshGeneration ?? 0) === refreshGeneration) await recoverAccess()
  if (request._authGeneration !== authGeneration || recoveryStopped) throw error
  request._refreshGeneration = refreshGeneration
  return gatewayUrl(request)
})

export { gatewayUrl, publicClient }

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
}
window.addEventListener('auth:expired', onExpired)
window.addEventListener('auth:established', onEstablished)
if (import.meta.hot) import.meta.hot.dispose(() => {
  onExpired()
  window.removeEventListener('auth:expired', onExpired)
  window.removeEventListener('auth:established', onEstablished)
})

const expireSession = async () => {
  if (recoveryStopped) return
  window.dispatchEvent(new Event('auth:expired'))
  clearAuthenticationStorage()
  if (router.currentRoute.value.path !== '/login') await router.replace('/login')
}

// Initialization, HTTP retries and socket handshakes share the same refresh.
export function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise
  if (recoveryStopped) return Promise.reject(new Error('Authentication recovery stopped'))
  const generation = authGeneration
  const pending = publicClient.post<{ accessExpiresAt?: number }>('/api/auth/refresh')
    .then(response => {
      if (generation !== authGeneration || recoveryStopped) throw new Error('Authentication changed during refresh')
      ++refreshGeneration
      accessExpiresAt = response.data?.accessExpiresAt ?? null
    })
    .finally(() => { if (refreshPromise === pending) refreshPromise = null })
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

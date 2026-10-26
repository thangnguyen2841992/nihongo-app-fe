import { ref } from 'vue'
import axios from 'axios'
import { gatewayUrl, publicClient, refreshAccessToken, resumeAuthRecovery } from '@/api/authApi'
import { wsService } from '@/services/websocketService'
import { clearAuthenticationStorage } from './authStorage'

const isAuthenticated = ref(false)
const isAuthReady = ref(false)
const userName = ref('')
const userEmail = ref('')
const userRole = ref('')
// This tab had a signed-in session: when it is lost, checks are retried (navigation, returning to the tab) instead of
// leaving the learner on "please log in" until F5.
const hadSession = ref(false)
// Logout and session replacement are pushed over the auth WebSocket; polling is only a fallback.
export const SESSION_POLL_MS = 60_000
// While the realtime logout channel is open the server pushes session replacement instantly and every token
// refresh (15 min) re-checks the session, so the periodic check only runs as a safety net this often.
export const SESSION_POLL_CONNECTED_MS = 5 * 60_000
// Returning to the tab rechecks sooner, but not more often than this.
export const SESSION_RECHECK_MIN_MS = 15_000
let pollingTimer: ReturnType<typeof setInterval> | null = null
let isChecking = false
let lastCheckedAt = 0
let isLoggingOut = false
let sessionVersion = 0

type Session = { isLoggedIn: boolean; name?: string; email?: string; role?: string; sessionId?: string; accessExpiresAt?: number }

const clearAuth = () => {
  ++sessionVersion
  isAuthenticated.value = false
  userName.value = ''; userEmail.value = ''; userRole.value = ''
  if (pollingTimer !== null) clearInterval(pollingTimer)
  pollingTimer = null
  sessionStorage.removeItem('sessionId')
  wsService.disconnect()
}
const expireAuth = () => { clearAuth(); clearAuthenticationStorage() }
window.addEventListener('auth:expired', expireAuth)

const applySession = (session: Session) => {
  if (!session.isLoggedIn || !session.sessionId) { clearAuth(); return }
  isAuthenticated.value = true
  hadSession.value = true
  userName.value = session.name ?? ''
  userEmail.value = session.email ?? ''
  userRole.value = session.role ?? ''
  sessionStorage.setItem('sessionId', session.sessionId)
  window.dispatchEvent(new CustomEvent('auth:established', { detail: session }))
  wsService.connect(session.sessionId, () => {
    // The server replaced this session; newer shared cookies must remain valid.
    expireAuth()
    window.location.replace('/login')
  })
  lastCheckedAt = Date.now()
  if (pollingTimer !== null) return
  pollingTimer = setInterval(() => {
    if (wsService.isConnected() && Date.now() - lastCheckedAt < SESSION_POLL_CONNECTED_MS) return
    void checkSession()
  }, SESSION_POLL_MS)
}

const checkSession = async () => {
  if (!isAuthenticated.value || isChecking || isLoggingOut || document.visibilityState === 'hidden') return
  isChecking = true
  lastCheckedAt = Date.now()
  const version = sessionVersion
  try {
    const { data } = await gatewayUrl.get<Session>('/api/auth/checkLogin')
    if (version === sessionVersion && !isLoggingOut) applySession(data)
  } catch {
    // The API interceptor handles expiration. Keep the session during network outages.
  } finally { isChecking = false }
}

const recheckOnReturn = () => {
  if (document.visibilityState === 'hidden' || Date.now() - lastCheckedAt < SESSION_RECHECK_MIN_MS) return
  if (isAuthenticated.value) void checkSession()
  else if (hadSession.value && !isLoggingOut) { lastCheckedAt = Date.now(); void initAuth() }
}
document.addEventListener('visibilitychange', recheckOnReturn)
window.addEventListener('focus', recheckOnReturn)

/**
 * Signing in replaces the user's previous session and the server pushes FORCE_LOGOUT to it. When this very tab still
 * holds that previous session (e.g. it was sent to /login while its cookies were still valid), its own socket would
 * receive the push and bounce the fresh login back to /login. Drop the old session here before signing in.
 */
export const beginLogin = () => { clearAuth() }

export const logout = async () => {
  if (isLoggingOut) return
  isLoggingOut = true
  ++sessionVersion
  try {
    await publicClient.post('/api/auth/logout')
    hadSession.value = false
    expireAuth()
    if (window.location.pathname !== '/login') window.location.replace('/login')
  } finally { isLoggingOut = false }
}

const loadAuth = async () => {
  const version = sessionVersion
  resumeAuthRecovery()
  try {
    const { data } = await publicClient.get<Session>('/api/auth/checkLogin').catch(async error => {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error
      await refreshAccessToken()
      return publicClient.get<Session>('/api/auth/checkLogin')
    })
    if (version === sessionVersion && !isLoggingOut) applySession(data)
  } catch { if (version === sessionVersion) clearAuth() }
  finally { isAuthReady.value = true }
}

let initialization: Promise<void> | null = null
export const initAuth = (): Promise<void> => {
  if (initialization) return initialization
  initialization = loadAuth().finally(() => { initialization = null })
  return initialization
}

export const setAuth = async () => {
  const version = ++sessionVersion
  const { data } = await gatewayUrl.get<Session>('/api/auth/checkLogin')
  if (version === sessionVersion && !isLoggingOut) applySession(data)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearAuth()
    window.removeEventListener('auth:expired', expireAuth)
    document.removeEventListener('visibilitychange', recheckOnReturn)
    window.removeEventListener('focus', recheckOnReturn)
  })
}
export const useAuthState = () => ({ isAuthenticated, isAuthReady, userName, userEmail, userRole, hadSession })

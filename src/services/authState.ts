import { ref } from 'vue'
import axios from 'axios'
import { gatewayUrl, publicClient } from '@/api/authApi'
import { wsService } from '@/services/websocketService'
import { clearAuthenticationStorage } from './authStorage'

const isAuthenticated = ref(false)
const isAuthReady = ref(false)
const userName = ref('')
const userEmail = ref('')
const userRole = ref('')
let pollingTimer: ReturnType<typeof setInterval> | null = null
let isChecking = false
let isLoggingOut = false

type Session = { isLoggedIn: boolean; name?: string; email?: string; role?: string; sessionId?: string }

const clearAuth = () => {
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
  userName.value = session.name ?? ''
  userEmail.value = session.email ?? ''
  userRole.value = session.role ?? ''
  sessionStorage.setItem('sessionId', session.sessionId)
  wsService.connect(session.sessionId, () => {
    // The server replaced this session; newer shared cookies must remain valid.
    expireAuth()
    window.location.replace('/login')
  })
  if (pollingTimer !== null) return
  pollingTimer = setInterval(async () => {
    if (!isAuthenticated.value || isChecking || isLoggingOut || document.visibilityState === 'hidden') return
    isChecking = true
    try {
      const { data } = await gatewayUrl.get<Session>('/api/auth/checkLogin')
      applySession(data)
    } catch {
      // The API interceptor handles expiration. Keep the session during network outages.
    } finally { isChecking = false }
  }, 8000)
}

export const logout = async () => {
  if (isLoggingOut) return
  isLoggingOut = true
  try {
    await publicClient.post('/api/auth/logout')
    expireAuth()
    if (window.location.pathname !== '/login') window.location.replace('/login')
  } finally { isLoggingOut = false }
}

const loadAuth = async () => {
  try {
    const { data } = await publicClient.get<Session>('/api/auth/checkLogin').catch(async error => {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error
      await publicClient.post('/api/auth/refresh')
      return publicClient.get<Session>('/api/auth/checkLogin')
    })
    applySession(data)
  } catch { clearAuth() }
  finally { isAuthReady.value = true }
}

let initialization: Promise<void> | null = null
export const initAuth = (): Promise<void> => {
  if (initialization) return initialization
  initialization = loadAuth().finally(() => { initialization = null })
  return initialization
}

export const setAuth = async () => {
  const { data } = await gatewayUrl.get<Session>('/api/auth/checkLogin')
  applySession(data)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearAuth()
    window.removeEventListener('auth:expired', expireAuth)
  })
}
export const useAuthState = () => ({ isAuthenticated, isAuthReady, userName, userEmail, userRole })

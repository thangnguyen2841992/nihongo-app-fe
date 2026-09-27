import { ref } from 'vue'
import axios from 'axios'

import {
  gatewayUrl,
  publicClient
} from '@/api/authApi'

import { wsService }
  from '@/services/websocketService'

/* =========================
   STATE
========================= */

const isAuthenticated =
  ref(false)

const isAuthReady = ref(false)
const userName = ref('')
const userEmail = ref('')
const userRole = ref('')

/* =========================
   INTERNAL STATE
========================= */

let pollingTimer: any = null

let isChecking = false

let isLoggingOut = false

/* =========================
   STOP POLLING
========================= */

const stopPolling = () => {

  if (pollingTimer) {

    clearInterval(pollingTimer)

    pollingTimer = null
  }
}

/* =========================
   LOGOUT
========================= */

const clearAuth = () => {
  isAuthenticated.value = false
  userName.value = ''; userEmail.value = ''; userRole.value = ''
  stopPolling()
  wsService.disconnect()
}
window.addEventListener('auth:expired', clearAuth)

export const logout = async () => {
  if (isLoggingOut) return
  isLoggingOut = true
  try {
    await publicClient.post('/api/auth/logout')
    clearAuth()
    localStorage.clear()
    sessionStorage.clear()
    if (window.location.pathname !== '/login') window.location.replace('/login')
  } finally {
    isLoggingOut = false
  }
}
/* =========================
   START POLLING
========================= */

const startPolling = () => {

  if (pollingTimer) return

  pollingTimer = setInterval(
    async () => {

      if (
        !isAuthenticated.value
      ) return

      if (isChecking) return

      if (isLoggingOut) return

      if (
        document.visibilityState
        === 'hidden'
      ) return

      isChecking = true

      try {

        const res =
          await gatewayUrl.get(
            '/api/auth/checkLogin'
          )

        if (
          res.data.isLoggedIn
        ) {

          userName.value =
            res.data.name

          userEmail.value =
            res.data.email

          userRole.value =
            res.data.role
        }

      } catch (e) {

        console.log(e)

      } finally {

        isChecking = false
      }

    },
    8000
  )
}

/* =========================
   INIT AUTH
========================= */

export const initAuth =
  async () => {

    try {

      // An anonymous visitor can stay on public pages. Only an established
      // session uses the global interceptor's redirect-on-expiration behavior.
      const res = await publicClient.get('/api/auth/checkLogin').catch(async error => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error
        await publicClient.post('/api/auth/refresh')
        return publicClient.get('/api/auth/checkLogin')
      })

      if (
        !res.data.isLoggedIn
      ) {

        isAuthenticated.value =
          false

        return
      }

      isAuthenticated.value =
        true

      userName.value =
        res.data.name

      userEmail.value =
        res.data.email

      userRole.value =
        res.data.role

      const sessionId = res.data.sessionId
      sessionStorage.setItem('sessionId', sessionId)

      wsService.connect(
        sessionId,

        async () => {

          console.log(
            '🔥 Force logout received'
          )

          // The server already replaced this session; do not revoke newer shared cookies.
          clearAuth()
          window.location.replace('/login')
        }
      )

      startPolling()

    } catch (e) {

      console.log(e)

      isAuthenticated.value =
        false
    } finally {
      isAuthReady.value = true
    }
  }

/* =========================
   SET AUTH
========================= */

export const setAuth =
  async () => {

    const res =
      await gatewayUrl.get(
        '/api/auth/checkLogin'
      )

    if (
      !res.data.isLoggedIn
    ) return

    isAuthenticated.value =
      true

    userName.value =
      res.data.name

    userEmail.value =
      res.data.email

    userRole.value =
      res.data.role

    const sessionId = res.data.sessionId
    sessionStorage.setItem('sessionId', sessionId)

    if (sessionId) {

      wsService.connect(
        sessionId,

        async () => {

          console.log(
            '🔥 Force logout received'
          )

          // The server already replaced this session; do not revoke newer shared cookies.
          clearAuth()
          window.location.replace('/login')
        }
      )
    }

    startPolling()
  }

/* =========================
   EXPORT STATE
========================= */

export const useAuthState =
  () => ({

    isAuthenticated,
    isAuthReady,

    userName,

    userEmail,

    userRole
  })

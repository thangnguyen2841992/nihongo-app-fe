import { ref } from 'vue'

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

export const logout = async () => {

  if (isLoggingOut) return

  isLoggingOut = true

  try {

    const sessionId =
      sessionStorage.getItem(
        'sessionId'
      )

    await publicClient.post(
      '/api/auth/logout',
      {
        sessionId
      }
    )

  } catch (e) {

    console.log(e)

  } finally {

    isAuthenticated.value = false

    userName.value = ''
    userEmail.value = ''
    userRole.value = ''

    stopPolling()

    wsService.disconnect()

    localStorage.clear()

    sessionStorage.clear()

    isLoggingOut = false

    if (
      window.location.pathname
      !== '/login'
    ) {

      window.location.replace(
        '/login'
      )
    }
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

      const res =
        await gatewayUrl.get(
          '/api/auth/checkLogin'
        )

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

      let sessionId =
        sessionStorage.getItem(
          'sessionId'
        )

      if (!sessionId) {

        sessionId =
          crypto.randomUUID()

        sessionStorage.setItem(
          'sessionId',
          sessionId
        )
      }

      wsService.connect(
        sessionId,

        async () => {

          console.log(
            '🔥 Force logout received'
          )

          await logout()
        }
      )

      startPolling()

    } catch (e) {

      console.log(e)

      isAuthenticated.value =
        false
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

    const sessionId =
      sessionStorage.getItem(
        'sessionId'
      )

    if (sessionId) {

      wsService.connect(
        sessionId,

        async () => {

          console.log(
            '🔥 Force logout received'
          )

          await logout()
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

    userName,

    userEmail,

    userRole
  })

import { ref } from 'vue'
import gatewayUrl from '@/api/authApi'
import { wsService } from '@/services/websocketService'

// ======================
// 🔥 STATE
// ======================

const isAuthenticated = ref(false)

const userName = ref('')
const userEmail = ref('')
const userRole = ref('')

let pollingTimer: any = null
let isChecking = false
let interceptorInitialized = false

// ======================
// 🔥 LOGOUT
// ======================

export const logout = async () => {

  try {

    const sessionId =
      sessionStorage.getItem('sessionId')

    await gatewayUrl.post(
      '/api/auth/logout',
      {
        sessionId: sessionId
      }
    )

  } catch (e) {

    console.log(e)

  }

  isAuthenticated.value = false

  userName.value = ''
  userEmail.value = ''
  userRole.value = ''

  stopPolling()

  wsService.disconnect()

  sessionStorage.removeItem('sessionId')

  if (window.location.pathname !== '/login') {

    window.location.href = '/login'

  }
}

// ======================
// 🔥 INTERCEPTOR
// ======================

const initInterceptor = () => {

  if (interceptorInitialized) return

  interceptorInitialized = true

  gatewayUrl.interceptors.response.use(

    res => res,

    err => {

      if (err.response?.status === 401) {

        logout()

      }

      return Promise.reject(err)

    }
  )
}

// ======================
// 🔥 POLLING
// ======================

const startPolling = () => {

  if (pollingTimer) return

  pollingTimer = setInterval(async () => {

    if (!isAuthenticated.value || isChecking) return

    if (document.visibilityState === 'hidden') return

    isChecking = true

    try {

      const res =
        await gatewayUrl.get('/api/auth/checkLogin')

      if (res.data.isLoggedIn) {

        userName.value = res.data.name
        userEmail.value = res.data.email
        userRole.value = res.data.role

      }

    } catch (err: any) {

      if (err.response?.status === 401) {

        logout()

      }

    } finally {

      isChecking = false

    }

  }, 8000)
}

const stopPolling = () => {

  if (pollingTimer) {

    clearInterval(pollingTimer)

    pollingTimer = null

  }
}

// ======================
// 🔥 INIT AUTH
// ======================

export const initAuth = async () => {

  initInterceptor()

  try {

    const res =
      await gatewayUrl.get('/api/auth/checkLogin')

    if (res.data.isLoggedIn) {

      isAuthenticated.value = true

      userName.value = res.data.name
      userEmail.value = res.data.email
      userRole.value = res.data.role

      let sessionId =
        sessionStorage.getItem('sessionId')

      if (!sessionId) {

        sessionId = crypto.randomUUID()

        sessionStorage.setItem(
          'sessionId',
          sessionId
        )
      }

      wsService.connect(
        sessionId,
        () => {

          console.log(
            '🔥 Force logout received from WS'
          )

          logout()
        }
      )

      startPolling()

    } else {

      isAuthenticated.value = false

    }

  } catch {

    isAuthenticated.value = false

  }
}

// ======================
// 🔥 SET AUTH
// ======================

export const setAuth = async () => {

  const res =
    await gatewayUrl.get('/api/auth/checkLogin')

  if (!res.data.isLoggedIn) return

  isAuthenticated.value = true

  userName.value = res.data.name
  userEmail.value = res.data.email
  userRole.value = res.data.role

  const sessionId =
    sessionStorage.getItem('sessionId')

  wsService.connect(
    sessionId!,
    () => {

      console.log(
        '🔥 Force logout received from WS'
      )

      logout()
    }
  )

  startPolling()
}

// ======================
// 🔥 EXPORT
// ======================

export const useAuthState = () => ({

  isAuthenticated,

  userName,
  userEmail,
  userRole
})

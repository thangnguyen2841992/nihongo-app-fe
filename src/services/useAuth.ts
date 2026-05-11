import {ref} from 'vue'
import gatewayUrl from '@/api/authApi'
import {wsService} from '@/services/websocketService'

// ======================
// 🔥 STATE
// ======================
const isAuthenticated = ref(false)

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
    await gatewayUrl.post('/api/auth/logout',
      {
        sessionId: sessionId
      }
    )
  } catch (e) {
    console.log(e)
  }

  isAuthenticated.value = false

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
// 🔥 POLLING (SMART)
// ======================
const startPolling = () => {
  if (pollingTimer) return

  pollingTimer = setInterval(async () => {
    if (!isAuthenticated.value || isChecking) return
    if (document.visibilityState === 'hidden') return

    isChecking = true
    try {
      await gatewayUrl.get('/api/auth/checkLogin')
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
    const res = await gatewayUrl.get('/api/auth/checkLogin')

    if (res.data.isLoggedIn) {
      isAuthenticated.value = true
      // ✅ lấy sessionId current tab
      let sessionId =
        sessionStorage.getItem('sessionId')

      // ✅ nếu chưa có -> tạo mới
      if (!sessionId) {

        sessionId = crypto.randomUUID()

        sessionStorage.setItem(
          'sessionId',
          sessionId
        )
      }


      // 🔥 connect WS (chỉ emit event, không tự logout)
      wsService.connect(
        sessionId,
        () => {
          console.log('🔥 Force logout received from WS')
          logout();
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
// 🔥 SET AUTH (sau login)
// ======================
export const setAuth = () => {

  isAuthenticated.value = true

  const sessionId = sessionStorage.getItem('sessionId')

  wsService.connect(sessionId!, () => {

    console.log('🔥 Force logout received from WS')

    logout()

  })

  startPolling()
}

// ======================
// 🔥 EXPORT STATE
// ======================
export const useAuthState = () => ({
  isAuthenticated
})

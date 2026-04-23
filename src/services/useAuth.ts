import { ref } from 'vue'
import gatewayUrl from '@/api/authApi'
import { Client } from '@stomp/stompjs'

// 🔥 tránh lỗi global
// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs'

const isAuthenticated = ref(false)

let pollingTimer: any = null
let isChecking = false
let interceptorInitialized = false

let stompClient: Client | null = null

// ======================
// 🔥 LOGOUT
// ======================
export const logout = () => {
  localStorage.removeItem('access_token')
  isAuthenticated.value = false

  stopPolling()
  disconnectWebSocket()

  // ❗ tránh loop login
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
// 🔥 WEBSOCKET
// ======================
const connectWebSocket = () => {
  if (stompClient?.active) return

  stompClient = new Client({
    webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
    reconnectDelay: 5000,

    onConnect: () => {
      console.log('✅ WS connected')

      stompClient?.subscribe('/user/queue/logout', (msg) => {
        try {
          const data = JSON.parse(msg.body)

          if (data.type === 'FORCE_LOGOUT') {
            console.log('🔥 Force logout received')
            logout()
          }
        } catch {
          logout()
        }
      })
    },

    onStompError: (frame) => {
      console.error('❌ Broker error:', frame.headers['message'])
    },

    onWebSocketError: (err) => {
      console.error('❌ WS error', err)
    }
  })

  stompClient.activate()
}

const disconnectWebSocket = () => {
  if (stompClient?.active) {
    stompClient.deactivate()
    stompClient = null
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

      connectWebSocket()
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

  connectWebSocket()
  startPolling()
}

export const useAuthState = () => ({
  isAuthenticated
})

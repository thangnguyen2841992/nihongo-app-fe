import router from '@/router'
import { Client } from '@stomp/stompjs'
import gatewayUrl from '@/api/authApi.ts'

let stompClient: Client | null = null

export const connectWebSocket = () => {
  if (stompClient && stompClient.active) {
    return
  }

  stompClient = new Client({
    // 🔥 dùng WebSocket native
    brokerURL: 'ws://localhost:8082/ws',

    reconnectDelay: 5000, // auto reconnect

    debug: () => {}, // tắt log

    onConnect: () => {
      console.log('WS connected')

      stompClient?.subscribe('/user/queue/logout', async (msg) => {
        if (msg.body === 'force_logout') {

          try {
            // 👉 gọi logout backend (clear cookie)
            await gatewayUrl.post('/api/auth/logout')
          } catch (e) {}

          // 👉 redirect
          if (router.currentRoute.value.path !== '/login') {
            router.push('/login').catch(() => {})
          }
        }
      })
    },

    onStompError: (frame) => {
      console.error('Broker error:', frame.headers['message'])
    }
  })

  stompClient.activate()
}

export const disconnectWebSocket = () => {
  if (stompClient) {
    stompClient.deactivate()
    stompClient = null
  }
}

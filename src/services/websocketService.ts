import {Client} from '@stomp/stompjs'
import { authSocketUrl } from './endpoints'
import { gatewayUrl } from '@/api/authApi'

type LogoutCallback = () => void

class WebSocketService {
  private client: Client | null = null
  private logoutCallback: LogoutCallback | null = null
  private sessionId: string | null = null

  connect(
    sessionId: string,
    onLogout: LogoutCallback
  ) {

    if (this.client?.active && this.sessionId === sessionId) return
    this.disconnect()
    this.sessionId = sessionId

    this.logoutCallback = onLogout

    const client = new Client({

      brokerURL: authSocketUrl,
      connectionTimeout: 10000,
      beforeConnect: async () => {
        if (this.client !== client || this.sessionId !== sessionId) { await client.deactivate(); return }
        try { await gatewayUrl.get('/api/auth/checkLogin') }
        catch { await client.deactivate() }
        if (this.client !== client || this.sessionId !== sessionId) await client.deactivate()
      },

      reconnectDelay: 5000,

      onConnect: () => {
        if (this.sessionId !== sessionId) return


        client.subscribe(
          '/user/queue/logout',

          (msg) => {

            try {

              const data = JSON.parse(msg.body)


              // ✅ chỉ logout đúng session/tab
              if (
                data.type === 'FORCE_LOGOUT' &&
                this.sessionId === sessionId &&
                data.sessionId === sessionId
              ) {


                this.logoutCallback?.()
              }

            } catch (e) {

              console.error(
                '❌ WS parse error',
                e
              )
            }
          }
        )
      },

      onStompError: () => {
        // Polling checks the HTTP session before starting a new connection.
        void client.deactivate()
      },

    })
    this.client = client
    client.activate()
  }

  disconnect() {
    const old = this.client
    this.client = null
    this.sessionId = null
    this.logoutCallback = null
    if (old) void old.deactivate()
  }
}

export const wsService = new WebSocketService()

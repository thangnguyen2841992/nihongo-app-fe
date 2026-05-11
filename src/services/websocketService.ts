import {Client} from '@stomp/stompjs'
// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs'

type LogoutCallback = () => void

class WebSocketService {
  private client: Client | null = null
  private logoutCallback: LogoutCallback | null = null

  connect(
    sessionId: string,
    onLogout: LogoutCallback
  ) {

    if (this.client?.active) return

    this.logoutCallback = onLogout

    this.client = new Client({

      webSocketFactory: () =>
        new SockJS('http://localhost:8081/ws'),

      reconnectDelay: 5000,

      onConnect: () => {

        console.log('✅ WS connected')

        this.client?.subscribe(
          '/user/queue/logout',

          (msg) => {

            try {

              const data = JSON.parse(msg.body)

              console.log('📩 WS message:', data)

              // ✅ chỉ logout đúng session/tab
              if (
                data.type === 'FORCE_LOGOUT' &&
                data.sessionId === sessionId
              ) {

                console.log(
                  '🔥 Force logout current tab'
                )

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

      onStompError: (frame) => {

        console.error(
          '❌ Broker error:',
          frame.headers['message']
        )
      },

      onWebSocketError: (err) => {

        console.error('❌ WS error', err)
      }
    })

    this.client.activate()
  }

  disconnect() {
    if (this.client?.active) {
      this.client.deactivate().then(() =>
        this.client = null
      )
    }
  }
}

export const wsService = new WebSocketService()

import {Client} from '@stomp/stompjs'
import { authSocketUrl } from './endpoints'
// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs'

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

    this.client = new Client({

      webSocketFactory: () =>
        new SockJS(authSocketUrl),

      reconnectDelay: 5000,

      onConnect: () => {
        if (this.sessionId !== sessionId) return


        this.client?.subscribe(
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
    const old = this.client
    this.client = null
    this.sessionId = null
    this.logoutCallback = null
    if (old) void old.deactivate()
  }
}

export const wsService = new WebSocketService()

import { Client, type IMessage } from '@stomp/stompjs'
import axios from 'axios'
import { gatewayUrl } from '@/api/authApi'

export type RealtimeStatus = 'connecting' | 'live' | 'offline'
type Subscribe = (destination: string, receive: (message: IMessage) => void) => void

/** Owns one socket and its HTTP preflight, retries and session-expiry listener. */
export function connectAuthenticatedRealtime(
  path: string,
  onConnect: (subscribe: Subscribe) => void,
  onStatus: (status: RealtimeStatus) => void,
) {
  let stopped = false
  let connection = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let preflight: AbortController | undefined
  const url = new URL(path, gatewayUrl.defaults.baseURL || window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  const reconnect = async () => {
    ++connection
    await client.deactivate()
    if (stopped || retryTimer !== undefined) return
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      if (!stopped) client.activate()
    }, 10000)
  }
  const client = new Client({
    brokerURL: url.toString(),
    reconnectDelay: 3000,
    connectionTimeout: 10000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: async () => {
      if (stopped) return
      onStatus('connecting')
      preflight?.abort()
      const request = new AbortController()
      preflight = request
      try {
        // Refresh HttpOnly cookies before each handshake without fetching screen data.
        await gatewayUrl.get('/api/auth/checkLogin', { signal: request.signal })
      } catch (error) {
        if (stopped || request.signal.aborted) return
        onStatus('offline')
        if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) stop()
        else await reconnect()
      } finally {
        if (preflight === request) preflight = undefined
      }
    },
    onConnect: () => {
      if (stopped) return
      const generation = ++connection
      onStatus('live')
      onConnect((destination, receive) => {
        client.subscribe(destination, message => {
          // A buffered frame from an old connection must not overwrite its resync.
          if (!stopped && generation === connection) receive(message)
        })
      })
    },
    onWebSocketClose: () => {
      ++connection
      if (!stopped) onStatus('offline')
    },
    onWebSocketError: () => { if (!stopped) onStatus('offline') },
    onStompError: () => {
      if (stopped) return
      onStatus('offline')
      void reconnect()
    },
  })
  const stop = () => {
    if (stopped) return
    stopped = true
    ++connection
    clearTimeout(retryTimer)
    preflight?.abort()
    window.removeEventListener('auth:expired', expire)
    void client.deactivate()
  }
  const expire = () => { onStatus('offline'); stop() }
  window.addEventListener('auth:expired', expire)
  client.activate()
  return stop
}

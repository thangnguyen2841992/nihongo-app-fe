import { Client } from '@stomp/stompjs'
import { onMounted, onUnmounted, ref } from 'vue'
import { gatewayUrl } from '@/api/authApi'
import axios from 'axios'

export interface WalletNotice { eventId: string; depositId: number; type: 'CREATED' | 'APPROVED' | 'REJECTED' }
export type LiveStatus = 'connecting' | 'live' | 'offline'

export function connectWalletRealtime(admin: boolean, onChange: (event?: WalletNotice) => void, onStatus: (status: LiveStatus) => void) {
  let stopped = false
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  const seen = new Set<string>()
  const url = new URL('/api/nihongo-user/wallets/ws', gatewayUrl.defaults.baseURL || window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const client = new Client({
    brokerURL: url.toString(), reconnectDelay: 3000, connectionTimeout: 10000,
    heartbeatIncoming: 10000, heartbeatOutgoing: 10000,
    beforeConnect: async () => {
      onStatus('connecting')
      // HTTP refresh interceptor renews the HttpOnly cookie before the handshake.
      // No bearer token is exposed in browser storage, URL or STOMP headers.
      try { await gatewayUrl.get('/api/auth/checkLogin') }
      catch (error) {
        if (stopped) return
        onStatus('offline')
        await client.deactivate()
        const terminal = axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)
        if (terminal) { stop(); return }
        if (!stopped) retryTimer = setTimeout(() => { if (!stopped) client.activate() }, 10000)
        return
      }
      if (stopped) await client.deactivate()
    },
    onConnect: () => {
      if (stopped) return
      client.subscribe(admin ? '/topic/wallet-admin' : '/user/queue/wallet', message => {
        try {
          const event = JSON.parse(message.body) as WalletNotice
          if (!event.eventId || !Number.isInteger(event.depositId) || !['CREATED', 'APPROVED', 'REJECTED'].includes(event.type) || seen.has(event.eventId)) return
          seen.add(event.eventId)
          if (seen.size > 500) seen.delete(seen.values().next().value!)
          onChange(event)
        } catch { /* Ignore malformed notices; balance is read from the HTTP API. */ }
      })
      onStatus('live')
      onChange() // Resync on every connect/reconnect, including missed or reordered events.
    },
    onWebSocketClose: () => { if (!stopped) onStatus('offline') },
    onStompError: () => { if (!stopped) onStatus('offline') },
  })
  const stop = () => {
    if (stopped) return
    stopped = true
    clearTimeout(retryTimer)
    window.removeEventListener('auth:expired', stop)
    void client.deactivate()
  }
  window.addEventListener('auth:expired', stop)
  client.activate()
  return stop
}

export function useWalletRealtime(admin: boolean, onChange: (event?: WalletNotice) => void) {
  const status = ref<LiveStatus>('connecting')
  let stop: (() => void) | undefined
  const focus = () => onChange()
  onMounted(() => {
    stop = connectWalletRealtime(admin, onChange, value => { status.value = value })
    window.addEventListener('focus', focus)
  })
  onUnmounted(() => { stop?.(); window.removeEventListener('focus', focus) })
  return status
}

import { Client } from '@stomp/stompjs'
import { onMounted, onUnmounted, ref } from 'vue'
import { gatewayUrl } from '@/api/authApi'

export interface WalletNotice { eventId: string; depositId: number; type: 'CREATED' | 'APPROVED' | 'REJECTED' }
export type LiveStatus = 'connecting' | 'live' | 'offline'

export function connectWalletRealtime(admin: boolean, onChange: (event?: WalletNotice) => void, onStatus: (status: LiveStatus) => void) {
  let stopped = false
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
      try { await gatewayUrl.get('/api/nihongo-user/wallets') } catch { /* handshake/reconnect or auth redirect handles failure */ }
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
  client.activate()
  return () => { stopped = true; void client.deactivate() }
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

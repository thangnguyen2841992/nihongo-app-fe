import { onMounted, onUnmounted, ref } from 'vue'
import { connectAuthenticatedRealtime, type RealtimeStatus } from './authenticatedRealtime'

export interface WalletNotice { eventId: string; depositId: number; type: 'CREATED' | 'APPROVED' | 'REJECTED' }
export type LiveStatus = RealtimeStatus

export function connectWalletRealtime(admin: boolean, onChange: (event?: WalletNotice) => void, onStatus: (status: LiveStatus) => void) {
  const seen = new Set<string>()
  return connectAuthenticatedRealtime('/api/nihongo-user/wallets/ws', subscribe => {
      subscribe(admin ? '/topic/wallet-admin' : '/user/queue/wallet', message => {
        try {
          const event = JSON.parse(message.body) as WalletNotice
          if (!event.eventId || !Number.isInteger(event.depositId) || !['CREATED', 'APPROVED', 'REJECTED'].includes(event.type) || seen.has(event.eventId)) return
          seen.add(event.eventId)
          if (seen.size > 500) seen.delete(seen.values().next().value!)
          onChange(event)
        } catch { /* Ignore malformed notices; balance is read from the HTTP API. */ }
      })
      onChange() // Resync on every connect/reconnect, including missed or reordered events.
  }, onStatus)
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

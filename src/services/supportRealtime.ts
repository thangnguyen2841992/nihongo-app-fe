import { connectAuthenticatedRealtime, type RealtimeStatus } from './authenticatedRealtime'

export interface SupportNotice {
  eventId: string
  conversationId: number
  messageId: number | null
  type: 'MESSAGE' | 'STATUS'
  userId: string
}

export function connectSupportRealtime(
  staff: boolean,
  onChange: (notice?: SupportNotice) => void,
  onStatus: (status: RealtimeStatus) => void,
) {
  const seen = new Set<string>()
  return connectAuthenticatedRealtime('/api/nihongo-user/wallets/ws', subscribe => {
    subscribe(staff ? '/topic/support-staff' : '/user/queue/support', message => {
      try {
        const notice = JSON.parse(message.body) as SupportNotice
        if (!notice.eventId || !Number.isInteger(notice.conversationId) || !['MESSAGE', 'STATUS'].includes(notice.type) || seen.has(notice.eventId)) return
        seen.add(notice.eventId)
        if (seen.size > 500) seen.delete(seen.values().next().value!)
        onChange(notice)
      } catch { /* HTTP is the source of truth; malformed notices are ignored. */ }
    })
    onChange()
  }, onStatus)
}

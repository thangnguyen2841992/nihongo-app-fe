import type { BroadcastNotice } from './broadcastApi'
import { connectAuthenticatedRealtime, type RealtimeStatus } from './authenticatedRealtime'

function isNotice(value: unknown): value is BroadcastNotice {
  if (!value || typeof value !== 'object') return false
  const notice = value as Partial<BroadcastNotice>
  return Number.isInteger(notice.id) && typeof notice.title === 'string' && typeof notice.content === 'string'
    && typeof notice.createdAt === 'string' && ['ALL', 'STAFF', 'USER'].includes(notice.audience || '')
}

export function connectBroadcastRealtime(
  role: string,
  onChange: (notice?: BroadcastNotice) => void,
  onStatus: (status: RealtimeStatus) => void,
) {
  const normalizedRole = role.replace(/^ROLE_/, '')
  return connectAuthenticatedRealtime('/api/notification/ws', subscribe => {
    const topics = normalizedRole === 'ADMIN' ? ['all', 'staff', 'user'] : ['all', normalizedRole.toLowerCase()]
    for (const topic of topics) {
      subscribe(`/topic/broadcast/${topic}`, message => {
        try {
          const notice: unknown = JSON.parse(message.body)
          if (isNotice(notice)) onChange(notice)
        } catch { /* Ignore malformed frames and keep the connection alive. */ }
      })
    }
    onChange()
  }, onStatus)
}

import { ref, shallowRef } from 'vue'
import type { BroadcastNotice } from './broadcastApi'
import type { RealtimeStatus } from './authenticatedRealtime'

// The global notification listener and navbar bells share one UI state.
export const notificationOpen = ref(false)
export const notificationUnread = ref(0)
export const broadcastUnread = ref(0)
export const broadcastConnectionStatus = ref<RealtimeStatus>('offline')

export interface BroadcastFeed {
  owner: string
  notices: readonly BroadcastNotice[]
}

export const BROADCAST_READ_EVENT = 'broadcast:read'
export const broadcastOwner = (email: string, role: string) => `${email}:${role}`
export const broadcastFeed = shallowRef<BroadcastFeed>({ owner: '', notices: [] })

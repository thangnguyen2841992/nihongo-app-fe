import { ref } from 'vue'
import { getStaffSupportSummary } from './supportChat'
import { connectSupportRealtime } from './supportRealtime'
import type { RealtimeStatus } from './authenticatedRealtime'

export const staffSupportUnread = ref(0)
export const staffSupportRealtime = ref<RealtimeStatus>('connecting')

let stopRealtime: (() => void) | undefined
let refreshRequest = 0

export async function refreshStaffSupportSummary() {
  const current = ++refreshRequest
  try {
    const summary = await getStaffSupportSummary()
    if (current === refreshRequest) staffSupportUnread.value = Math.max(0, summary.unreadMessages)
  } catch {
    // Keep the last known count while the service reconnects.
  }
}

export function startStaffSupportNotifications() {
  if (!stopRealtime) {
    void refreshStaffSupportSummary()
    stopRealtime = connectSupportRealtime(
      true,
      () => { void refreshStaffSupportSummary() },
      status => { staffSupportRealtime.value = status },
    )
  }

  return () => {
    stopRealtime?.()
    stopRealtime = undefined
    ++refreshRequest
    staffSupportRealtime.value = 'connecting'
  }
}

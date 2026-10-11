import { connectAuthenticatedRealtime } from '@/services/authenticatedRealtime'
import type { MonitorEvent } from './monitorEventService'
import type { PerformanceLiveStatus } from './vpsPerformanceRealtime'

export function connectVpsEvents(
  vpsId: number,
  onEvents: (events?: MonitorEvent[]) => void,
  onStatus: (status: PerformanceLiveStatus) => void,
) {
  let sequence = 0
  return connectAuthenticatedRealtime('/api/staff/vps-performance/ws', subscribe => {
      sequence = 0
      subscribe(`/topic/vps-events/${vpsId}`, (message) => {
        try {
          const data = JSON.parse(message.body)
          if (
            data.vpsId !== vpsId ||
            !Number.isSafeInteger(data.sequence) ||
            data.sequence <= sequence ||
            !Array.isArray(data.events)
          )
            return
          if (
            !data.events.every(
              (event: MonitorEvent) =>
                Number.isSafeInteger(event.eventId) &&
                event.eventId > 0 &&
                typeof event.ruleName === 'string' &&
                typeof event.objectName === 'string' &&
                typeof event.metricCode === 'string' &&
                typeof event.unit === 'string' &&
                ['MINOR', 'WARNING', 'CRITICAL', 'FATAL'].includes(event.severity) &&
                ['ALERT', 'RECOVERY'].includes(event.kind) &&
                ['GT', 'GTE', 'LT', 'LTE'].includes(event.operator) &&
                Number.isFinite(event.value) &&
                Number.isFinite(event.threshold) &&
                Number.isFinite(event.timestamp),
            )
          )
            return
          sequence = data.sequence
          onEvents(data.events)
        } catch {
          /* Malformed frames must not corrupt the feed. */
        }
      })
      onEvents() // Reconnect always resyncs recent events from DB.
  }, onStatus)
}

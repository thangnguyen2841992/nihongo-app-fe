import { connectAuthenticatedRealtime } from '@/services/authenticatedRealtime'
import type { VpsPerformance } from './vpsPerformanceService'

export type PerformanceLiveStatus = 'connecting' | 'live' | 'offline'

export function connectVpsPerformance(
  vpsId: number,
  code: string,
  onUpdate: (value?: VpsPerformance) => void,
  onStatus: (status: PerformanceLiveStatus) => void,
) {
  let sequence = 0
  return connectAuthenticatedRealtime('/api/staff/vps-performance/ws', subscribe => {
      sequence = 0
      subscribe(`/topic/vps-performance/${vpsId}/${code}`, (message) => {
        try {
          const update = JSON.parse(message.body)
          const data = update.performance as VpsPerformance
          if (
            !Number.isSafeInteger(update.sequence) ||
            update.sequence <= sequence ||
            data?.vpsId !== vpsId ||
            data.metricCode !== code ||
            !['UP', 'DOWN', 'UNKNOWN', 'PAUSED'].includes(data.state) ||
            !Array.isArray(data.objects)
          )
            return
          if (
            data.events !== undefined &&
            (!Array.isArray(data.events) ||
              !data.events.every(
                (e) =>
                  Number.isSafeInteger(e.eventId) &&
                  e.eventId > 0 &&
                  Number.isSafeInteger(e.ruleId) &&
                  typeof e.ruleName === 'string' &&
                  typeof e.objectName === 'string' &&
                  typeof e.objectKey === 'string' &&
                  ['ALERT', 'RECOVERY'].includes(e.kind) &&
                  ['MINOR', 'WARNING', 'CRITICAL', 'FATAL'].includes(e.severity) &&
                  ['GT', 'GTE', 'LT', 'LTE'].includes(e.operator) &&
                  Number.isFinite(e.threshold) &&
                  Number.isFinite(e.value) &&
                  Number.isFinite(e.timestamp),
              ))
          )
            return
          if (
            !data.objects.every(
              (o) =>
                typeof o.objectKey === 'string' &&
                Array.isArray(o.points) &&
                o.points.every(
                  (p) =>
                    Number.isFinite(p.timestamp) && (p.value === null || Number.isFinite(p.value)),
                ),
            )
          )
            return
          sequence = update.sequence
          onUpdate(data)
        } catch {
          /* Ignore malformed frames. */
        }
      })
      onUpdate() // HTTP snapshot/history resync after every connect, including reconnects.
  }, onStatus)
}

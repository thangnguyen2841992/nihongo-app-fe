import { Client } from '@stomp/stompjs'
import { gatewayUrl } from '@/api/authApi'
import type { MonitorEvent } from './monitorEventService'
import type { PerformanceLiveStatus } from './vpsPerformanceRealtime'

export function connectVpsEvents(
  vpsId: number,
  onEvents: (events?: MonitorEvent[]) => void,
  onStatus: (status: PerformanceLiveStatus) => void,
) {
  let stopped = false,
    sequence = 0
  const url = new URL(
    '/api/staff/vps-performance/ws',
    gatewayUrl.defaults.baseURL || window.location.origin,
  )
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const client = new Client({
    brokerURL: url.toString(),
    reconnectDelay: 3000,
    connectionTimeout: 10000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: async () => {
      if (stopped) return
      onStatus('connecting')
      try {
        await gatewayUrl.get('/api/staff/vps-metrics')
      } catch {
        /* Socket status reports failure. */
      }
      if (stopped) await client.deactivate()
    },
    onConnect: () => {
      if (stopped) return
      sequence = 0
      client.subscribe(`/topic/vps-events/${vpsId}`, (message) => {
        if (stopped) return
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
      onStatus('live')
      onEvents() // Reconnect always resyncs recent events from DB.
    },
    onWebSocketClose: () => {
      if (!stopped) onStatus('offline')
    },
    onWebSocketError: () => {
      if (!stopped) onStatus('offline')
    },
    onStompError: () => {
      if (!stopped) onStatus('offline')
    },
  })
  client.activate()
  return () => {
    stopped = true
    void client.deactivate()
  }
}

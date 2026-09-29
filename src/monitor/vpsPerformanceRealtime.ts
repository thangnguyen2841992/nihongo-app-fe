import { Client } from '@stomp/stompjs'
import { gatewayUrl } from '@/api/authApi'
import type { VpsPerformance } from './vpsPerformanceService'

export type PerformanceLiveStatus = 'connecting' | 'live' | 'offline'

export function connectVpsPerformance(
  vpsId: number,
  code: string,
  onUpdate: (value?: VpsPerformance) => void,
  onStatus: (status: PerformanceLiveStatus) => void,
) {
  let stopped = false
  let sequence = 0
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
      // Refresh the HttpOnly access cookie through the existing HTTP interceptor.
      try {
        await gatewayUrl.get('/api/staff/vps-metrics')
      } catch {
        /* Authentication/connection failure is shown by the UI. */
      }
      if (stopped) await client.deactivate()
    },
    onConnect: () => {
      if (stopped) return
      sequence = 0
      client.subscribe(`/topic/vps-performance/${vpsId}/${code}`, (message) => {
        if (stopped) return
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
      onStatus('live')
      onUpdate() // HTTP snapshot/history resync after every connect, including reconnects.
    },
    onWebSocketClose: () => {
      if (!stopped) onStatus('offline')
    },
    onStompError: () => {
      if (!stopped) onStatus('offline')
    },
    onWebSocketError: () => {
      if (!stopped) onStatus('offline')
    },
  })
  client.activate()
  return () => {
    stopped = true
    void client.deactivate()
  }
}

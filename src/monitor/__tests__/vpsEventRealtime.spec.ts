import { beforeEach, expect, it, vi } from 'vitest'
import { connectVpsEvents } from '../vpsEventRealtime'
const mocks = vi.hoisted(() => ({ clients: [] as any[], get: vi.fn().mockResolvedValue({}) }))
vi.mock('@/api/authApi', () => ({
  gatewayUrl: { defaults: { baseURL: 'https://app.example.com' }, get: mocks.get },
}))
vi.mock('@stomp/stompjs', () => ({
  Client: class {
    options: any
    subscribe = vi.fn()
    activate = vi.fn()
    deactivate = vi.fn().mockResolvedValue(undefined)
    constructor(options: any) {
      this.options = options
      mocks.clients.push(this)
    }
  },
}))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.clients.length = 0
})
it('uses one VPS topic, validates frames and resyncs after reconnect', async () => {
  const update = vi.fn(),
    status = vi.fn()
  const stop = connectVpsEvents(2, update, status),
    client = mocks.clients[0]
  expect(client.options.brokerURL).toBe('wss://app.example.com/api/staff/vps-performance/ws')
  await client.options.beforeConnect()
  expect(mocks.get).toHaveBeenCalledWith('/api/staff/vps-metrics')
  client.options.onConnect()
  expect(client.subscribe).toHaveBeenCalledWith('/topic/vps-events/2', expect.any(Function))
  expect(update).toHaveBeenLastCalledWith()
  const receive = client.subscribe.mock.calls[0][1]
  const event = {
    eventId: 1,
    ruleName: 'High memory',
    objectName: 'VPS',
    metricCode: 'MEMORY_USAGE',
    unit: '%',
    severity: 'MINOR',
    kind: 'ALERT',
    operator: 'GTE',
    value: 90,
    threshold: 80,
    timestamp: 1800000000,
  }
  const send = (sequence: number, events = [event], vpsId = 2) =>
    receive({ body: JSON.stringify({ sequence, vpsId, events }) })
  send(10)
  send(10)
  send(9)
  send(11, [event], 1)
  send(11, [{ ...event, severity: 'INFO' }])
  receive({ body: '{invalid' })
  expect(update).toHaveBeenCalledTimes(2)
  send(11, [{ ...event, metricCode: 'DISK_USAGE', severity: 'FATAL' }])
  expect(update).toHaveBeenCalledTimes(3)
  client.options.onWebSocketClose()
  expect(status).toHaveBeenLastCalledWith('offline')
  client.options.onConnect()
  expect(update).toHaveBeenCalledTimes(4)
  const reconnectedReceive = client.subscribe.mock.calls[1][1]
  reconnectedReceive({ body: JSON.stringify({ sequence: 1, vpsId: 2, events: [event] }) })
  expect(update).toHaveBeenCalledTimes(5)
  stop()
  reconnectedReceive({ body: JSON.stringify({ sequence: 2, vpsId: 2, events: [event] }) })
  client.options.onConnect()
  expect(update).toHaveBeenCalledTimes(5)
  expect(client.deactivate).toHaveBeenCalledOnce()
})

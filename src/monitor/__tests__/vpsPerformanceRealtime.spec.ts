import { beforeEach, expect, it, vi } from 'vitest'
import { connectVpsPerformance } from '../vpsPerformanceRealtime'
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
it('subscribes to the selected metric, filters duplicate/wrong frames and refreshes on reconnect', async () => {
  const update = vi.fn(),
    status = vi.fn()
  const stop = connectVpsPerformance(2, 'CPU_USAGE', update, status)
  const client = mocks.clients[0]
  expect(client.options.brokerURL).toBe('wss://app.example.com/api/staff/vps-performance/ws')
  await client.options.beforeConnect()
  expect(mocks.get).toHaveBeenCalledWith('/api/staff/vps-metrics')
  client.options.onConnect()
  expect(client.subscribe).toHaveBeenCalledWith(
    '/topic/vps-performance/2/CPU_USAGE',
    expect.any(Function),
  )
  const receive = client.subscribe.mock.calls[0][1]
  const performance = { vpsId: 2, metricCode: 'CPU_USAGE', state: 'UP', objects: [] }
  receive({ body: JSON.stringify({ sequence: 10, performance }) })
  receive({ body: JSON.stringify({ sequence: 10, performance }) })
  receive({ body: JSON.stringify({ sequence: 9, performance }) })
  receive({ body: JSON.stringify({ sequence: 11, performance: { ...performance, vpsId: 1 } }) })
  receive({ body: '{invalid' })
  expect(update).toHaveBeenCalledTimes(2)
  client.options.onWebSocketClose()
  expect(status).toHaveBeenLastCalledWith('offline')
  client.options.onConnect()
  expect(update).toHaveBeenCalledTimes(3)
  const newReceive = client.subscribe.mock.calls[1][1]
  newReceive({ body: JSON.stringify({ sequence: 1, performance }) })
  expect(update).toHaveBeenCalledTimes(4)
  stop()
  newReceive({ body: JSON.stringify({ sequence: 2, performance }) })
  client.options.onConnect()
  expect(client.deactivate).toHaveBeenCalledOnce()
  expect(update).toHaveBeenCalledTimes(4)
})

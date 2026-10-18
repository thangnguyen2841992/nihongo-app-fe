import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { connectBroadcastRealtime } from '../broadcastRealtime'

const mocks = vi.hoisted(() => ({ clients: [] as any[], get: vi.fn().mockResolvedValue({}) }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { defaults: { baseURL: 'http://localhost:8082' }, get: mocks.get } }))
vi.mock('@stomp/stompjs', () => ({
  Client: class {
    options: any
    subscribe = vi.fn()
    activate = vi.fn()
    deactivate = vi.fn().mockResolvedValue(undefined)
    constructor(options: any) { this.options = options; mocks.clients.push(this) }
  },
}))

beforeEach(() => { mocks.clients.length = 0; vi.clearAllMocks() })
afterEach(() => window.dispatchEvent(new Event('auth:expired')))

it('subscribes staff to all and staff topics and emits valid notices immediately', () => {
  const change = vi.fn()
  const stop = connectBroadcastRealtime('STAFF', change, vi.fn())
  const client = mocks.clients[0]
  expect(client.options.brokerURL).toBe('ws://localhost:8082/api/notification/ws')
  client.options.onConnect()
  expect(client.subscribe.mock.calls.map((call: any[]) => call[0])).toEqual([
    '/topic/broadcast/all', '/topic/broadcast/staff',
  ])
  const receive = client.subscribe.mock.calls[1][1]
  receive({ body: JSON.stringify({ id: 4, title: 'Mới', content: 'Ngay lập tức', audience: 'STAFF', createdAt: '2026-10-17T00:00:00Z' }) })
  receive({ body: '{invalid' })
  expect(change).toHaveBeenCalledTimes(2)
  expect(change.mock.calls[1]![0].id).toBe(4)
  stop()
})

it('subscribes users only to public and user topics', () => {
  connectBroadcastRealtime('ROLE_USER', vi.fn(), vi.fn())
  const client = mocks.clients[0]
  client.options.onConnect()
  expect(client.subscribe.mock.calls.map((call: any[]) => call[0])).toEqual([
    '/topic/broadcast/all', '/topic/broadcast/user',
  ])
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { connectWalletRealtime } from '../walletRealtime'

const mocks = vi.hoisted(() => ({
  clients: [] as any[],
  get: vi.fn().mockResolvedValue({}),
}))
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
describe('wallet realtime transport', () => {
  it('subscribes privately, ignores duplicate notices, and resyncs after reconnect', () => {
    const change = vi.fn(), status = vi.fn()
    const stop = connectWalletRealtime(false, change, status)
    const client = mocks.clients[0]
    expect(client.options.brokerURL).toBe('ws://localhost:8082/api/nihongo-user/wallets/ws')
    client.options.onConnect()
    expect(client.subscribe).toHaveBeenCalledWith('/user/queue/wallet', expect.any(Function))
    const receive = client.subscribe.mock.calls[0][1]
    const notice = { eventId: 'event-1', depositId: 10, type: 'APPROVED' }
    receive({ body: JSON.stringify(notice) }); receive({ body: JSON.stringify(notice) })
    expect(change).toHaveBeenCalledTimes(2)
    client.options.onWebSocketClose(); expect(status).toHaveBeenLastCalledWith('offline')
    client.options.onConnect(); expect(change).toHaveBeenCalledTimes(3)
    stop(); expect(client.deactivate).toHaveBeenCalledOnce()
  })
  it('uses the admin topic and refreshes cookies before the handshake', async () => {
    connectWalletRealtime(true, vi.fn(), vi.fn())
    const client = mocks.clients[0]
    await client.options.beforeConnect()
    expect(mocks.get).toHaveBeenCalledWith('/api/nihongo-user/wallets')
    client.options.onConnect()
    expect(client.subscribe).toHaveBeenCalledWith('/topic/wallet-admin', expect.any(Function))
  })
})

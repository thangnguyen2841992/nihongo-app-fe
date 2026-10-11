import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ clients: [] as any[], get: vi.fn() }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: mocks.get } }))
vi.mock('@/services/endpoints', () => ({ authSocketUrl: 'ws://localhost:8081/ws/native' }))
vi.mock('@stomp/stompjs', () => ({ Client: class {
  active = true
  options: any
  activate = vi.fn()
  deactivate = vi.fn().mockResolvedValue(undefined)
  subscribe = vi.fn()
  constructor(options: any) { this.options = options; mocks.clients.push(this) }
} }))
import { wsService } from '../websocketService'
beforeEach(() => { wsService.disconnect(); mocks.clients.length = 0; vi.clearAllMocks(); mocks.get.mockResolvedValue({}) })
afterEach(() => wsService.disconnect())

it('uses native WebSocket with a validated session and keeps forced logout scoped to the current session', async () => {
  const logout = vi.fn()
  wsService.connect('sid', logout)
  const client = mocks.clients[0]
  expect(client.options.brokerURL).toBe('ws://localhost:8081/ws/native')
  expect(client.options.webSocketFactory).toBeUndefined()
  await client.options.beforeConnect()
  expect(mocks.get).toHaveBeenCalledWith('/api/auth/checkLogin')
  client.options.onConnect()
  const receive = client.subscribe.mock.calls[0][1]
  receive({ body: JSON.stringify({ type: 'FORCE_LOGOUT', sessionId: 'other' }) })
  expect(logout).not.toHaveBeenCalled()
  receive({ body: JSON.stringify({ type: 'FORCE_LOGOUT', sessionId: 'sid' }) })
  expect(logout).toHaveBeenCalledOnce()
})
it('cancels the handshake when HTTP authentication fails', async () => {
  mocks.get.mockRejectedValueOnce(new Error('Authentication failed'))
  wsService.connect('sid', vi.fn())
  const client = mocks.clients[0]
  await client.options.beforeConnect()
  expect(client.deactivate).toHaveBeenCalledOnce()
})
it('ignores a late logout from a replaced socket even when the session ID is unchanged', () => {
  const previous = vi.fn(), current = vi.fn()
  wsService.connect('sid', previous)
  const oldClient = mocks.clients[0]
  oldClient.options.onConnect()
  const receiveOld = oldClient.subscribe.mock.calls[0][1]
  wsService.disconnect()
  wsService.connect('sid', current)
  oldClient.options.onConnect()
  receiveOld({ body: JSON.stringify({ type: 'FORCE_LOGOUT', sessionId: 'sid' }) })
  expect(oldClient.subscribe).toHaveBeenCalledOnce()
  expect(previous).not.toHaveBeenCalled()
  expect(current).not.toHaveBeenCalled()
  const newClient = mocks.clients[1]
  newClient.options.onConnect()
  newClient.subscribe.mock.calls[0][1]({ body: JSON.stringify({ type: 'FORCE_LOGOUT', sessionId: 'sid' }) })
  expect(current).toHaveBeenCalledOnce()
})

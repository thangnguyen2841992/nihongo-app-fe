import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { connectAuthenticatedRealtime } from '../authenticatedRealtime'

const mocks = vi.hoisted(() => ({ clients: [] as any[], get: vi.fn() }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { defaults: { baseURL: 'https://app.example.com' }, get: mocks.get } }))
vi.mock('@stomp/stompjs', () => ({ Client: class {
  options: any
  activate = vi.fn()
  deactivate = vi.fn().mockResolvedValue(undefined)
  subscribe = vi.fn()
  constructor(options: any) { this.options = options; mocks.clients.push(this) }
} }))
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mocks.clients.length = 0; mocks.get.mockResolvedValue({}) })
afterEach(() => { window.dispatchEvent(new Event('auth:expired')); vi.useRealTimers() })

it.each([401, 403])('stops reconnecting when HTTP rejects the session with %s', async status => {
  mocks.get.mockRejectedValueOnce({ isAxiosError: true, response: { status } })
  const connected = vi.fn(), onStatus = vi.fn()
  connectAuthenticatedRealtime('/socket', connected, onStatus)
  const client = mocks.clients[0]
  await client.options.beforeConnect()
  await vi.advanceTimersByTimeAsync(60000)
  client.options.onConnect()
  expect(client.deactivate).toHaveBeenCalledOnce()
  expect(client.activate).toHaveBeenCalledOnce()
  expect(connected).not.toHaveBeenCalled()
  expect(onStatus).toHaveBeenLastCalledWith('offline')
})

it('retries transient outages without a reconnect storm and cancels retry when disposed', async () => {
  mocks.get.mockRejectedValueOnce(new Error('offline'))
  const stop = connectAuthenticatedRealtime('/socket', vi.fn(), vi.fn())
  const client = mocks.clients[0]
  await client.options.beforeConnect()
  expect(client.deactivate).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(9999)
  expect(client.activate).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(1)
  expect(client.activate).toHaveBeenCalledTimes(2)
  await client.options.beforeConnect()
  client.options.onStompError()
  await Promise.resolve()
  stop()
  await vi.advanceTimersByTimeAsync(60000)
  expect(client.activate).toHaveBeenCalledTimes(2)
})

it('aborts a pending handshake request on logout and ignores delayed completion', async () => {
  let finish!: (value: unknown) => void
  mocks.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const connected = vi.fn(), status = vi.fn()
  connectAuthenticatedRealtime('/socket', connected, status)
  const client = mocks.clients[0], pending = client.options.beforeConnect()
  const signal = mocks.get.mock.calls[0]![1].signal as AbortSignal
  expect(signal.aborted).toBe(false)
  window.dispatchEvent(new Event('auth:expired'))
  expect(signal.aborted).toBe(true)
  finish({})
  await pending
  client.options.onConnect()
  expect(connected).not.toHaveBeenCalled()
  expect(client.deactivate).toHaveBeenCalledOnce()
  expect(status).toHaveBeenLastCalledWith('offline')
})

it('ignores frames from a previous connection and after the screen is disposed', () => {
  const receive = vi.fn()
  const stop = connectAuthenticatedRealtime('/socket', subscribe => subscribe('/topic/changes', receive), vi.fn())
  const client = mocks.clients[0]
  client.options.onConnect()
  const first = client.subscribe.mock.calls[0][1]
  first({ body: 'current' })
  client.options.onWebSocketClose()
  first({ body: 'delayed' })
  client.options.onConnect()
  first({ body: 'delayed after reconnect' })
  const second = client.subscribe.mock.calls[1][1]
  second({ body: 'new' })
  stop()
  second({ body: 'delayed after leaving' })
  expect(receive.mock.calls).toEqual([[{ body: 'current' }], [{ body: 'new' }]])
})

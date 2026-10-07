import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), refresh: vi.fn(), privateGet: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }))
vi.mock('@/api/authApi', () => ({ publicClient: { get: mocks.get, post: mocks.post }, gatewayUrl: { get: mocks.privateGet }, refreshAccessToken: mocks.refresh }))
vi.mock('@/services/websocketService', () => ({ wsService: { connect: mocks.connect, disconnect: mocks.disconnect } }))
import { initAuth, useAuthState } from '../authState'
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')); vi.spyOn(console, 'log').mockImplementation(() => {}) })
afterEach(() => { window.dispatchEvent(new Event('auth:expired')); vi.useRealTimers(); vi.restoreAllMocks() })
const unauthorized = () => new AxiosError('unauthorized', 'ERR_BAD_RESPONSE', undefined, undefined, { status: 401 } as any)
it('restores the session after access expiration and uses server session ID', async () => {
  mocks.get.mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce({ data: { isLoggedIn: true, name: 'User', email: 'u@example.com', role: 'USER', sessionId: 'server-sid' } })
  mocks.refresh.mockResolvedValueOnce(undefined)
  await initAuth()
  expect(mocks.refresh).toHaveBeenCalledOnce()
  expect(useAuthState().isAuthenticated.value).toBe(true)
  expect(sessionStorage.getItem('sessionId')).toBe('server-sid')
  expect(mocks.connect).toHaveBeenCalledWith('server-sid', expect.any(Function))
})
it('allows anonymous initialization and does not start realtime connections', async () => {
  mocks.get.mockRejectedValueOnce(unauthorized()); mocks.refresh.mockRejectedValueOnce(unauthorized())
  await initAuth()
  expect(useAuthState().isAuthReady.value).toBe(true)
  expect(useAuthState().isAuthenticated.value).toBe(false)
  expect(mocks.connect).not.toHaveBeenCalled(); expect(mocks.privateGet).not.toHaveBeenCalled()
})

it('clears stale identity and stops polling when initialization becomes anonymous', async () => {
  mocks.get.mockResolvedValueOnce({ data: { isLoggedIn: true, name: 'User', email: 'u@example.com', role: 'USER', sessionId: 'sid' } })
  await initAuth()
  localStorage.setItem('display-theme', 'soft')
  sessionStorage.setItem('purchase-retry', 'key')
  mocks.get.mockResolvedValueOnce({ data: { isLoggedIn: false } })
  await initAuth()
  expect(useAuthState().userName.value).toBe('')
  expect(sessionStorage.getItem('sessionId')).toBeNull()
  expect(localStorage.getItem('display-theme')).toBe('soft')
  expect(sessionStorage.getItem('purchase-retry')).toBe('key')
  await vi.advanceTimersByTimeAsync(16000)
  expect(mocks.privateGet).not.toHaveBeenCalled()
})

it('ignores initialization that finishes after the session expires', async () => {
  let resolve!: (response: any) => void
  mocks.get.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const initialization = initAuth()
  window.dispatchEvent(new Event('auth:expired'))
  resolve({ data: { isLoggedIn: true, sessionId: 'expired-session', email: 'old@example.com' } })
  await initialization
  expect(useAuthState().isAuthenticated.value).toBe(false)
  expect(sessionStorage.getItem('sessionId')).toBeNull()
  expect(mocks.connect).not.toHaveBeenCalled()
})

it('ignores a polling response after the session expires', async () => {
  mocks.get.mockResolvedValueOnce({ data: { isLoggedIn: true, sessionId: 'sid', email: 'u@example.com' } })
  await initAuth()
  let resolve!: (response: any) => void
  mocks.privateGet.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  await vi.advanceTimersByTimeAsync(8000)
  window.dispatchEvent(new Event('auth:expired'))
  resolve({ data: { isLoggedIn: true, sessionId: 'sid', email: 'u@example.com' } })
  await Promise.resolve()
  expect(useAuthState().isAuthenticated.value).toBe(false)
  expect(sessionStorage.getItem('sessionId')).toBeNull()
})

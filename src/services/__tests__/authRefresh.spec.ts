import { beforeEach, expect, it, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
const mocks = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('@/router', () => ({ default: { currentRoute: { value: { path: '/wallet' } }, replace: mocks.replace } }))
vi.mock('@/services/endpoints', () => ({ gatewayBaseUrl: 'http://localhost:8082' }))
import { gatewayUrl, publicClient } from '@/api/authApi'
const failure = (config: InternalAxiosRequestConfig, status: number) => new AxiosError('failed', 'ERR_BAD_RESPONSE', config, undefined, { config, status, statusText: 'failed', headers: {}, data: {} })
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  window.dispatchEvent(new CustomEvent('auth:established', { detail: { sessionId: crypto.randomUUID() } }))
})
it('shares one refresh for concurrent requests and retries them', async () => {
  gatewayUrl.defaults.adapter = async config => {
    if (!config._retry) throw failure(config, 401)
    return { config, status: 200, statusText: 'OK', headers: {}, data: 'ok' }
  }
  const refresh = vi.fn(async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: {} }))
  publicClient.defaults.adapter = refresh
  const result = await Promise.all([gatewayUrl.get('/a'), gatewayUrl.get('/b')])
  expect(result.map(r => r.data)).toEqual(['ok', 'ok']); expect(refresh).toHaveBeenCalledTimes(1)
})
it('expires once when a refreshed token is still rejected and does not refresh again', async () => {
  const request = vi.fn(async config => { throw failure(config, 401) })
  gatewayUrl.defaults.adapter = request
  const refresh = vi.fn(async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: {} }))
  publicClient.defaults.adapter = refresh
  await expect(gatewayUrl.get('/private')).rejects.toBeDefined()
  await expect(gatewayUrl.get('/private-again')).rejects.toBeDefined()
  expect(refresh).toHaveBeenCalledOnce()
  expect(request).toHaveBeenCalledTimes(3)
  expect(mocks.replace).toHaveBeenCalledOnce()
})
it('reuses the newer cookies for a late 401 without a second refresh', async () => {
  let rejectLate!: () => void
  gatewayUrl.defaults.adapter = async config => {
    if (config._retry) return { config, status: 200, statusText: 'OK', headers: {}, data: 'ok' }
    if (config.url === '/late') return new Promise((_, reject) => { rejectLate = () => reject(failure(config, 401)) })
    throw failure(config, 401)
  }
  const refresh = vi.fn(async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: {} }))
  publicClient.defaults.adapter = refresh
  const late = gatewayUrl.get('/late')
  await gatewayUrl.get('/first')
  rejectLate()
  expect((await late).data).toBe('ok')
  expect(refresh).toHaveBeenCalledOnce()
})
it('refreshes before sending an API request when the known token is about to expire', async () => {
  window.dispatchEvent(new CustomEvent('auth:established', { detail: { sessionId: 'sid', accessExpiresAt: Date.now() + 5000 } }))
  const refresh = vi.fn(async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { accessExpiresAt: Date.now() + 300000 } }))
  publicClient.defaults.adapter = refresh
  gatewayUrl.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: 'ok' })
  await gatewayUrl.get('/private')
  expect(refresh).toHaveBeenCalledOnce()
})
it('does not try refreshing a session explicitly revoked by the gateway', async () => {
  gatewayUrl.defaults.adapter = async config => {
    const error = failure(config, 401)
    error.response!.headers['x-auth-failure'] = 'session-invalid'
    throw error
  }
  const refresh = vi.fn()
  publicClient.defaults.adapter = refresh
  await expect(gatewayUrl.get('/private')).rejects.toBeDefined()
  expect(refresh).not.toHaveBeenCalled()
  expect(mocks.replace).toHaveBeenCalledOnce()
})
it('keeps the session on refresh 503 and clears it only on 401', async () => {
  gatewayUrl.defaults.adapter = async config => { throw failure(config, 401) }
  publicClient.defaults.adapter = async config => { throw failure(config, 503) }
  sessionStorage.setItem('sessionId', 'keep')
  await expect(gatewayUrl.get('/private')).rejects.toBeDefined()
  expect(sessionStorage.getItem('sessionId')).toBe('keep'); expect(mocks.replace).not.toHaveBeenCalled()
  publicClient.defaults.adapter = async config => { throw failure(config, 401) }
  await expect(gatewayUrl.get('/private')).rejects.toBeDefined()
  expect(sessionStorage.getItem('sessionId')).toBeNull(); expect(mocks.replace).toHaveBeenCalledWith('/login')
})

import { beforeEach, expect, it, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
const mocks = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('@/router', () => ({ default: { currentRoute: { value: { path: '/wallet' } }, replace: mocks.replace } }))
vi.mock('@/services/endpoints', () => ({ gatewayBaseUrl: 'http://localhost:8082' }))
import { gatewayUrl, publicClient } from '@/api/authApi'
const failure = (config: InternalAxiosRequestConfig, status: number) => new AxiosError('failed', 'ERR_BAD_RESPONSE', config, undefined, { config, status, statusText: 'failed', headers: {}, data: {} })
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}) })
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

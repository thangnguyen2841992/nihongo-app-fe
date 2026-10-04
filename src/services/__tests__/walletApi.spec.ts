import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: mocks }))
import { getWallet } from '../walletApi'

beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) })

it('shares overlapping balance requests and fetches fresh data after completion', async () => {
  let resolve!: (response: any) => void
  mocks.get.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const first = getWallet(), second = getWallet()
  expect(mocks.get).toHaveBeenCalledOnce()
  resolve({ data: { balance: 100 } })
  expect(await first).toEqual({ balance: 100 })
  expect(await second).toEqual({ balance: 100 })
  mocks.get.mockResolvedValueOnce({ data: { balance: 200 } })
  expect(await getWallet()).toEqual({ balance: 200 })
  expect(mocks.get).toHaveBeenCalledTimes(2)
})

it('does not reuse a failed balance request', async () => {
  mocks.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { balance: 200 } })
  await expect(getWallet()).rejects.toThrow('offline')
  expect(await getWallet()).toEqual({ balance: 200 })
})

it('starts a separate request for a new authentication session', async () => {
  let resolve!: (response: any) => void
  mocks.get.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  sessionStorage.setItem('sessionId', 'old-session')
  const old = getWallet()
  sessionStorage.setItem('sessionId', 'new-session')
  mocks.get.mockResolvedValueOnce({ data: { balance: 300 } })
  expect(await getWallet()).toEqual({ balance: 300 })
  resolve({ data: { balance: 100 } })
  await old
  expect(mocks.get).toHaveBeenCalledTimes(2)
})

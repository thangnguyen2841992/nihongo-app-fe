import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Wallet from '../Wallet.vue'
import * as api from '@/services/walletApi'
import type { WalletNotice } from '@/services/walletRealtime'
const realtime = vi.hoisted(() => ({ change: undefined as undefined | ((event?: WalletNotice) => void) }))
vi.mock('@/services/walletRealtime', () => ({ useWalletRealtime: (_admin: boolean, change: (event?: WalletNotice) => void) => { realtime.change = change; return 'live' } }))
vi.mock('@/services/walletApi', () => ({
  getWallet: vi.fn(), getDeposits: vi.fn(), getBankInfo: vi.fn(), depositWallet: vi.fn(),
  walletError: (_e: unknown, fallback: string) => fallback,
  formatMoney: (n: number) => `${n}đ`,
  depositStatus: (s: string) => s,
}))
const request = { id: 10, userId: 'uuid-owner', amount: 10000, description: '', requestKey: 'key', status: 'PENDING' as const, createdAt: '2026-09-22T12:00:00', bankReference: null, reviewNote: null, reviewedAt: null }
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  vi.mocked(api.getWallet).mockResolvedValue({ walletId: 1, userId: 'uuid-owner', balance: 0 })
  vi.mocked(api.getDeposits).mockResolvedValue([])
  vi.mocked(api.getBankInfo).mockResolvedValue({ bankName: 'Test bank', accountNumber: '123', accountName: 'Test' })
  vi.mocked(api.depositWallet).mockResolvedValue(request)
})
describe('manual wallet deposits', () => {
  it('loads without a sessionStorage userId and does not claim money was credited', async () => {
    const wrapper = mount(Wallet); await flushPromises()
    expect(api.getWallet).toHaveBeenCalledWith()
    await wrapper.get('#amount').setValue(10000)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(api.depositWallet).toHaveBeenCalledWith(expect.objectContaining({ amount: 10000, requestKey: expect.any(String) }))
    expect(wrapper.text()).toContain('chờ đối soát')
    expect(wrapper.text()).toContain('0đ')
    expect(wrapper.text()).not.toContain('Nạp tiền thành công')
  })
  it('rejects below minimum and fractional amounts before API calls', async () => {
    const wrapper = mount(Wallet); await flushPromises()
    for (const amount of [999, 1000.5, 100000001]) {
      await wrapper.get('#amount').setValue(amount)
      await wrapper.get('form').trigger('submit'); await flushPromises()
    }
    expect(api.depositWallet).not.toHaveBeenCalled()
  })
  it('reuses the same request after network failure and remount', async () => {
    vi.mocked(api.depositWallet).mockRejectedValueOnce(new Error('timeout'))
    let wrapper = mount(Wallet); await flushPromises()
    await wrapper.get('#amount').setValue(10000)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    const first = vi.mocked(api.depositWallet).mock.calls[0]?.[0]
    wrapper.unmount(); wrapper = mount(Wallet); await flushPromises()
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(vi.mocked(api.depositWallet).mock.calls[1]?.[0]).toEqual(first)
    expect(sessionStorage.getItem('wallet-deposit-retry:uuid-owner')).toBeNull()
  })
  it('allows correcting the form after a definitive validation rejection', async () => {
    vi.mocked(api.depositWallet).mockRejectedValueOnce({ isAxiosError: true, response: { status: 400 } })
    const wrapper = mount(Wallet); await flushPromises()
    await wrapper.get('#amount').setValue(10000)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(sessionStorage.getItem('wallet-deposit-retry:uuid-owner')).toBeNull()
    expect(wrapper.get('fieldset').attributes('disabled')).toBeUndefined()
  })
  it('does not send a second request while the first is pending', async () => {
    let resolve!: (value: typeof request) => void
    vi.mocked(api.depositWallet).mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const wrapper = mount(Wallet); await flushPromises()
    await wrapper.get('#amount').setValue(10000)
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(api.depositWallet).toHaveBeenCalledTimes(1)
    resolve(request); await flushPromises()
  })
})

describe('wallet realtime outcomes', () => {
  it.each(['APPROVED', 'REJECTED'] as const)('refreshes the authoritative state after %s', async type => {
    const wrapper = mount(Wallet); await flushPromises()
    vi.mocked(api.getWallet).mockResolvedValue({ walletId: 1, userId: 'uuid-owner', balance: type === 'APPROVED' ? 10000 : 0 })
    vi.mocked(api.getDeposits).mockResolvedValue([{ ...request, status: type === 'APPROVED' ? 'SUCCESS' : 'CANCELLED', reviewNote: 'Đã đối soát' }])
    realtime.change?.({ eventId: 'event-1', depositId: 10, type })
    await flushPromises()
    expect(wrapper.text()).toContain(type === 'APPROVED' ? 'Nạp tiền thành công' : 'Nạp tiền không thành công')
    expect(wrapper.text()).toContain(type === 'APPROVED' ? '10000đ' : 'CANCELLED')
    expect(wrapper.text()).toContain('Đã đối soát')
    wrapper.unmount()
  })
  it('does not lose a notice received while deposit submission is in flight', async () => {
    let resolve!: (value: typeof request) => void
    vi.mocked(api.depositWallet).mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const wrapper = mount(Wallet); await flushPromises()
    await wrapper.get('#amount').setValue(10000)
    await wrapper.get('form').trigger('submit')
    realtime.change?.({ eventId: 'event-2', depositId: 10, type: 'APPROVED' })
    vi.mocked(api.getDeposits).mockResolvedValue([{ ...request, status: 'SUCCESS' }])
    resolve(request); await flushPromises()
    expect(wrapper.text()).toContain('SUCCESS')
    expect(api.getWallet).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})

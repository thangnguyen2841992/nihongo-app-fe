import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WalletDeposits from '../WalletDeposits.vue'
import * as api from '@/services/walletApi'
const realtime = vi.hoisted(() => ({ change: undefined as undefined | (() => void) }))
vi.mock('@/services/walletRealtime', () => ({
  useWalletRealtime: (_admin: boolean, change: () => void) => { realtime.change = change; return 'live' },
}))
vi.mock('@/services/walletApi', () => ({
  getAdminDeposits: vi.fn(), reviewDeposit: vi.fn(),
  walletError: (_e: unknown, fallback: string) => fallback,
  formatMoney: (value: number) => String(value), depositStatus: (value: string) => value,
}))
const request = { id: 10, userId: 'owner', amount: 10000, description: '', requestKey: 'key',
  status: 'PENDING' as const, createdAt: '2026-09-22T12:00:00', bankReference: null, reviewNote: null, reviewedAt: null }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.getAdminDeposits).mockResolvedValue([request]) })
it('updates the admin list when another session reviews the selected request', async () => {
  const wrapper = mount(WalletDeposits); await flushPromises()
  await wrapper.get('tbody button').trigger('click')
  expect(wrapper.find('#bank-reference').exists()).toBe(true)
  vi.mocked(api.getAdminDeposits).mockResolvedValue([{ ...request, status: 'SUCCESS' }])
  realtime.change?.(); await flushPromises()
  expect(wrapper.text()).toContain('SUCCESS')
  expect(wrapper.find('#bank-reference').exists()).toBe(false)
  wrapper.unmount()
})

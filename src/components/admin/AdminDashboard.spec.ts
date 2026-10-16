import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import AdminDashboard from './AdminDashboard.vue'

const mocks = vi.hoisted(() => ({ summary: vi.fn(), pending: vi.fn(), get: vi.fn() }))
vi.mock('@/services/adminAccounts', () => ({ getAccountSummary: mocks.summary }))
vi.mock('@/services/walletApi', () => ({ getPendingDepositCount: mocks.pending }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: mocks.get } }))

beforeEach(() => {
  mocks.summary.mockResolvedValue({ activeUsers: 120, activeStaff: 8 })
  mocks.pending.mockResolvedValue(4)
  mocks.get.mockResolvedValue({ data: { totalElements: 3 } })
})

it('uses aggregate endpoints instead of downloading full collections', async () => {
  const wrapper = mount(AdminDashboard, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  await flushPromises()
  expect(wrapper.text()).toContain('120')
  expect(wrapper.text()).toContain('8')
  expect(wrapper.text()).toContain('4')
  expect(wrapper.text()).toContain('3')
  expect(mocks.get).toHaveBeenCalledWith('/api/staff/content/reviews', { params: { status: 'IN_REVIEW', page: 0 } })
})

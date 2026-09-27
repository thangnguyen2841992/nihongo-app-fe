import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import WalletNotifications from './WalletNotifications.vue'
import NotificationBell from './NotificationBell.vue'

const mocks = vi.hoisted(() => ({ auth: {} as any, change: undefined as any, stop: vi.fn(), admin: vi.fn(), history: vi.fn() }))
vi.mock('@/services/authState', () => ({ useAuthState: () => mocks.auth }))
vi.mock('@/services/walletRealtime', () => ({ connectWalletRealtime: (_: boolean, change: any) => { mocks.change = change; return mocks.stop } }))
vi.mock('@/services/walletApi', () => ({ getAdminDeposits: mocks.admin, getDeposits: mocks.history, formatMoney: (n: number) => `${n}đ` }))
const row = { id: 12, amount: 10000, status: 'PENDING', createdAt: '2026-09-27T08:00:00', reviewedAt: null, reviewNote: null }
const mountPanel = () => mount({ components: { WalletNotifications, NotificationBell }, template: '<NotificationBell /><WalletNotifications />' }, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear(); localStorage.clear()
  mocks.auth = { isAuthenticated: ref(true), userEmail: ref('test@example.com'), userRole: ref('ADMIN') }
  mocks.admin.mockResolvedValue([row]); mocks.history.mockResolvedValue([])
})
it('shows admin requests, marks them read and does not toast duplicate events', async () => {
  const wrapper = mountPanel(); await flushPromises()
  await wrapper.get('[aria-controls]').trigger('click')
  expect(wrapper.text()).toContain('Có yêu cầu nạp tiền mới')
  expect(wrapper.find('.bell-count').text()).toBe('1')
  await wrapper.get('.btn-link').trigger('click')
  expect(wrapper.find('.bell-count').exists()).toBe(false)
  mocks.change({ eventId: 'a' }); await flushPromises()
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
  wrapper.unmount()
})
it('deletes without navigation, persists across remount and supports undo', async () => {
  let wrapper = mountPanel(); await flushPromises()
  await wrapper.get('[aria-controls]').trigger('click')
  await wrapper.get('.delete-one').trigger('click')
  expect(wrapper.find('.notice-item').exists()).toBe(false)
  expect(wrapper.find('.bell-count').exists()).toBe(false)
  expect(wrapper.find('#wallet-notification-panel').exists()).toBe(true)
  mocks.change({ eventId: 'retry' }); await flushPromises()
  expect(wrapper.find('.notice-item').exists()).toBe(false)
  await wrapper.get('.undo-bar button').trigger('click')
  expect(wrapper.find('.notice-item').exists()).toBe(true)
  await wrapper.get('.delete-all').trigger('click')
  wrapper.unmount()
  wrapper = mountPanel(); await flushPromises()
  await wrapper.get('[aria-controls]').trigger('click')
  expect(wrapper.find('.notice-item').exists()).toBe(false)
  mocks.auth.userEmail.value = 'another@example.com'; await flushPromises()
  await wrapper.get('[aria-controls]').trigger('click')
  expect(wrapper.find('.notice-item').exists()).toBe(true)
  wrapper.unmount()
})
it('notifies a user of rejection after reconnect and clears data on logout', async () => {
  mocks.auth.userRole.value = 'USER'
  const wrapper = mountPanel(); await flushPromises()
  mocks.history.mockResolvedValue([{ ...row, status: 'CANCELLED', reviewNote: 'Chưa nhận được tiền' }])
  mocks.change(); await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('bị từ chối')
  await wrapper.get('[aria-controls]').trigger('click')
  expect(wrapper.text()).toContain('Chưa nhận được tiền')
  expect(mocks.admin).not.toHaveBeenCalled()
  mocks.auth.isAuthenticated.value = false; await flushPromises()
  expect(wrapper.find('aside').exists()).toBe(false)
  expect(mocks.stop).toHaveBeenCalled()
  wrapper.unmount()
})

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Navbar from '../Navbar.vue'
import { getUserProfile } from '@/services/userProfile'
import { logout } from '@/services/authState'

vi.mock('@/services/walletApi', () => ({ getWallet: vi.fn().mockResolvedValue({ balance: 0 }), formatMoney: (value: number) => `${value} đ` }))
vi.mock('@/services/userProfile', () => ({ getUserProfile: vi.fn() }))
vi.mock('@/services/authState', () => ({ logout: vi.fn().mockResolvedValue(undefined) }))

let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUserProfile).mockResolvedValue({
    fullName: 'Nguyễn Mai', email: 'mai@example.com', phoneNumber: '0901234567', address: 'Hà Nội',
  })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

async function showNavbar(role?: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/login', component: { template: '<div />' } },
    { path: '/wallet', component: { template: '<div />' } },
    { path: '/admin/dashboard', component: { template: '<div />' } },
    { path: '/staff', component: { template: '<div />' } },
  ] })
  await router.push('/')
  await router.isReady()
  wrapper = mount(Navbar, {
    props: { isLoggedIn: true, name: 'Mai', email: 'mai@example.com', role },
    global: { plugins: [router], stubs: { NotificationBell: true, BrandLogo: true } },
  })
  await flushPromises()
  return { router, wrapper }
}

it('shows Admin and Staff return buttons only to an Admin account', async () => {
  const { wrapper } = await showNavbar('ADMIN')
  expect(wrapper.get('[aria-label="Về giao diện Admin"]').attributes('href')).toBe('/admin/dashboard')
  expect(wrapper.get('[aria-label="Về giao diện Staff"]').attributes('href')).toBe('/staff')
  await wrapper.setProps({ role: 'USER' })
  expect(wrapper.find('[aria-label="Về giao diện Admin"]').exists()).toBe(false)
  expect(wrapper.find('[aria-label="Về giao diện Staff"]').exists()).toBe(false)
})

it('shows the signed-in user profile when their name is clicked and logs out from the panel', async () => {
  const { router, wrapper } = await showNavbar()
  expect(getUserProfile).not.toHaveBeenCalled()
  await wrapper.get('.account-trigger').trigger('click')
  await flushPromises()
  expect(getUserProfile).toHaveBeenCalledWith('mai@example.com', expect.any(AbortSignal))
  expect(wrapper.get('#user-account-panel').text()).toContain('Nguyễn Mai')
  expect(wrapper.get('#user-account-panel').text()).toContain('0901234567')
  expect(wrapper.get('#user-account-panel').text()).toContain('Hà Nội')
  await wrapper.get('.account-logout').trigger('click')
  await flushPromises()
  expect(logout).toHaveBeenCalledOnce()
  expect(router.currentRoute.value.path).toBe('/login')
})

it('keeps session name and email visible if profile loading fails, then retries and closes outside', async () => {
  vi.mocked(getUserProfile).mockRejectedValueOnce(new Error('offline'))
  const { wrapper } = await showNavbar()
  await wrapper.get('.account-trigger').trigger('click')
  await flushPromises()
  expect(wrapper.get('#user-account-panel').text()).toContain('Mai')
  expect(wrapper.get('#user-account-panel').text()).toContain('mai@example.com')
  expect(wrapper.get('[role="alert"]').text()).toContain('Không tải được thông tin bổ sung')
  expect(wrapper.get('.account-details').text()).toContain('Chưa tải được')
  expect(wrapper.get('.account-details').text()).not.toContain('Chưa cập nhật')
  await wrapper.get('.account-error button').trigger('click')
  await flushPromises()
  expect(wrapper.get('#user-account-panel').text()).toContain('0901234567')
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  await wrapper.vm.$nextTick()
  expect(wrapper.find('#user-account-panel').exists()).toBe(false)
})

it('only shows not-updated fields after a successful profile response with empty values', async () => {
  vi.mocked(getUserProfile).mockResolvedValue({ fullName: 'Mai', email: 'mai@example.com', phoneNumber: null, address: null })
  const { wrapper } = await showNavbar()
  await wrapper.get('.account-trigger').trigger('click'); await flushPromises()
  expect(wrapper.get('.account-details').text()).toContain('Chưa cập nhật')
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

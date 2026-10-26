import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AccountView from '../AccountView.vue'
import AccountLayout from '../AccountLayout.vue'
import AccountMenu from '@/components/common/AccountMenu.vue'
import { accountSections } from '@/services/accountSections'
import { readFeature } from '@/services/additionalFeatures'
vi.mock('@/api/authApi', () => ({ gatewayUrl: { put: vi.fn() }, refreshAccessToken: vi.fn(), resumeAuthRecovery: vi.fn() }))
vi.mock('@/services/authState', () => ({ setAuth: vi.fn() }))
vi.mock('@/services/additionalFeatures', () => ({ readFeature: vi.fn(), writeFeature: vi.fn(), featureError: () => 'Lỗi tải dữ liệu' }))
let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readFeature).mockImplementation(async (url) => {
    if (url.endsWith('/profile')) return { firstName: 'Nguyễn', lastName: 'Mai', email: 'mai@example.com' }
    if (url.endsWith('/security')) return { enabled: false, backupCodes: 0 }
    return { content: [], number: 0, totalPages: 0, totalElements: 0 }
  })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
async function open(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/account', component: AccountLayout, meta: { requiresAuth: true }, children: [
    { path: '', redirect: '/account/profile' },
    ...accountSections.map(item => ({ path: item.id, component: AccountView, props: { section: item.id } }))
  ] }] })
  await router.push(path); await router.isReady()
  return router
}
it.each(accountSections)('shows only the $label screen and inherits authentication protection', async (item) => {
  const router = await open(`/account/${item.id}`)
  wrapper = mount(AccountLayout, { global: { plugins: [router] } }); await flushPromises()
  expect(wrapper.get('h1').text()).toBe(item.label)
  expect(router.currentRoute.value.meta.requiresAuth).toBe(true)
  expect(wrapper.findAll('.profile-panel,.password-panel,.mfa-panel,.history-panel,.session-panel')).toHaveLength(1)
})
it('redirects the parent to profile and clears password inputs when navigating between child screens', async () => {
  const router = await open('/account')
  expect(router.currentRoute.value.path).toBe('/account/profile')
  wrapper = mount(AccountLayout, { global: { plugins: [router] } }); await flushPromises()
  await router.push('/account/password'); await flushPromises()
  await wrapper.get('input[autocomplete="current-password"]').setValue('temporary-password')
  await router.push('/account/profile'); await flushPromises()
  await router.push('/account/password'); await flushPromises()
  expect((wrapper.get('input[autocomplete="current-password"]').element as HTMLInputElement).value).toBe('')
})
it('opens the account tree on a child route and links to all five screens', async () => {
  const router = await open('/account/security')
  wrapper = mount(AccountMenu, { global: { plugins: [router] } })
  expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
  expect(wrapper.findAll('a')).toHaveLength(5)
  expect(wrapper.get('a.router-link-exact-active').attributes('href')).toBe('/account/security')
  await wrapper.get('button').trigger('click')
  expect(wrapper.findAll('a')).toHaveLength(0)
})
it('shows each recorded device and retains local IPs, with a fallback for old records', async () => {
  vi.mocked(readFeature).mockImplementation(async url => url.endsWith('/profile')
    ? { firstName: 'Nguyễn', lastName: 'Mai', email: 'mai@example.com' }
    : { content: [
      { id: 1, method: 'PASSWORD', address: '127.0.0.1', localAddresses: '192.168.1.8,10.0.0.4', agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', createdAt: '2026-10-12T11:00:00' },
      { id: 2, method: 'GOOGLE', address: '::1', agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1', createdAt: '2026-10-11T11:00:00' },
      { id: 3, method: 'MFA', address: null, agent: null, createdAt: '2026-10-10T11:00:00' },
    ], number: 0, totalPages: 1, totalElements: 3 })
  const router = await open('/account/history')
  wrapper = mount(AccountLayout, { global: { plugins: [router] } }); await flushPromises()
  const entries = wrapper.findAll('.login-entry')
  expect(entries[0]!.text()).toContain('Máy tính Windows')
  expect(entries[0]!.get('.login-agent').text()).toBe('Microsoft Edge · Mật khẩu')
  expect(entries[0]!.findAll('.login-address code').map(item => item.text())).toEqual(['127.0.0.1', '192.168.1.8, 10.0.0.4'])
  expect(entries[0]!.get('.local-badge').text()).toBe('Kết nối local')
  expect(entries[1]!.text()).toContain('iPhone')
  expect(entries[1]!.get('.login-agent').text()).toBe('Safari · Google')
  expect(entries[1]!.get('.login-address code').text()).toBe('::1')
  expect(entries[2]!.text()).toContain('Thiết bị chưa xác định')
  expect(entries[2]!.get('.login-address code').text()).toBe('Chưa ghi nhận')
  expect(entries[2]!.find('.local-badge').exists()).toBe(false)
  expect(entries[2]!.findAll('.login-address')).toHaveLength(1)
})

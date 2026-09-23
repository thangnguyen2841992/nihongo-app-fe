import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import CourseView from '../CourseView.vue'
import { publicClient, gatewayUrl } from '@/api/authApi'

const state = { isAuthenticated: ref(false), isAuthReady: ref(true), userName: ref('User'), userEmail: ref(''), userRole: ref('USER') }
vi.mock('@/services/authState', () => ({ useAuthState: () => state }))
vi.mock('@/api/authApi', () => ({ publicClient: { get: vi.fn() }, gatewayUrl: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/users/Navbar.vue', () => ({ default: { template: '<nav>Member navbar</nav>' } }))
vi.mock('@/users/Sidebar.vue', () => ({ default: { template: '<aside>Member sidebar</aside>' } }))
vi.mock('@/components/staff/StaffNavbar.vue', () => ({ default: { template: '<nav>Staff navbar</nav>' } }))
vi.mock('@/components/staff/StaffSidebar.vue', () => ({ default: { template: '<aside>Staff sidebar</aside>' } }))
let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => {
  vi.clearAllMocks(); state.isAuthenticated.value = false; state.isAuthReady.value = true
  vi.mocked(publicClient.get).mockResolvedValue({ data: [{ courseId: 1, courseName: 'Tiếng Nhật N5', courseDescription: 'Cho người mới bắt đầu', active: 'ACTIVE', packages: [{ packageId: 1, packageName: '3 tháng', durationDays: 90, price: 100000 }] }] })
  vi.mocked(gatewayUrl.get).mockResolvedValue({ data: [] })
})
afterEach(() => { wrapper?.unmount() })
async function open(path = '/') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component: MainLayout, children: [
      { path: '', component: { template: '<p>Member home</p>' } },
      { path: 'courses', component: CourseView },
    ] },
    { path: '/login', component: { template: '<p>Login</p>' } },
    { path: '/register', component: { template: '<p>Register</p>' } },
  ] })
  await router.push(path); await router.isReady()
  wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
it('redirects guests to the catalog with navigation and no private API calls', async () => {
  const router = await open()
  expect(router.currentRoute.value.path).toBe('/courses')
  expect(wrapper!.text()).toContain('Tiếng Nhật N5')
  expect(wrapper!.find('a[href="/login"]').exists()).toBe(true)
  expect(wrapper!.find('a[href="/register"]').exists()).toBe(true)
  expect(wrapper!.find('#guest-sidebar').exists()).toBe(true)
  expect(wrapper!.find('a[href="/user/my-courses"]').exists()).toBe(false)
  expect(wrapper!.get('main').classes()).toContain('with-sidebar')
  expect(gatewayUrl.get).not.toHaveBeenCalled()
  expect(publicClient.get).toHaveBeenCalledWith('/api/nihongo-user/courses', { withCredentials: false })
})
it('routes a guest to login instead of purchasing', async () => {
  const router = await open('/courses')
  await wrapper!.get('.footer button').trigger('click'); await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/courses')
  expect(gatewayUrl.post).not.toHaveBeenCalled()
})
it('preserves the member homepage after authentication', async () => {
  state.isAuthenticated.value = true
  const router = await open()
  expect(router.currentRoute.value.path).toBe('/')
  expect(wrapper!.text()).toContain('Member home')
  expect(wrapper!.text()).toContain('Member sidebar')
})
it('waits for session initialization before deciding the landing page', async () => {
  state.isAuthReady.value = false
  const router = await open()
  expect(router.currentRoute.value.path).toBe('/')
  expect(publicClient.get).not.toHaveBeenCalled()
  state.isAuthenticated.value = true; state.isAuthReady.value = true
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/')
  expect(wrapper!.text()).toContain('Member home')
})
it('loads subscription status only for signed-in users', async () => {
  state.isAuthenticated.value = true
  await open('/courses')
  expect(gatewayUrl.get).toHaveBeenCalledWith('/api/nihongo-user/my-courses-dto')
})
it('shows a recoverable catalog error without redirecting to login', async () => {
  vi.mocked(publicClient.get).mockRejectedValueOnce(new Error('offline'))
  const router = await open('/courses')
  expect(wrapper!.get('[role="alert"]').text()).toContain('Không thể tải')
  expect(router.currentRoute.value.path).toBe('/courses')
  await wrapper!.get('[role="alert"] button').trigger('click'); await flushPromises()
  expect(wrapper!.text()).toContain('Tiếng Nhật N5')
})
it('toggles the guest mobile menu accessibly', async () => {
  await open('/courses')
  const button = wrapper!.get('[aria-controls="guest-sidebar"]')
  expect(button.attributes('aria-expanded')).toBe('false')
  await button.trigger('click')
  expect(button.attributes('aria-expanded')).toBe('true')
  expect(wrapper!.get('#guest-sidebar').classes()).toContain('open')
  await wrapper!.get('.guest-overlay').trigger('click')
  expect(button.attributes('aria-expanded')).toBe('false')
  await button.trigger('click')
  await wrapper!.get('#guest-sidebar a[href="/courses"]').trigger('click')
  expect(button.attributes('aria-expanded')).toBe('false')
})

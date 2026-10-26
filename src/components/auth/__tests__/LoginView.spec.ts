import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn(), post: vi.fn() } }))
const auth = vi.hoisted(() => ({ ready: true, authenticated: false, role: '' }))
vi.mock('@/services/authState.ts', async () => {
  const { ref } = await import('vue')
  return {
    setAuth: vi.fn(), beginLogin: vi.fn(), initAuth: vi.fn(async () => undefined),
    useAuthState: () => ({ isAuthReady: ref(auth.ready), isAuthenticated: ref(auth.authenticated), userRole: ref(auth.role) }),
  }
})
import { gatewayUrl } from '@/api/authApi'
import { beginLogin, setAuth } from '@/services/authState'
import LoginView from '../LoginView.vue'

beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); Object.assign(auth, { ready: true, authenticated: false, role: '' }) })

it.each([
  ['USER', '', '/user/my-courses'],
  ['USER', '?redirect=/courses', '/user/my-courses'],
  ['ADMIN', '', '/admin'],
  ['STAFF', '', '/staff'],
])('sends %s from login%s to %s', async (role, query, destination) => {
  vi.mocked(gatewayUrl.get).mockResolvedValueOnce({ data: { isLoggedIn: true, role } })
  vi.mocked(gatewayUrl.post).mockResolvedValue({ data: { message: 'Login success' } })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/login', component: LoginView },
    ...['/user/my-courses', '/admin', '/staff', '/courses'].map(path => ({
      path, component: { template: '<p>Destination</p>' },
    })),
  ] })
  await router.push('/login' + query)
  await router.isReady()
  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
  await wrapper.get('input[type="email"]').setValue('user@example.com')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(gatewayUrl.get).not.toHaveBeenCalled()
  await wrapper.get('input[type="password"]').setValue('ValidPass1!')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(beginLogin).toHaveBeenCalledOnce()
  expect(vi.mocked(beginLogin).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(gatewayUrl.post).mock.invocationCallOrder[0]!)
  expect(setAuth).toHaveBeenCalledOnce()
  expect(router.currentRoute.value.path).toBe(destination)
  wrapper.unmount()
})

it('sends a tab that is still signed in to its home instead of signing in over the live session', async () => {
  Object.assign(auth, { authenticated: true, role: 'STAFF' })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/login', component: LoginView }, { path: '/staff', component: { template: '<p>Staff</p>' } },
  ] })
  await router.push('/login')
  await router.isReady()
  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/staff')
  expect(gatewayUrl.post).not.toHaveBeenCalled()
  wrapper.unmount()
})

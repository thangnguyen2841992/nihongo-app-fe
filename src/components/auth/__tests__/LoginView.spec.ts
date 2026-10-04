import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/services/authState.ts', () => ({ setAuth: vi.fn() }))
import { gatewayUrl } from '@/api/authApi'
import { setAuth } from '@/services/authState'
import LoginView from '../LoginView.vue'

beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks() })

it.each([
  ['USER', '', '/user/my-courses'],
  ['USER', '?redirect=/courses', '/user/my-courses'],
  ['ADMIN', '', '/admin'],
  ['STAFF', '', '/staff'],
])('sends %s from login%s to %s', async (role, query, destination) => {
  vi.mocked(gatewayUrl.get)
    .mockResolvedValueOnce({ data: { type: 'LOCAL' } })
    .mockResolvedValueOnce({ data: { isLoggedIn: true, role } })
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
  await wrapper.get('input[type="password"]').setValue('ValidPass1!')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(setAuth).toHaveBeenCalledOnce()
  expect(router.currentRoute.value.path).toBe(destination)
  wrapper.unmount()
})

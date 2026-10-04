import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/api/authApi', () => ({ publicClient: { post: vi.fn() } }))
vi.mock('@/services/authState', () => ({ setAuth: vi.fn() }))
import { publicClient } from '@/api/authApi'
import { setAuth } from '@/services/authState'
import GoogleSetupPassword from '../GoogleSetupPassword.vue'

beforeEach(() => { vi.clearAllMocks() })

it('restores authentication before entering the protected My Courses page after Google setup', async () => {
  vi.mocked(publicClient.post).mockResolvedValue({ data: {} })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/google/setup-password', component: GoogleSetupPassword },
    { path: '/user/my-courses', component: { template: '<p>My courses</p>' } },
  ] })
  router.beforeEach(to => {
    if (to.path === '/user/my-courses') expect(setAuth).toHaveBeenCalledOnce()
  })
  await router.push('/google/setup-password?token=grant&email=user@example.com')
  await router.isReady()
  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
  for (const input of wrapper.findAll('input[type="password"]')) await input.setValue('ValidPass1!')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(publicClient.post).toHaveBeenCalledOnce()
  expect(router.currentRoute.value.path).toBe('/user/my-courses')
  wrapper.unmount()
})

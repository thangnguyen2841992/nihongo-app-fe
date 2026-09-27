import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
vi.mock('@/api/authApi', () => ({ gatewayUrl: { post: vi.fn() } }))
import { gatewayUrl } from '@/api/authApi'
import ResetPassword from '../ResetPassword.vue'
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks() })
async function open() {
 const router = createRouter({ history: createMemoryHistory(), routes: [
  { path: '/reset-password', component: ResetPassword },
  { path: '/login', component: { template: '<p>Login</p>' } },
 ] })
 await router.push('/reset-password?email=other@example.com')
 await router.isReady()
 const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
 await flushPromises()
 return { router, wrapper }
}
it('does not allow an email-only URL to start password setup', async () => {
 const { router, wrapper } = await open()
 expect(router.currentRoute.value.path).toBe('/login')
 expect(gatewayUrl.post).not.toHaveBeenCalled()
 wrapper.unmount()
})
it('submits the activation grant rather than trusting an email in the URL', async () => {
 sessionStorage.setItem('passwordSetup', JSON.stringify({ userId: 'owner', token: 'grant', email: 'owner@example.com' }))
 vi.mocked(gatewayUrl.post).mockResolvedValue({ data: { status: 'SUCCESS' } })
 const { router, wrapper } = await open()
 const inputs = wrapper.findAll('input')
 await inputs[1]!.setValue('ValidPass1!')
 await inputs[2]!.setValue('ValidPass1!')
 await wrapper.get('form').trigger('submit')
 await flushPromises()
 expect(gatewayUrl.post).toHaveBeenCalledWith('/api/active-user/updatePassword', {
  userId: 'owner', token: 'grant', password: 'ValidPass1!', confirmPassword: 'ValidPass1!',
 })
 expect(sessionStorage.getItem('passwordSetup')).toBeNull()
 expect(router.currentRoute.value.path).toBe('/login')
 wrapper.unmount()
})

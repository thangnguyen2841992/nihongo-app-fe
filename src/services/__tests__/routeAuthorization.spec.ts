import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  isAuthReady: { value: true }, isAuthenticated: { value: false }, userRole: { value: '' }, init: vi.fn(),
}))
vi.mock('../authState', () => ({ initAuth: state.init, useAuthState: () => state }))
import { authorizeRoute } from '../routeAuthorization'

beforeEach(() => {
  vi.clearAllMocks()
  state.isAuthReady.value = true; state.isAuthenticated.value = false; state.userRole.value = ''
})
const staff = { fullPath: '/staff/monitoring/vps/performance', meta: { requiresAuth: true, roles: ['ADMIN', 'STAFF'] } }

it('allows public pages without waiting for authentication', async () => {
  expect(await authorizeRoute({ fullPath: '/courses', meta: {} })).toBe(true)
  expect(state.init).not.toHaveBeenCalled()
})
it('redirects anonymous visitors and preserves the requested page', async () => {
  expect(await authorizeRoute(staff)).toEqual({ path: '/login', query: { redirect: staff.fullPath } })
})
it('checks the role before entering staff pages', async () => {
  state.isAuthenticated.value = true; state.userRole.value = 'USER'
  expect(await authorizeRoute(staff)).toEqual({ path: '/' })
  state.userRole.value = 'STAFF'
  expect(await authorizeRoute(staff)).toBe(true)
})
it('restores the session before authorizing a direct private URL', async () => {
  state.isAuthReady.value = false
  state.init.mockImplementationOnce(async () => { state.isAuthenticated.value = true; state.userRole.value = 'ADMIN' })
  expect(await authorizeRoute(staff)).toBe(true)
  expect(state.init).toHaveBeenCalledOnce()
})

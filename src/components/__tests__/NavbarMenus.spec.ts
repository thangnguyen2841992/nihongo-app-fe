import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import StaffNavbar from '@/components/staff/StaffNavbar.vue'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  checkLogin: vi.fn(),
  role: 'ADMIN',
}))

vi.mock('@/services/authState.ts', () => ({
  logout: mocks.logout,
  useAuthState: () => ({ userName: ref('Tester'), userEmail: ref('staff@example.com'), userRole: ref(mocks.role) }),
}))
vi.mock('@/router', () => ({ default: { replace: mocks.replace, push: mocks.push } }))
vi.mock('@/api/authApi.ts', () => ({ gatewayUrl: { get: mocks.checkLogin } }))

const routerLink = { props: ['to'], template: '<a :href="to"><slot /></a>' }
const mounted: VueWrapper[] = []
const show = (component: typeof StaffNavbar | typeof AdminNavbar) => {
  const wrapper = mount(component, { global: { stubs: { RouterLink: routerLink } } })
  mounted.push(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.role = 'ADMIN'
  mocks.logout.mockResolvedValue(undefined)
  mocks.replace.mockResolvedValue(undefined)
  mocks.checkLogin.mockResolvedValue({ data: { isLoggedIn: true, name: 'Admin', email: 'admin@example.com' } })
})

it('hides the Admin return button from Staff accounts', () => {
  mocks.role = 'STAFF'
  const wrapper = show(StaffNavbar)
  expect(wrapper.get('[aria-label="Về giao diện Staff"]').attributes('href')).toBe('/staff')
  expect(wrapper.find('[aria-label="Về giao diện Admin"]').exists()).toBe(false)
})
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()) })

it('staff bell opens realtime events and account menu can log out without Bootstrap JS', async () => {
  const wrapper = show(StaffNavbar)
  expect(wrapper.get('[aria-label="Về giao diện Staff"]').attributes('href')).toBe('/staff')
  expect(wrapper.get('[aria-label="Về giao diện Admin"]').attributes('href')).toBe('/admin/dashboard')
  expect(wrapper.get('[aria-label="Xem sự kiện giám sát realtime"]').attributes('href'))
    .toBe('/staff/monitoring/vps/events/realtime')
  const toggle = wrapper.get('[aria-controls="staff-account-menu"]')
  expect(toggle.attributes('aria-expanded')).toBe('false')
  await toggle.trigger('click')
  expect(toggle.attributes('aria-expanded')).toBe('true')
  await wrapper.get('#staff-account-menu [role="menuitem"]').trigger('click')
  await flushPromises()
  expect(mocks.logout).toHaveBeenCalledOnce()
  expect(mocks.replace).toHaveBeenCalledWith('/login')
})

it('staff account menu closes on outside click', async () => {
  const wrapper = show(StaffNavbar)
  await wrapper.get('[aria-controls="staff-account-menu"]').trigger('click')
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  await wrapper.vm.$nextTick()
  expect(wrapper.find('#staff-account-menu').exists()).toBe(false)
})

it('admin account menu can log out without Bootstrap JS', async () => {
  const wrapper = show(AdminNavbar)
  await flushPromises()
  expect(wrapper.get('[aria-label="Về giao diện Staff"]').attributes('href')).toBe('/staff')
  await wrapper.get('[aria-controls="admin-account-menu"]').trigger('click')
  await wrapper.get('#admin-account-menu [role="menuitem"]').trigger('click')
  await flushPromises()
  expect(mocks.logout).toHaveBeenCalledOnce()
  expect(mocks.replace).toHaveBeenCalledWith('/login')
})

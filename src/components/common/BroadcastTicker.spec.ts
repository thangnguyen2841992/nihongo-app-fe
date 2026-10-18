import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import BroadcastTicker from './BroadcastTicker.vue'
import { broadcastFeed } from '@/services/notificationState'

const mocks = vi.hoisted(() => ({ auth: {} as any }))
vi.mock('@/services/authState', () => ({ useAuthState: () => mocks.auth }))

const notice = {
  id: 42,
  title: 'Bảo trì hệ thống',
  content: 'Hệ thống sẽ bảo trì lúc 22:00.',
  audience: 'ALL' as const,
  createdAt: '2026-10-17T10:00:00Z',
}

beforeEach(() => {
  localStorage.clear()
  broadcastFeed.value = { owner: '', notices: [] }
  mocks.auth = { isAuthenticated: ref(true), userEmail: ref('user@example.com'), userRole: ref('USER') }
})
afterEach(() => vi.useRealTimers())

it('runs the newest broadcast as one plain line over the screen', async () => {
  vi.useFakeTimers()
  broadcastFeed.value = { owner: 'user@example.com:USER', notices: [{ ...notice, createdAt: new Date().toISOString() }] }
  let wrapper = mount(BroadcastTicker)
  await flushPromises()

  expect(wrapper.get('.broadcast-ticker').text()).toContain('Bảo trì hệ thống')
  expect(wrapper.findAll('.ticker-line')).toHaveLength(1)
  expect(wrapper.find('button').exists()).toBe(false)
  vi.advanceTimersByTime(119_999)
  await flushPromises()
  expect(wrapper.find('.broadcast-ticker').exists()).toBe(true)
  vi.advanceTimersByTime(1)
  await flushPromises()
  expect(wrapper.find('.broadcast-ticker').exists()).toBe(false)

  wrapper.unmount()
  wrapper = mount(BroadcastTicker)
  await flushPromises()
  expect(wrapper.find('.broadcast-ticker').exists()).toBe(false)
  wrapper.unmount()
})

it('does not show the running line to admins', async () => {
  broadcastFeed.value = { owner: 'user@example.com:USER', notices: [notice] }
  const wrapper = mount(BroadcastTicker)
  await flushPromises()
  wrapper.unmount()

  mocks.auth.userRole.value = 'ADMIN'
  broadcastFeed.value = { owner: 'user@example.com:ADMIN', notices: [{ ...notice, id: 43 }] }
  const adminWrapper = mount(BroadcastTicker)
  await flushPromises()
  expect(adminWrapper.find('.broadcast-ticker').exists()).toBe(false)
  adminWrapper.unmount()
})

import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import BroadcastInbox from './BroadcastInbox.vue'
import { broadcastUnread } from '@/services/notificationState'
const mocks = vi.hoisted(() => ({ auth: {} as any, list: vi.fn() }))
vi.mock('@/services/authState', () => ({ useAuthState: () => mocks.auth }))
vi.mock('@/services/broadcastApi', () => ({ getBroadcasts: mocks.list }))
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks()
  mocks.auth = { isAuthenticated: ref(true), userEmail: ref('staff@example.com'), userRole: ref('STAFF') }
  mocks.list.mockResolvedValue({ content: [{ id: 1, title: 'Lịch bảo trì', content: '<b>Nội dung</b>', createdAt: '2026-10-16T01:00:00Z' }], totalPages: 1 })
})
it('shows staff messages as plain text and persists read state across remount', async () => {
  let wrapper = mount(BroadcastInbox); await flushPromises()
  expect(wrapper.text()).toContain('Lịch bảo trì'); expect(wrapper.find('b').exists()).toBe(false)
  expect(broadcastUnread.value).toBe(1)
  await wrapper.get('article button').trigger('click'); expect(broadcastUnread.value).toBe(0)
  wrapper.unmount(); wrapper = mount(BroadcastInbox); await flushPromises()
  expect(broadcastUnread.value).toBe(0); wrapper.unmount()
})
it('isolates read state by account and clears notices on logout', async () => {
  const wrapper = mount(BroadcastInbox); await flushPromises()
  await wrapper.get('article button').trigger('click')
  mocks.auth.userEmail.value = 'other@example.com'; await flushPromises()
  expect(broadcastUnread.value).toBe(1)
  mocks.auth.isAuthenticated.value = false; await flushPromises()
  expect(wrapper.find('article').exists()).toBe(false); expect(broadcastUnread.value).toBe(0)
  wrapper.unmount()
})
it('loads only the next page and refreshes only the newest page', async () => {
  mocks.list.mockImplementation(async (page = 0) => ({
    content: [{ id: page + 1, title: `Trang ${page}`, content: 'Nội dung', createdAt: '2026-10-16T01:00:00Z' }],
    totalPages: 2,
  }))
  const wrapper = mount(BroadcastInbox); await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Xem thêm')!.trigger('click'); await flushPromises()
  window.dispatchEvent(new Event('focus')); await flushPromises()
  expect(mocks.list.mock.calls.map(call => call[0])).toEqual([0, 1, 0])
  expect(wrapper.findAll('article')).toHaveLength(2)
  wrapper.unmount()
})

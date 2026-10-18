import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { BroadcastNotice } from '@/services/broadcastApi'
import type { RealtimeStatus } from '@/services/authenticatedRealtime'
import BroadcastInbox from './BroadcastInbox.vue'
import { BROADCAST_READ_EVENT, broadcastUnread, broadcastFeed } from '@/services/notificationState'
const mocks = vi.hoisted(() => ({ auth: {} as any, list: vi.fn(), realtime: vi.fn<(role: string, receive: (notice?: BroadcastNotice) => void, status: (value: RealtimeStatus) => void) => () => void>(() => vi.fn()) }))
vi.mock('@/services/authState', () => ({ useAuthState: () => mocks.auth }))
vi.mock('@/services/broadcastApi', () => ({ getBroadcasts: mocks.list }))
vi.mock('@/services/broadcastRealtime', () => ({ connectBroadcastRealtime: mocks.realtime }))
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks()
  mocks.auth = { isAuthenticated: ref(true), userEmail: ref('staff@example.com'), userRole: ref('STAFF') }
  mocks.list.mockResolvedValue({ content: [{ id: 1, title: 'Lịch bảo trì', content: '<b>Nội dung</b>', createdAt: '2026-10-16T01:00:00Z' }], totalPages: 1 })
})
afterEach(() => vi.useRealTimers())
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
it('accepts a read action from the prominent popup', async () => {
  const wrapper = mount(BroadcastInbox); await flushPromises()
  window.dispatchEvent(new CustomEvent(BROADCAST_READ_EVENT, { detail: { id: 1, owner: 'staff@example.com:STAFF' } }))
  await flushPromises()
  expect(broadcastUnread.value).toBe(0)
  expect(localStorage.getItem('broadcast-read:staff@example.com:STAFF')).toBe('[1]')
  wrapper.unmount()
})
it('shows a WebSocket broadcast immediately without another HTTP request', async () => {
  const wrapper = mount(BroadcastInbox); await flushPromises()
  const receive = mocks.realtime.mock.calls[0]![1]
  receive({ id: 2, title: 'Thông báo mới', content: 'Hiện ngay', audience: 'STAFF', createdAt: '2026-10-16T02:00:00Z' })
  await flushPromises()
  expect(wrapper.findAll('article')[0]!.text()).toContain('Thông báo mới')
  expect(mocks.list).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})

it('polls only while realtime is offline and resumes after a disconnect', async () => {
  vi.useFakeTimers()
  const wrapper = mount(BroadcastInbox)
  try {
    await flushPromises()
    const status = mocks.realtime.mock.calls[0]![2]
    status('live')
    await vi.advanceTimersByTimeAsync(90_000)
    expect(mocks.list).toHaveBeenCalledTimes(1)
    status('offline')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(mocks.list).toHaveBeenCalledTimes(2)
  } finally { wrapper.unmount() }
})

it('aborts old requests and ignores old socket events after changing accounts', async () => {
  const wrapper = mount(BroadcastInbox)
  try {
    await flushPromises()
    const oldSignal = mocks.list.mock.calls[0]![1] as AbortSignal
    const oldReceive = mocks.realtime.mock.calls[0]![1]
    mocks.auth.userEmail.value = 'new@example.com'
    await flushPromises()
    expect(oldSignal.aborted).toBe(true)
    oldReceive({ id: 99, title: 'Old account', content: 'Private', audience: 'STAFF', createdAt: new Date().toISOString() })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Old account')
    expect(broadcastFeed.value.owner).toBe('new@example.com:STAFF')
  } finally { wrapper.unmount() }
})

it('keeps a load-more action queued while a refresh is in progress', async () => {
  const result = { content: [{ id: 1, title: 'First', content: 'Message', createdAt: new Date().toISOString() }], totalPages: 2 }
  mocks.list.mockResolvedValue(result)
  const wrapper = mount(BroadcastInbox)
  try {
    await flushPromises()
    let finish!: (value: typeof result) => void
    mocks.list.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    window.dispatchEvent(new Event('focus'))
    await wrapper.findAll('button').find(button => button.text() === 'Xem thêm')!.trigger('click')
    finish(result)
    await flushPromises()
    expect(mocks.list.mock.calls.map(call => call[0])).toEqual([0, 0, 1])
  } finally { wrapper.unmount() }
})

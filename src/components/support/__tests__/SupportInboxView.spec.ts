import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SupportInboxView from '../SupportInboxView.vue'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  thread: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  connect: vi.fn(),
  refreshSummary: vi.fn(),
}))

vi.mock('@/services/supportChat', () => ({
  getSupportConversations: api.list,
  getStaffSupportThread: api.thread,
  sendStaffSupportMessage: api.send,
  closeSupportConversation: api.close,
}))
vi.mock('@/services/supportRealtime', () => ({ connectSupportRealtime: api.connect }))
vi.mock('@/services/staffSupportNotifications', () => ({ refreshStaffSupportSummary: api.refreshSummary }))

const waiting = {
  id: 11,
  userId: 'learner-1',
  userName: 'Học viên chờ hỗ trợ',
  userEmail: 'learner@example.com',
  status: 'WAITING_STAFF',
  lastMessagePreview: 'Mình cần hỗ trợ',
  unreadForUser: 0,
  unreadForStaff: 1,
  createdAt: '2026-10-14T08:00:00',
  lastMessageAt: '2026-10-14T08:00:00',
  version: 1,
}
const page = (content: (typeof waiting)[]) => ({ content, totalElements: content.length, number: 0, totalPages: 1 })

let wrapper: VueWrapper | undefined
let resolveBackground: ((value: ReturnType<typeof page>) => void) | undefined

beforeEach(() => {
  vi.clearAllMocks()
  let waitingRequests = 0
  api.list.mockImplementation((status: string) => {
    if (status === 'WAITING_STAFF' && ++waitingRequests > 1) {
      return new Promise(resolve => { resolveBackground = resolve })
    }
    return Promise.resolve(page(status === 'ALL' || status === 'WAITING_STAFF' ? [waiting] : []))
  })
  api.connect.mockReturnValue(vi.fn())
})

afterEach(() => {
  resolveBackground?.(page([waiting]))
  resolveBackground = undefined
  wrapper?.unmount()
  wrapper = undefined
})

it('prefetches status tabs and renders cached conversations before the refresh finishes', async () => {
  wrapper = mount(SupportInboxView)
  await flushPromises()

  const waitingTab = wrapper.findAll('.filter-tabs button').find(button => button.text() === 'Chờ hỗ trợ')!
  await waitingTab.trigger('click')
  await wrapper.vm.$nextTick()

  expect(wrapper.text()).toContain('Học viên chờ hỗ trợ')
  expect(wrapper.find('.panel-state .spinner-border').exists()).toBe(false)
})

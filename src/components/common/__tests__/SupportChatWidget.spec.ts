import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import SupportChatWidget from '../SupportChatWidget.vue'

const api = vi.hoisted(() => ({
  get: vi.fn(), send: vi.fn(), read: vi.fn(), connect: vi.fn(),
}))
const authenticated = ref(true)
const role = ref('USER')

vi.mock('@/services/authState', () => ({ useAuthState: () => ({ isAuthenticated: authenticated, userRole: role }) }))
vi.mock('@/services/supportChat', () => ({
  getSupportThread: api.get,
  sendSupportMessage: api.send,
  markSupportRead: api.read,
}))
vi.mock('@/services/supportRealtime', () => ({
  connectSupportRealtime: api.connect,
}))

let wrapper: VueWrapper | undefined
beforeEach(() => {
  authenticated.value = true
  role.value = 'USER'
  api.get.mockReset().mockResolvedValue({ conversation: null, messages: [] })
  api.send.mockReset().mockResolvedValue({
    conversation: { id: 1, unreadForUser: 0, status: 'WAITING_STAFF' },
    messages: [
      { id: 1, senderType: 'USER', senderName: 'Thắng', content: 'Mình cần hỗ trợ', createdAt: '2026-10-14T08:00:00' },
      { id: 2, senderType: 'AUTO', senderName: 'Nihongo hỗ trợ', content: 'Chào bạn! Cảm ơn bạn đã liên hệ Nihongo.', createdAt: '2026-10-14T08:00:00' },
    ],
  })
  api.read.mockReset().mockResolvedValue(undefined)
  api.connect.mockReset().mockImplementation((_staff, onChange, onStatus) => { onStatus('live'); onChange(); return vi.fn() })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

it('opens for a learner and displays the automatic greeting returned after the first message', async () => {
  wrapper = mount(SupportChatWidget)
  await flushPromises()
  await wrapper.get('.chat-launcher').trigger('click')
  await flushPromises()
  await wrapper.get('textarea').setValue('Mình cần hỗ trợ')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(api.send).toHaveBeenCalledWith('Mình cần hỗ trợ', false)
  expect(wrapper.text()).toContain('Chào bạn! Cảm ơn bạn đã liên hệ Nihongo.')
  expect(wrapper.text()).toContain('Đang trực tuyến')
})

it('locks a closed thread and sends the next message as a new conversation', async () => {
  api.get.mockResolvedValue({
    conversation: { id: 4, unreadForUser: 1, status: 'RESOLVED' },
    messages: [{ id: 8, senderType: 'AUTO', senderName: 'Nihongo hỗ trợ', content: 'Phiên hỗ trợ đã kết thúc.', createdAt: '2026-10-14T09:00:00' }],
  })
  api.send.mockResolvedValue({
    conversation: { id: 5, unreadForUser: 0, status: 'WAITING_STAFF' },
    messages: [{ id: 9, senderType: 'USER', senderName: 'Thắng', content: 'Mình cần hỗ trợ thêm', createdAt: '2026-10-14T09:05:00' }],
  })
  wrapper = mount(SupportChatWidget)
  await flushPromises()
  await wrapper.get('.chat-launcher').trigger('click')
  await flushPromises()

  expect(wrapper.text()).toContain('Phiên hỗ trợ đã kết thúc')
  expect(wrapper.find('textarea').exists()).toBe(false)

  await wrapper.get('.ended-state button').trigger('click')
  await wrapper.get('textarea').setValue('Mình cần hỗ trợ thêm')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(api.send).toHaveBeenCalledWith('Mình cần hỗ trợ thêm', true)
})

it('is hidden from staff accounts', async () => {
  role.value = 'STAFF'
  wrapper = mount(SupportChatWidget)
  await flushPromises()
  expect(wrapper.find('.chat-launcher').exists()).toBe(false)
})

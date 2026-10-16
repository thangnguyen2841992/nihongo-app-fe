import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import StaffBroadcasts from './StaffBroadcasts.vue'

const mocks = vi.hoisted(() => ({ list: vi.fn(), send: vi.fn() }))
vi.mock('@/services/broadcastApi', () => ({
  getStaffBroadcasts: mocks.list,
  sendStaffBroadcast: mocks.send,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue({ content: [], totalPages: 0 })
  mocks.send.mockResolvedValue({ id: 1, title: 'Lịch học', content: 'Đổi giờ', audience: 'USER', createdAt: new Date().toISOString() })
})

it('sends a trimmed notification to all users', async () => {
  const wrapper = mount(StaffBroadcasts)
  await flushPromises()
  await wrapper.get('input:not([disabled])').setValue(' Lịch học ')
  await wrapper.get('textarea').setValue(' Đổi giờ học ')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(mocks.send).toHaveBeenCalledWith({ title: 'Lịch học', content: 'Đổi giờ học' })
  expect(wrapper.get('[role="status"]').text()).toContain('toàn bộ user')
})

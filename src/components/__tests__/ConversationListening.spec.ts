import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import ConversationListening from '@/users/ConversationListeningView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), route: { params: {} as { courseId?: string } } }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: mocks.get } }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }))
beforeEach(() => {
  mocks.get.mockReset()
  mocks.route = reactive({ params: { courseId: '42' } })
})
const open = () => mount(ConversationListening, { global: { stubs: { RouterLink: true } } })

it('only embeds recordings returned by the course endpoint', async () => {
  mocks.get.mockResolvedValue({ data: [{ id: 'n3-1', title: 'N3', videoId: '4u1pFXayzLE' }] })
  const wrapper = open()
  await flushPromises()
  expect(mocks.get).toHaveBeenCalledWith('/api/nihongo-user/courses/42/conversation-listening')
  expect(wrapper.get('iframe').attributes('src')).toContain('4u1pFXayzLE')
})
it('does not embed any video when access is denied', async () => {
  mocks.get.mockRejectedValue({ response: { status: 403 } })
  const wrapper = open()
  await flushPromises()
  expect(wrapper.find('iframe').exists()).toBe(false)
  expect(wrapper.get('[role="alert"]').text()).toContain('VIP còn hạn')
})
it('shows an empty state for courses without recordings', async () => {
  mocks.get.mockResolvedValue({ data: [] })
  const wrapper = open()
  await flushPromises()
  expect(wrapper.find('iframe').exists()).toBe(false)
  expect(wrapper.text()).toContain('chưa có bản ghi')
})
it('discards a previous course response after switching courses', async () => {
  let finish!: (value: unknown) => void
  mocks.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve })).mockResolvedValueOnce({ data: [] })
  const wrapper = open()
  mocks.route.params.courseId = '99'
  await flushPromises()
  finish({ data: [{ id: 'n3-1', title: 'N3', videoId: '4u1pFXayzLE' }] })
  await flushPromises()
  expect(wrapper.find('iframe').exists()).toBe(false)
})

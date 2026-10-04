import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn(), post: vi.fn() } }))
import { gatewayUrl } from '@/api/authApi'
import TryN3ImportView from '../TryN3ImportView.vue'
const chapter = { bookName: 'TRY N3', notes: ['Bản mẫu'], sourcePdfPages: [15, 16], lessons: [
  { name: 'Phần 1', description: 'Mục tiêu', reading: '<p>日本語</p>', sourcePrintedPages: [16, 21], grammars: [], exercises: [] },
  { name: 'Phần 2', description: 'Mục tiêu', reading: '<p>富士山</p>', sourcePrintedPages: [22, 27], grammars: [], exercises: [
    { sourceQuestionNumber: 1, contentNihongo: '問い', answerA: '一', answerB: '二', answerC: '三', answerD: '四', correctAnswer: 'C' },
  ] },
] }
beforeEach(() => { vi.clearAllMocks() })
async function open(importedBookId: number | null = null) {
  vi.mocked(gatewayUrl.get).mockResolvedValue({ data: { chapter, importedBookId } })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/staff/imports/try-n3', component: TryN3ImportView },
    { path: '/staff', component: { template: '<p>Books</p>' } },
    { path: '/staff/books/:id', component: { template: '<p>Book</p>' } },
  ] })
  await router.push('/staff/imports/try-n3')
  await router.isReady()
  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}
it('previews without writing and imports once with a link to the created book', async () => {
  const wrapper = await open()
  expect(gatewayUrl.post).not.toHaveBeenCalled()
  vi.mocked(gatewayUrl.post).mockResolvedValue({ data: { bookId: 42, alreadyImported: false } })
  await wrapper.get('header button').trigger('click')
  await flushPromises()
  expect(gatewayUrl.post).toHaveBeenCalledOnce()
  expect(wrapper.get('header a').attributes('href')).toBe('/staff/books/42')
  expect(wrapper.text()).toContain('Đã nhập chương 1')
  wrapper.unmount()
})
it('offers the existing book instead of creating another copy', async () => {
  const wrapper = await open(42)
  expect(wrapper.get('header a').attributes('href')).toBe('/staff/books/42')
  expect(wrapper.find('header button').exists()).toBe(false)
  expect(gatewayUrl.post).not.toHaveBeenCalled()
  wrapper.unmount()
})
it('requires answers before grading and permits retrying the quiz', async () => {
  const wrapper = await open()
  await wrapper.get('form').trigger('submit')
  expect(wrapper.text()).toContain('chọn đáp án cho tất cả')
  await wrapper.get('input[value="C"]').setValue(true)
  await wrapper.get('form').trigger('submit')
  expect(wrapper.text()).toContain('đúng 1/1 câu')
  expect(wrapper.get('fieldset').attributes()).toHaveProperty('disabled')
  await wrapper.get('form button').trigger('click')
  expect(wrapper.find('.score').exists()).toBe(false)
  wrapper.unmount()
})
it('keeps a failed import retryable and does not show a success message', async () => {
  const wrapper = await open()
  vi.mocked(gatewayUrl.post).mockRejectedValue({ response: { data: { message: 'Dịch vụ tạm ngưng' } } })
  await wrapper.get('header button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Dịch vụ tạm ngưng')
  expect(wrapper.find('.alert-success').exists()).toBe(false)
  expect(wrapper.get('header button').attributes('disabled')).toBeUndefined()
  wrapper.unmount()
})

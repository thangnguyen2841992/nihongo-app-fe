import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
vi.mock('@/api/authApi.ts', () => ({ gatewayUrl: { get: vi.fn(), post: vi.fn() } }))
import { gatewayUrl } from '@/api/authApi.ts'
import ExerciseView from '../CourseLessonExerciseView.vue'
import n4Layout from '@/data/try-n4-review-layout.json'
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'alert').mockImplementation(() => {})
  vi.mocked(gatewayUrl.get).mockImplementation(async (url) => ({ data:
    url === '/api/staff/exerciseTypes' ? [{ exerciseTypeId: 1, name: 'Test' }] :
    url?.includes('getAllExcercises') ? [{ exerciseKeywordId: 10, contentNihongo: 'Question', answerA: 'One', answerB: 'Two', answerC: 'Three', answerD: 'Four', correctAnswer: null, lessonId: 1, exerciseTypeId: 1, exerciseTypeName: 'Test' }] :
    { lessonId: 1, name: 'Lesson', description: '', reading: '', bookId: 1 } }))
})
it('sends answers rather than a client score and allows retry after a failed submission', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/lesson/:lessonId', component: ExerciseView }] })
  await router.push('/lesson/1'); await router.isReady()
  const wrapper = mount(ExerciseView, { global: { plugins: [router] } })
  await flushPromises()
  vi.mocked(gatewayUrl.post).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { totalQuestion: 1, correctCount: 0, wrongCount: 1, correctAnswers: { 10: 'B' } } })
  await wrapper.get('.start-btn').trigger('click')
  await wrapper.get('.submit-btn').trigger('click'); await flushPromises()
  expect(wrapper.get('.submit-btn').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('.submit-btn').text()).toBe('Nộp lại')
  await wrapper.get('.submit-btn').trigger('click'); await flushPromises()
  expect(gatewayUrl.post).toHaveBeenLastCalledWith('/api/nihongo-user/userExerciseAttempt', { lessonId: 1, answers: {} })
  expect(wrapper.get('.submit-btn').text()).toBe('Đã nộp')
  wrapper.unmount()
})
it('allows practice but prevents submitting N4 questions whose source answers are unverified', async () => {
  const typeName = n4Layout.sections[0]!.typeName
  vi.mocked(gatewayUrl.get).mockImplementation(async url => ({ data:
    url === '/api/staff/exerciseTypes' ? [{ exerciseTypeId: 1, name: typeName }] :
    url?.includes('getAllExcercises') ? [{ exerciseKeywordId: 10, contentNihongo: 'CD 06', answerA: '1', answerB: '2', answerC: '3', answerD: '', correctAnswer: null, lessonId: 1, exerciseTypeId: 1, exerciseTypeName: typeName }] :
    { lessonId: 1, name: 'N4 lesson', description: '', reading: '', bookId: 7 } }))
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/lesson/:lessonId', component: ExerciseView }] })
  await router.push('/lesson/1'); await router.isReady()
  const wrapper = mount(ExerciseView, { global: { plugins: [router] } })
  await flushPromises()
  expect(wrapper.get('.start-btn').attributes('disabled')).toBeDefined()
  expect(wrapper.get('.submit-btn').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('câu chờ kiểm tra')
  await wrapper.get('.answer-item').trigger('click')
  expect(wrapper.get('.answer-item').classes()).toContain('selected')
  expect(gatewayUrl.post).not.toHaveBeenCalled()
  wrapper.unmount()
})

it('distinguishes a loading failure from a lesson with no exercises', async () => {
  let fail = true
  vi.mocked(gatewayUrl.get).mockImplementation(async url => {
    if (url?.includes('getAllExcercises')) {
      if (fail) throw new Error('offline')
      return { data: [] } as never
    }
    return { data: url === '/api/staff/exerciseTypes' ? [] : { lessonId: 1, name: 'Lesson', bookId: 1 } } as never
  })
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/lesson/:lessonId', component: ExerciseView }] })
  await router.push('/lesson/1'); await router.isReady()
  const wrapper = mount(ExerciseView, { global: { plugins: [router] } })
  try {
    await flushPromises()
    expect(wrapper.text()).toContain('Không tải được danh sách bài tập')
    expect(wrapper.text()).not.toContain('Không có bài tập')
    fail = false
    await wrapper.get('.empty-retry-btn').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('Không có bài tập')
    expect(wrapper.find('.start-btn').exists()).toBe(false)
  } finally {
    wrapper.unmount()
    errorLog.mockRestore()
  }
})

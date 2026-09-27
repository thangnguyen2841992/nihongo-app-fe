import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
vi.mock('@/api/authApi.ts', () => ({ gatewayUrl: { get: vi.fn(), post: vi.fn() } }))
import { gatewayUrl } from '@/api/authApi.ts'
import ExerciseView from '../CourseLessonExerciseView.vue'
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

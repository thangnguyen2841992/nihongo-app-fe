import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import StudyDashboardView from '../StudyDashboard.vue'
import ReviewView from '../ReviewView.vue'
import NotebookView from '../NotebookView.vue'
import * as study from '@/api/study'
import { gatewayUrl } from '@/api/authApi'

vi.mock('@/api/study', () => ({ saveStudyGoal: vi.fn(), getDueBatch: vi.fn(), getWrongPage: vi.fn(), getWeakPage: vi.fn(), rateCard: vi.fn(), practiceWrong: vi.fn(), masterWrong: vi.fn(), getCardPage: vi.fn(), saveCard: vi.fn(), deleteCard: vi.fn() }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn() } }))
let wrapper: ReturnType<typeof mount> | undefined
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
const global = { plugins: [router], stubs: { RouterLink: { template: '<a><slot /></a>' } } }
const card: study.StudyCard = { id: 1, sourceKey: 'vocab:1', kind: 'VOCAB', courseId: null, bookId: null, lessonId: null, grammarId: null, exampleId: null, front: '日本', back: 'Nhật Bản', note: null, repetitions: 0, dueAt: '2026-10-10T08:00:00', createdAt: '2026-10-10T07:00:00' }
const wrong: study.WrongAnswer = { id: 5, lessonId: 1, exerciseId: 10, chosenAnswer: 'A', correctAnswer: 'C', updatedAt: '2026-10-10T08:00:00' }
const empty = { content: [], number: 0, totalElements: 0, totalPages: 0 }
const dashboard: study.StudyDashboard = {
  dueCards: 1, weakLessons: 0, attempts: 3, lessons: 2, averageScore: 85,
  cardsToday: 3, attemptsToday: 1, practiceToday: 1, goalCompleted: false, streak: 4, longestStreak: 8,
  today: '2026-10-10', timeZone: 'Asia/Bangkok', goal: { dailyCards: 10, dailyAttempts: 1, remindersEnabled: true },
  trend: [{ day: '2026-10-10', attempts: 1, averageScore: 85 }],
  reminders: [{ key: 'due-cards', message: 'Bạn có 1 thẻ đến hạn ôn tập', courseId: null, expiresAt: null }],
}
beforeEach(async () => {
  await router.push('/')
  vi.resetAllMocks()
  vi.mocked(study.getDueBatch).mockResolvedValue([])
  vi.mocked(study.getWeakPage).mockResolvedValue(empty)
  vi.mocked(study.getWrongPage).mockResolvedValue(empty)
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

it('shows progress and persists daily goals and reminder preference', async () => {
  vi.mocked(study.saveStudyGoal).mockResolvedValue({ dailyCards: 5, dailyAttempts: 1, remindersEnabled: false })
  wrapper = mount(StudyDashboardView, { props: { dashboard, courses: [] }, global })
  expect(wrapper.text()).toContain('4 ngày')
  expect(wrapper.text()).toContain('Bạn có 1 thẻ đến hạn')
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('65')
  await wrapper.findAll('input[type="number"]')[0]!.setValue(5)
  await wrapper.get('input[type="checkbox"]').setValue(false)
  await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(study.saveStudyGoal).toHaveBeenCalledWith({ dailyCards: 5, dailyAttempts: 1, remindersEnabled: false })
  expect(wrapper.emitted('saved')).toHaveLength(1)
})

it('keeps the card when saving a rating fails and advances only after success', async () => {
  vi.mocked(study.getDueBatch).mockResolvedValueOnce([card]).mockResolvedValue([])
  vi.mocked(study.rateCard).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...card, dueAt: '2026-10-12T08:00:00' })
  wrapper = mount(ReviewView, { global }); await flushPromises()
  await wrapper.findAll('button').find(b => b.text() === 'Hiện đáp án')!.trigger('click')
  await wrapper.findAll('button').find(b => b.text() === 'Dễ')!.trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('日本')
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  await wrapper.findAll('button').find(b => b.text() === 'Dễ')!.trigger('click'); await flushPromises()
  expect(study.rateCard).toHaveBeenLastCalledWith(1, 'EASY')
  expect(wrapper.text()).toContain('Bạn đã ôn hết thẻ')
})

it('practices a single wrong answer without revealing its key before the first answer', async () => {
  vi.mocked(study.getWrongPage).mockResolvedValueOnce({ content: [wrong], number: 0, totalElements: 1, totalPages: 1 }).mockResolvedValue(empty)
  vi.mocked(gatewayUrl.get).mockResolvedValue({ data: [{ exerciseKeywordId: 10, contentNihongo: '日本は？', answerA: 'A text', answerB: 'B text', answerC: 'C text', answerD: 'D text' }] })
  vi.mocked(study.practiceWrong).mockResolvedValueOnce({ correct: false, correctAnswer: 'C' }).mockResolvedValueOnce({ correct: true, correctAnswer: 'C' })
  wrapper = mount(ReviewView, { global }); await flushPromises()
  await wrapper.findAll('[role="tab"]')[2]!.trigger('click')
  await wrapper.findAll('button').find(b => b.text() === 'Luyện câu này')!.trigger('click'); await flushPromises()
  expect(wrapper.text()).not.toContain('Đáp án:')
  await wrapper.findAll('.study-options button')[0]!.trigger('click'); await flushPromises()
  expect(study.practiceWrong).toHaveBeenLastCalledWith(5, 'A')
  expect(wrapper.text()).toContain('Đáp án: C')
  await wrapper.findAll('.study-options button')[2]!.trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Chính xác!')
  expect(wrapper.text()).toContain('Chưa có câu sai')
})

it('loads notebook filters from the server and requests subsequent pages', async () => {
  vi.mocked(study.getCardPage).mockResolvedValue({ content: [card], number: 0, totalElements: 21, totalPages: 2 })
  wrapper = mount(NotebookView, { global }); await flushPromises()
  expect(study.getCardPage).toHaveBeenCalledWith(0, undefined)
  await wrapper.findAll('button').find(b => b.text() === 'Từ vựng')!.trigger('click'); await flushPromises()
  expect(study.getCardPage).toHaveBeenLastCalledWith(0, 'VOCAB')
  await wrapper.findAll('button').find(b => b.text() === 'Sau')!.trigger('click'); await flushPromises()
  expect(study.getCardPage).toHaveBeenLastCalledWith(1, 'VOCAB')
})

it('shows a retryable error when study data fails to load', async () => {
  vi.mocked(study.getDueBatch).mockRejectedValueOnce(new Error('offline'))
  wrapper = mount(ReviewView, { global }); await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Không tải được đầy đủ')
  await wrapper.get('[role="alert"] button').trigger('click'); await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('opens weak lessons directly when reached from the dashboard link', async () => {
  await router.push('/?tab=lessons')
  vi.mocked(study.getWeakPage).mockResolvedValue({ content: [{ lessonId: 3, score: 50, submittedAt: '2026-10-10T08:00:00' }], number: 0, totalElements: 1, totalPages: 1 })
  wrapper = mount(ReviewView, { global }); await flushPromises()
  expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('Bài yếu (1)')
  expect(wrapper.text()).toContain('Lần gần nhất: 50 điểm')
})

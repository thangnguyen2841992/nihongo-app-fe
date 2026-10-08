import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HistoryExercise from '../HistoryExercise.vue'
import { gatewayUrl } from '@/api/authApi'

vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn() } }))
vi.mock('chart.js', () => ({
  Chart: class { static register() {} destroy() {} },
  LineController: {}, LineElement: {}, PointElement: {}, CategoryScale: {}, LinearScale: {}, Tooltip: {}, Legend: {}
}))
let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null) })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks() })
async function openHistory() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/history/:lessonId', component: HistoryExercise }] })
  await router.push('/history/1'); await router.isReady()
  wrapper = mount(HistoryExercise, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
const result = { resultId: 1, lessonId: 1, lessonName: 'Bài 1', totalQuestion: 3, correctCount: 1, wrongCount: 1, unansweredCount: 1, score: 100 / 3, submittedAt: '2026-10-08T10:00:00', chosenAnswers: { '10': 'A', '11': 'B' }, correctAnswers: { '10': 'A', '11': 'C', '12': 'D' } }

it('shows a retryable load error instead of pretending history is empty', async () => {
  vi.mocked(gatewayUrl.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] })
  await openHistory()
  expect(wrapper!.get('[role="alert"]').text()).toContain('Không tải được lịch sử')
  expect(wrapper!.text()).not.toContain('Bạn chưa làm bài tập này')
  await wrapper!.get('[role="alert"] button').trigger('click'); await flushPromises()
  expect(wrapper!.text()).toContain('Bạn chưa làm bài tập này')
})

it('shows saved choices including skipped questions and keeps chronological attempt numbers', async () => {
  vi.mocked(gatewayUrl.get).mockResolvedValue({ data: [{ ...result, resultId: 2, submittedAt: '2026-10-08T11:00:00' }, result] })
  await openHistory()
  expect(wrapper!.findAll('.unanswered-count').map(cell => cell.text())).toEqual(['1', '1'])
  await wrapper!.findAll('.detail-button')[1]!.trigger('click')
  expect(wrapper!.get('.attempt-details').text()).toContain('Chi tiết lần làm 1')
  expect(wrapper!.get('.attempt-details').text()).toContain('Bạn chọn: B')
  expect(wrapper!.get('.attempt-details').text()).toContain('Đáp án đúng: C')
  expect(wrapper!.get('.attempt-details').text()).toContain('Bạn chọn: Chưa trả lời')
})

it('marks missing legacy counts as unknown instead of zero', async () => {
  vi.mocked(gatewayUrl.get).mockResolvedValue({ data: [{ ...result, unansweredCount: null, correctAnswers: null, chosenAnswers: null }] })
  await openHistory()
  expect(wrapper!.get('.unanswered-count').text()).toBe('—')
  expect(wrapper!.text()).toContain('Chưa lưu chi tiết')
  expect(wrapper!.find('.detail-button').exists()).toBe(false)
})

it('reloads when the lesson changes and ignores a late response from the previous lesson', async () => {
  let resolveFirst!: (value: { data: typeof result[] }) => void
  vi.mocked(gatewayUrl.get).mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
    .mockResolvedValueOnce({ data: [{ ...result, lessonId: 2, lessonName: 'Bài 2' }] })
  const router = await openHistory()
  await router.push('/history/2'); await flushPromises()
  resolveFirst({ data: [result] }); await flushPromises()
  expect(wrapper!.text()).toContain('Bài 2')
  expect(wrapper!.text()).not.toContain('📘 Bài 1')
})

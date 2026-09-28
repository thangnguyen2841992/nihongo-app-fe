import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import JapaneseAiResult from '../JapaneseAiResult.vue'
import { analyzeJapanese, type JapaneseAiResponse } from '@/services/japaneseAiService'

vi.mock('@/services/japaneseAiService', () => ({ analyzeJapanese: vi.fn() }))
let wrapper: ReturnType<typeof mount> | undefined
const answer = (word: string): JapaneseAiResponse => ({ originalText: word, translation: 'Bản dịch', reading: word, vocabulary: [], grammar: [], sentenceStructure: 'Cấu trúc', examples: [] })
beforeEach(() => { vi.resetAllMocks() })
afterEach(() => { wrapper?.unmount() })
async function open(query = '') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/japanese-ai', component: JapaneseAiResult }] })
  await router.push('/japanese-ai' + query)
  await router.isReady()
  wrapper = mount(JapaneseAiResult, { global: { plugins: [router] } })
  await flushPromises()
  return router
}

it('loads URL keywords and keeps local searches in the URL', async () => {
  vi.mocked(analyzeJapanese).mockImplementation(async text => answer(text))
  const router = await open('?q=学校')
  expect(wrapper!.get('.original-text-content').text()).toBe('学校')
  await wrapper!.get('input').setValue(' ăn cơm ')
  await wrapper!.get('.search-box button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query.q).toBe('ăn cơm')
  expect(analyzeJapanese).toHaveBeenCalledTimes(2)
  expect(wrapper!.get('.original-text-content').text()).toBe('ăn cơm')
})

it('aborts old requests and ignores stale results', async () => {
  let resolveOld!: (value: JapaneseAiResponse) => void
  vi.mocked(analyzeJapanese).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    .mockResolvedValueOnce(answer('新しい'))
  const router = await open('?q=古い')
  const oldSignal = vi.mocked(analyzeJapanese).mock.calls[0]![1]!
  await router.push('/japanese-ai?q=新しい')
  await flushPromises()
  expect(oldSignal.aborted).toBe(true)
  resolveOld(answer('古い'))
  await flushPromises()
  expect(wrapper!.get('.original-text-content').text()).toBe('新しい')
})

it('lets users cancel without accepting a late result', async () => {
  let resolve!: (value: JapaneseAiResponse) => void
  vi.mocked(analyzeJapanese).mockImplementation(() => new Promise(done => { resolve = done }))
  await open('?q=学校')
  expect(wrapper!.get('input').attributes('disabled')).toBeUndefined()
  await wrapper!.get('.loading-panel button').trigger('click')
  expect(vi.mocked(analyzeJapanese).mock.calls[0]![1]!.aborted).toBe(true)
  resolve(answer('学校'))
  await flushPromises()
  expect(wrapper!.find('.result-container').exists()).toBe(false)
  expect(wrapper!.find('.loading-panel').exists()).toBe(false)
})

it('rejects oversized URL input before sending a request', async () => {
  await open('?q=' + 'a'.repeat(2001))
  expect(analyzeJapanese).not.toHaveBeenCalled()
  expect(wrapper!.get('[role="alert"]').text()).toContain('2.000')
})

it('shows friendly errors and allows retry of the same query', async () => {
  vi.mocked(analyzeJapanese).mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: { message: 'AI chưa khả dụng' } } })
    .mockResolvedValueOnce(answer('学校'))
  await open('?q=学校')
  expect(wrapper!.get('[role="alert"]').text()).toBe('AI chưa khả dụng')
  await wrapper!.get('.search-box button').trigger('click')
  await flushPromises()
  expect(wrapper!.find('[role="alert"]').exists()).toBe(false)
  expect(wrapper!.get('.original-text-content').text()).toBe('学校')
})

it('clears stale results when browser navigation removes the query', async () => {
  vi.mocked(analyzeJapanese).mockResolvedValue(answer('学校'))
  const router = await open('?q=学校')
  await router.push('/japanese-ai')
  await flushPromises()
  expect(wrapper!.get('input').element.value).toBe('')
  expect(wrapper!.find('.result-container').exists()).toBe(false)
})

it('does not submit while the Japanese keyboard is composing text', async () => {
  await open()
  await wrapper!.get('input').setValue('学校')
  await wrapper!.get('input').trigger('keydown', { key: 'Enter', isComposing: true })
  expect(analyzeJapanese).not.toHaveBeenCalled()
})

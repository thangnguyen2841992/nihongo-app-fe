import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CourseBookDetailView from '../CourseBookDetailView.vue'
import { gatewayUrl } from '@/api/authApi'

vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn() } }))

let wrapper: ReturnType<typeof mount> | undefined
let bookName = 'TRY! N3 - Tiếng Việt'
const voice = { lang: 'ja-JP', name: 'Google 日本語', default: false } as SpeechSynthesisVoice
const synthesis = {
  getVoices: vi.fn(),
  speak: vi.fn(),
  cancel: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}
const play = vi.fn()
const pause = vi.fn()
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

beforeEach(() => {
  vi.resetAllMocks()
  bookName = 'TRY! N3 - Tiếng Việt'
  synthesis.getVoices.mockReturnValue([voice])
  vi.stubGlobal('speechSynthesis', synthesis)
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string
    constructor(text: string) { this.text = text }
  })
  vi.stubGlobal('Audio', class {
    onended: (() => void) | null = null
    constructor(public src: string) {}
    play = play
    pause = pause
  })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:voicevox') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  play.mockResolvedValue(undefined)
  vi.mocked(gatewayUrl.get).mockImplementation(async (url) => {
    const data = url === '/api/staff/books/1'
      ? { bookId: 1, bookName }
      : url === '/api/staff/getLessonsByBook'
        ? [{ lessonId: 11, bookId: 1, name: 'Bài 1', reading: '', description: '' }]
        : url === '/api/staff/getAllGrammarByLesson'
          ? [{ grammarId: 21, title: '文法', description: '' }]
          : url === '/api/staff/lessons/11/examples'
            ? [{ exampleId: 31, grammarId: 21, nihongo: '<p><ruby>日本語<rt>にほんご</rt></ruby>を勉強します。</p>', vietnamese: '<p>Tôi học tiếng Nhật.</p>' }]
            : []
    return { data } as never
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL })
  else Reflect.deleteProperty(URL, 'createObjectURL')
  if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL })
  else Reflect.deleteProperty(URL, 'revokeObjectURL')
  vi.unstubAllGlobals()
})

async function openBook() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/books/:bookId', name: 'CourseBookDetail', component: CourseBookDetailView }],
  })
  await router.push('/books/1')
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
}

it('plays cached VOICEVOX audio for a TRY! N3 example and shows the voice credit', async () => {
  await openBook()
  await wrapper!.get('.example-speak').trigger('click')
  await flushPromises()
  expect(gatewayUrl.get).toHaveBeenCalledWith('/api/staff/grammars/21/examples/31/speech', expect.objectContaining({ responseType: 'blob' }))
  expect(play).toHaveBeenCalledOnce()
  expect(wrapper!.text()).toContain('VOICEVOX: ずんだもん')
  expect(synthesis.speak).not.toHaveBeenCalled()
})

it('does not show TRY! N3 pronunciation controls for another book', async () => {
  bookName = 'Minna no Nihongo'
  await openBook()
  expect(wrapper!.find('.example-speak').exists()).toBe(false)
})

it('falls back to the browser voice when VOICEVOX is unavailable', async () => {
  vi.mocked(gatewayUrl.get).mockImplementation(async (url) => {
    if (url.includes('/speech')) throw new Error('engine offline')
    return { data: url === '/api/staff/books/1' ? { bookId: 1, bookName } :
      url === '/api/staff/getLessonsByBook' ? [{ lessonId: 11, bookId: 1, name: 'Bài 1' }] :
      url === '/api/staff/getAllGrammarByLesson' ? [{ grammarId: 21, title: '文法' }] :
      [{ exampleId: 31, grammarId: 21, nihongo: '<ruby>日本語<rt>にほんご</rt></ruby>を勉強します。' }] } as never
  })
  await openBook()
  await wrapper!.get('.example-speak').trigger('click')
  await flushPromises()
  expect(synthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ text: '日本語を勉強します。' }))
})

it('explains when neither VOICEVOX nor a Japanese browser voice is available', async () => {
  synthesis.getVoices.mockReturnValue([])
  await openBook()
  vi.mocked(gatewayUrl.get).mockRejectedValueOnce(new Error('engine offline'))
  await wrapper!.get('.example-speak').trigger('click')
  await flushPromises()
  expect(wrapper!.get('.example-speech-error').text()).toContain('chưa có giọng đọc tiếng Nhật')
  expect(synthesis.speak).not.toHaveBeenCalled()
})

it('loads all lesson examples in one request and reuses them when returning to the lesson', async () => {
  vi.mocked(gatewayUrl.get).mockImplementation(async (url, config) => ({ data:
    url === '/api/staff/books/1' ? { bookId: 1, bookName } :
    url === '/api/staff/getLessonsByBook' ? [
      { lessonId: 11, name: 'Bài 1', reading: '' },
      { lessonId: 12, name: 'Bài 2', reading: '' },
    ] : url === '/api/staff/getAllGrammarByLesson' ? [
      { grammarId: config?.params?.lessonId === 11 ? 21 : 22, title: '文法' },
    ] : url === '/api/staff/lessons/11/examples' ? [
      { exampleId: 31, grammarId: 21, nihongo: '一番' },
    ] : url === '/api/staff/lessons/12/examples' ? [
      { exampleId: 32, grammarId: 22, nihongo: '二番' },
    ] : [] } as never))
  await openBook()
  expect(wrapper!.text()).toContain('一番')
  await wrapper!.findAll('.lesson-tab')[1]!.trigger('click')
  await flushPromises()
  expect(wrapper!.text()).toContain('二番')
  await wrapper!.findAll('.lesson-tab')[0]!.trigger('click')
  await flushPromises()
  expect(wrapper!.text()).toContain('一番')
  expect(vi.mocked(gatewayUrl.get).mock.calls.filter(([url]) => url === '/api/staff/lessons/11/examples')).toHaveLength(1)
  expect(vi.mocked(gatewayUrl.get).mock.calls.some(([url]) => url === '/api/staff/getAllExampleByGrammar')).toBe(false)
})

it('keeps the newest lesson visible when an older response arrives late', async () => {
  let resolveOld!: (value: { data: Array<{ grammarId: number; title: string }> }) => void
  vi.mocked(gatewayUrl.get).mockImplementation(async (url, config) => {
    if (url === '/api/staff/books/1') return { data: { bookId: 1, bookName } } as never
    if (url === '/api/staff/getLessonsByBook') return { data: [
      { lessonId: 11, name: 'Bài 1', reading: '' }, { lessonId: 12, name: 'Bài 2', reading: '' },
    ] } as never
    if (url === '/api/staff/getAllGrammarByLesson' && config?.params?.lessonId === 11) {
      return await new Promise(resolve => { resolveOld = resolve })
    }
    if (url === '/api/staff/getAllGrammarByLesson') return { data: [{ grammarId: 22, title: 'Ngữ pháp mới' }] } as never
    return { data: url === '/api/staff/lessons/12/examples' ? [
      { exampleId: 32, grammarId: 22, nihongo: '二番' },
    ] : [{ exampleId: 31, grammarId: 21, nihongo: '一番' }] } as never
  })
  await openBook()
  await wrapper!.findAll('.lesson-tab')[1]!.trigger('click')
  await flushPromises()
  expect(wrapper!.text()).toContain('二番')
  resolveOld({ data: [{ grammarId: 21, title: 'Ngữ pháp cũ' }] })
  await flushPromises()
  expect(wrapper!.text()).toContain('二番')
  expect(wrapper!.text()).not.toContain('一番')
})

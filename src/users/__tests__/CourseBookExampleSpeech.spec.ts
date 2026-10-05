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

beforeEach(() => {
  vi.resetAllMocks()
  bookName = 'TRY! N3 - Tiếng Việt'
  synthesis.getVoices.mockReturnValue([voice])
  vi.stubGlobal('speechSynthesis', synthesis)
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string
    constructor(text: string) { this.text = text }
  })
  vi.mocked(gatewayUrl.get).mockImplementation(async (url) => {
    const data = url === '/api/staff/books/1'
      ? { bookId: 1, bookName }
      : url === '/api/staff/getLessonsByBook'
        ? [{ lessonId: 11, bookId: 1, name: 'Bài 1', reading: '', description: '' }]
        : url === '/api/staff/getAllGrammarByLesson'
          ? [{ grammarId: 21, title: '文法', description: '' }]
          : url === '/api/staff/getAllExampleByGrammar'
            ? [{ exampleId: 31, grammarId: 21, nihongo: '<p><ruby>日本語<rt>にほんご</rt></ruby>を勉強します。</p>', vietnamese: '<p>Tôi học tiếng Nhật.</p>' }]
            : []
    return { data } as never
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
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

it('adds a Japanese pronunciation button to each TRY! N3 example', async () => {
  await openBook()
  await wrapper!.get('.example-speak').trigger('click')
  expect(synthesis.speak).toHaveBeenCalledWith(expect.objectContaining({
    text: '日本語を勉強します。',
    voice,
    lang: 'ja-JP',
  }))
})

it('does not show TRY! N3 pronunciation controls for another book', async () => {
  bookName = 'Minna no Nihongo'
  await openBook()
  expect(wrapper!.find('.example-speak').exists()).toBe(false)
})

it('explains when a Japanese voice is not installed', async () => {
  synthesis.getVoices.mockReturnValue([])
  await openBook()
  await wrapper!.get('.example-speak').trigger('click')
  expect(wrapper!.get('.example-speech-error').text()).toContain('chưa có giọng đọc tiếng Nhật')
  expect(synthesis.speak).not.toHaveBeenCalled()
})

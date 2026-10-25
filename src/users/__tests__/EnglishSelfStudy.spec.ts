import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import EnglishSelfStudyView from '../EnglishSelfStudyView.vue'
import { loadEnglishStudy } from '@/services/englishSelfStudy'
import { grammarPackFixture } from '@/services/__tests__/grammarPackFixture'

const auth = { isAuthenticated: ref(true), userEmail: ref('first@example.test') }
vi.mock('@/services/authState', () => ({ useAuthState: () => auth }))
const sync = vi.hoisted(() => ({ fetchRemoteStudy: vi.fn(), pushRemoteStudy: vi.fn() }))
vi.mock('@/services/englishStudySync', async () => ({
  ...(await vi.importActual<typeof import('@/services/englishStudySync')>('@/services/englishStudySync')),
  fetchRemoteStudy: sync.fetchRemoteStudy,
  pushRemoteStudy: sync.pushRemoteStudy,
}))
let wrapper: VueWrapper | undefined
let sequence = 0
beforeEach(() => {
  localStorage.clear()
  auth.isAuthenticated.value = true
  auth.userEmail.value = 'first@example.test'
  sequence = 0
  sync.fetchRemoteStudy.mockReset().mockResolvedValue(null)
  sync.pushRemoteStudy.mockReset().mockImplementation(async (version: number, data: unknown) => ({ version: version + 1, updatedAt: Date.now(), data }))
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:local-${++sequence}`)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
})
async function open() {
  wrapper = mount(EnglishSelfStudyView, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await vi.waitFor(() => expect(wrapper!.find('#grammar-companion-title').exists()).toBe(true), {
    timeout: 5000,
  })
  return wrapper
}
async function selectFiles(selector: string, files: File[]) {
  const input = wrapper!.get(selector)
  Object.defineProperty(input.element, 'files', { configurable: true, value: files })
  await input.trigger('change')
  // FileReader uses its own event queue.
  await vi.waitFor(() => expect(wrapper!.find('input[type="file"][disabled]').exists()).toBe(false))
  await flushPromises()
}

it('shows official resources honestly and saves progress and notes for each book', async () => {
  const view = await open()
  expect(view.findAll('.book-card')).toHaveLength(3)
  expect(view.text()).toContain('không tải lên server')
  expect(
    view.get('a[href="https://shop.cambridge.org/english/product/2800506037"]').attributes('rel'),
  ).toContain('noopener')
  await view.get('#english-unit').setValue('Unit 3')
  await view.get('#english-notes').setValue('I am a student.')
  await view.get('#english-completed').setValue(2)
  await view.get('#english-total').setValue(20)
  await view.get('.notebook-panel').trigger('submit')
  expect(view.get('[role="status"]').text()).toContain('Đã lưu')
  expect(loadEnglishStudy('first@example.test')['essential-grammar'].notes).toBe('I am a student.')
  await view.findAll('.book-card')[1]!.trigger('click')
  expect((view.get('#english-notes').element as HTMLTextAreaElement).value).toBe('')
  await view.get('#english-notes').setValue('A new word')
  await view.get('.notebook-panel').trigger('submit')
  await view.findAll('.book-card')[0]!.trigger('click')
  expect((view.get('#english-notes').element as HTMLTextAreaElement).value).toBe('I am a student.')
  view.unmount()
  wrapper = undefined
  expect(((await open()).get('#english-unit').element as HTMLInputElement).value).toBe('Unit 3')
})

it('opens PDF locally, keeps a valid PDF after a bad selection, and revokes it when leaving', async () => {
  const view = await open()
  await selectFiles('input[accept=".pdf,application/pdf"]', [new File(['%PDF-1.7\n'], 'book.pdf')])
  expect(view.get('object').attributes('data')).toBe('blob:local-1#page=1&view=FitH')
  expect(view.text()).toContain('book.pdf')
  await view.get('#english-page').setValue(8)
  await view.get('.page-jump').trigger('submit')
  expect(view.get('object').attributes('data')).toContain('#page=8')
  await selectFiles('input[accept=".pdf,application/pdf"]', [new File(['not PDF'], 'fake.pdf')])
  expect(view.get('[role="alert"]').text()).toContain('không phải PDF')
  expect(view.get('object').attributes('data')).toContain('blob:local-1')
  view.unmount()
  wrapper = undefined
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
})

it('clears local files and private drafts immediately when identity changes or expires', async () => {
  const view = await open()
  await view.get('#english-notes').setValue('Only for first user')
  await view.get('.notebook-panel').trigger('submit')
  await selectFiles('input[accept=".pdf,application/pdf"]', [new File(['%PDF-1.7'], 'private.pdf')])
  auth.userEmail.value = 'second@example.test'
  await flushPromises()
  expect(view.find('object').exists()).toBe(false)
  expect((view.get('#english-notes').element as HTMLTextAreaElement).value).toBe('')
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
  auth.userEmail.value = 'first@example.test'
  await flushPromises()
  expect((view.get('#english-notes').element as HTMLTextAreaElement).value).toBe(
    'Only for first user',
  )
  auth.isAuthenticated.value = false
  await flushPromises()
  expect(view.find('textarea').exists()).toBe(false)
  expect(view.text()).not.toContain('Only for first user')
})

it('keeps audio playlists with their book and supports playback controls', async () => {
  const view = await open()
  await selectFiles('input[multiple]', [
    new File([''], 'Track 10.mp3'),
    new File([''], 'Track 2.mp3'),
  ])
  expect(view.findAll('#english-track option').map((option) => option.text())).toEqual([
    'Track 2.mp3',
    'Track 10.mp3',
  ])
  await view.get('#english-track').setValue(1)
  expect(view.get('audio').attributes('src')).toBe('blob:local-2')
  await view.get('select[aria-label="Tốc độ nghe"]').setValue(0.75)
  expect((view.get('audio').element as HTMLAudioElement).playbackRate).toBe(0.75)
  await view.get('input[type="checkbox"]').setValue(true)
  expect(view.get('audio').attributes()).toHaveProperty('loop')
  await view.findAll('.book-card')[2]!.trigger('click')
  expect(view.find('audio').exists()).toBe(false)
  expect(view.get('a[href$="9780521685276_frontmatter.pdf"]').text()).toContain(
    'không phải sách đầy đủ',
  )
  await view.findAll('.book-card')[0]!.trigger('click')
  expect(view.findAll('#english-track option')).toHaveLength(2)
})

it('keeps edits available and reports a save failure without a success message', async () => {
  const view = await open()
  await view.get('#english-notes').setValue('Do not lose this')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  await view.get('.notebook-panel').trigger('submit')
  expect(view.get('[role="alert"]').text()).toContain('Không lưu được')
  expect(view.find('[role="status"]').exists()).toBe(false)
  expect((view.get('#english-notes').element as HTMLTextAreaElement).value).toBe('Do not lose this')
  expect(view.text()).toContain('Chưa lưu')
})

it('imports a bilingual pack locally and clears its private PDF and custom lesson on account change', async () => {
  const view = await open()
  const personalPack = grammarPackFixture()
  personalPack.units[0]!.explanation = 'Private imported lesson wording'
  await selectFiles('input[aria-label="Chọn bản học Anh–Việt"]', [
    new File([JSON.stringify(personalPack)], 'my.english-study.json', {
      type: 'application/json',
    }),
  ])
  await vi.waitFor(() => expect(view.find('#grammar-companion-title').exists()).toBe(true))
  expect(view.text()).toContain('Chị tôi là y tá.')
  expect(view.get('object').attributes('data')).toContain('#page=11')
  expect((view.get('#english-total').element as HTMLInputElement).value).toBe('115')
  expect(view.text()).toContain('Private imported lesson wording')
  auth.userEmail.value = 'second@example.test'
  await flushPromises()
  expect(view.text()).not.toContain('Private imported lesson wording')
  expect(view.find('object').exists()).toBe(false)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1')
})

it('shows all built-in bilingual units without opening any file and resumes saved unit selection', async () => {
  const view = await open()
  expect(view.findAll('.unit-list button')).toHaveLength(115)
  expect(view.text()).toContain('Chị tôi là y tá.')
  expect(view.find('object').exists()).toBe(false)
  expect(view.find('.original-links button')!.text()).toBe('Mở PDF gốc để đối chiếu')
  await view.get('#grammar-search').setValue('115')
  await view.get('.unit-list button').trigger('click')
  expect((view.get('#english-unit').element as HTMLInputElement).value).toContain('Unit 115')
  await view.get('.notebook-panel').trigger('submit')
  view.unmount()
  wrapper = undefined
  const reopened = await open()
  expect(reopened.get('#bilingual-lesson-title').text()).toContain('put on your shoes')
  expect(reopened.find('object').exists()).toBe(false)
})

it('saves notes automatically shortly after typing and syncs them to the account', async () => {
  const view = await open()
  vi.useFakeTimers()
  try {
    await view.get('#english-notes').setValue('Typed without pressing save')
    expect(view.text()).toContain('Chưa lưu')
    await vi.advanceTimersByTimeAsync(1000)
    expect(loadEnglishStudy('first@example.test')['essential-grammar'].notes).toBe('Typed without pressing save')
    await vi.advanceTimersByTimeAsync(1500)
    expect(sync.pushRemoteStudy).toHaveBeenLastCalledWith(0, expect.objectContaining({
      'essential-grammar': expect.objectContaining({ notes: 'Typed without pressing save' }),
    }))
    await flushPromises()
    expect(view.text()).toContain('Đã lưu và đồng bộ')
  } finally { vi.useRealTimers() }
})

it('loads the notebook saved from another device and marks units as finished', async () => {
  const remote = (await import('@/services/englishSelfStudy')).emptyEnglishStudy()
  remote['essential-grammar'] = { ...remote['essential-grammar'], notes: 'Written on my phone', doneUnits: [1], completedUnits: 1, totalUnits: 115 }
  sync.fetchRemoteStudy.mockResolvedValue({ version: 4, updatedAt: Date.now(), data: remote })
  const view = await open()
  await vi.waitFor(() => expect((view.get('#english-notes').element as HTMLTextAreaElement).value).toBe('Written on my phone'))
  expect(view.get('.unit-list button.done').text()).toContain('đã học xong')
  await view.get('.unit-done-toggle').trigger('click')
  expect(view.findAll('.unit-list button.done')).toHaveLength(0)
  expect((view.get('#english-completed').element as HTMLInputElement).value).toBe('0')
})

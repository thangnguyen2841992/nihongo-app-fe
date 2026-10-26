import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, withDirectives } from 'vue'

const mocks = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { post: mocks.post } }))

import { japaneseReadingPrefs, vJapaneseReadings } from '../japaneseReadings'

const View = defineComponent({
  props: { html: { type: String, required: true } },
  setup(props) {
    return () => withDirectives(h('div', { class: 'jp', innerHTML: props.html }), [[vJapaneseReadings]])
  },
})

afterEach(() => {
  japaneseReadingPrefs.furigana = true
  japaneseReadingPrefs.hanViet = true
  mocks.post.mockReset()
})

it('marks kanji words for the hover card without adding text, and removes the marks when both are off', async () => {
  mocks.post.mockResolvedValue({
    data: {
      results: [[
        { text: '食', reading: 'た', hanViet: 'THỰC' },
        { text: 'べる。', reading: null, hanViet: null },
      ]],
    },
  })
  const wrapper = mount(View, { props: { html: '<p>食べる。<ruby>日本<rt>にほん</rt></ruby></p>' } })
  await vi.waitFor(() => expect(wrapper.find('.jr-word').exists()).toBe(true))
  expect(mocks.post).toHaveBeenCalledWith('/api/nihongo-user/japanese/readings', { texts: ['食べる。'] })
  const word = wrapper.get('.jr-word')
  expect(word.text()).toBe('食')
  expect(word.attributes('data-reading')).toBe('た')
  expect(word.attributes('data-han-viet')).toBe('THỰC')
  expect(wrapper.get('.jp').text()).toBe('食べる。日本にほん')
  expect(wrapper.findAll('ruby')).toHaveLength(1)

  japaneseReadingPrefs.furigana = false
  await flushPromises()
  await vi.waitFor(() => expect(wrapper.get('.jr-word').attributes('data-reading')).toBeUndefined())
  expect(wrapper.get('.jr-word').attributes('data-han-viet')).toBe('THỰC')

  japaneseReadingPrefs.hanViet = false
  await flushPromises()
  await vi.waitFor(() => expect(wrapper.find('.jr-word').exists()).toBe(false))
  expect(wrapper.get('.jp').html()).toContain('<p>食べる。<ruby>日本<rt>にほん</rt></ruby></p>')
  expect(mocks.post).toHaveBeenCalledTimes(1)
})

it('shows the reading card when the learner points at a word', async () => {
  mocks.post.mockResolvedValue({ data: { results: [[{ text: '勉強', reading: 'べんきょう', hanViet: 'MIỄN CƯỜNG' }]] } })
  const wrapper = mount(View, { props: { html: '<p>勉強</p>' }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.find('.jr-word').exists()).toBe(true))
  wrapper.get('.jr-word').element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  const card = document.querySelector('.jr-popover') as HTMLElement
  expect(card.hidden).toBe(false)
  expect(card.textContent).toContain('べんきょう')
  expect(card.textContent).toContain('MIỄN CƯỜNG')
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(card.hidden).toBe(true)
  wrapper.unmount()
})

it('leaves the text untouched when the reading service is unavailable', async () => {
  mocks.post.mockRejectedValue(new Error('offline'))
  const wrapper = mount(View, { props: { html: '<p>漢字</p>' } })
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 60))
  expect(wrapper.get('.jp').html()).toContain('<p>漢字</p>')
})

it('marks Japanese runs inside Vietnamese notes without touching the Vietnamese text', async () => {
  japaneseReadingPrefs.furigana = false
  japaneseReadingPrefs.hanViet = false
  const Mixed = defineComponent({
    setup() {
      return () => withDirectives(h('div', { class: 'note', innerHTML: '<p>Ví dụ: <b>ありがとう</b> nghĩa là cảm ơn</p>' }), [[vJapaneseReadings, 'mixed']])
    },
  })
  const wrapper = mount(Mixed)
  await vi.waitFor(() => expect(wrapper.find('.jr-ja').exists()).toBe(true))
  expect(wrapper.get('.jr-ja').text()).toBe('ありがとう')
  expect(wrapper.get('.jr-ja').attributes('lang')).toBe('ja')
  expect(wrapper.get('.note').attributes('lang')).toBeUndefined()
  expect(wrapper.get('.note').text()).toBe('Ví dụ: ありがとう nghĩa là cảm ơn')
  expect(mocks.post).not.toHaveBeenCalled()
})

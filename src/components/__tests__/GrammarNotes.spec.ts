import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GrammarNotes from '../GrammarNotes.vue'

it('separates the formula from meaning and preserves bilingual Plus examples', () => {
  const wrapper = mount(GrammarNotes, { props: { description: '<p>Cấu trúc: V + 始める</p><p>Bắt đầu làm gì.</p><h4>Plus: ～終わる</h4><ul><li>読み終わった<br><em>Đọc xong</em></li></ul>' } })
  expect(wrapper.get('.formula').text()).toContain('V + 始める')
  expect(wrapper.get('.meaning').text()).not.toContain('Cấu trúc:')
  expect(wrapper.get('.meaning li').text()).toContain('Đọc xong')
})

it('renders existing plain notes with literal formulas and no active HTML', () => {
  const wrapper = mount(GrammarNotes, { props: { description: '<N> + なら\nDùng để đưa ra lời khuyên.' } })
  expect(wrapper.find('.formula').exists()).toBe(false)
  expect(wrapper.get('.note-body').text()).toBe('<N> + なら\nDùng để đưa ra lời khuyên.')
})

it('removes executable content before rendering stored notes', () => {
  const wrapper = mount(GrammarNotes, { props: { description: '<p>Cách dùng</p><svg onload="alert(1)">bad</svg><img onerror="alert(1)"><script>alert(1)</script>' } })
  expect(wrapper.get('.note-body').html()).not.toContain('onload')
  expect(wrapper.get('.note-body').html()).not.toContain('script')
  expect(wrapper.get('.note-body').text()).toBe('Cách dùng')
})

it.each(['V bỏ ます', 'V bỏ masu', 'Vます（bỏ ます）', 'Vます (bỏ masu)'])('displays %s as compact Japanese notation without changing usage notes', (form) => {
  const description = `<p>Cấu trúc: ${form} + 始める</p><p>Giải thích: V bỏ ます.</p>`
  const wrapper = mount(GrammarNotes, { props: { description } })
  expect(wrapper.get('.formula-expression').text()).toBe('Vます形（−ます） + 始める')
  expect(wrapper.get('.formula-help').text()).toContain('読みます → 読み')
  expect(wrapper.get('.note-body').text()).toBe('Giải thích: V bỏ ます.')
})

it('keeps Vない and already-written formulas intact', () => {
  const wrapper = mount(GrammarNotes, { props: { description: '<p>Cấu trúc: Vない + うちに</p><p>Trong khi chưa…</p>' } })
  expect(wrapper.get('.formula-expression').text()).toBe('Vない + うちに')
  expect(wrapper.find('.formula-help').exists()).toBe(false)
})

it('shows the saved sentence for a conversational structure while removing active content', () => {
  const wrapper = mount(GrammarNotes, { props: {
    description: '<p>Cấu trúc: ～ている → ～てる</p><p>Dạng rút gọn trong hội thoại.</p>',
    examples: [{ nihongo: '<p>何してる？</p><script>bad()</script>', vietnamese: '<p>Bạn đang làm gì?</p>' }]
  } })
  expect(wrapper.get('.sentence-jp').text()).toBe('何してる？')
  expect(wrapper.get('.sentence-vn').text()).toBe('Bạn đang làm gì?')
  expect(wrapper.find('.sentence-jp script').exists()).toBe(false)
  expect(wrapper.find('.connection-card').exists()).toBe(false)
})

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

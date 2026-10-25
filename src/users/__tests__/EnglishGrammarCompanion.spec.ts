import { afterEach, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import EnglishGrammarCompanion from '../EnglishGrammarCompanion.vue'
import { grammarPackFixture } from '@/services/__tests__/grammarPackFixture'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
function open(initialUnit = 1) {
  wrapper = mount(EnglishGrammarCompanion, { props: { pack: grammarPackFixture(), initialUnit } })
  return wrapper
}
it('shows bilingual explanations and keeps feedback hidden until the learner submits', async () => {
  const view = open()
  expect(view.text()).toContain('My sister is a nurse.')
  expect(view.text()).toContain('Chị tôi là y tá.')
  expect(view.find('[role="status"]').exists()).toBe(false)
  await view.findAll('input[type="radio"]')[0]!.setValue()
  expect(view.find('[role="status"]').exists()).toBe(false)
  await view.get('.grammar-practice').trigger('submit')
  expect(view.get('[role="status"]').text()).toContain('Đáp án: are')
  expect(view.get('[role="status"]').text()).toContain('Parents là số nhiều')
  expect(view.get('fieldset').attributes()).toHaveProperty('disabled')
  await view.get('.unit-pagination button:last-child').trigger('click')
  expect(view.find('[role="status"]').exists()).toBe(false)
  expect(
    view
      .findAll('input[type="radio"]')
      .every((input) => !(input.element as HTMLInputElement).checked),
  ).toBe(true)
})
it('resumes a unit, searches without accents and navigates to the mapped original PDF page', async () => {
  const view = open(10)
  expect(view.get('#bilingual-lesson-title').text()).toBe('Grammar 10')
  await view.get('#grammar-search').setValue('dong tu be')
  expect(view.findAll('.unit-list button')).toHaveLength(1)
  await view.get('.unit-list button').trigger('click')
  await view.get('.original-links button:first-child').trigger('click')
  expect(view.emitted('source')).toEqual([[11, 'Unit 1 — am / is / are']])
  await view.get('.original-links button:nth-child(2)').trigger('click')
  expect(view.emitted('source')![1]).toEqual([12, 'Unit 1 — am / is / are'])
})

it('marks units as finished and remembers the last self-check result', async () => {
  wrapper = mount(EnglishGrammarCompanion, { props: { pack: grammarPackFixture(), doneUnits: [2], quiz: { '1': false } } })
  expect(wrapper.text()).toContain('đã học 1/115')
  expect(wrapper.get('.quiz-history').text()).toContain('nên làm lại')
  await wrapper.get('.unit-done-toggle').trigger('click')
  expect(wrapper.emitted('toggleDone')).toEqual([[1]])
  await wrapper.findAll('input[type="radio"]')[2]!.setValue()
  await wrapper.get('.grammar-practice').trigger('submit')
  expect(wrapper.emitted('quizResult')).toEqual([[1, true]])
})

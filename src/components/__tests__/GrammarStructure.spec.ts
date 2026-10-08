import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GrammarStructure from '../GrammarStructure.vue'

it('opens the existing image preview from either the explicit control or the diagram', async () => {
  const wrapper = mount(GrammarStructure, { props: { source: '/structure.png', title: '～始める' } })
  expect(wrapper.get('img').attributes('alt')).toBe('～始める')
  expect(wrapper.get('img').attributes('src')).toBe('/structure.png')
  await wrapper.get('.enlarge').trigger('click')
  await wrapper.get('.structure-image-button').trigger('click')
  expect(wrapper.emitted('enlarge')).toHaveLength(2)
})

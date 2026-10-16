import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ref } from 'vue'
import JapaneseAiPopup from '../JapaneseAiPopup.vue'
import {
  japaneseAiPopupMounted,
  japaneseAiPopupOpen,
  japaneseAiPopupQuery,
  openJapaneseAiPopup,
} from '@/services/japaneseAiPopup'

vi.mock('@/services/authState', () => ({
  useAuthState: () => ({ isAuthenticated: ref(true), isAuthReady: ref(true) }),
}))

const AiResultStub = {
  props: ['query'],
  emits: ['update:query'],
  template: '<div data-testid="ai-result">{{ query }}</div>',
}

async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lesson', component: { template: '<div />' } },
      { path: '/course', component: { template: '<div />' } },
    ],
  })
  await router.push('/lesson')
  await router.isReady()
  const wrapper = mount(JapaneseAiPopup, {
    global: { plugins: [router], stubs: { JapaneseAiResult: AiResultStub } },
  })
  return { router, wrapper }
}

beforeEach(() => {
  japaneseAiPopupOpen.value = false
  japaneseAiPopupMounted.value = false
  japaneseAiPopupQuery.value = ''
})

describe('JapaneseAiPopup', () => {
  it('keeps the AI result open while navigating between screens', async () => {
    const { router, wrapper } = await render()
    openJapaneseAiPopup('日本語')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('#japanese-ai-popup').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="ai-result"]').text()).toBe('日本語')

    await router.push('/course')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('#japanese-ai-popup').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="ai-result"]').text()).toBe('日本語')
  })

  it('minimizes and reopens without clearing the current query', async () => {
    const { wrapper } = await render()
    openJapaneseAiPopup('勉強します')
    await wrapper.vm.$nextTick()

    await wrapper.get('[aria-label="Thu nhỏ trợ lý AI"]').trigger('click')
    expect(wrapper.get('#japanese-ai-popup').isVisible()).toBe(false)

    await wrapper.get('[aria-label="Mở trợ lý tiếng Nhật"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(japaneseAiPopupOpen.value).toBe(true)
    expect(japaneseAiPopupQuery.value).toBe('勉強します')
  })
})

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'
import FloatingScrollButtons from '../FloatingScrollButtons.vue'

const route = reactive({ path: '/courses', fullPath: '/courses' })
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('@/services/authState', () => ({ useAuthState: () => ({ isAuthenticated: ref(false), isAuthReady: ref(true), userRole: ref('') }) }))
let wrapper: VueWrapper | undefined
let resized: ResizeObserverCallback
let frame: FrameRequestCallback | undefined
const disconnect = vi.fn()
const requestFrame = vi.fn((callback: FrameRequestCallback) => { frame = callback; return 7 })

beforeEach(() => {
  vi.clearAllMocks()
  frame = undefined
  route.path = '/courses'; route.fullPath = '/courses'
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resized = callback }
    observe = vi.fn()
    disconnect = disconnect
  })
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(3000)
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function paint() { const callback = frame; frame = undefined; callback?.(0); await nextTick() }

it('coalesces a burst of scroll events and cancels pending work when removed', async () => {
  wrapper = mount(FloatingScrollButtons)
  expect(wrapper.find('[title="Lên đầu trang"]').exists()).toBe(false)
  for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('scroll'))
  expect(requestFrame).toHaveBeenCalledOnce()
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(2200)
  await paint()
  expect(wrapper.find('[title="Lên đầu trang"]').exists()).toBe(true)
  expect(wrapper.find('[title="Xuống cuối trang"]').exists()).toBe(false)
  window.dispatchEvent(new Event('scroll'))
  wrapper.unmount(); wrapper = undefined
  expect(cancelAnimationFrame).toHaveBeenCalledWith(7)
  expect(disconnect).toHaveBeenCalledOnce()
  requestFrame.mockClear()
  window.dispatchEvent(new Event('scroll'))
  expect(requestFrame).not.toHaveBeenCalled()
})

it('updates after async content grows and after navigation without needing a scroll', async () => {
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(700)
  wrapper = mount(FloatingScrollButtons)
  expect(wrapper.find('button').exists()).toBe(false)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(3000)
  resized([], {} as ResizeObserver)
  await paint()
  expect(wrapper.find('[title="Xuống cuối trang"]').exists()).toBe(true)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(700)
  route.fullPath = '/login'
  await nextTick(); await paint()
  expect(wrapper.find('button').exists()).toBe(false)
})

it('respects reduced motion for manual scrolling', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  wrapper = mount(FloatingScrollButtons)
  await nextTick()
  await wrapper.get('[title="Xuống cuối trang"]').trigger('click')
  expect(scroll).toHaveBeenCalledWith({ top: 3000, behavior: 'auto' })
})

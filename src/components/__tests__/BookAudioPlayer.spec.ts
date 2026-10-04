import { afterEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BookAudioPlayer from '../BookAudioPlayer.vue'

afterEach(() => vi.restoreAllMocks())

it('plays uploaded audio with credentials and measures its own duration', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  const wrapper = mount(BookAudioPlayer, { props: { source: 'http://localhost:8082/api/staff/imported-audio/lessons/9' } })
  const audio = wrapper.get('audio')
  expect(audio.attributes('crossorigin')).toBe('use-credentials')
  expect(audio.attributes('aria-label')).toBe('Nghe file đã tải lên')
  expect(wrapper.find('.listening-hint').exists()).toBe(false)
  Object.defineProperty(audio.element, 'duration', { value: 127, configurable: true })
  await audio.trigger('loadedmetadata')
  expect(wrapper.get('.audio-heading').text()).toContain('2:07')
  await wrapper.setProps({ source: 'http://localhost:8082/api/staff/imported-audio/lessons/10' })
  expect(wrapper.get('.audio-heading').text()).not.toContain('2:07')
  wrapper.unmount()
})

it('pauses the previous track when another begins and stops on leaving the page', async () => {
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: true })
  })
  const first = mount(BookAudioPlayer, { props: { track: '04' } })
  const second = mount(BookAudioPlayer, { props: { track: '05' } })
  Object.defineProperty(first.get('audio').element, 'paused', { configurable: true, value: false })
  await second.get('audio').trigger('play')
  expect(pause).toHaveBeenCalledOnce()
  Object.defineProperty(second.get('audio').element, 'paused', { configurable: true, value: false })
  second.unmount()
  expect(pause).toHaveBeenCalledTimes(2)
  first.unmount()
})

it('keeps the original audio, adjusts playback speed and permits retry after a load failure', async () => {
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const wrapper = mount(BookAudioPlayer, { props: { track: '06' } })
  const audio = wrapper.get('audio')
  expect(audio.attributes('preload')).toBe('none')
  expect(audio.attributes('src')).toMatch(/06-[a-f0-9]{12}\.m4a$/)
  await wrapper.get('select').setValue('0.75')
  expect((audio.element as HTMLAudioElement).playbackRate).toBe(0.75)
  await audio.trigger('error')
  expect(wrapper.get('[role="alert"]').text()).toContain('Chưa phát được file nghe')
  await wrapper.get('[role="alert"] button').trigger('click')
  expect(load).toHaveBeenCalledOnce()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  wrapper.unmount()
})

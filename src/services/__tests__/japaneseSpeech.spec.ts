import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { japaneseSpeechText, useJapaneseSpeech } from '../japaneseSpeech'

let wrapper: ReturnType<typeof mount> | undefined
let speech: ReturnType<typeof useJapaneseSpeech>
const japanese = { lang: 'ja-JP', name: 'Google 日本語', default: false } as SpeechSynthesisVoice
const english = { lang: 'en-US', name: 'English', default: true } as SpeechSynthesisVoice
const synth = { getVoices: vi.fn(), speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }

beforeEach(() => {
  vi.resetAllMocks()
  synth.getVoices.mockReturnValue([english, japanese])
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string
    constructor(text: string) { this.text = text }
  })
  wrapper = mount({ setup() { speech = useJapaneseSpeech(); return () => h('div') } })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals() })

it('explicitly selects a Japanese voice even when the default voice is English', () => {
  speech.speakJapanese('学校')
  expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: '学校', voice: japanese, lang: 'ja-JP', rate: 0.9 }))
  expect(speech.speechError.value).toBe('')
})

it('supports slower playback for sentence practice', () => {
  speech.speakJapanese('もう一度', 0.75)
  expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'もう一度', rate: 0.75 }))
})

it('reads example HTML without markup or duplicate ruby pronunciation', () => {
  expect(japaneseSpeechText('<p><ruby>日本語<rt>にほんご</rt></ruby>を勉強します。<br>頑張ります。</p>'))
    .toBe('日本語を勉強します。頑張ります。')
})

it('shows an explanation instead of using an English voice when Japanese is unavailable', () => {
  synth.getVoices.mockReturnValue([english])
  speech.speakJapanese('学校')
  expect(synth.speak).not.toHaveBeenCalled()
  expect(speech.speechError.value).toContain('chưa có giọng đọc tiếng Nhật')
})

it('uses voices loaded later and cancels playback when the page closes', () => {
  synth.getVoices.mockReturnValue([])
  speech.speakJapanese('学校')
  synth.getVoices.mockReturnValue([japanese])
  speech.speakJapanese('学校')
  expect(speech.speechError.value).toBe('')
  expect(synth.speak).toHaveBeenCalledOnce()
  wrapper!.unmount(); wrapper = undefined
  expect(synth.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function))
  expect(synth.cancel).toHaveBeenCalledTimes(3)
})

it('ignores playback errors from a canceled older utterance', () => {
  speech.speakJapanese('学校')
  const older = synth.speak.mock.calls[0]![0]
  speech.speakJapanese('先生')
  older.onerror({ error: 'network' })
  expect(speech.speechError.value).toBe('')
  synth.speak.mock.calls[1]![0].onerror({ error: 'network' })
  expect(speech.speechError.value).toContain('Không phát được')
})

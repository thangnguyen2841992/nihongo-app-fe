import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: mocks.get } }))

const british = { lang: 'en-GB', name: 'British', default: false } as SpeechSynthesisVoice
const synth = { getVoices: vi.fn(), speak: vi.fn(), cancel: vi.fn(), speaking: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
const played: { src: string; playbackRate: number }[] = []

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  played.length = 0
  synth.getVoices.mockReturnValue([british])
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string
    constructor(text: string) { this.text = text }
  })
  vi.stubGlobal('Audio', class {
    src = ''
    playbackRate = 1
    paused = true
    ended = false
    play() { played.push({ src: this.src, playbackRate: this.playbackRate }); this.paused = false; return Promise.resolve() }
    pause() { this.paused = true }
  })
  URL.createObjectURL = vi.fn(() => 'blob:kokoro-1')
  URL.revokeObjectURL = vi.fn()
  try { localStorage.clear() } catch { /* optional */ }
})
afterEach(() => vi.unstubAllGlobals())

it('plays the Kokoro voice for the chosen accent and reuses the audio for the same sentence', async () => {
  mocks.get.mockResolvedValue({ data: new Blob(['ID3'], { type: 'audio/mpeg' }) })
  const speech = await import('../englishSpeech')
  speech.setEnglishAccent('us')
  expect(await speech.speakEnglish('  My sister   is a nurse. ', { rate: 0.75 })).toBe('kokoro')
  expect(mocks.get).toHaveBeenCalledWith('/api/nihongo-user/english-speech', expect.objectContaining({
    params: { text: 'My sister is a nurse.', voice: 'us' }, responseType: 'blob',
  }))
  expect(played).toEqual([{ src: 'blob:kokoro-1', playbackRate: 0.75 }])
  await speech.speakEnglish('My sister is a nurse.')
  expect(mocks.get).toHaveBeenCalledOnce()
  expect(synth.speak).not.toHaveBeenCalled()
  expect(localStorage.getItem('english-accent')).toBe('us')
})

it('falls back to the browser voice when Kokoro is not running and does not retry for a while', async () => {
  mocks.get.mockRejectedValue({ response: { status: 503 } })
  const speech = await import('../englishSpeech')
  expect(await speech.speakEnglish('three trees')).toBe('browser')
  expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'three trees', lang: 'en-GB', voice: british }))
  await speech.speakEnglish('ship / sheep')
  expect(mocks.get).toHaveBeenCalledOnce()
  expect(synth.speak).toHaveBeenCalledTimes(2)
})

it('rejects empty text with a learner-facing message', async () => {
  const speech = await import('../englishSpeech')
  await expect(speech.speakEnglish('   ')).rejects.toThrow('Chưa có nội dung')
  expect(mocks.get).not.toHaveBeenCalled()
})

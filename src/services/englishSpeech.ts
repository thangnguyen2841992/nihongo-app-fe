import { ref } from 'vue'
import { gatewayUrl } from '@/api/authApi'

/**
 * English pronunciation: natural Kokoro voices from nihongo-user (British or American), falling back to the browser's
 * own voice when the Kokoro engine is not running. One player is shared by the whole page, so starting a sentence
 * stops the previous one.
 */
export type EnglishAccent = 'uk' | 'us'
export type SpeechSource = 'kokoro' | 'browser'
export const ENGLISH_SPEECH_MAX = 300

const ACCENT_KEY = 'english-accent'
const RETRY_AFTER_MS = 60_000
const CACHE_LIMIT = 40

function savedAccent(): EnglishAccent {
  try {
    return localStorage.getItem(ACCENT_KEY) === 'us' ? 'us' : 'uk'
  } catch {
    return 'uk'
  }
}
export const englishAccent = ref<EnglishAccent>(savedAccent())
export function setEnglishAccent(accent: EnglishAccent) {
  englishAccent.value = accent
  try {
    localStorage.setItem(ACCENT_KEY, accent)
  } catch {
    /* The choice still applies for this visit. */
  }
}

// Object URLs of recently played sentences, oldest first; revoked when evicted.
const audioUrls = new Map<string, string>()
let kokoroDownUntil = 0
let player: HTMLAudioElement | null = null
let request = 0
let controller: AbortController | null = null

function remember(key: string, url: string) {
  audioUrls.set(key, url)
  while (audioUrls.size > CACHE_LIMIT) {
    const [oldest, oldUrl] = audioUrls.entries().next().value as [string, string]
    audioUrls.delete(oldest)
    URL.revokeObjectURL(oldUrl)
  }
}

async function kokoroUrl(text: string, accent: EnglishAccent, signal: AbortSignal): Promise<string | null> {
  const key = `${accent}\n${text}`
  const cached = audioUrls.get(key)
  if (cached) {
    audioUrls.delete(key)
    audioUrls.set(key, cached)
    return cached
  }
  if (Date.now() < kokoroDownUntil || typeof URL.createObjectURL !== 'function') return null
  try {
    const { data } = await gatewayUrl.get<Blob>('/api/nihongo-user/english-speech', {
      params: { text, voice: accent },
      responseType: 'blob',
      signal,
    })
    if (!(data instanceof Blob) || !data.size) return null
    const url = URL.createObjectURL(data)
    remember(key, url)
    return url
  } catch (error: unknown) {
    if (signal.aborted) throw error
    const status = (error as { response?: { status?: number } }).response?.status
    // Engine off or missing: use the browser voice for a minute before trying the server again.
    if (status === undefined || status === 404 || status === 502 || status === 503 || status === 504)
      kokoroDownUntil = Date.now() + RETRY_AFTER_MS
    return null
  }
}

function browserVoice(lang: string): Promise<SpeechSynthesisVoice | undefined> {
  const synth = window.speechSynthesis
  const pick = () => {
    const voices = synth.getVoices()
    return voices.find((item) => item.lang === lang) ?? voices.find((item) => item.lang?.startsWith('en'))
  }
  if (synth.getVoices().length || typeof synth.addEventListener !== 'function') return Promise.resolve(pick())
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      synth.removeEventListener('voiceschanged', finish)
      resolve(pick())
    }
    const timer = setTimeout(finish, 1000)
    synth.addEventListener('voiceschanged', finish)
  })
}

async function speakWithBrowser(text: string, accent: EnglishAccent, rate: number, mine: number): Promise<SpeechSource> {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window))
    throw new Error('Trình duyệt này chưa hỗ trợ đọc tiếng Anh.')
  const lang = accent === 'us' ? 'en-US' : 'en-GB'
  const voice = await browserVoice(lang)
  if (mine !== request) return 'browser'
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    if (voice) utterance.voice = voice
    utterance.onerror = () => reject(new Error('Chưa đọc được câu này. Bạn có thể thử lại.'))
    window.speechSynthesis.speak(utterance)
    resolve('browser')
  })
}

export function stopEnglishSpeech() {
  request++
  controller?.abort()
  controller = null
  player?.pause()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

/**
 * Reads `text` aloud. `rate` below 1 slows playback (pitch is kept). Resolves with the voice actually used, or
 * rejects with a message suitable for the learner.
 */
export async function speakEnglish(
  text: string,
  options: { accent?: EnglishAccent; rate?: number } = {},
): Promise<SpeechSource> {
  stopEnglishSpeech()
  const mine = request
  const spoken = text.replace(/\s+/g, ' ').trim().slice(0, ENGLISH_SPEECH_MAX)
  if (!spoken) throw new Error('Chưa có nội dung để đọc.')
  const accent = options.accent ?? englishAccent.value
  const rate = options.rate ?? 1
  controller = new AbortController()
  let url: string | null = null
  try {
    url = await kokoroUrl(spoken, accent, controller.signal)
  } catch {
    return 'kokoro' // Superseded by a newer request.
  }
  if (mine !== request) return 'kokoro'
  if (url && typeof Audio !== 'undefined') {
    player ??= new Audio()
    player.src = url
    player.playbackRate = rate
    try {
      await player.play()
      return 'kokoro'
    } catch {
      if (mine !== request) return 'kokoro' // Paused by a newer request.
      /* Autoplay or decoding refused: fall back to the browser voice below. */
    }
  }
  return speakWithBrowser(spoken, accent, rate, mine)
}

/** Resolves once the current sentence (Kokoro audio or browser voice) has finished, or after 20 seconds. */
export function englishSpeechFinished(): Promise<void> {
  const started = Date.now()
  return new Promise((resolve) => {
    const check = () => {
      const audioBusy = !!player && !player.paused && !player.ended
      const browserBusy = 'speechSynthesis' in window && window.speechSynthesis.speaking
      if ((!audioBusy && !browserBusy) || Date.now() - started > 20_000) resolve()
      else window.setTimeout(check, 150)
    }
    // The browser voice reports "speaking" only shortly after speak(); give it a moment before the first check.
    window.setTimeout(check, 300)
  })
}

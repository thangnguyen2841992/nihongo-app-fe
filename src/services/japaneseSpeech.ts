import { onMounted, onBeforeUnmount, ref } from 'vue'
import { gatewayUrl } from '@/api/authApi'

export function japaneseSpeechText(html: string) {
  const content = document.createElement('template')
  content.innerHTML = html
  content.content.querySelectorAll('rt, rp').forEach(annotation => annotation.remove())
  return (content.content.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function selectJapaneseVoice(voices: SpeechSynthesisVoice[]) {
  const japanese = voices.filter(voice => /^ja(?:[-_]|$)/i.test(voice.lang))
  return japanese.find(voice => /^ja[-_]JP$/i.test(voice.lang) && /Google/i.test(voice.name))
    ?? japanese.find(voice => /^ja[-_]JP$/i.test(voice.lang) && voice.default)
    ?? japanese.find(voice => /^ja[-_]JP$/i.test(voice.lang))
    ?? japanese[0]
}

export function useJapaneseSpeech() {
  const speechError = ref('')
  const speechProvider = ref<'voicevox' | 'browser' | null>(null)
  let voices: SpeechSynthesisVoice[] = []
  let version = 0
  let request: AbortController | null = null
  let audio: HTMLAudioElement | null = null
  let audioUrl: string | null = null
  const supported = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
  const refreshVoices = () => { if (supported()) voices = window.speechSynthesis.getVoices() }

  const stopSpeaking = () => {
    ++version
    request?.abort()
    request = null
    audio?.pause()
    audio = null
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    audioUrl = null
    speechProvider.value = null
    if (supported()) window.speechSynthesis.cancel()
  }

  const speakJapanese = (text: string, rate = 0.9) => {
    stopSpeaking()
    speechError.value = ''
    if (!text.trim()) return
    if (!supported()) {
      speechError.value = 'Trình duyệt này chưa hỗ trợ đọc văn bản. Hãy thử Chrome hoặc Edge.'
      return
    }
    refreshVoices()
    const voice = selectJapaneseVoice(voices)
    if (!voice) {
      speechError.value = 'Thiết bị chưa có giọng đọc tiếng Nhật. Hãy cài giọng tiếng Nhật trong cài đặt hệ thống rồi thử lại.'
      return
    }
    const current = version
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = rate
    utterance.pitch = 1
    utterance.onerror = event => {
      if (current === version && event.error !== 'canceled' && event.error !== 'interrupted') {
        speechError.value = 'Không phát được âm thanh. Vui lòng bấm nghe lại.'
      }
    }
    window.speechSynthesis.speak(utterance)
    speechProvider.value = 'browser'
  }

  const speakExample = async (exampleId: number, grammarId: number, text: string, rate = 1) => {
    stopSpeaking()
    speechError.value = ''
    if (!text.trim()) return
    const current = version
    request = new AbortController()
    try {
      const response = await gatewayUrl.get<Blob>(`/api/staff/grammars/${grammarId}/examples/${exampleId}/speech`, {
        responseType: 'blob', signal: request.signal, timeout: 45000,
      })
      if (current !== version) return
      request = null
      audioUrl = URL.createObjectURL(response.data)
      audio = new Audio(audioUrl)
      audio.playbackRate = rate
      audio.onended = () => {
        if (current === version) stopSpeaking()
      }
      audio.onerror = () => {
        if (current === version) speakJapanese(text, rate)
      }
      await audio.play()
      if (current === version) speechProvider.value = 'voicevox'
    } catch {
      if (current !== version) return
      request = null
      // The local VOICEVOX engine is optional; keep pronunciation available offline.
      speakJapanese(text, rate)
    }
  }

  onMounted(() => {
    refreshVoices()
    if (supported()) window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  })
  onBeforeUnmount(() => {
    stopSpeaking()
    if (supported()) window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
  })
  return { speechError, speechProvider, speakJapanese, speakExample, stopSpeaking }
}

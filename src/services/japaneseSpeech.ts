import { onMounted, onBeforeUnmount, ref } from 'vue'

export function selectJapaneseVoice(voices: SpeechSynthesisVoice[]) {
  const japanese = voices.filter(voice => /^ja(?:[-_]|$)/i.test(voice.lang))
  return japanese.find(voice => /^ja[-_]JP$/i.test(voice.lang) && /Google/i.test(voice.name))
    ?? japanese.find(voice => /^ja[-_]JP$/i.test(voice.lang) && voice.default)
    ?? japanese.find(voice => /^ja[-_]JP$/i.test(voice.lang))
    ?? japanese[0]
}

export function useJapaneseSpeech() {
  const speechError = ref('')
  let voices: SpeechSynthesisVoice[] = []
  let version = 0
  const supported = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
  const refreshVoices = () => { if (supported()) voices = window.speechSynthesis.getVoices() }

  const stopSpeaking = () => {
    ++version
    if (supported()) window.speechSynthesis.cancel()
  }

  const speakJapanese = (text: string) => {
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
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.onerror = event => {
      if (current === version && event.error !== 'canceled' && event.error !== 'interrupted') {
        speechError.value = 'Không phát được âm thanh. Vui lòng bấm nghe lại.'
      }
    }
    window.speechSynthesis.speak(utterance)
  }

  onMounted(() => {
    refreshVoices()
    if (supported()) window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  })
  onBeforeUnmount(() => {
    stopSpeaking()
    if (supported()) window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
  })
  return { speechError, speakJapanese, stopSpeaking }
}

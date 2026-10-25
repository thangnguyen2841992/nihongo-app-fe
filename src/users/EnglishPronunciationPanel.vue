<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import {
  ENGLISH_SPEECH_MAX,
  englishAccent,
  englishSpeechFinished,
  setEnglishAccent,
  speakEnglish,
  stopEnglishSpeech,
  type SpeechSource,
} from '@/services/englishSpeech'

/**
 * Pronunciation practice: hear any word or sentence in a natural British/American voice, record yourself and play
 * both back to compare. The recording never leaves the browser.
 */
const props = defineProps<{ suggestions?: string[] }>()
const text = ref(props.suggestions?.[0] ?? '')
const busy = ref(false)
const source = ref<SpeechSource | ''>('')
const message = ref('')
const recording = ref(false)
const recordingUrl = ref('')
const canRecord =
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder === 'function' &&
  !!navigator.mediaDevices?.getUserMedia
let recorder: MediaRecorder | null = null
let stream: MediaStream | null = null
let mine: HTMLAudioElement | null = null
let stopTimer: ReturnType<typeof setTimeout> | null = null

async function listen(rate = 1) {
  message.value = ''
  busy.value = true
  try {
    source.value = await speakEnglish(text.value, { rate })
  } catch (error: unknown) {
    message.value = error instanceof Error ? error.message : 'Chưa đọc được câu này.'
  } finally {
    busy.value = false
  }
}
function pick(value: string) {
  text.value = value
  void listen()
}
function releaseMicrophone() {
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}
async function toggleRecording() {
  message.value = ''
  if (recording.value) {
    recorder?.stop()
    return
  }
  stopEnglishSpeech()
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    message.value = 'Chưa dùng được micro. Hãy cho phép trình duyệt truy cập micro rồi thử lại.'
    return
  }
  const chunks: Blob[] = []
  recorder = new MediaRecorder(stream)
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }
  recorder.onstop = () => {
    if (stopTimer) clearTimeout(stopTimer)
    recording.value = false
    releaseMicrophone()
    if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
    recordingUrl.value = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: chunks[0]!.type })) : ''
  }
  recorder.start()
  recording.value = true
  // Short practice clips only.
  stopTimer = setTimeout(() => recorder?.state === 'recording' && recorder.stop(), 15_000)
}
function playMine() {
  if (!recordingUrl.value) return
  compareRequest++
  stopEnglishSpeech()
  mine ??= new Audio()
  mine.src = recordingUrl.value
  void mine.play().catch(() => (message.value = 'Chưa phát được bản ghi của bạn.'))
}
let compareRequest = 0
async function compare() {
  const request = ++compareRequest
  await listen()
  // Let the model finish, then play your own recording right after it.
  await englishSpeechFinished()
  if (request === compareRequest && !message.value) window.setTimeout(playMine, 300)
}
onBeforeUnmount(() => {
  if (stopTimer) clearTimeout(stopTimer)
  if (recorder?.state === 'recording') recorder.stop()
  releaseMicrophone()
  mine?.pause()
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  stopEnglishSpeech()
})
</script>

<template>
  <article class="desk-panel pronunciation-panel" aria-labelledby="english-pronounce-heading">
    <div class="section-heading">
      <h3 id="english-pronounce-heading">
        <i class="bi bi-mic" aria-hidden="true"></i>Luyện phát âm
      </h3>
      <div class="accent-switch" role="group" aria-label="Giọng đọc">
        <button type="button" :aria-pressed="englishAccent === 'uk'" @click="setEnglishAccent('uk')">
          Anh–Anh
        </button>
        <button type="button" :aria-pressed="englishAccent === 'us'" @click="setEnglishAccent('us')">
          Anh–Mỹ
        </button>
      </div>
    </div>
    <label class="field-label" for="pronounce-text">Từ hoặc câu muốn nghe</label>
    <textarea
      id="pronounce-text"
      v-model="text"
      rows="2"
      :maxlength="ENGLISH_SPEECH_MAX"
      placeholder="Ví dụ: three trees / I think it's Thursday."
    ></textarea>
    <div v-if="suggestions?.length" class="pronounce-suggestions" aria-label="Gợi ý luyện tập">
      <button v-for="item in suggestions" :key="item" type="button" @click="pick(item)">{{ item }}</button>
    </div>
    <div class="pronounce-actions">
      <button type="button" class="desk-button" :disabled="busy || !text.trim()" @click="listen(1)">
        <i class="bi bi-volume-up" aria-hidden="true"></i>Nghe mẫu
      </button>
      <button type="button" class="desk-button subtle" :disabled="busy || !text.trim()" @click="listen(0.75)">
        Nghe chậm
      </button>
      <template v-if="canRecord">
        <button
          type="button"
          class="desk-button subtle record-button"
          :class="{ recording }"
          :aria-pressed="recording"
          @click="toggleRecording"
        >
          <i class="bi" :class="recording ? 'bi-stop-circle' : 'bi-record-circle'" aria-hidden="true"></i
          >{{ recording ? 'Dừng ghi' : 'Ghi âm giọng tôi' }}
        </button>
        <button v-if="recordingUrl" type="button" class="desk-button subtle" @click="playMine">
          <i class="bi bi-play-circle" aria-hidden="true"></i>Nghe lại giọng tôi
        </button>
        <button v-if="recordingUrl" type="button" class="desk-button subtle" @click="compare">
          <i class="bi bi-arrow-left-right" aria-hidden="true"></i>Mẫu rồi giọng tôi
        </button>
      </template>
    </div>
    <p v-if="message" class="feedback warning" role="alert">{{ message }}</p>
    <p class="pronounce-hint">
      {{
        source === 'browser'
          ? 'Đang dùng giọng của trình duyệt vì máy đọc Kokoro chưa chạy.'
          : 'Giọng đọc AI Kokoro (tự nhiên, không phải audio gốc của sách).'
      }}
      <template v-if="canRecord"> Bản ghi của bạn chỉ nằm trong trình duyệt, không tải lên server.</template>
    </p>
  </article>
</template>

<style scoped src="./englishSelfStudy.css"></style>
<style scoped>
.pronounce-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.pronounce-suggestions button {
  padding: 4px 11px;
  border: 1px solid var(--learn-border);
  border-radius: 999px;
  background: var(--learn-surface);
  color: var(--learn-text);
  font-size: var(--learn-text-xs);
  cursor: pointer;
}
.pronounce-suggestions button:hover {
  border-color: var(--learn-primary);
  color: var(--learn-primary);
}
.pronounce-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.desk-button:disabled {
  opacity: 0.55;
  cursor: progress;
}
.record-button.recording {
  border-color: var(--learn-danger);
  background: var(--learn-danger-soft);
  color: var(--learn-danger);
}
.pronounce-hint {
  margin-top: 10px !important;
  color: var(--learn-subtle);
  font-size: var(--learn-text-xs);
}
.accent-switch {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--learn-border);
  border-radius: 999px;
  background: var(--learn-surface-muted);
}
.accent-switch button {
  min-height: 28px;
  padding: 2px 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--learn-muted);
  font-size: var(--learn-text-xs);
  font-weight: 600;
  cursor: pointer;
}
.accent-switch button[aria-pressed='true'] {
  background: var(--learn-primary);
  color: #fff;
}
.pronunciation-panel textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--learn-border);
  border-radius: 10px;
  font: inherit;
  resize: vertical;
}
</style>

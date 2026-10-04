<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import manifest from '@/data/try-n3-audio.json'

const props = defineProps<{ track?: string; source?: string; label?: string }>()
const player = ref<HTMLAudioElement | null>(null)
const speed = ref(1)
const failed = ref(false)
const measuredDuration = ref(0)
const heading = computed(() => props.label || (props.source ? 'Nghe file đã tải lên' : `Nghe CD ${props.track ?? ''}`))
const figure = computed(() => ({
  '16': 'Người khách đang chỉ vào ảnh mẫu tóc tại tiệm làm tóc; mũi tên chỉ người khách.',
  '52': 'Hai người nhìn trời nhiều mây; mũi tên chỉ người đàn ông.',
  '55': 'Hai người đang nói chuyện; mũi tên chỉ người đàn ông bị đau đầu.',
} as Record<string, string>)[props.source ? '' : props.track ?? ''])
const figureSource = computed(() => `${import.meta.env.BASE_URL}images/try-n3/cd${props.track}.png`)
const listeningHint = computed(() => {
  if (props.source) return ''
  if (figure.value) return '絵を見ながら質問を聞いてください。矢印（→）の人は何と言いますか。1から3の中から、最もよいものを一つえらんでください。'
  if (['50', '51'].includes(props.track ?? '')) return '話の前に質問はありません。まず話を聞いてください。それから、質問と選択肢を聞いて、1から4の中から、最もよいものを一つえらんでください。'
  if (['06','19','20','21','22','23','27','28','29','30','33','34','35','36','37','38','41','42','43','45','46','47','56','57','58','62','63','64'].includes(props.track ?? '')) return 'まず文を聞いてください。それから、その返事を聞いて、1から3の中から、最もよいものを一つえらんでください。'
  return ''
})
const entry = computed(() => (manifest.tracks as Record<string, { path: string; durationSeconds: number }>)[props.source ? '' : props.track ?? ''])
const source = computed(() => props.source || (entry.value ? `${import.meta.env.BASE_URL}${entry.value.path}` : ''))
const duration = computed(() => {
  const seconds = Math.floor(props.source ? measuredDuration.value : entry.value?.durationSeconds ?? 0)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})
function changeSpeed() { if (player.value) player.value.playbackRate = speed.value }
function metadata() { measuredDuration.value = Number.isFinite(player.value?.duration) ? player.value!.duration : 0; changeSpeed() }
watch(source, () => { failed.value = false; measuredDuration.value = 0; player.value?.pause() })
function playing() { window.dispatchEvent(new CustomEvent('book-audio:playing', { detail: player.value })) }
function pauseOthers(event: Event) {
  if ((event as CustomEvent).detail !== player.value && player.value && !player.value.paused) player.value.pause()
}
async function replay() {
  if (!player.value) return
  player.value.currentTime = 0
  try { await player.value.play() } catch { failed.value = true }
}
function retry() { failed.value = false; player.value?.load() }
onMounted(() => window.addEventListener('book-audio:playing', pauseOthers))
onBeforeUnmount(() => {
  window.removeEventListener('book-audio:playing', pauseOthers)
  if (player.value && !player.value.paused) player.value.pause()
})
</script>

<template>
  <div class="book-audio">
    <p v-if="listeningHint" class="listening-hint" lang="ja">{{ listeningHint }}</p>
    <div class="audio-heading"><strong>{{ heading }}</strong><span v-if="!props.source || measuredDuration">{{ duration }}</span></div>
    <audio v-if="source" ref="player" :src="source" :crossorigin="props.source ? 'use-credentials' : undefined" controls preload="none" :aria-label="heading" @play="playing" @loadedmetadata="metadata" @error="failed = true" @canplay="failed = false"></audio>
    <div class="audio-actions"><label>Tốc độ <select v-model="speed" @change="changeSpeed"><option :value="0.75">0,75×</option><option :value="1">1×</option><option :value="1.25">1,25×</option><option :value="1.5">1,5×</option></select></label><button type="button" @click="replay">Nghe lại từ đầu</button></div>
    <p v-if="failed || !source" class="audio-error" role="alert">Chưa phát được file nghe. <button type="button" @click="retry">Thử lại</button></p>
    <figure v-if="figure" class="listening-figure">
      <img :src="figureSource" :alt="figure" loading="lazy">
    </figure>
  </div>
</template>

<style scoped>
.book-audio { margin: 16px 0; padding: 16px 20px; border: 1px solid #dce6f3; border-radius: 12px; background: #f5f8fd; min-width: 0; }
.audio-heading { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 12px; font-size: 15px; color: #31547c; }.audio-heading span { color: #64748b; font-size: 13px; }
audio { width: 100%; height: 40px; display: block; }
.audio-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 12px; color: #526479; font-size: 13px; }
select { margin-left: 8px; border: 1px solid #d3deed; border-radius: 6px; background: #fff; color: #334155; padding: 4px 6px; }
button { background: #fff; border: 1px solid #d3deed; border-radius: 6px; color: #31547c; padding: 5px 10px; font-size: 13px; }
.audio-error { color: #a34141; font-size: 13px; margin: 12px 0 0; }
.listening-figure { margin: 16px 0 0; color: #334155; line-height: 1.8; }
.listening-hint { margin: 0 0 12px; font-size: 15px; line-height: 1.8; }
.listening-figure img { display: block; width: 280px; max-width: 100%; height: auto; margin: 12px auto 0; border-radius: 8px; }
</style>

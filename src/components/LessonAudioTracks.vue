<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import { importedAudioUrl, type LessonTrack } from '@/services/bookImport'

/** Labelled listening tracks of a lesson (ことば, 文型, 例文, 練習 A/B/C …), grouped by part, one player at a time. */
const props = defineProps<{ tracks: LessonTrack[] }>()

const groupName = (label: string) => {
  const japanese = label.split(' · ')[0] ?? label
  const practice = japanese.match(/^練習\s*([ABC])/)
  return practice ? `練習 ${practice[1]}` : japanese
}
const groupTitle: Record<string, string> = {
  'ことば': 'Từ vựng', '文型': 'Mẫu câu', '例文': 'Câu ví dụ', '会話': 'Hội thoại',
  '練習 A': 'Luyện tập A', '練習 B': 'Luyện tập B', '練習 C': 'Luyện tập C', '問題': 'Bài tập nghe', '読み物': 'Bài đọc',
}
const groups = computed(() => {
  const map = new Map<string, LessonTrack[]>()
  for (const track of props.tracks) {
    const key = groupName(track.label)
    map.set(key, [...(map.get(key) ?? []), track])
  }
  return [...map.entries()].map(([key, tracks]) => ({ key, title: groupTitle[key] ?? '', tracks }))
})
const shortLabel = (track: LessonTrack) => {
  const japanese = track.label.split(' · ')[0] ?? track.label
  const practice = japanese.match(/^練習\s*([ABC]\d*)/)
  return practice ? practice[1]! : japanese
}
const selectedId = ref<number | null>(props.tracks[0]?.id ?? null)
watch(() => props.tracks, (tracks) => { selectedId.value = tracks[0]?.id ?? null })
const selected = computed(() => props.tracks.find((track) => track.id === selectedId.value))
const source = computed(() => importedAudioUrl(selected.value?.url))
</script>

<template>
  <section v-if="tracks.length" class="lesson-tracks" aria-label="File nghe của bài">
    <div class="tracks-heading">
      <i class="bi bi-headphones" aria-hidden="true"></i>
      <strong>Nghe theo phần</strong>
      <span>{{ tracks.length }} file</span>
    </div>
    <div v-for="group in groups" :key="group.key" class="track-group">
      <span class="group-name"><span lang="ja">{{ group.key }}</span><small v-if="group.title">{{ group.title }}</small></span>
      <div class="track-buttons">
        <button
          v-for="track in group.tracks"
          :key="track.id"
          type="button"
          :aria-pressed="track.id === selectedId"
          :title="track.label"
          @click="selectedId = track.id"
        >
          <i class="bi" :class="track.id === selectedId ? 'bi-volume-up-fill' : 'bi-play-fill'" aria-hidden="true"></i>
          <span lang="ja">{{ shortLabel(track) }}</span>
        </button>
      </div>
    </div>
    <BookAudioPlayer v-if="selected && source" :key="selected.id" :source="source" :label="selected.label" />
  </section>
</template>

<style scoped>
.lesson-tracks { margin: 0 0 18px; padding: 14px 16px; border: 1px solid var(--learn-border); border-radius: 14px; background: var(--learn-primary-softer); }
.tracks-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--learn-heading); }
.tracks-heading i { color: var(--learn-primary); font-size: 18px; }
.tracks-heading span { margin-left: auto; color: var(--learn-muted); font-size: 13px; }
.track-group { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 8px 12px; align-items: center; padding: 6px 0; border-top: 1px dashed var(--learn-border); }
.group-name { display: flex; flex-direction: column; line-height: 1.3; color: var(--learn-heading); font-weight: 650; font-size: 15px; }
.group-name small { color: var(--learn-muted); font-size: 12px; font-weight: 500; }
.track-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
.track-buttons button { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 4px 12px; border: 1px solid var(--learn-border); border-radius: 999px; background: #fff; color: var(--learn-text); font-size: 14px; font-weight: 600; cursor: pointer; }
.track-buttons button:hover { border-color: var(--learn-primary); color: var(--learn-primary); }
.track-buttons button[aria-pressed='true'] { border-color: var(--learn-primary); background: var(--learn-primary); color: #fff; }
.track-buttons button:focus-visible { outline: 3px solid var(--learn-focus); outline-offset: 2px; }
.lesson-tracks :deep(.book-audio) { margin-top: 12px; }
@media (max-width: 600px) {
  .track-group { grid-template-columns: minmax(0, 1fr); }
  .track-buttons button { min-height: 40px; }
}
</style>

<script setup lang="ts">
import { japaneseReadingPrefs } from '@/services/japaneseReadings'
</script>

<template>
  <div class="jr-toggle" role="group" aria-label="Cách đọc chữ Hán">
    <button
      type="button"
      :aria-pressed="japaneseReadingPrefs.furigana"
      title="Rê chuột hoặc chạm vào chữ Hán để xem cách đọc hiragana"
      @click="japaneseReadingPrefs.furigana = !japaneseReadingPrefs.furigana"
    >
      Hiragana
    </button>
    <button
      type="button"
      :aria-pressed="japaneseReadingPrefs.hanViet"
      title="Rê chuột hoặc chạm vào chữ Hán để xem âm Hán Việt"
      @click="japaneseReadingPrefs.hanViet = !japaneseReadingPrefs.hanViet"
    >
      Hán Việt
    </button>
    <button
      type="button"
      class="meaning-toggle"
      :aria-pressed="japaneseReadingPrefs.meaning"
      :title="japaneseReadingPrefs.meaning ? 'Ẩn nghĩa tiếng Việt của các câu ví dụ' : 'Hiện nghĩa tiếng Việt của tất cả câu ví dụ'"
      @click="japaneseReadingPrefs.meaning = !japaneseReadingPrefs.meaning"
    >
      <i class="bi" :class="japaneseReadingPrefs.meaning ? 'bi-eye-slash' : 'bi-eye'" aria-hidden="true"></i>{{ japaneseReadingPrefs.meaning ? 'Ẩn nghĩa' : 'Hiện nghĩa' }}
    </button>
  </div>
</template>

<style scoped>
.jr-toggle { display: inline-flex; gap: 4px; padding: 3px; border: 1px solid var(--learn-border); border-radius: 999px; background: var(--learn-surface-muted); }
.jr-toggle button { display: inline-flex; align-items: center; gap: 4px; min-height: 30px; padding: 2px 12px; border: 0; border-radius: 999px; background: transparent; color: var(--learn-muted); font-size: var(--learn-text-xs); font-weight: 650; cursor: pointer; }
.jr-toggle button[aria-pressed='true'] { background: var(--learn-primary); color: #fff; }
.jr-toggle button:focus-visible { outline: 3px solid var(--learn-focus); outline-offset: 1px; }
.jr-toggle .meaning-toggle { margin-left: 2px; border-left: 1px solid var(--learn-border); border-radius: 0 999px 999px 0; }
.jr-toggle .meaning-toggle[aria-pressed='true'] { border-radius: 999px; }
</style>

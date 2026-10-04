<script setup lang="ts">
import { computed } from 'vue'
import { exerciseBookLayout } from '@/services/exerciseBookLayout'
const props = defineProps<{ typeName: string; index: number }>()
const section = computed(() => exerciseBookLayout(props.typeName))
const sourceUrl = (image: string) => `${import.meta.env.BASE_URL}${image}`
</script>

<template>
  <header v-if="section" :id="section.title === '聴解' ? 'book-listening' : undefined" class="book-exercise-heading">
    <div class="section-title"><span class="section-number">問題{{ section.number }}</span><h3 lang="ja">〈{{ section.title }}〉</h3><span class="section-translation">{{ section.vietnameseTitle }}</span></div>
    <p class="instruction" lang="ja">{{ section.instruction }}</p>
    <p class="source">Trang sách {{ section.sourcePrintedPages }}</p>
    <p v-if="section.aiAnswerCount" class="ai-answers">Đã bổ sung {{ section.aiAnswerCount }}/{{ section.questionCount }} đáp án do AI tự giải, kèm giải thích. Chưa đối chiếu đáp án chính thức của sách.</p>
    <p v-if="section.answersReviewed === false" class="pending-answers">Còn {{ section.pendingAnswerCount ?? section.questionCount }} câu chờ kiểm tra. Bạn có thể luyện và xem lời giải hiện có; bài có câu chờ kiểm tra chưa chấm điểm.</p>
    <details v-if="section.sourceImages?.length" class="source-pages">
      <summary>Xem trang sách gốc và hình minh họa</summary>
      <img v-for="sourceImage in section.sourceImages" :key="sourceImage" :src="sourceUrl(sourceImage)" alt="Trang sách gốc TRY N4" loading="lazy">
    </details>
    <div v-if="section.reading" class="shared-reading" lang="ja">{{ section.reading }}</div>
  </header>
  <h3 v-else class="generic-heading">Bài {{ index + 1 }}: {{ typeName }}</h3>
</template>

<style scoped>
.book-exercise-heading { margin-bottom: 24px; }
.section-title { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.section-number { background: #26364a; color: #fff; padding: 6px 15px; border-radius: 6px; font-size: 17px; font-weight: 700; }
h3 { font-size: 20px; font-weight: 700; margin: 0; color: #24334b; }
.section-translation { color: #64748b; font-size: 14px; }
.instruction { margin: 18px 0 8px; font-size: 17px; line-height: 1.9; overflow-wrap: anywhere; }
.source { margin: 0; font-size: 12px; color: #748296; }
.pending-answers { color: #805b20; font-size: 14px; margin: 12px 0; }
.ai-answers { color: #475569; font-size: 14px; margin: 12px 0; }
.source-pages { margin: 12px 0; }.source-pages summary { cursor: pointer; }.source-pages img { display: block; max-width: 100%; height: auto; margin: 12px auto; }
.shared-reading { border: 1px dashed #8493a6; padding: 24px; margin-top: 24px; font-size: 18px; line-height: 2.2; white-space: pre-line; overflow-wrap: anywhere; background: #fff; }
.generic-heading { background: #eef4ff; border-radius: 10px; padding: 16px; font-size: 19px; line-height: 1.8; margin-bottom: 20px; }
@media (max-width: 600px) { .shared-reading { padding: 18px; font-size: 16px; }.instruction { font-size: 16px; } }
</style>

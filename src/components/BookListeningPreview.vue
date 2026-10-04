<script setup lang="ts">
import { tryN3Listening as section } from '@/services/exerciseBookLayout'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
</script>

<template>
  <section id="book-listening" class="book-listening" aria-label="問題4 聴解">
    <h3><span>問題{{ section.number }}</span>〈{{ section.title }}〉 <small>{{ section.vietnameseTitle }}</small></h3>
    <p class="audio-status">Đề nghe chưa được thêm vào bộ chấm của bài này.</p>
    <p class="instruction" lang="ja">1. {{ section.instruction1 }}</p>
    <div v-for="question in section.questions" :key="question.number" class="listening-question">
      <div class="question-meta"><span class="question-number">{{ question.number }}</span><span>CD {{ question.track }}</span></div>
      <BookAudioPlayer :track="question.track" />
      <ol lang="ja"><li v-for="(choice, index) in question.choices" :key="choice"><b>{{ index + 1 }}</b> {{ choice }}</li></ol>
    </div>
    <p class="instruction" lang="ja">2. {{ section.instruction2 }}</p>
    <BookAudioPlayer :track="section.track" />
    <div class="response-choices" lang="ja"><span>1</span><span>2</span><span>3</span><small>CD {{ section.track }}</small></div>
    <p class="source">Trang sách {{ section.sourcePrintedPages }}</p>
  </section>
</template>

<style scoped>
.book-listening { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; margin-top: 28px; color: #24334b; scroll-margin-top: 170px; }
h3 { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; font-size: 20px; font-weight: 700; margin: 0; }
h3 > span { background: #26364a; color: #fff; padding: 6px 15px; border-radius: 6px; font-size: 17px; }
small { font-size: 14px; color: #64748b; font-weight: 400; }
.audio-status { font-size: 14px; color: #765b2e; padding: 12px 16px; background: #fff9e9; border-radius: 8px; margin: 20px 0; }
.instruction { font-size: 17px; line-height: 1.9; margin: 24px 0; }
.listening-question { margin-bottom: 28px; }
.question-meta { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #64748b; margin-bottom: 14px; }
.question-number { display: grid; place-items: center; width: 34px; height: 28px; border: 1px solid #94a3b8; color: #24334b; font-size: 16px; }
ol { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); list-style: none; padding: 0; margin: 0; gap: 16px; font-size: 17px; line-height: 1.8; }
li b { margin-right: 12px; }.response-choices { display: flex; gap: 32px; align-items: center; }.response-choices small { margin-left: auto; }.source { color: #748296; font-size: 12px; margin-top: 24px; }
@media (max-width: 600px) { .book-listening { padding: 18px; }ol { grid-template-columns: 1fr; } }
</style>

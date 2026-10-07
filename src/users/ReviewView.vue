<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDueCards, getResults, getWrongAnswers, latestResults, reviewCard, type LessonResult, type StudyCard, type WrongAnswer } from '@/api/study'
import { gatewayUrl } from '@/api/authApi'
import './studyPages.css'

const tab = ref<'cards' | 'lessons' | 'wrong'>('cards')
const cards = ref<StudyCard[]>([])
const results = ref<LessonResult[]>([])
const wrong = ref<WrongAnswer[]>([])
const openedLessonId = ref<number | null>(null)
const questions = ref<Record<number, { exerciseKeywordId: number; contentNihongo: string; answerA: string; answerB: string; answerC: string; answerD: string }>>({})
const loadingQuestions = ref(false)
const revealed = ref(false)
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const weak = computed(() => latestResults(results.value).filter(r => r.score < 80))
const current = computed(() => cards.value[0])
const wrongLessons = computed(() => {
  const grouped = new Map<number, number>()
  for (const answer of wrong.value) grouped.set(answer.lessonId, (grouped.get(answer.lessonId) || 0) + 1)
  return [...grouped].map(([lessonId, count]) => ({ lessonId, count, name: results.value.find(r => r.lessonId === lessonId)?.lessonName || `Bài ${lessonId}` }))
})

async function load() {
  loading.value = true; error.value = ''
  const [cardsResult, resultsResult, wrongResult] = await Promise.allSettled([getDueCards(), getResults(), getWrongAnswers()])
  if (cardsResult.status === 'fulfilled') cards.value = cardsResult.value
  if (resultsResult.status === 'fulfilled') results.value = resultsResult.value
  if (wrongResult.status === 'fulfilled') wrong.value = wrongResult.value
  if ([cardsResult, resultsResult, wrongResult].some(r => r.status === 'rejected')) error.value = 'Không tải được đầy đủ dữ liệu ôn tập. Hãy thử lại.'
  loading.value = false
}
async function answer(remembered: boolean) {
  if (!current.value || busy.value) return
  busy.value = true; error.value = ''
  try {
    await reviewCard(current.value.id, remembered)
    cards.value.shift(); revealed.value = false
  } catch { error.value = 'Chưa lưu được kết quả ôn tập. Hãy thử lại.' }
  finally { busy.value = false }
}
async function openWrong(lessonId: number) {
  if (openedLessonId.value === lessonId) { openedLessonId.value = null; return }
  openedLessonId.value = lessonId
  loadingQuestions.value = true
  try {
    const response = await gatewayUrl.get<Array<{ exerciseKeywordId: number; contentNihongo: string; answerA: string; answerB: string; answerC: string; answerD: string }>>(`/api/staff/getAllExcercisesKeywordOfLesson/${lessonId}`)
    questions.value = Object.fromEntries(response.data.map(question => [question.exerciseKeywordId, question]))
  } catch { error.value = 'Không tải được nội dung câu sai. Hãy thử lại.' }
  finally { loadingQuestions.value = false }
}
function plain(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html || ''
  template.content.querySelectorAll('rt,rp').forEach(node => node.remove())
  return template.content.textContent?.replace(/\s+/g, ' ').trim() || ''
}
function answerText(question: { answerA: string; answerB: string; answerC: string; answerD: string } | undefined, key: string | null) {
  if (!question || !key) return 'Chưa chọn'
  return plain(question[`answer${key}` as keyof typeof question] || key)
}
onMounted(load)
</script>

<template>
  <div class="study-page">
    <header class="study-hero"><h1>Ôn tập</h1><p>Ôn thẻ đến hạn, luyện lại bài điểm thấp và xem những câu đã sai.</p></header>
    <div class="study-actions" role="tablist" aria-label="Nội dung ôn tập">
      <button class="study-button" :class="{ secondary: tab !== 'cards' }" role="tab" :aria-selected="tab === 'cards'" @click="tab = 'cards'">Thẻ ôn ({{ cards.length }})</button>
      <button class="study-button" :class="{ secondary: tab !== 'lessons' }" role="tab" :aria-selected="tab === 'lessons'" @click="tab = 'lessons'">Bài yếu ({{ weak.length }})</button>
      <button class="study-button" :class="{ secondary: tab !== 'wrong' }" role="tab" :aria-selected="tab === 'wrong'" @click="tab = 'wrong'">Câu sai ({{ wrong.length }})</button>
    </div>
    <p v-if="error" class="study-error" role="alert">{{ error }} <button type="button" @click="load">Tải lại</button></p>
    <p v-if="loading" role="status">Đang tải...</p>
    <template v-else-if="tab === 'cards'">
      <section v-if="current" class="study-panel" style="margin-top:20px; max-width:720px">
        <p class="study-meta">{{ current.kind === 'EXAMPLE' ? 'Câu ví dụ' : current.kind === 'GRAMMAR' ? 'Ngữ pháp' : 'Từ vựng' }} · Còn {{ cards.length }} thẻ</p>
        <h2 lang="ja" style="font-size:24px">{{ current.front }}</h2>
        <template v-if="revealed"><p>{{ current.back }}</p><p v-if="current.note" class="study-meta">Ghi chú: {{ current.note }}</p>
          <div class="study-actions"><button class="study-button secondary" :disabled="busy" @click="answer(false)">Chưa nhớ · ôn lại sau 10 phút</button><button class="study-button" :disabled="busy" @click="answer(true)">Đã nhớ</button></div>
        </template>
        <button v-else class="study-button" @click="revealed = true">Hiện đáp án</button>
      </section>
      <div v-else class="study-empty" style="margin-top:20px">Bạn đã ôn hết thẻ đến hạn. <RouterLink to="/user/notebook">Xem sổ tay</RouterLink></div>
    </template>
    <template v-else-if="tab === 'lessons'"><div v-if="weak.length" class="study-list"><section v-for="item in weak" :key="item.lessonId" class="study-panel"><h2>{{ item.lessonName || `Bài ${item.lessonId}` }}</h2><p>Lần gần nhất: {{ Math.round(item.score) }} điểm · {{ item.wrongCount }} câu sai</p><RouterLink class="study-button" :to="{ name: 'course-lesson-exercises', params: { lessonId: item.lessonId } }">Luyện lại bài</RouterLink></section></div><p v-else class="study-empty" style="margin-top:20px">Chưa có bài nào dưới 80 điểm.</p></template>
    <template v-else><div v-if="wrongLessons.length" class="study-list"><section v-for="item in wrongLessons" :key="item.lessonId" class="study-panel"><h2>{{ item.name }}</h2><p>{{ item.count }} câu cần xem lại</p><div class="study-actions"><button class="study-button secondary" @click="openWrong(item.lessonId)">{{ openedLessonId === item.lessonId ? 'Ẩn câu sai' : 'Xem câu sai' }}</button><RouterLink class="study-button" :to="{ name: 'course-lesson-exercises', params: { lessonId: item.lessonId } }">Luyện lại bài</RouterLink></div><div v-if="openedLessonId === item.lessonId" class="study-list"><p v-if="loadingQuestions">Đang tải câu hỏi...</p><article v-for="answer in wrong.filter(w => w.lessonId === item.lessonId)" v-else :key="answer.id" class="study-panel"><h3 lang="ja">{{ plain(questions[answer.exerciseId]?.contentNihongo || `Câu ${answer.exerciseId}`) }}</h3><p>Bạn chọn: {{ answerText(questions[answer.exerciseId], answer.chosenAnswer) }}</p><p>Đáp án đúng: <strong>{{ answer.correctAnswer }} · {{ answerText(questions[answer.exerciseId], answer.correctAnswer) }}</strong></p></article></div></section></div><p v-else class="study-empty" style="margin-top:20px">Chưa có câu sai cần ôn.</p></template>
  </div>
</template>

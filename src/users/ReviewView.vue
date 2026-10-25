<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getDueBatch, getWrongPage, getWeakPage, rateCard, practiceWrong, masterWrong,
  type StudyCard, type WrongAnswer, type WeakLesson, type ReviewRating } from '@/api/study'
import { gatewayUrl } from '@/api/authApi'
import './studyPages.css'

interface Question { exerciseKeywordId: number; contentNihongo: string; answerA: string; answerB: string; answerC: string; answerD: string }
const tab = ref<'cards' | 'lessons' | 'wrong'>('cards')
const route = useRoute()
watch(() => route.query.tab, value => { tab.value = value === 'lessons' || value === 'wrong' ? value : 'cards' }, { immediate: true })
const cards = ref<StudyCard[]>([]), weak = ref<WeakLesson[]>([]), wrong = ref<WrongAnswer[]>([])
const weakPage = ref(0), weakPages = ref(0), weakTotal = ref(0)
const wrongPage = ref(0), wrongPages = ref(0), wrongTotal = ref(0)
const openedId = ref<number | null>(null), question = ref<Question | null>(null)
const practiceResult = ref<{ correct: boolean; correctAnswer: string } | null>(null)
const loadingQuestions = ref(false), revealed = ref(false), busy = ref(false), loading = ref(true)
const error = ref(''), feedback = ref('')
const current = computed(() => cards.value[0])
let questionRequest = 0, disposed = false
// Show what the learner recognises (lesson name, question text) instead of database ids. Lesson locations are tiny
// and cached by the content service; a lesson's questions are fetched once and reused when practising.
interface LessonInfo { name: string; bookId: number | null }
const lessonInfo = ref<Record<number, LessonInfo>>({})
const lessonQuestions = new Map<number, Promise<Question[]>>()
function questionsOf(lessonId: number) {
  let request = lessonQuestions.get(lessonId)
  if (!request) {
    request = Promise.resolve().then(() => gatewayUrl.get<Question[]>(`/api/staff/getAllExcercisesKeywordOfLesson/${lessonId}`)).then(r => r.data)
    request.catch(() => lessonQuestions.delete(lessonId))
    lessonQuestions.set(lessonId, request)
  }
  return request
}
const questionText = ref<Record<number, string>>({})
async function describe(lessonIds: number[], wrongItems: WrongAnswer[] = []) {
  for (const lessonId of new Set(lessonIds)) {
    if (lessonInfo.value[lessonId]) continue
    void Promise.resolve().then(() => gatewayUrl.get<{ bookId: number | null; name: string }>(`/api/staff/lessons/${lessonId}/location`))
      .then(({ data }) => { if (!disposed && data?.name) lessonInfo.value = { ...lessonInfo.value, [lessonId]: { name: data.name, bookId: data.bookId } } })
      .catch(() => { /* fall back to the generic label */ })
  }
  for (const item of wrongItems) {
    if (questionText.value[item.exerciseId]) continue
    void questionsOf(item.lessonId).then(rows => {
      const row = rows.find(q => q.exerciseKeywordId === item.exerciseId)
      if (row && !disposed) questionText.value = { ...questionText.value, [item.exerciseId]: shorten(plain(row.contentNihongo)) }
    }).catch(() => {})
  }
}
function shorten(text: string) { return text.length > 90 ? `${text.slice(0, 90)}…` : text }
function lessonLabel(lessonId: number) { return lessonInfo.value[lessonId]?.name || 'Bài học' }
function lessonLink(lessonId: number) {
  const bookId = lessonInfo.value[lessonId]?.bookId
  return { name: 'course-lesson-exercises', params: { lessonId }, query: bookId ? { bookId: String(bookId) } : {} }
}
async function loadWeak(page = weakPage.value) {
  const r = await getWeakPage(page)
  weak.value = r.content; weakPage.value = r.number; weakPages.value = r.totalPages; weakTotal.value = r.totalElements
  void describe(r.content.map(item => item.lessonId))
}
async function loadWrong(page = wrongPage.value): Promise<void> {
  const r = await getWrongPage(page)
  if (!r.content.length && page > 0) return loadWrong(Math.max(0, r.totalPages - 1))
  wrong.value = r.content; wrongPage.value = r.number; wrongPages.value = r.totalPages; wrongTotal.value = r.totalElements
  void describe(r.content.map(item => item.lessonId), r.content)
}
async function load() {
  if (busy.value || loading.value && cards.value.length) return
  loading.value = true; error.value = ''; openedId.value = null; questionRequest++; revealed.value = false
  const outcomes = await Promise.allSettled([getDueBatch().then(value => { cards.value = value }), loadWeak(), loadWrong()])
  if (outcomes.some(r => r.status === 'rejected')) error.value = 'Không tải được đầy đủ dữ liệu ôn tập. Hãy thử lại.'
  loading.value = false
}
async function answer(rating: ReviewRating) {
  if (!current.value || busy.value) return
  busy.value = true; error.value = ''; feedback.value = ''
  try {
    const reviewed = await rateCard(current.value.id, rating)
    cards.value.shift(); revealed.value = false
    feedback.value = `Đã lưu. Ôn thẻ này tiếp vào ${new Date(reviewed.dueAt).toLocaleString('vi-VN')}.`
    if (!cards.value.length) cards.value = await getDueBatch()
  } catch { error.value = 'Chưa lưu được hoặc thẻ chưa đến hạn. Hãy tải lại để cập nhật lịch ôn.' }
  finally { busy.value = false }
}
async function changePage(kind: 'lessons' | 'wrong', page: number) {
  if (busy.value) return
  busy.value = true; error.value = ''; questionRequest++; openedId.value = null
  try { if (kind === 'lessons') await loadWeak(page); else await loadWrong(page) }
  catch { error.value = 'Không tải được trang tiếp theo. Hãy thử lại.' }
  finally { busy.value = false }
}
async function openWrong(answer: WrongAnswer) {
  if (busy.value) return
  if (openedId.value === answer.id) { openedId.value = null; questionRequest++; return }
  openedId.value = answer.id; question.value = null; practiceResult.value = null
  loadingQuestions.value = true; error.value = ''
  const id = ++questionRequest
  try {
    const rows = await questionsOf(answer.lessonId)
    if (disposed || id !== questionRequest) return
    question.value = rows.find(q => q.exerciseKeywordId === answer.exerciseId) || null
    if (!question.value) error.value = 'Câu hỏi không còn trong bài học. Bạn có thể bỏ câu khỏi danh sách ôn.'
  } catch { if (!disposed && id === questionRequest) error.value = 'Không tải được câu hỏi. Kiểm tra quyền học hoặc thử lại.' }
  finally { if (!disposed && id === questionRequest) loadingQuestions.value = false }
}
async function choose(answer: WrongAnswer, choice: string) {
  if (busy.value) return
  busy.value = true; error.value = ''; feedback.value = ''
  try {
    practiceResult.value = await practiceWrong(answer.id, choice)
    if (practiceResult.value.correct) {
      feedback.value = 'Chính xác! Câu đã được đánh dấu nắm vững và bỏ khỏi danh sách câu sai.'
      openedId.value = null; await loadWrong()
    }
  } catch { error.value = 'Chưa chấm được câu này. Hãy thử lại hoặc mở lại bài học.' }
  finally { busy.value = false }
}
async function master(answer: WrongAnswer) {
  if (busy.value || !confirm('Đánh dấu đã nắm vững và bỏ câu này khỏi danh sách ôn?')) return
  busy.value = true; error.value = ''
  try { await masterWrong(answer.id); openedId.value = null; feedback.value = 'Đã đánh dấu câu này là nắm vững.'; await loadWrong() }
  catch { error.value = 'Chưa cập nhật được câu này. Hãy thử lại.' }
  finally { busy.value = false }
}
function plain(html: string) {
  const template = document.createElement('template'); template.innerHTML = html || ''
  template.content.querySelectorAll('rt,rp').forEach(node => node.remove())
  return template.content.textContent?.replace(/\s+/g, ' ').trim() || ''
}
function answerText(key: string) { return question.value ? plain(question.value[`answer${key}` as 'answerA'] || key) : key }
onMounted(load)
onBeforeUnmount(() => { disposed = true; questionRequest++ })
</script>

<template>
  <div class="study-page">
    <header class="study-hero"><p class="study-eyebrow">Luyện tập thích ứng</p><h1>Ôn tập</h1><p>Ôn thẻ đến hạn, luyện bài yếu và chinh phục từng câu từng làm sai.</p></header>
    <div class="study-actions" role="tablist" aria-label="Nội dung ôn tập">
      <button class="study-button" :class="{ secondary: tab !== 'cards' }" role="tab" :aria-selected="tab === 'cards'" @click="tab = 'cards'">Thẻ ôn</button>
      <button class="study-button" :class="{ secondary: tab !== 'lessons' }" role="tab" :aria-selected="tab === 'lessons'" @click="tab = 'lessons'">Bài yếu ({{ weakTotal }})</button>
      <button class="study-button" :class="{ secondary: tab !== 'wrong' }" role="tab" :aria-selected="tab === 'wrong'" @click="tab = 'wrong'">Câu sai ({{ wrongTotal }})</button>
    </div>
    <p v-if="error" class="study-error" role="alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ error }} <button :disabled="busy || loading" type="button" @click="load">Tải lại</button></p>
    <p v-if="feedback" class="study-feedback" role="status">{{ feedback }}</p>
    <div v-if="loading" class="study-loading" role="status"><span class="study-spinner" aria-hidden="true"></span><span>Đang tải dữ liệu ôn tập...</span></div>
    <template v-else-if="tab === 'cards'">
      <section v-if="current" class="study-panel" style="margin-top:20px;max-width:720px">
        <p class="study-meta">{{ current.kind === 'EXAMPLE' ? 'Câu ví dụ' : current.kind === 'GRAMMAR' ? 'Ngữ pháp' : 'Từ vựng' }} · {{ cards.length }} thẻ trong lượt này</p>
        <h2 lang="ja" style="font-size:24px">{{ current.front }}</h2>
        <template v-if="revealed"><p>{{ current.back }}</p><p v-if="current.note" class="study-meta">Ghi chú: {{ current.note }}</p>
          <div class="study-actions"><button class="study-button secondary" :disabled="busy" @click="answer('AGAIN')">Quên · 10 phút</button><button class="study-button secondary" :disabled="busy" @click="answer('HARD')">Khó</button><button class="study-button" :disabled="busy" @click="answer('GOOD')">Nhớ</button><button class="study-button" :disabled="busy" @click="answer('EASY')">Dễ</button></div>
          <p class="study-meta" style="margin-top:12px">Khó: ôn sớm hơn · Nhớ: lịch chuẩn · Dễ: giãn lịch ôn.</p>
        </template>
        <button v-else class="study-button" :disabled="busy" @click="revealed = true">Hiện đáp án</button>
      </section>
      <div v-else class="study-empty" style="margin-top:20px">Bạn đã ôn hết thẻ đến hạn. <RouterLink to="/user/notebook">Xem sổ tay</RouterLink><div class="study-actions"><button class="study-button secondary" :disabled="busy" @click="load">Kiểm tra thẻ đến hạn</button></div></div>
    </template>
    <template v-else-if="tab === 'lessons'">
      <div v-if="weak.length" class="study-list"><section v-for="item in weak" :key="item.lessonId" class="study-panel"><h2>{{ lessonLabel(item.lessonId) }}</h2><p>Lần gần nhất: {{ Math.round(item.score) }} điểm · {{ new Date(item.submittedAt).toLocaleString('vi-VN') }}</p><RouterLink class="study-button" :to="lessonLink(item.lessonId)">Luyện lại bài</RouterLink></section></div>
      <p v-else class="study-empty" style="margin-top:20px">Chưa có bài nào dưới 80 điểm.</p>
      <nav v-if="weakPages > 1" class="study-pagination" aria-label="Trang bài yếu"><button class="study-button secondary" :disabled="busy || weakPage === 0" @click="changePage('lessons', weakPage - 1)">Trước</button><span>{{ weakPage + 1 }} / {{ weakPages }}</span><button class="study-button secondary" :disabled="busy || weakPage + 1 >= weakPages" @click="changePage('lessons', weakPage + 1)">Sau</button></nav>
    </template>
    <template v-else>
      <div v-if="wrong.length" class="study-list"><section v-for="item in wrong" :key="item.id" class="study-panel">
        <h2 lang="ja">{{ questionText[item.exerciseId] || 'Câu hỏi đã làm sai' }}</h2>
        <p class="study-meta">{{ lessonLabel(item.lessonId) }}<template v-if="item.chosenAnswer"> · bạn đã chọn {{ item.chosenAnswer }}</template></p>
        <div class="study-actions"><button class="study-button" :disabled="busy" @click="openWrong(item)">{{ openedId === item.id ? 'Ẩn câu hỏi' : 'Luyện câu này' }}</button><button class="study-button secondary" :disabled="busy" @click="master(item)">Đã nắm vững</button><RouterLink class="study-button secondary" :to="lessonLink(item.lessonId)">Mở bài học</RouterLink></div>
        <div v-if="openedId === item.id" style="margin-top:16px">
          <p v-if="loadingQuestions" role="status">Đang tải câu hỏi...</p>
          <template v-else-if="question"><h3 lang="ja">{{ plain(question.contentNihongo) }}</h3><p>Chọn đáp án để kiểm tra lại.</p><div class="study-options"><button v-for="choice in ['A','B','C','D']" :key="choice" class="study-button secondary" :disabled="busy" @click="choose(item, choice)">{{ choice }} · {{ answerText(choice) }}</button></div><p v-if="practiceResult" class="study-feedback" role="status">Chưa đúng. Đáp án: {{ practiceResult.correctAnswer }} · {{ answerText(practiceResult.correctAnswer) }}. Đọc lại rồi thử lần nữa.</p></template>
        </div>
      </section></div>
      <p v-else class="study-empty" style="margin-top:20px">Chưa có câu sai cần ôn.</p>
      <nav v-if="wrongPages > 1" class="study-pagination" aria-label="Trang câu sai"><button class="study-button secondary" :disabled="busy || wrongPage === 0" @click="changePage('wrong', wrongPage - 1)">Trước</button><span>{{ wrongPage + 1 }} / {{ wrongPages }}</span><button class="study-button secondary" :disabled="busy || wrongPage + 1 >= wrongPages" @click="changePage('wrong', wrongPage + 1)">Sau</button></nav>
    </template>
  </div>
</template>

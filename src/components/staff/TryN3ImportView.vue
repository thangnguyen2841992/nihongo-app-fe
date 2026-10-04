<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import GrammarNotes from '@/components/GrammarNotes.vue'
import BookExerciseHeading from '@/components/BookExerciseHeading.vue'
import BookListeningPreview from '@/components/BookListeningPreview.vue'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import { bookReadingAudioTrack } from '@/services/bookReadingAudio'
import { bookAudioTrack, tryN3Listening } from '@/services/exerciseBookLayout'

interface Example { nihongo: string; vietnamese: string }
interface Grammar { number: number; title: string; sourcePrintedPage: number; description: string; examples: Example[] }
interface Exercise { sourceQuestionNumber: number; contentNihongo: string; answerA: string; answerB: string; answerC: string; answerD: string; correctAnswer: string; exerciseTypeName?: string }
interface Lesson { name: string; description: string; reading: string; sourcePrintedPages: number[]; grammars: Grammar[]; exercises: Exercise[] }
interface Chapter { bookName: string; notes: string[]; sourcePdfPages: number[]; lessons: Lesson[] }
const endpoint = '/api/staff/imports/try-n3/chapter-1'
const chapter = ref<Chapter | null>(null)
const importedBookId = ref<number | null>(null)
const selectedPart = ref(0)
const loading = ref(false)
const importing = ref(false)
const error = ref('')
const success = ref('')
const lesson = computed(() => chapter.value?.lessons[selectedPart.value])
const readingTrack = computed(() => bookReadingAudioTrack(chapter.value?.bookName, lesson.value?.name))
const questions = computed(() => chapter.value?.lessons.flatMap(part => part.exercises) ?? [])
const reviewGroups = computed(() => {
  const groups = new Map<string, Exercise[]>()
  for (const question of questions.value) {
    const name = question.exerciseTypeName ?? 'Bài ôn tập'
    const group = groups.get(name) ?? []
    group.push(question)
    groups.set(name, group)
  }
  return [...groups.entries()]
})
const answers = ref<Record<number, string>>({})
const checked = ref(false)
const quizError = ref('')
const score = computed(() => questions.value.filter(q => answers.value[q.sourceQuestionNumber] === q.correctAnswer).length)
const choices = (q: Exercise) => [['A', q.answerA], ['B', q.answerB], ['C', q.answerC], ['D', q.answerD]].filter(([, text]) => text)
const sourcePage = ref(15)
const sourceImage = ref('')
const sourceLoading = ref(false)
const sourceError = ref('')
let sourceRequest = 0
let disposed = false
let controller: AbortController | null = null

function message(e: any, fallback: string) {
  return typeof e.response?.data?.message === 'string' ? e.response.data.message : fallback
}
async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await gatewayUrl.get<{ chapter: Chapter; importedBookId: number | null }>(endpoint)
    if (disposed) return
    chapter.value = data.chapter
    importedBookId.value = data.importedBookId
  } catch (e) {
    if (!disposed) error.value = message(e, 'Chưa tải được bản mẫu. Nếu vừa cập nhật mã nguồn, hãy khởi động lại dịch vụ quản lý sách rồi thử lại.')
  } finally { loading.value = false }
}
async function importChapter() {
  if (importing.value || importedBookId.value || !chapter.value) return
  importing.value = true
  error.value = ''
  success.value = ''
  try {
    const { data } = await gatewayUrl.post<{ bookId: number; alreadyImported: boolean }>(endpoint)
    if (disposed) return
    importedBookId.value = data.bookId
    success.value = data.alreadyImported ? 'Chương 1 đã được nhập trước đó. Bạn có thể mở sách.' : 'Đã nhập chương 1: 2 bài học, 10 mục ngữ pháp, 37 ví dụ và 18 câu ôn tập, gồm phần nghe.'
  } catch (e) {
    if (!disposed) error.value = message(e, 'Chưa nhập được chương 1. Bạn có thể thử lại; hệ thống sẽ kiểm tra để tránh nhập trùng.')
  } finally { importing.value = false }
}
function checkAnswers() {
  quizError.value = ''
  if (questions.value.some(q => !answers.value[q.sourceQuestionNumber])) {
    quizError.value = 'Bạn hãy chọn đáp án cho tất cả các câu trước khi kiểm tra.'
    return
  }
  checked.value = true
}
async function loadSource() {
  const request = ++sourceRequest
  controller?.abort()
  controller = new AbortController()
  sourceLoading.value = true
  sourceError.value = ''
  try {
    const { data } = await gatewayUrl.get<Blob>(`${endpoint}/pages/${sourcePage.value}`, { responseType: 'blob', signal: controller.signal })
    if (disposed || request !== sourceRequest) return
    if (sourceImage.value) URL.revokeObjectURL(sourceImage.value)
    sourceImage.value = URL.createObjectURL(data)
  } catch (e) {
    if (!disposed && request === sourceRequest && !controller.signal.aborted) sourceError.value = 'Chưa tải được trang sách gốc. Vui lòng thử lại.'
  } finally { if (request === sourceRequest) sourceLoading.value = false }
}
onMounted(load)
onBeforeUnmount(() => { disposed = true; sourceRequest++; controller?.abort(); if (sourceImage.value) URL.revokeObjectURL(sourceImage.value) })
</script>

<template>
  <main class="try-import">
    <RouterLink to="/staff" class="back-link">← Quản lý sách</RouterLink>
    <header class="intro">
      <div><span class="tag">TRY! N3 · Bản nhập thử</span><h1>Lần đầu leo núi Phú Sĩ</h1><p>Xem trước chương 1, thử bài ôn tập và nhập thành sách để chỉnh sửa.</p></div>
      <RouterLink v-if="importedBookId" :to="`/staff/books/${importedBookId}`" class="btn btn-success">Mở sách đã nhập</RouterLink>
      <button v-else class="btn btn-primary" :disabled="loading || importing || !chapter" @click="importChapter">{{ importing ? 'Đang nhập…' : 'Nhập chương 1' }}</button>
    </header>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }} <button class="btn btn-sm btn-outline-danger" @click="load">Tải lại</button></p>
    <p v-if="success" class="alert alert-success" role="status">{{ success }}</p>
    <p v-if="loading" role="status">Đang tải bản mẫu…</p>
    <template v-if="chapter">
      <div class="stats"><span>2 bài đọc</span><span>10 mục ngữ pháp</span><span>37 ví dụ</span><span>{{ questions.length }} câu ôn tập</span></div>
      <aside class="scope"><strong>Nội dung bản mẫu</strong><ul><li v-for="note in chapter.notes" :key="note">{{ note }}</li></ul></aside>
      <div class="part-tabs" aria-label="Chọn phần học"><button v-for="(part, index) in chapter.lessons" :key="part.name" :class="{ active: selectedPart === index }" :aria-pressed="selectedPart === index" @click="selectedPart = index">{{ part.name }}</button></div>
      <section v-if="lesson" class="lesson-panel">
        <h2>{{ lesson.name }}</h2><p class="goal">{{ lesson.description }}</p>
        <h3>Bài đọc</h3>
        <BookAudioPlayer v-if="readingTrack" :key="readingTrack" :track="readingTrack" />
        <div class="reading rich-text" lang="ja" v-html="lesson.reading"></div>
        <h3>Ngữ pháp và ví dụ</h3>
        <article v-for="grammar in lesson.grammars" :key="grammar.number" class="grammar">
          <h4 lang="ja">{{ grammar.title }}</h4><span class="source-label">Trang sách {{ grammar.sourcePrintedPage }}</span>
          <GrammarNotes :description="grammar.description" />
          <ol class="examples"><li v-for="(example, index) in grammar.examples" :key="index"><div class="rich-text" lang="ja" v-html="example.nihongo"></div><div v-if="example.vietnamese" class="example-translation rich-text" lang="vi" v-html="example.vietnamese"></div></li></ol>
        </article>
      </section>
      <section class="quiz">
        <h2>Thử bài ôn tập chương 1</h2><p>Chọn một đáp án cho mỗi câu. Đáp án đã đối chiếu với phụ lục của sách.</p>
        <form @submit.prevent="checkAnswers">
          <section v-for="([typeName, group], groupIndex) in reviewGroups" :key="typeName" class="review-section">
            <BookExerciseHeading :type-name="typeName" :index="groupIndex" />
            <fieldset v-for="(q, questionIndex) in group" :key="q.sourceQuestionNumber" :disabled="checked">
              <legend lang="ja">{{ bookAudioTrack(typeName, q.contentNihongo) === '06' ? 1 : questionIndex + 1 }}. {{ q.contentNihongo }}</legend>
              <p v-if="bookAudioTrack(typeName, q.contentNihongo) === '06'" class="rich-text" lang="ja">2. {{ tryN3Listening.instruction2 }}</p>
              <BookAudioPlayer v-if="bookAudioTrack(typeName, q.contentNihongo)" :track="bookAudioTrack(typeName, q.contentNihongo)!" />
              <label v-for="([key, text], choiceIndex) in choices(q)" :key="key" class="choice" :class="{ correct: checked && key === q.correctAnswer, wrong: checked && answers[q.sourceQuestionNumber] === key && key !== q.correctAnswer }">
                <input v-model="answers[q.sourceQuestionNumber]" type="radio" :name="`question-${q.sourceQuestionNumber}`" :value="key"><span lang="ja">{{ bookAudioTrack(typeName, q.contentNihongo) === '06' ? '' : (choiceIndex + 1) + '.' }} {{ text }}</span>
              </label>
            </fieldset>
          </section>
          <p v-if="quizError" role="alert" class="text-danger">{{ quizError }}</p>
          <p v-if="checked" role="status" class="score">Bạn trả lời đúng {{ score }}/{{ questions.length }} câu.</p>
          <button v-if="!checked" class="btn btn-primary" type="submit">Kiểm tra đáp án</button>
          <button v-else class="btn btn-outline-primary" type="button" @click="checked = false; answers = {}; quizError = ''">Làm lại</button>
        </form>
        <BookListeningPreview v-if="questions.some(q => q.exerciseTypeName?.startsWith('TRY! N3')) && !questions.some(q => bookAudioTrack(q.exerciseTypeName, q.contentNihongo))" />
      </section>
      <section class="source-panel"><h2>Đối chiếu trang sách gốc</h2><p>15 trang của chương 1, gồm hình minh họa và các bài tập chưa chuyển sang dạng tương tác.</p>
        <div class="source-controls"><label>Trang PDF <select v-model="sourcePage" @change="loadSource"><option v-for="page in chapter.sourcePdfPages" :key="page" :value="page">{{ page }} (trang sách {{ page + 1 }})</option></select></label><button class="btn btn-outline-secondary" :disabled="sourceLoading" @click="loadSource">{{ sourceLoading ? 'Đang tải…' : 'Xem trang gốc' }}</button></div>
        <p v-if="sourceError" role="alert" class="text-danger">{{ sourceError }}</p><img v-if="sourceImage" :src="sourceImage" alt="Trang scan sách TRY! N3 để đối chiếu" class="source-image">
      </section>
    </template>
  </main>
</template>

<style scoped>
.try-import { max-width: 1080px; margin: 0 auto; padding: 28px 24px 60px; color: #24334b; }
.back-link { display: inline-block; margin-bottom: 22px; text-decoration: none; }
.intro { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.intro h1 { font-size: 30px; margin: 12px 0; font-weight: 700; }
.intro p { margin: 0; color: #66758a; }
.tag { font-size: 13px; color: #1e669a; background: #e8f4fc; border-radius: 20px; padding: 6px 12px; }
.stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
.stats span { border: 1px solid #dce5ef; padding: 10px 18px; border-radius: 8px; background: #fff; }
.scope { border-left: 4px solid #d3ab50; background: #fff9e9; padding: 18px 22px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; }
.scope ul { margin: 10px 0 0; padding-left: 20px; line-height: 1.8; }
.part-tabs { display: flex; gap: 10px; margin-bottom: 16px; }
.part-tabs button { border: 1px solid #d6e0ed; background: #fff; border-radius: 8px; padding: 12px 18px; color: #43546b; }
.part-tabs button.active { background: #1d67ae; color: #fff; border-color: #1d67ae; }
.lesson-panel, .quiz, .source-panel { background: #fff; border: 1px solid #e0e7ef; border-radius: 12px; padding: 28px; margin-bottom: 24px; }
h2 { font-size: 23px; font-weight: 700; margin-bottom: 16px; } h3 { font-size: 20px; margin: 28px 0 16px; } h4 { font-size: 19px; font-weight: 600; }
.goal { color: #5b6c7f; line-height: 1.8; }.reading { background: #f4f8fc; padding: 22px; border-radius: 8px; font-size: 18px; }
.rich-text { line-height: 1.95; white-space: pre-line; overflow-wrap: anywhere; }
.rich-text :deep(p) { margin: 8px 0; }.grammar { border-top: 1px solid #e4eaf2; padding-top: 22px; margin-top: 24px; }.source-label { display: block; color: #738196; font-size: 12px; margin-bottom: 12px; }
.examples { padding-left: 24px; color: #263f5c; font-size: 17px; }.quiz fieldset { border: 0; border-top: 1px solid #e4eaf2; padding: 20px 0; }.quiz legend { float: none; font-size: 17px; line-height: 1.8; margin-bottom: 12px; }
.choice { display: flex; align-items: center; gap: 12px; border: 1px solid #dce5ef; border-radius: 7px; padding: 10px 14px; margin: 8px 0; cursor: pointer; }.choice.correct { background: #e8f7eb; border-color: #83bd8f; }.choice.wrong { background: #fff0f0; border-color: #dca2a2; }.score { font-weight: 700; color: #246c39; }
.source-controls { display: flex; gap: 16px; align-items: center; margin: 18px 0; }.source-controls select { margin-left: 10px; border-radius: 6px; padding: 8px; border: 1px solid #d6e0ed; }.source-image { display: block; width: 100%; max-width: 800px; margin: 20px auto 0; }
.examples { margin-top: 20px; }.examples li { padding: 12px 0; }.example-translation { color: #526479; font-size: 15px; }
@media (max-width: 700px) { .try-import { padding: 20px 12px; }.intro { align-items: flex-start; flex-direction: column; }.intro h1 { font-size: 25px; }.part-tabs { flex-direction: column; }.lesson-panel, .quiz, .source-panel { padding: 18px; }.source-controls { flex-wrap: wrap; } }
</style>

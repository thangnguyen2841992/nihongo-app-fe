<script setup lang="ts">
import { bookLessonOrder } from '@/services/bookLessonOrder'
import { bookAdditionalAudio } from '@/services/bookAdditionalAudio'
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue"

import {useRoute, useRouter} from "vue-router"
import { useAuthState } from '@/services/authState'


import {gatewayUrl} from "@/api/authApi.ts"
import { saveLearningPosition } from '@/api/learningPosition'
import GrammarNotes from '@/components/GrammarNotes.vue'
import LessonCompletionButton from '@/users/LessonCompletionButton.vue'
import ContentReport from '@/components/operations/ContentReport.vue'
import GrammarStructure from '@/components/GrammarStructure.vue'
import { importedAudioUrl } from '@/services/bookImport'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import LessonAudioTracks from '@/components/LessonAudioTracks.vue'
import type { LessonTrack } from '@/services/bookImport'
import JapaneseReadingToggle from '@/components/common/JapaneseReadingToggle.vue'
import { japaneseReadingPrefs, vJapaneseReadings } from '@/services/japaneseReadings'
import { bookReadingAudioTrack } from '@/services/bookReadingAudio'
import { japaneseSpeechText, useJapaneseSpeech } from '@/services/japaneseSpeech'
import { getCards, saveCard, deleteCard, type StudyCard, type CardInput } from '@/api/study'

/* =========================
   ROUTER
========================= */

const route = useRoute()

const router = useRouter()

/* =========================
   TYPES
========================= */

interface Lesson {
  lessonId: number
  name: string
  description: string
  reading: string
  audioTrack?: string | null
  audioUrl?: string | null
  tracks?: LessonTrack[]
  bookId: number
}

interface Grammar {
  grammarId: number
  title: string
  imageUrl?: string
  description: string
}

interface Book {
  bookId: number
  bookName: string
}

interface Example {
  exampleId: number
  nihongo: string
  vietnamese: string
  grammarId: number
}

/* =========================
   STATE
========================= */
const activeGrammarId =
  ref<number | null>(null)

const book =
  ref<Book | null>(null)
const { userRole } = useAuthState()
const pageError = ref('')
// Lessons the learner marked as done, shown in the lesson tabs (one request for the whole book).
const completedLessons = ref<Set<number>>(new Set())
// Vietnamese meaning of each example: follows the "Hiện/Ẩn nghĩa" button unless the learner showed or hid that one.
const meaningOverrides = ref<Map<number, boolean>>(new Map())
const meaningShown = (exampleId: number) => meaningOverrides.value.get(exampleId) ?? japaneseReadingPrefs.meaning
function setMeaning(exampleId: number, shown: boolean) {
  meaningOverrides.value = new Map(meaningOverrides.value).set(exampleId, shown)
}
watch(() => japaneseReadingPrefs.meaning, () => { meaningOverrides.value = new Map() })
async function loadCompletedLessons() {
  const ids = lessons.value.map(lesson => lesson.lessonId)
  if (!ids.length || userRole.value !== 'USER') return
  try {
    const { data } = await gatewayUrl.get<number[]>('/api/nihongo-user/study/completions/among', { params: { lessonIds: ids.join(',') }, signal: pageController.signal })
    if (!disposed && Array.isArray(data)) completedLessons.value = new Set(data)
  } catch { /* the tabs simply show no marks */ }
}
function lessonCompletionChanged(lessonId: number, completed: boolean) {
  const next = new Set(completedLessons.value)
  if (completed) next.add(lessonId); else next.delete(lessonId)
  completedLessons.value = next
}
function lessonTabLabel(lesson: Lesson, index: number) { return lesson.name?.trim() || `Bài ${index + 1}` }
const lessons =
  ref<Lesson[]>([])

const grammars =
  ref<Grammar[]>([])

const selectedLesson =
  ref<Lesson | null>(null)

const readingTrack = computed(() => selectedLesson.value?.audioTrack || bookReadingAudioTrack(book.value?.bookName, selectedLesson.value?.name))
const readingAudioSource = computed(() => importedAudioUrl(selectedLesson.value?.audioUrl))
const { speechError, speechProvider, speakExample: playExample, stopSpeaking } = useJapaneseSpeech()
const activeSpokenExampleId = ref<number | null>(null)
const savedCards = ref<StudyCard[]>([])
const cardsLoading = ref(false)
const bookmarkError = ref('')
const bookmarkBusy = ref('')
const practiceExample = ref<Example | null>(null)
const recording = ref(false)
const recordError = ref('')
const recordedUrl = ref('')
let recorder: MediaRecorder | null = null
let microphone: MediaStream | null = null
let recordingVersion = 0

function plain(html: string) { return japaneseSpeechText(html || '') }
function shortPlain(html: string) { return plain(html).slice(0, 2000) }
function saved(key: string) { return savedCards.value.find(card => card.sourceKey === key) }
async function toggleCard(input: CardInput) {
  bookmarkError.value = ''; bookmarkBusy.value = input.sourceKey
  try {
    const existing = saved(input.sourceKey)
    if (existing) { await deleteCard(existing.id); savedCards.value = savedCards.value.filter(c => c.id !== existing.id) }
    else savedCards.value.push(await saveCard(input))
  } catch { bookmarkError.value = 'Không lưu được sổ tay. Vui lòng thử lại.' }
  finally { bookmarkBusy.value = '' }
}
function bookmarkGrammar(grammar: Grammar) {
  if (!selectedLesson.value) return
  void toggleCard({ sourceKey: `grammar:${grammar.grammarId}`, kind: 'GRAMMAR', courseId: courseId || null,
    bookId, lessonId: selectedLesson.value.lessonId, grammarId: grammar.grammarId, exampleId: null,
    front: shortPlain(grammar.title), back: shortPlain(grammar.description), note: null })
}
function bookmarkExample(example: Example) {
  if (!selectedLesson.value) return
  void toggleCard({ sourceKey: `example:${example.exampleId}`, kind: 'EXAMPLE', courseId: courseId || null,
    bookId, lessonId: selectedLesson.value.lessonId, grammarId: example.grammarId, exampleId: example.exampleId,
    front: shortPlain(example.nihongo), back: shortPlain(example.vietnamese), note: null })
}
function stopRecording() {
  if (recorder?.state === 'recording') recorder.stop()
  microphone?.getTracks().forEach(track => track.stop())
  microphone = null
  recording.value = false
}
function clearRecording() {
  recordingVersion++
  stopRecording()
  if (recordedUrl.value) URL.revokeObjectURL(recordedUrl.value)
  recordedUrl.value = ''
}
async function startRecording() {
  recordError.value = ''
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    recordError.value = 'Trình duyệt chưa hỗ trợ ghi âm.'; return
  }
  try {
    clearRecording()
    const version = recordingVersion
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (version !== recordingVersion) { stream.getTracks().forEach(track => track.stop()); return }
    microphone = stream
    const activeRecorder = new MediaRecorder(stream)
    recorder = activeRecorder
    const chunks: Blob[] = []
    activeRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    activeRecorder.onstop = () => {
      if (version === recordingVersion && chunks.length) recordedUrl.value = URL.createObjectURL(new Blob(chunks, { type: activeRecorder.mimeType || 'audio/webm' }))
      stream.getTracks().forEach(track => track.stop())
      if (microphone === stream) microphone = null
    }
    activeRecorder.start(); recording.value = true
  } catch { recordError.value = 'Không mở được micro. Kiểm tra quyền micro của trình duyệt.' }
}
function showPractice(example: Example) {
  if (practiceExample.value?.exampleId === example.exampleId) { practiceExample.value = null; clearRecording() }
  else { clearRecording(); practiceExample.value = example }
}

function speakExample(example: Example, rate = 1) {
  activeSpokenExampleId.value = example.exampleId
  if (example.grammarId) void playExample(example.exampleId, example.grammarId, japaneseSpeechText(example.nihongo), rate)
}

const examples =
  ref<Record<number, Example[]>>({})
type LessonContent = { grammars: Grammar[]; examples: Record<number, Example[]>; loadedAt: number }
const lessonContentCache = new Map<number, LessonContent>()
const LESSON_CACHE_TTL = 5 * 60_000
const lessonCacheKey = (lessonId: number) => `nihongo:lesson-content:${lessonId}`
const readStoredLesson = (lessonId: number): LessonContent | null => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(lessonCacheKey(lessonId)) || 'null') as LessonContent | null
    return cached && Array.isArray(cached.grammars) && cached.examples && Date.now() - cached.loadedAt < LESSON_CACHE_TTL
      ? cached : null
  } catch { return null }
}
const storeLesson = (lessonId: number, content: LessonContent) => {
  try { sessionStorage.setItem(lessonCacheKey(lessonId), JSON.stringify(content)) } catch { /* cache is optional */ }
}
const clearStoredLesson = (lessonId: number) => {
  try { sessionStorage.removeItem(lessonCacheKey(lessonId)) } catch { /* cache is optional */ }
}
const loadingLessonContent = ref(false)
const lessonContentError = ref('')
let lessonRequestId = 0
let lessonContentController: AbortController | null = null
let disposed = false

const expandedGrammar =
  ref<Record<number, boolean>>({})

/* =========================
   TOOLBAR ACTIVE
========================= */
let scrollFrame: number | null = null
const handleScroll = () => {
  if (scrollFrame !== null) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null
    updateActiveGrammarFromScroll()
  })
}
const updateActiveGrammarFromScroll = () => {

  let currentId = null

  for (const grammar of grammars.value) {

    const el =
      document.getElementById(
        `grammar-${grammar.grammarId}`
      )

    if (!el) {
      continue
    }

    const rect =
      el.getBoundingClientRect()

    if (rect.top <= 220) {
      currentId =
        grammar.grammarId
    } else {
      break
    }
  }

  activeGrammarId.value =
    currentId
}
const scrollToGrammar =
  (grammarId: number) => {

    activeGrammarId.value =
      grammarId

    const element =
      document.getElementById(
        `grammar-${grammarId}`
      )

    if (!element) {
      return
    }

    const y =
      element.getBoundingClientRect().top +
      window.scrollY -
      180

    window.scrollTo({
      top: y,
      behavior: "smooth"
    })
  }

const openImage = (
  imageUrl?: string
) => {

  if (!imageUrl) {
    return
  }

  window.open(
    imageUrl,
    "_blank"
  )
}

/* =========================
   BOOK ID
========================= */

const bookId =
  Number(route.params.bookId)
const courseId = Number(route.query.courseId)
const pageController = new AbortController()
const positionError = ref('')
let pendingPositionSave: Promise<void> = Promise.resolve()

const rememberPosition = (lessonId: number | null) => {
  if (!Number.isInteger(courseId) || courseId <= 0) return
  pendingPositionSave = pendingPositionSave.catch(() => {}).then(() =>
    saveLearningPosition(courseId, bookId, lessonId)
  )
  void pendingPositionSave.then(() => {
    positionError.value = ''
  }).catch(error => {
    console.error(error)
    positionError.value = 'Chưa lưu được vị trí học. Vui lòng chọn lại bài học.'
  })
}

/* =========================
   FETCH BOOK
========================= */

const fetchBook =
  async () => {

    try {

      const res =
        await gatewayUrl.get(
          `/api/staff/books/${bookId}`, { signal: pageController.signal }
        )

      if (disposed) return
      book.value = res.data

    } catch (e) {

      if (disposed) return
      console.error(e)
      pageError.value = "Không tải được thông tin sách. Vui lòng thử lại."
    }
  }

/* =========================
   FETCH LESSONS
========================= */

const fetchLessons =
  async () => {

    try {

      const res =
        await gatewayUrl.get(
          "/api/staff/getLessonsByBook",
          {
            params: {
              bookId
            },
            signal: pageController.signal
          }
        )

      if (disposed) return
      lessons.value =
        bookLessonOrder(res.data)
      void loadCompletedLessons()

    } catch (e) {

      if (disposed) return
      console.error(e)
      pageError.value = "Không tải được danh sách bài học. Vui lòng thử lại."
    }
  }

/* =========================
   OPEN LESSON
========================= */

const openLesson = async (
  lesson: Lesson
) => {

  if (disposed) return
  if (selectedLesson.value?.lessonId === lesson.lessonId && loadingLessonContent.value) return
  const requestId = ++lessonRequestId
  lessonContentController?.abort()
  lessonContentController = null

  stopSpeaking()
  clearRecording()
  practiceExample.value = null
  speechError.value = ''
  activeSpokenExampleId.value = null
  selectedLesson.value = lesson
  savedCards.value = []
  cardsLoading.value = true
  void getCards(lesson.lessonId).then(cards => {
    if (requestId === lessonRequestId && !disposed) savedCards.value = cards
  }).catch(() => {
    if (requestId === lessonRequestId && !disposed) bookmarkError.value = 'Không tải được sổ tay.'
  }).finally(() => {
    if (requestId === lessonRequestId && !disposed) cardsLoading.value = false
  })
  grammars.value = []
  examples.value = {}
  expandedGrammar.value = {}
  activeGrammarId.value = null
  lessonContentError.value = ''
  loadingLessonContent.value = true
  rememberPosition(lesson.lessonId)
  if (Number.isInteger(courseId) && courseId > 0) {
    void router.replace({
      name: 'CourseBookDetail',
      params: { bookId },
      query: { courseId: String(courseId), lessonId: String(lesson.lessonId) }
    })
  }

  const cached = lessonContentCache.get(lesson.lessonId) ?? readStoredLesson(lesson.lessonId)
  if (cached && Date.now() - cached.loadedAt < LESSON_CACHE_TTL) {
    lessonContentCache.delete(lesson.lessonId)
    lessonContentCache.set(lesson.lessonId, cached)
    grammars.value = cached.grammars
    examples.value = cached.examples
    expandedGrammar.value = Object.fromEntries(cached.grammars.map(grammar => [grammar.grammarId, true]))
    loadingLessonContent.value = false
    return
  }

  const controller = new AbortController()
  lessonContentController = controller
  let grammarLoaded = false
  try {
    // Khởi động song song nhưng render ngữ pháp ngay khi request nhẹ hơn về.
    // Danh sách ví dụ không còn chặn phần công thức/cách dùng.
    const examplesRequest = gatewayUrl.get<Example[]>(
      `/api/staff/lessons/${lesson.lessonId}/examples`,
      { signal: controller.signal },
    ).then(response => ({ response }), error => ({ error }))
    const grammarResponse = await gatewayUrl.get<Grammar[]>(
      '/api/staff/getAllGrammarByLesson',
      { params: { lessonId: lesson.lessonId }, signal: controller.signal },
    )
    if (requestId !== lessonRequestId) return
    const firstStructure = grammarResponse.data.find(grammar => grammar.imageUrl)?.imageUrl
    if (firstStructure) new Image().src = getStructureImage(firstStructure)
    const lessonExamples: Record<number, Example[]> = {}
    for (const grammar of grammarResponse.data) lessonExamples[grammar.grammarId] = []
    grammars.value = grammarResponse.data
    examples.value = lessonExamples
    expandedGrammar.value = Object.fromEntries(grammarResponse.data.map(grammar => [grammar.grammarId, true]))
    grammarLoaded = true
    loadingLessonContent.value = false

    const exampleResult = await examplesRequest
    if (requestId !== lessonRequestId) return
    if ('error' in exampleResult) throw exampleResult.error
    for (const example of exampleResult.response.data) {
      if (lessonExamples[example.grammarId]) lessonExamples[example.grammarId]!.push(example)
    }
    examples.value = { ...lessonExamples }
    const content = { grammars: grammarResponse.data, examples: lessonExamples, loadedAt: Date.now() }
    if (lessonContentCache.size >= 8) lessonContentCache.delete(lessonContentCache.keys().next().value!)
    lessonContentCache.set(lesson.lessonId, content)
    storeLesson(lesson.lessonId, content)
    grammars.value = content.grammars
    examples.value = content.examples
    expandedGrammar.value = Object.fromEntries(content.grammars.map(grammar => [grammar.grammarId, true]))
  } catch (error) {
    if (requestId !== lessonRequestId) return
    console.error(error)
    lessonContentError.value = grammarLoaded
      ? 'Ngữ pháp đã hiển thị nhưng chưa tải được ví dụ. Vui lòng thử lại.'
      : 'Không thể tải nội dung bài học. Vui lòng thử lại.'
  } finally {
    if (requestId === lessonRequestId) {
      loadingLessonContent.value = false
      lessonContentController = null
    }
  }
}


/* =========================
   FETCH EXAMPLE
========================= */
const fetchExamples = async (
  grammarId: number
) => {

  try {

    const res =
      await gatewayUrl.get(
        "/api/staff/getAllExampleByGrammar",
        {
          params: {
            grammarId
          }
        }
      )

    examples.value[grammarId] =
      res.data
    if (selectedLesson.value) {
      lessonContentCache.delete(selectedLesson.value.lessonId)
      clearStoredLesson(selectedLesson.value.lessonId)
    }

  } catch (e) {

    console.error(e)
  }
}

const toggleExamples =
  async (grammarId: number) => {

    expandedGrammar.value[grammarId] =
      !expandedGrammar.value[grammarId]

    if (
      expandedGrammar.value[grammarId] &&
      !examples.value[grammarId]
    ) {

      await fetchExamples(
        grammarId
      )
    }
  }

/* =========================
   BACK
========================= */

// Without a course (e.g. opened from a notebook card) learners go back where they came from, never to /staff.
const goBack = () => {
  if (Number.isInteger(courseId) && courseId > 0) {
    router.push({ name: 'CourseBooks', params: { courseId } })
  } else if (userRole.value === 'ADMIN' || userRole.value === 'STAFF') {
    router.push('/staff')
  } else if (window.history.state?.back) {
    router.back()
  } else {
    router.push('/user/my-courses')
  }
}
async function retryPage() {
  pageError.value = ''
  void fetchBook()
  await fetchLessons()
  if (!disposed && !selectedLesson.value && lessons.value.length) await openLesson(lessons.value[0]!)
}

const getStructureImage = (
  imageUrl: string
) => {

  return imageUrl.replace(
    "/upload/",
    "/upload/f_auto,q_auto:good,w_900,c_limit/"
  )
}

/* =========================
   MOUNT
========================= */
onUnmounted(() => {
  clearRecording()
  disposed = true
  pageController.abort()
  ++lessonRequestId
  lessonContentController?.abort()
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
  window.removeEventListener(
    "scroll",
    handleScroll
  )
})

onMounted(async () => {
  window.addEventListener(
    "scroll",
    handleScroll
  )
  // Thông tin sách không chặn việc tải nội dung bài học.
  void fetchBook()
  const requestedLessonId = Number(route.query.lessonId)
  const requestedGrammarId = Number(route.query.grammarId)
  const hasRequestedLesson = Number.isInteger(requestedLessonId) && requestedLessonId > 0

  if (hasRequestedLesson) {
    // URL đã có lessonId: không đợi payload danh sách bài (có thể chứa nhiều bài đọc dài).
    const contentPromise = openLesson({
      lessonId: requestedLessonId,
      name: 'Đang tải bài học...',
      description: '',
      reading: '',
      bookId,
    })
    await fetchLessons()
    if (disposed) return
    const hydratedLesson = lessons.value.find(lesson => lesson.lessonId === requestedLessonId)
    if (hydratedLesson && selectedLesson.value?.lessonId === requestedLessonId) selectedLesson.value = hydratedLesson
    await contentPromise
  } else {
    await fetchLessons()
    if (disposed) return
    if (lessons.value.length > 0) await openLesson(lessons.value[0]!)
    else rememberPosition(null)
  }

  if (!disposed && selectedLesson.value) {
    if (Number.isInteger(requestedGrammarId) && requestedGrammarId > 0) {
      await nextTick()
      document.getElementById(`grammar-${requestedGrammarId}`)?.scrollIntoView({ block: 'center' })
    }
  }

})

const goToExercisePage =
  async () => {
    if (!selectedLesson.value) {
      return
    }
    try {
      await pendingPositionSave
    } catch {
      positionError.value = 'Chưa lưu được vị trí học. Vui lòng chọn lại bài học.'
      return
    }
    router.push({
      name: "course-lesson-exercises",
      params: {
        lessonId:
        selectedLesson.value.lessonId
      },
      query: Number.isInteger(courseId) && courseId > 0
        ? { courseId: String(courseId), bookId: String(bookId) }
        : {}
    })
  }
</script>

<template>
  <ContentReport v-if="selectedLesson" :lesson-id="selectedLesson.lessonId" style="margin:12px 24px" />

  <div class="grammar-page">
    <p v-if="positionError" role="alert" class="position-error">{{ positionError }}</p>
    <p v-if="bookmarkError" role="alert" class="position-error">{{ bookmarkError }}</p>
    <p v-if="pageError" role="alert" class="position-error">{{ pageError }} <button type="button" class="retry-link" @click="retryPage">Thử lại</button></p>

    <!-- HEADER -->

    <div class="mb-4">

      <div
        class="
          page-header
          d-flex
          justify-content-between
          align-items-start
        "
      >

        <div>

          <h2 class="book-title mb-1">
            <i class="bi bi-book" aria-hidden="true"></i> {{ book?.bookName }}
          </h2>

          <div class="sub-title">
            Bài đọc, ngữ pháp và ví dụ
          </div>

        </div>

        <div class="book-head-actions">
          <JapaneseReadingToggle />
          <button
            class="back-btn"
            @click="goBack"
          >
            ← Quay lại
          </button>
        </div>

      </div>

    </div>


    <!-- LESSON TABS -->

    <div class="lesson-tabs">

      <button
        v-for="(lesson,index) in lessons"
        :key="lesson.lessonId"
        class="lesson-tab"
        :aria-pressed="selectedLesson?.lessonId === lesson.lessonId"
        :class="{
          active:
            selectedLesson?.lessonId ===
            lesson.lessonId
        }"
        :title="lessonTabLabel(lesson, index)"
        @click="openLesson(lesson)"
      >
        <i v-if="completedLessons.has(lesson.lessonId)" class="bi bi-check-circle-fill lesson-done" aria-hidden="true"></i>
        <span class="lesson-tab-name">{{ lessonTabLabel(lesson, index) }}</span>
        <span v-if="completedLessons.has(lesson.lessonId)" class="visually-hidden">(đã học xong)</span>
      </button>

    </div>


    <!-- CONTENT -->

    <div class="grammar-panel">

      <div
        v-if="!selectedLesson"
        class="empty-state"
      >

        <div class="empty-icon">
          <i class="bi bi-journal-text" aria-hidden="true"></i>
        </div>

        <div class="empty-title">
          Chọn bài học
        </div>

        <div class="empty-desc">
          Hãy chọn bài học để xem nội dung ngữ pháp.
        </div>

      </div>


      <template v-else>

        <!-- TOP ACTION -->

        <div class="top-actions">

          <div class="selected-lesson-wrapper">

            <div class="selected-lesson">
              {{ selectedLesson.name }}
            </div>
            <LessonCompletionButton :key="selectedLesson.lessonId" :lesson-id="selectedLesson.lessonId" @changed="lessonCompletionChanged" />

          </div>

          <div class="action-buttons">

            <button
              class="exercise-btn"
              @click="goToExercisePage()"
            >
              <i class="bi bi-pencil-square" aria-hidden="true"></i> Bài tập
            </button>

          </div>

        </div>


        <div v-if="loadingLessonContent" class="lesson-content-status" role="status">Đang tải nội dung bài học...</div>
        <div v-else-if="lessonContentError" class="lesson-content-status" role="alert">
          {{ lessonContentError }}
          <button type="button" @click="openLesson(selectedLesson)">Thử lại</button>
        </div>

        <!-- GRAMMAR TABS -->

        <div
          v-if="grammars.length"
          class="grammar-tabs"
        >

          <button
            v-for="grammar in grammars"
            :key="grammar.grammarId"
            class="grammar-tab"
            :aria-pressed="activeGrammarId === grammar.grammarId"
            :class="{
    active:
      activeGrammarId === grammar.grammarId
  }"
            :data-tooltip="grammar.title"
            @click="
    scrollToGrammar(
      grammar.grammarId
    )
  "
          >
  <span class="grammar-tab-text">
    {{ grammar.title }}
  </span>
          </button>

        </div>


        <!-- LISTENING TRACKS (e.g. Minna no Nihongo: ことば, 文型, 例文, 練習 A/B/C) -->

        <LessonAudioTracks v-if="selectedLesson.tracks?.length" :key="selectedLesson.lessonId" :tracks="selectedLesson.tracks" />

        <!-- READING -->

        <div
          v-if="selectedLesson.reading"
          class="lesson-reading-card"
        >

          <div class="lesson-reading-header">

            <div class="lesson-reading-icon">
              <i class="bi bi-book-half" aria-hidden="true"></i>
            </div>

            <div>

              <div class="lesson-reading-title">
                Bài đọc
              </div>

              <div class="lesson-reading-subtitle">
                Nội dung luyện đọc của bài học
              </div>

            </div>

          </div>

          <BookAudioPlayer v-if="readingAudioSource || readingTrack" :key="readingAudioSource || readingTrack" :source="readingAudioSource" :track="readingAudioSource ? undefined : readingTrack" />
          <BookAudioPlayer v-for="audio in bookAdditionalAudio(book?.bookName, selectedLesson.name)" :key="audio.source" :source="audio.source" :label="audio.label" />
          <div
            v-japanese-readings
            class="lesson-reading-content"
            v-html="selectedLesson.reading"
          />

        </div>


        <!-- GRAMMAR LIST -->

        <div class="grammar-scroll">

          <div
            v-for="(grammar,index) in grammars"
            :key="grammar.grammarId"
            :id="`grammar-${grammar.grammarId}`"
            class="grammar-card"
          >

            <!-- TITLE -->

            <div class="grammar-title">

              <div class="grammar-number">
                {{ index + 1 }}
              </div>

              <div class="grammar-title-text">
                {{ grammar.title }}
              </div>
              <button type="button" class="example-speak" :disabled="cardsLoading || bookmarkBusy === `grammar:${grammar.grammarId}`" @click="bookmarkGrammar(grammar)">{{ saved(`grammar:${grammar.grammarId}`) ? 'Đã lưu' : 'Lưu vào sổ tay' }}</button>

            </div>


            <!-- IMAGE -->

            <GrammarStructure v-if="grammar.imageUrl" :source="getStructureImage(grammar.imageUrl)" :title="grammar.title" :eager="index === 0" @enlarge="openImage(grammar.imageUrl)" />


            <!-- DESCRIPTION -->

            <GrammarNotes :description="grammar.description" :examples="examples[grammar.grammarId]" />


            <!-- EXAMPLES -->

            <div class="example-section">

              <button
                class="expand-btn"
                @click="
                  toggleExamples(
                    grammar.grammarId
                  )
                "
              >

                {{
                  expandedGrammar[
                    grammar.grammarId
                    ]
                    ? '▼ Ẩn ví dụ'
                    : '▶ Xem ví dụ'
                }}

              </button>


              <div
                v-if="
                  expandedGrammar[
                    grammar.grammarId
                  ]
                "
                class="example-expand"
              >

                <div class="example-topbar">

                  <div class="example-count">

                    {{
                      examples[
                        grammar.grammarId
                        ]?.length || 0
                    }}

                    ví dụ

                  </div>

                </div>


                <!-- EXAMPLE LIST -->

                <template
                  v-if="
                    examples[
                      grammar.grammarId
                    ]?.length
                  "
                >

                  <div
                    v-for="
                      (example, exampleIndex)
                      in examples[
                        grammar.grammarId
                      ]
                    "
                    :key="example.exampleId"
                    class="example-card"
                  >

                    <div class="example-row">

                      <div class="example-number">
                        {{ exampleIndex + 1 }}
                      </div>

                      <div class="example-content">

                        <div
                          v-japanese-readings
                          class="jp-text"
                          v-html="
                            example.nihongo
                          "
                        />

                        <template v-if="example.vietnamese">
                          <template v-if="meaningShown(example.exampleId)">
                            <div
                              class="vn-text"
                              v-html="
                                example.vietnamese
                              "
                            />
                            <button type="button" class="meaning-toggle-btn hide" @click="setMeaning(example.exampleId, false)">
                              <i class="bi bi-eye-slash" aria-hidden="true"></i> Ẩn nghĩa
                            </button>
                          </template>
                          <button
                            v-else
                            type="button"
                            class="meaning-toggle-btn"
                            @click="setMeaning(example.exampleId, true)"
                          >
                            <i class="bi bi-eye" aria-hidden="true"></i> Xem nghĩa
                          </button>
                        </template>

                        <p
                          v-if="activeSpokenExampleId === example.exampleId && speechError"
                          class="example-speech-error"
                          role="alert"
                        >{{ speechError }}</p>

                        <small v-if="activeSpokenExampleId === example.exampleId && speechProvider === 'voicevox'" class="example-speech-credit">
                          Giọng: <a href="https://voicevox.hiroshiba.jp/product/zundamon/" target="_blank" rel="noopener noreferrer">VOICEVOX: ずんだもん</a>
                        </small>

                      </div>

                      <div class="example-actions">
                        <button
                          v-if="example.nihongo?.trim()"
                          type="button"
                          class="example-speak"
                          :aria-label="`Nghe phát âm câu ví dụ ${exampleIndex + 1}`"
                          title="Nghe giọng VOICEVOX; dùng giọng trình duyệt nếu VOICEVOX chưa sẵn sàng"
                          @click="speakExample(example)"
                        >
                          <i class="bi bi-volume-up" aria-hidden="true"></i>
                          <span class="action-text">Nghe</span>
                        </button>
                        <button v-if="example.nihongo?.trim()" type="button" class="example-speak" :aria-pressed="practiceExample?.exampleId === example.exampleId" :aria-label="`Luyện nghe nói câu ví dụ ${exampleIndex + 1}`" title="Nghe chậm, ghi âm giọng bạn và so sánh" @click="showPractice(example)">
                          <i class="bi bi-mic" aria-hidden="true"></i>
                          <span class="action-text">Luyện nói</span>
                        </button>
                        <button type="button" class="example-speak" :aria-pressed="Boolean(saved(`example:${example.exampleId}`))" :aria-label="saved(`example:${example.exampleId}`) ? `Bỏ câu ví dụ ${exampleIndex + 1} khỏi sổ tay` : `Lưu câu ví dụ ${exampleIndex + 1} vào sổ tay`" :title="saved(`example:${example.exampleId}`) ? 'Đã lưu trong sổ tay — bấm để bỏ' : 'Lưu vào sổ tay'" :disabled="cardsLoading || bookmarkBusy === `example:${example.exampleId}`" @click="bookmarkExample(example)">
                          <i class="bi" :class="saved(`example:${example.exampleId}`) ? 'bi-bookmark-check-fill' : 'bi-bookmark'" aria-hidden="true"></i>
                          <span class="action-text">{{ saved(`example:${example.exampleId}`) ? 'Đã lưu' : 'Lưu' }}</span>
                        </button>
                      </div>

                    </div>
                    <div v-if="practiceExample?.exampleId === example.exampleId" class="example-practice">
                      <p>Nghe câu mẫu, đọc theo rồi nghe lại bản ghi của bạn để tự so sánh.</p>
                      <div class="study-actions"><button type="button" class="example-speak" @click="speakExample(example)">Nghe lại</button><button type="button" class="example-speak" @click="speakExample(example, 0.75)">Nghe chậm 0,75×</button><button v-if="!recording" type="button" class="example-speak" @click="startRecording">Bắt đầu ghi âm</button><button v-else type="button" class="example-speak" @click="stopRecording">Dừng ghi âm</button></div>
                      <p v-if="recordError" role="alert" class="example-speech-error">{{ recordError }}</p>
                      <audio v-if="recordedUrl" :src="recordedUrl" controls aria-label="Bản ghi của bạn"></audio>
                      <small>Bản ghi chỉ được giữ trong trình duyệt ở phiên này.</small>
                    </div>

                  </div>

                </template>


                <div
                  v-else
                  class="empty-example"
                >
                  Chưa có ví dụ
                </div>

              </div>

            </div>

          </div>

        </div>

      </template>

    </div>

  </div>

</template>

<style scoped>

.back-btn {

  display: inline-flex;

  align-items: center;

  gap: 10px;

  padding: 12px 18px;

  border-radius: 16px;

  background: white;

  color: var(--learn-heading);

  font-weight: 600;

  font-size: 14px;

  border: 1px solid #efeaf3;

  box-shadow: 0 4px 12px rgba(
    0,
    0,
    0,
    0.05
  );

  transition: all .25s ease;
}

.back-btn:hover {

  transform: translateY(-2px);

  border-color: #dfd7e7;

  box-shadow: 0 10px 24px rgba(
    79,
    140,
    255,
    0.12
  );
}

.back-btn:active {

  transform: translateY(0);
}

.sub-title {
  color: var(--learn-muted);
  font-size: 14px;
}

.grammar-panel {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  overflow: hidden;
}

.top-actions {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 16px;

  box-sizing: border-box;
}

.selected-lesson {
  font-size: 22px;
  font-weight: 700;

  color: var(--learn-text);

  overflow-wrap: anywhere;
}

.grammar-scroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  overflow-x: hidden;
}

.grammar-card {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  margin-bottom: 24px;

  padding: 24px;

  background: #ffffff;

  border: 1px solid var(--learn-border);

  border-radius: 18px;

  overflow: hidden;
}
.empty-state {
  padding: 70px 20px;

  text-align: center;

  color: var(--learn-muted);
}
.lesson-content-status { margin: 18px 0; padding: 14px 18px; border-radius: 12px; background: var(--learn-surface-muted); color: var(--learn-heading); }
.lesson-content-status button { margin-left: 10px; border: 0; background: transparent; color: var(--learn-primary); font-weight: 700; cursor: pointer; }
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--learn-text);
}
.empty-desc {
  margin-top: 6px;
}

/* =========================
   EXAMPLES
========================= */

.example-section {

  width: 100%;
  max-width: 100%;
  min-width: 0;
}

/* TOGGLE BUTTON */

.expand-btn {

  border: none;

  padding: 9px 14px;

  border-radius: 10px;

  background: var(--learn-primary-soft);

  color: var(--learn-primary);

  font-weight: 600;

  cursor: pointer;
}

.expand-btn:hover {

  transform: translateY(-1px);

  box-shadow: 0 8px 24px rgba(
    79,
    140,
    255,
    0.18
  );

  background: linear-gradient(
    135deg,
    var(--learn-primary-soft),
    #f3eff6
  );
}

/* EXPAND AREA */

.example-expand {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  margin-top: 14px;

  padding: 16px;

  box-sizing: border-box;

  border-radius: 14px;

  background: var(--learn-surface-muted);

  overflow: hidden;
}

/* CARD */

.example-card {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  padding: 14px;

  margin-bottom: 10px;

  background: white;

  border: 1px solid var(--learn-border);

  border-radius: 12px;
}

.example-card:hover {

  transform: translateY(-2px);

  box-shadow: 0 14px 32px rgba(
    0,
    0,
    0,
    0.06
  );
}

.example-row {

  display: flex;

  align-items: flex-start;

  gap: 12px;

  width: 100%;

  min-width: 0;
}

.jp-text :deep(*) {

  font-size: inherit !important;

  line-height: inherit !important;
}

.jp-text :deep(i) {

  font-style: italic;
}


.vn-text :deep(b) {

  font-weight: 700;
}

.vn-text :deep(i) {

  font-style: italic;
}

/* LEFT ACCENT */

.example-card::before {

  content: "";

  position: absolute;

  top: 0;

  left: 0;

  width: 4px;

  height: 100%;

  background: linear-gradient(
    180deg,
    var(--learn-primary),
    var(--learn-accent)
  );
}

/* JAPANESE */

.jp-text {

  font-family: var(--learn-jp-font);

  font-weight: var(--learn-jp-weight);

  color: var(--learn-jp-ink);

  font-size: var(--learn-jp-size-example);

  line-height: 1.9;

  overflow-wrap: anywhere;
}

/* VIETNAMESE */

.vn-text {

  margin-top: 6px;

  color: var(--learn-vn-ink);

  font-size: var(--learn-vn-size);

  font-weight: 500;

  line-height: 1.7;

  overflow-wrap: anywhere;
}

.vn-text::before {

  content: "";

  position: absolute;

  left: 0;

  top: 10px;

  width: 8px;

  height: 8px;

  border-radius: 50%;

  background: var(--learn-accent);
}

/* EMPTY */

.empty-example {

  text-align: center;

  padding: 40px 20px;

  border-radius: 18px;

  background: white;

  border: 1px dashed var(--learn-border);

  color: #8a95a8;

  font-weight: 500;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 768px) {

  .grammar-page {
    padding: 16px 12px;
  }

  .grammar-panel {
    padding: 14px;
    border-radius: 16px;
  }

  .page-header {
    flex-direction: column;

    gap: 12px;
  }

  .top-actions {
    align-items: flex-start;

    flex-direction: column;
  }

  .action-buttons {
    width: 100%;
  }

  .exercise-btn {
    width: 100%;
  }

  .grammar-card {
    padding: 14px;
  }

  .grammar-title {
    position: relative;

    display: flex;
    align-items: center;
    gap: 16px;

    margin-bottom: 24px;
    padding: 18px 22px;

    background: var(--learn-primary-softer);

    border: 1px solid var(--learn-primary-soft);
    border-left: 7px solid var(--learn-primary);

    border-radius: 14px;

    box-shadow:
      0 6px 20px
      rgba(107, 79, 134, .08);

    font-size: 26px;
    font-weight: 800;
    line-height: 1.5;

    color: var(--learn-text);
  }

  .lesson-reading-card {
    width: 100%;
    max-width: 100%;
    min-width: 0;

    box-sizing: border-box;

    margin-bottom: 24px;

    padding: 24px;

    background: #ffffff;

    border: 1px solid var(--learn-border);

    border-radius: 18px;

    overflow: hidden;
  }

  .example-expand {
    padding: 10px;
  }

}

/* =========================
   EXAMPLE TOPBAR
========================= */

.example-topbar {

  margin-bottom: 12px;
}

.example-count {

  font-weight: 700;
  color: var(--learn-heading);
}

/* ADD BUTTON */

.add-example-btn {

  border: none;

  padding: 12px 18px;

  border-radius: 14px;

  background: linear-gradient(
    135deg,
    var(--learn-primary),
    var(--learn-accent)
  );

  color: white;

  font-weight: 700;

  transition: all 0.25s ease;

  box-shadow: 0 10px 24px rgba(
    79,
    140,
    255,
    0.22
  );
}

.add-example-btn:hover {

  transform: translateY(-2px);

  box-shadow: 0 16px 32px rgba(
    79,
    140,
    255,
    0.35
  );
}

/* =========================
   EXAMPLE EDITOR
========================= */
.edit-example-btn {

  border: none;

  background: var(--learn-primary-softer);

  color: var(--learn-primary);

  padding: 8px 14px;

  border-radius: 12px;

  font-size: 14px;

  font-weight: 600;

  transition: all 0.2s ease;
}

.edit-example-btn:hover {

  background: var(--learn-primary-soft);

  transform: translateY(-1px);
}


.example-number {

  width: 30px;
  height: 30px;

  min-width: 30px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: var(--learn-primary-soft);

  color: var(--learn-primary);

  font-weight: 700;
}

.example-content {

  flex: 1;

  min-width: 0;

  overflow-wrap: anywhere;

  word-break: break-word;
}

.lesson-tabs {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  display: flex;
  gap: 10px;

  margin-bottom: 20px;

  overflow-x: auto;
  overflow-y: hidden;

  padding: 4px;

  scrollbar-width: thin;
}

.lesson-tabs::-webkit-scrollbar {

  height: 6px;
}

.lesson-tabs::-webkit-scrollbar-thumb {

  background: var(--learn-border);

  border-radius: 999px;
}

.lesson-tab {

  flex-shrink: 0;

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: var(--learn-surface-muted);

  color: var(--learn-heading);

  font-weight: 600;

  cursor: pointer;

  white-space: nowrap;

  transition: all .2s ease;

}

.lesson-tab:hover {

  background: var(--learn-primary-soft);
  color: var(--learn-primary);
}

.lesson-tab.active {

  background: linear-gradient(
    135deg,
    var(--learn-primary),
    var(--learn-accent)
  );

  color: white;
}


.lesson-add-tab {

  border-radius: 16px;

  padding: 12px 20px;

  white-space: nowrap;

  flex-shrink: 0;

  background: var(--learn-primary-soft);

  color: #8565a4;

  font-weight: 700;

  border: 1px dashed #cec1db;

  transition: all .25s ease;
}

.lesson-add-tab:hover {

  background: #f2eff5;
}


.book-title {

  font-size: 28px;
  font-weight: 700;
  color: var(--learn-text);
  overflow-wrap: anywhere;
}



.grammar-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-width: 0;
  margin-bottom: 18px;
  font-size: 20px;
  font-weight: 700;
  color: var(--learn-text)
}
.grammar-number {
  flex-shrink: 0;

  flex-shrink: 0;

  width: 48px;
  height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    var(--learn-primary),
    var(--learn-accent)
  );

  color: white;

  font-size: 20px;
  font-weight: 800;

  box-shadow:
    0 6px 16px
    rgba(107, 79, 134, .3);
}
.grammar-title-text {
  flex: 1;
  min-width: 0;

  color: var(--learn-text);

  font-size: 26px;
  font-weight: 800;

  line-height: 1.5;

  overflow-wrap: anywhere;
  word-break: break-word;
}

.grammar-description {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  margin-top: 18px;

  font-size: 17px;
  line-height: 1.9;

  white-space: pre-line;

  word-break: break-word;

  overflow-wrap: anywhere;
}

.grammar-description::before {

  content: "Giải thích";

  display: block;

  margin-bottom: 12px;

  font-size: 13px;

  font-weight: 700;

  color: var(--learn-primary);

  text-transform: uppercase;

  letter-spacing: .5px;
}

.selected-lesson-wrapper {

  min-width: 0;
  flex: 1;
}

/* =========================
   LESSON READING
========================= */

.lesson-reading-card {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  margin-bottom: 24px;
  padding: 24px;

  background: #fff;
  border: 1px solid var(--learn-border);
  border-radius: 18px;

  overflow: hidden;
}

.lesson-reading-header {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  display: flex;
  align-items: center;

  gap: 14px;

  margin-bottom: 20px;

  box-sizing: border-box;
}

.lesson-reading-icon {
  width: 42px;
  height: 42px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 12px;

  background: var(--learn-primary-soft);

  font-size: 22px;

  flex-shrink: 0;
}

.lesson-reading-title {

  font-weight: 700;
  color: var(--learn-text);
}

.lesson-reading-subtitle {

  font-size: 13px;
  color: var(--learn-muted);
}

.lesson-reading-content {

  display: block;

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  font-size: var(--learn-jp-size-reading);
  line-height: 1.9;
  font-family: var(--learn-jp-font);
  font-weight: var(--learn-jp-weight);
  color: var(--learn-jp-ink);

  overflow-x: hidden;
  overflow-y: visible;

  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.lesson-reading-content :deep(*) {
  max-width: 100%;
  box-sizing: border-box;
}
.lesson-reading-content :deep(p),
.lesson-reading-content :deep(div),
.lesson-reading-content :deep(span) {
  max-width: 100%;

  white-space: normal;

  word-break: break-word;

  overflow-wrap: anywhere;
}
.lesson-reading-content :deep(table) {
  width: 100%;
  max-width: 100%;

  table-layout: fixed;

  border-collapse: collapse;

  overflow-wrap: anywhere;
}
.lesson-reading-content :deep(img) {
  display: block;

  max-width: 100%;
  height: auto;

  object-fit: contain;
}


/* Nếu có iframe */

.lesson-reading-content :deep(iframe) {
  max-width: 100%;
}


/* Nếu có pre/code */

.lesson-reading-content :deep(pre) {
  max-width: 100%;

  overflow-x: auto;

  white-space: pre-wrap;

  word-break: break-word;
}

/* Textbook lessons (e.g. Minna no Nihongo): 文型 list and 会話 lines with the speaker in front. */
.lesson-reading-content :deep(h4) {
  margin: 18px 0 8px;
  font-family: inherit;
  font-size: 0.82em;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--learn-muted);
}
.lesson-reading-content :deep(h4:first-child) {
  margin-top: 0;
}
.lesson-reading-content :deep(ol) {
  margin: 0 0 6px;
  padding-left: 1.6em;
}
.lesson-reading-content :deep(ol li) {
  margin: 2px 0;
}
.lesson-reading-content :deep(p) {
  margin: 0 0 4px;
}
.lesson-reading-content :deep(p > strong:first-child) {
  font-weight: 700;
  color: var(--learn-accent, inherit);
}

.lesson-reading-content :deep(code) {
  max-width: 100%;

  word-break: break-word;
}
/* Scroll đẹp */

.lesson-reading-content::-webkit-scrollbar {

  width: 8px;
}

.lesson-reading-content::-webkit-scrollbar-thumb {

  background: #e1d9e8;

  border-radius: 999px;
}

@media (max-width: 768px) {

  .lesson-reading-content {

    font-size: var(--learn-jp-size-reading);

    line-height: 2;

    padding: 18px;
  }

  .lesson-reading-header {

    padding: 16px 18px;
  }

  .lesson-reading-icon {

    width: 44px;

    height: 44px;

    font-size: 20px;
  }
}
.action-buttons {

  flex-shrink: 0;
}

.exercise-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #22c55e,
    #16a34a
  );

  color: white;

  font-weight: 700;

  cursor: pointer;

  white-space: nowrap;
}

.exercise-btn:hover {

  transform: translateY(-2px);

  box-shadow: 0 8px 20px rgba(
    245,
    158,
    11,
    0.25
  );
}
.grammar-tabs {

  display: flex;
  gap: 10px;

  width: 100%;
  max-width: 100%;

  overflow-x: auto;
  overflow-y: visible;

  padding: 10px 4px 14px;

  scrollbar-width: thin;

  /* Quan trọng */
  min-width: 0;
}

.grammar-tab {

  position: relative;

  flex: 0 1 220px;
  min-width: 0;
  max-width: 220px;

  height: 46px;

  padding: 0 16px;

  border: 1px solid var(--learn-border);
  border-radius: 12px;

  background: var(--learn-surface-muted);

  color: var(--learn-heading);

  font-weight: 600;

  cursor: pointer;

  white-space: nowrap;

  overflow: hidden;
  text-overflow: ellipsis;

  transition:
    background .2s,
    color .2s,
    border-color .2s,
    transform .2s;

  flex-shrink: 1;
}
.grammar-tab-text {
  display: block;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grammar-tab:hover {

  background: var(--learn-primary-soft);
  border-color: var(--learn-primary);
  color: var(--learn-primary);

  z-index: 1000;
}
/* Tooltip full text */
.grammar-tab:hover::after {
  content: attr(data-tooltip);

  position: absolute;

  left: 0;
  top: calc(100% + 8px);

  width: max-content;
  max-width: 420px;

  padding: 10px 14px;

  border-radius: 10px;

  background: var(--learn-text);
  color: white;

  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;

  white-space: normal;
  word-break: break-word;

  box-shadow:
    0 8px 24px rgba(0, 0, 0, .18);

  pointer-events: none;
}
.grammar-tab.active {

  background: var(--learn-primary);
  color: white;
}
.grammar-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  padding: 20px 24px;
}

.example-card { position: relative; overflow: hidden; }
.jp-text, .vn-text { white-space: pre-line; }
.jp-text :deep(p), .vn-text :deep(p) { margin: 0; }
.vn-text::before { display: none; }
.example-speak { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid #d8cde2; border-radius: 999px; background: var(--learn-primary-softer); color: #553f6b; font-size: 12px; font-weight: 650; cursor: pointer; white-space: nowrap; }
.example-speak:hover { background: #ede8f1; }
.example-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; flex: none; }
.lesson-tab { display: inline-flex; align-items: center; gap: 6px; max-width: 220px; }
.lesson-tab-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lesson-done { color: #2f8a57; flex: none; }
.retry-link { padding: 0; border: 0; background: none; color: inherit; font-weight: 700; text-decoration: underline; cursor: pointer; }
@media (max-width: 600px) { .example-actions .action-text { display: none; } .example-actions .example-speak { padding: 8px 10px; } }
.grammar-title, .example-row { flex-wrap: wrap; }
.grammar-title .example-speak { margin-left: auto; }
.example-row .example-content { flex: 1 1 230px; }
.example-row .example-speak { white-space: normal; }
.example-practice { margin: 12px 0 4px; padding: 14px; border-radius: 12px; background: #f8f3fb; color: #514860; }
.example-practice .study-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.example-practice audio { display: block; max-width: 100%; margin: 8px 0; }
.example-practice small { color: #71667a; }
.example-speak:focus-visible { outline: 3px solid #bcaacd; outline-offset: 2px; }
.example-speech-error { margin: 8px 0 0; color: #a34141; font-size: 12px; }
.example-speech-credit { display: block; margin-top: 7px; color: #77638a; font-size: var(--learn-text-xs); }
.example-speech-credit a { color: inherit; text-decoration: underline; }

@media (max-width: 768px) {
  .grammar-page { padding: 8px 0 24px; }
  .page-header { gap: 12px; }
  .page-header > div { min-width: 0; width: 100%; }
  .book-title { font-size: 22px; line-height: 1.5; overflow-wrap: anywhere; }
  .back-btn { min-height: 44px; padding: 10px 14px; border-radius: 10px; }
  .lesson-tabs { gap: 8px; margin-bottom: 16px; padding: 4px 0 8px; scroll-padding-inline: 4px; }
  .lesson-tab { min-height: 44px; padding: 10px 16px; }
  .grammar-panel { padding: 0; overflow: visible; }
  .top-actions { gap: 12px; margin-bottom: 16px; }
  .selected-lesson { font-size: 20px; line-height: 1.5; }
  .exercise-btn { min-height: 46px; }
  .grammar-tabs { gap: 8px; padding: 4px 0 12px; margin-bottom: 12px; }
  .grammar-tab { flex: 0 0 auto; width: auto; max-width: 240px; height: auto; min-height: 44px; padding: 10px 14px; }
  .grammar-tab-text { white-space: normal; line-height: 1.5; }
  .grammar-card, .lesson-reading-card { padding: 16px; margin-bottom: 16px; border-radius: 16px; }
  .lesson-reading-header { padding: 0; gap: 10px; margin-bottom: 14px; }
  .lesson-reading-header > div:last-child { min-width: 0; }
  .lesson-reading-content { padding: 0; font-size: var(--learn-jp-size-reading); line-height: 1.95; }
  .lesson-reading-content :deep(table) { display: block; overflow-x: auto; table-layout: auto; }
  .grammar-title { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; padding: 12px; margin-bottom: 16px; border-left-width: 4px; border-radius: 12px; }
  .grammar-number { width: 32px; height: 32px; font-size: 16px; border-radius: 10px; }
  .grammar-title-text { font-size: 20px; line-height: 1.6; }
  .grammar-title .example-speak { grid-column: 1 / -1; margin-left: 0; justify-self: start; }
  .expand-btn { min-height: 44px; }
  .example-card { padding: 14px 12px; }
  .example-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .example-number { grid-column: 1 / -1; }
  .example-row .example-content { grid-column: 1 / -1; min-width: 0; }
  .example-row .example-speak:last-child { grid-column: 1 / -1; }
  .example-speak { min-height: 44px; justify-content: center; border-radius: 10px; white-space: normal; line-height: 1.5; }
  .jp-text { font-size: var(--learn-jp-size-example); line-height: 1.9; }
  .vn-text { font-size: var(--learn-vn-size); line-height: 1.8; }
  .example-practice { padding: 12px; font-size: 14px; }
  .example-practice .study-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .example-practice audio { width: 100%; min-width: 0; }
  .grammar-card { scroll-margin-top: 80px; }
}

</style>
<style scoped>
.book-head-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; }
</style>

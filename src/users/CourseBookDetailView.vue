<script setup lang="ts">
import { bookLessonOrder } from '@/services/bookLessonOrder'
import { bookAdditionalAudio } from '@/services/bookAdditionalAudio'
import {computed, nextTick, onMounted, onUnmounted, ref} from "vue"

import {useRoute, useRouter} from "vue-router"

import CreateLessonModal from "@/components/staff/CreateLessonModal.vue"

import {gatewayUrl} from "@/api/authApi.ts"
import ExampleModal from "@/components/staff/ExampleModal.vue"
import GrammarModal from "@/components/staff/GrammarModal.vue";
import { saveLearningPosition } from '@/api/learningPosition'
import GrammarNotes from '@/components/GrammarNotes.vue'
import GrammarStructure from '@/components/GrammarStructure.vue'
import { importedAudioUrl } from '@/services/bookImport'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
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
const showExampleModal = ref(false)

const activeGrammarId =
  ref<number | null>(null)

const selectedGrammarId =
  ref<number | null>(null)

const editingExample =
  ref<Example | null>(null)

const book =
  ref<Book | null>(null)

const lessons =
  ref<Lesson[]>([])

const grammars =
  ref<Grammar[]>([])

const selectedLesson =
  ref<Lesson | null>(null)

const readingTrack = computed(() => selectedLesson.value?.audioTrack || bookReadingAudioTrack(book.value?.bookName, selectedLesson.value?.name))
const readingAudioSource = computed(() => importedAudioUrl(selectedLesson.value?.audioUrl))
const isTryN3 = computed(() => book.value?.bookName?.startsWith('TRY! N3') ?? false)
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

const showLessonModal =
  ref(false)

const editingLesson =
  ref<Lesson | null>(null)


const examples =
  ref<Record<number, Example[]>>({})
type LessonContent = { grammars: Grammar[]; examples: Record<number, Example[]>; loadedAt: number }
const lessonContentCache = new Map<number, LessonContent>()
const loadingLessonContent = ref(false)
const lessonContentError = ref('')
let lessonRequestId = 0
let lessonContentController: AbortController | null = null
let disposed = false

const expandedGrammar =
  ref<Record<number, boolean>>({})

const showGrammarModal =
  ref(false)

const editingGrammar =
  ref<Grammar | null>(null)

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

const openCreateGrammarModal =
  () => {

    editingGrammar.value =
      null

    showGrammarModal.value =
      true
  }

const openEditGrammarModal =
  (grammar: Grammar) => {

    editingGrammar.value =
      grammar

    showGrammarModal.value =
      true
  }

const onGrammarSaved = async (
  grammarId: number
) => {

  showGrammarModal.value = false

  if (!selectedLesson.value) {
    return
  }

  await fetchGrammars(
    selectedLesson.value.lessonId
  )

  await nextTick()

  document
    .getElementById(
      `grammar-${grammarId}`
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    })
}

const deleteGrammar =
  async (grammarId: number) => {
    const confirmDelete =
      confirm(
        "Bạn có chắc muốn xóa grammar này?"
      )
    if (!confirmDelete) {
      return
    }
    try {
      await gatewayUrl.delete(
        "/api/staff/grammars",
        {
          data: {
            grammarId
          }
        }
      )
      if (
        selectedLesson.value
      ) {
        await fetchGrammars(
          selectedLesson.value.lessonId
        )
      }
    } catch (e) {
      console.error(e)
      alert(
        "Xóa grammar thất bại"
      )
    }
  }

const openCreateExampleModal = (
  grammarId: number
) => {

  selectedGrammarId.value =
    grammarId

  editingExample.value =
    null

  showExampleModal.value =
    true
}

const openEditExampleModal = (
  example: Example
) => {

  selectedGrammarId.value =
    example.grammarId

  editingExample.value =
    example

  showExampleModal.value =
    true
}

const onExampleSaved = async (
  exampleId: number
) => {

  showExampleModal.value = false

  if (!selectedGrammarId.value) {
    return
  }

  // đảm bảo đang expand
  expandedGrammar.value[
    selectedGrammarId.value
    ] = true

  await fetchExamples(
    selectedGrammarId.value
  )

  await nextTick()

  document
    .getElementById(
      `example-${exampleId}`
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    })
}
/* =========================
   BOOK ID
========================= */

const bookId =
  Number(route.params.bookId)
const courseId = Number(route.query.courseId)
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
          `/api/staff/books/${bookId}`
        )

      book.value = res.data

    } catch (e) {

      console.error(e)

      alert(
        "Không thể tải thông tin sách"
      )
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
            }
          }
        )

      lessons.value =
        bookLessonOrder(res.data)

    } catch (e) {

      console.error(e)

      alert(
        "Không thể tải bài học"
      )
    }
  }

/* =========================
   FETCH GRAMMARS
========================= */

const fetchGrammars =
  async (lessonId: number) => {

    try {

      const res =
        await gatewayUrl.get(
          "/api/staff/getAllGrammarByLesson",
          {
            params: {
              lessonId
            }
          }
        )

      grammars.value = res.data
      lessonContentCache.delete(lessonId)

    } catch (e) {

      console.error(e)

      alert(
        "Không thể tải grammar"
      )
    }
  }


/* =========================
   LESSON MODAL
========================= */

const openLessonModal =
  () => {
    editingLesson.value =
      null

    showLessonModal.value =
      true
  }

const openEditLessonModal =
  (lesson: Lesson) => {

    editingLesson.value =
      lesson

    showLessonModal.value =
      true
  }

const closeLessonModal =
  async () => {

    showLessonModal.value =
      false
    editingLesson.value =
      null
    await fetchLessons()
    selectedLesson.value = lessons.value.find(l => l.lessonId === selectedLesson.value?.lessonId) || null
  }

/* =========================
   OPEN LESSON
========================= */

const openLesson = async (
  lesson: Lesson
) => {

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

  const cached = lessonContentCache.get(lesson.lessonId)
  if (cached && Date.now() - cached.loadedAt < 60_000) {
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
  try {
    const [grammarResponse, exampleResponse] = await Promise.all([
      gatewayUrl.get<Grammar[]>('/api/staff/getAllGrammarByLesson', {
        params: { lessonId: lesson.lessonId }, signal: controller.signal,
      }),
      gatewayUrl.get<Example[]>(`/api/staff/lessons/${lesson.lessonId}/examples`, {
        signal: controller.signal,
      }),
    ])
    if (requestId !== lessonRequestId) return
    const lessonExamples: Record<number, Example[]> = {}
    for (const grammar of grammarResponse.data) lessonExamples[grammar.grammarId] = []
    for (const example of exampleResponse.data) {
      if (lessonExamples[example.grammarId]) lessonExamples[example.grammarId]!.push(example)
    }
    const content = { grammars: grammarResponse.data, examples: lessonExamples, loadedAt: Date.now() }
    if (lessonContentCache.size >= 8) lessonContentCache.delete(lessonContentCache.keys().next().value!)
    lessonContentCache.set(lesson.lessonId, content)
    grammars.value = content.grammars
    examples.value = content.examples
    expandedGrammar.value = Object.fromEntries(content.grammars.map(grammar => [grammar.grammarId, true]))
  } catch (error) {
    if (requestId !== lessonRequestId) return
    console.error(error)
    lessonContentError.value = 'Không thể tải nội dung bài học. Vui lòng thử lại.'
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
    if (selectedLesson.value) lessonContentCache.delete(selectedLesson.value.lessonId)

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

const goBack = () => {
  if (Number.isInteger(courseId) && courseId > 0) {
    router.push({ name: 'CourseBooks', params: { courseId } })
  } else {
    router.push('/staff')
  }
}

const getStructureImage = (
  imageUrl: string
) => {

  return imageUrl.replace(
    "/upload/",
    "/upload/w_1200,c_limit/"
  )
}

/* =========================
   MOUNT
========================= */
onUnmounted(() => {
  clearRecording()
  disposed = true
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
  await Promise.all([fetchBook(), fetchLessons()])
  if (disposed) return

  /* AUTO OPEN FIRST LESSON */

  if (
    lessons.value.length > 0
  ) {
    const requestedLessonId = Number(route.query.lessonId)
    const requestedGrammarId = Number(route.query.grammarId)
    const requestedLesson = lessons.value.find(lesson => lesson.lessonId === requestedLessonId)
    await openLesson(requestedLesson ?? lessons.value[0]!)
    if (Number.isInteger(requestedGrammarId) && requestedGrammarId > 0) {
      await nextTick()
      document.getElementById(`grammar-${requestedGrammarId}`)?.scrollIntoView({ block: 'center' })
    }
  } else {
    rememberPosition(null)
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

  <div class="grammar-page">
    <p v-if="positionError" role="alert" class="position-error">{{ positionError }}</p>
    <p v-if="bookmarkError" role="alert" class="position-error">{{ bookmarkError }}</p>

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
            📚 {{ book?.bookName }}
          </h2>

          <div class="sub-title">
            Bài đọc, ngữ pháp và ví dụ
          </div>

        </div>

        <button
          class="back-btn"
          @click="goBack"
        >
          ← Quay lại
        </button>

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
        @click="openLesson(lesson)"
      >
        Bài {{ index + 1 }}
      </button>

    </div>


    <!-- CONTENT -->

    <div class="grammar-panel">

      <div
        v-if="!selectedLesson"
        class="empty-state"
      >

        <div class="empty-icon">
          📘
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

          </div>

          <div class="action-buttons">

            <button
              class="exercise-btn"
              @click="goToExercisePage()"
            >
              🎯 Bài tập
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


        <!-- READING -->

        <div
          v-if="selectedLesson.reading"
          class="lesson-reading-card"
        >

          <div class="lesson-reading-header">

            <div class="lesson-reading-icon">
              📖
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

            <GrammarStructure v-if="grammar.imageUrl" :source="getStructureImage(grammar.imageUrl)" :title="grammar.title" @enlarge="openImage(grammar.imageUrl)" />


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
                          class="jp-text"
                          v-html="
                            example.nihongo
                          "
                        />

                        <div
                          v-if="example.vietnamese"
                          class="vn-text"
                          v-html="
                            example.vietnamese
                          "
                        />

                        <p
                          v-if="activeSpokenExampleId === example.exampleId && speechError"
                          class="example-speech-error"
                          role="alert"
                        >{{ speechError }}</p>

                        <small v-if="activeSpokenExampleId === example.exampleId && speechProvider === 'voicevox'" class="example-speech-credit">
                          Giọng: <a href="https://voicevox.hiroshiba.jp/product/zundamon/" target="_blank" rel="noopener noreferrer">VOICEVOX: ずんだもん</a>
                        </small>

                      </div>

                      <button
                        v-if="isTryN3 && example.nihongo?.trim()"
                        type="button"
                        class="example-speak"
                        :aria-label="`Nghe phát âm câu ví dụ ${exampleIndex + 1}`"
                        title="Nghe giọng VOICEVOX; dùng giọng trình duyệt nếu VOICEVOX chưa sẵn sàng"
                        @click="speakExample(example)"
                      >
                        <i class="bi bi-volume-up" aria-hidden="true"></i>
                        <span>Nghe phát âm</span>
                      </button>
                      <button type="button" class="example-speak" :disabled="cardsLoading || bookmarkBusy === `example:${example.exampleId}`" @click="bookmarkExample(example)">{{ saved(`example:${example.exampleId}`) ? 'Đã lưu' : 'Lưu vào sổ tay' }}</button>
                      <button v-if="example.nihongo?.trim()" type="button" class="example-speak" @click="showPractice(example)">Luyện nghe nói</button>

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

  color: #334155;

  font-weight: 600;

  font-size: 14px;

  border: 1px solid #e7edf6;

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

  border-color: #c9d7f5;

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
  color: #64748b;
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

  color: #1e293b;

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

  border: 1px solid #e2e8f0;

  border-radius: 18px;

  overflow: hidden;
}
.empty-state {
  padding: 70px 20px;

  text-align: center;

  color: #64748b;
}
.lesson-content-status { margin: 18px 0; padding: 14px 18px; border-radius: 12px; background: #f1f5f9; color: #475569; }
.lesson-content-status button { margin-left: 10px; border: 0; background: transparent; color: #2563eb; font-weight: 700; cursor: pointer; }
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
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

  background: #eef4ff;

  color: #2563eb;

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
    #eef4ff,
    #e6edff
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

  background: #f8fafc;

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

  border: 1px solid #e2e8f0;

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
    #4f8cff,
    #7b61ff
  );
}

/* JAPANESE */

.jp-text {

  font-family:
    "Noto Sans JP",
    sans-serif;

  font-size: 18px;

  line-height: 1.8;

  overflow-wrap: anywhere;
}

/* VIETNAMESE */

.vn-text {

  margin-top: 6px;

  color: #64748b;

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

  background: #7b61ff;
}

/* EMPTY */

.empty-example {

  text-align: center;

  padding: 40px 20px;

  border-radius: 18px;

  background: white;

  border: 1px dashed #d7dfeb;

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

    background: #f8faff;

    border: 1px solid #dbe7ff;
    border-left: 7px solid #4f8cff;

    border-radius: 14px;

    box-shadow:
      0 6px 20px
      rgba(37, 99, 235, .08);

    font-size: 26px;
    font-weight: 800;
    line-height: 1.5;

    color: #172554;
  }

  .lesson-reading-card {
    width: 100%;
    max-width: 100%;
    min-width: 0;

    box-sizing: border-box;

    margin-bottom: 24px;

    padding: 24px;

    background: #ffffff;

    border: 1px solid #e2e8f0;

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
  color: #475569;
}

/* ADD BUTTON */

.add-example-btn {

  border: none;

  padding: 12px 18px;

  border-radius: 14px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
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

  background: #f8faff;

  color: #4f8cff;

  padding: 8px 14px;

  border-radius: 12px;

  font-size: 14px;

  font-weight: 600;

  transition: all 0.2s ease;
}

.edit-example-btn:hover {

  background: #eef4ff;

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

  background: #eef4ff;

  color: #2563eb;

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

  background: #d7dfeb;

  border-radius: 999px;
}

.lesson-tab {

  flex-shrink: 0;

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: #f1f5f9;

  color: #475569;

  font-weight: 600;

  cursor: pointer;

  white-space: nowrap;

  transition: all .2s ease;

}

.lesson-tab:hover {

  background: #e0e7ff;
  color: #4f46e5;
}

.lesson-tab.active {

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;
}


.lesson-add-tab {

  border-radius: 16px;

  padding: 12px 20px;

  white-space: nowrap;

  flex-shrink: 0;

  background: #eef4ff;

  color: #3158d8;

  font-weight: 700;

  border: 1px dashed #9db7ff;

  transition: all .25s ease;
}

.lesson-add-tab:hover {

  background: #e5eeff;
}


.book-title {

  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
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
  color: #1e293b
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
    #2563eb,
    #7c3aed
  );

  color: white;

  font-size: 20px;
  font-weight: 800;

  box-shadow:
    0 6px 16px
    rgba(37, 99, 235, .3);
}
.grammar-title-text {
  flex: 1;
  min-width: 0;

  color: #172554;

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

  content: "📝 Giải thích";

  display: block;

  margin-bottom: 12px;

  font-size: 13px;

  font-weight: 700;

  color: #4f46e5;

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
  border: 1px solid #e2e8f0;
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

  background: #e0e7ff;

  font-size: 22px;

  flex-shrink: 0;
}

.lesson-reading-title {

  font-weight: 700;
  color: #1e293b;
}

.lesson-reading-subtitle {

  font-size: 13px;
  color: #64748b;
}

.lesson-reading-content {

  display: block;

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  font-size: 17px;
  line-height: 1.9;
  color: #334155;

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

.lesson-reading-content :deep(code) {
  max-width: 100%;

  word-break: break-word;
}
/* Scroll đẹp */

.lesson-reading-content::-webkit-scrollbar {

  width: 8px;
}

.lesson-reading-content::-webkit-scrollbar-thumb {

  background: #d5ddec;

  border-radius: 999px;
}

@media (max-width: 768px) {

  .lesson-reading-content {

    font-size: 16px;

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

  border: 1px solid #e2e8f0;
  border-radius: 12px;

  background: #f8fafc;

  color: #334155;

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

  background: #eef4ff;
  border-color: #4f8cff;
  color: #2563eb;

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

  background: #1e293b;
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

  background: #4f8cff;
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
.example-speak { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid #c5d9ea; border-radius: 999px; background: #f0f7fd; color: #275b83; font-size: 12px; font-weight: 650; cursor: pointer; white-space: nowrap; }
.example-speak:hover { background: #deeffb; }
.grammar-title, .example-row { flex-wrap: wrap; }
.grammar-title .example-speak { margin-left: auto; }
.example-row .example-content { flex: 1 1 230px; }
.example-row .example-speak { white-space: normal; }
.example-practice { margin: 12px 0 4px; padding: 14px; border-radius: 12px; background: #f8f3fb; color: #514860; }
.example-practice .study-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.example-practice audio { display: block; max-width: 100%; margin: 8px 0; }
.example-practice small { color: #71667a; }
.example-speak:focus-visible { outline: 3px solid #90c5e7; outline-offset: 2px; }
.example-speech-error { margin: 8px 0 0; color: #a34141; font-size: 12px; }
.example-speech-credit { display: block; margin-top: 7px; color: #63748a; font-size: 11px; }
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
  .lesson-reading-content { padding: 0; font-size: 16px; line-height: 1.95; }
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
  .jp-text { font-size: 17px; line-height: 1.9; }
  .vn-text { font-size: 14px; line-height: 1.8; }
  .example-practice { padding: 12px; font-size: 14px; }
  .example-practice .study-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .example-practice audio { width: 100%; min-width: 0; }
  .grammar-card { scroll-margin-top: 80px; }
}

</style>

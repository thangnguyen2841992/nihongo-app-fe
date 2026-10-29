<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue"
import {useRoute, useRouter} from "vue-router"
import {gatewayUrl} from "@/api/authApi.ts";

import BookExerciseHeading from '@/components/BookExerciseHeading.vue'
import ContentReport from '@/components/operations/ContentReport.vue'
import BookAiSolution from '@/components/BookAiSolution.vue'
import type { AiAnswer } from '@/services/bookAiAnswers'
import BookListeningPreview from '@/components/BookListeningPreview.vue'
import { importedAudioUrl } from '@/services/bookImport'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import { exerciseBookLayout, exerciseGroups, bookChoiceColumns, bookAudioTrack, bookListeningItem, bookAnswersPending, tryN3Listening, audioBlocks } from '@/services/exerciseBookLayout'

const route = useRoute()
const router = useRouter()
const started = ref(false)
const submitted = ref(false)
const submitting = ref(false)
const submitFailed = ref(false)
let pendingSubmission: { submissionId: string; lessonId: number; answers: Record<number, string> } | null = null
const createSubmissionId = () => {
  // getRandomValues also works when studying over a local HTTP network on a phone.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
const remainSeconds = ref(0)
let timer: number | null = null
// The countdown is computed from an absolute deadline: browsers slow down timers in background tabs, so counting
// ticks would give a learner who switched tabs extra time.
let deadline: number | null = null
const timed = ref(true)
const confirmingSubmit = ref(false)
const draftNotice = ref('')
const answeredCount = computed(() => exercises.value.filter(e => selectedAnswers.value[e.exerciseKeywordId]).length)
const unansweredNow = computed(() => exercises.value.length - answeredCount.value)
// An attempt in progress survives a reload or leaving the page (same tab): answers and the deadline are kept until
// the attempt is submitted or restarted.
type Draft = { answers: Record<number, string>; deadline: number | null; timed: boolean }
const draftKey = () => `exercise-draft:${lessonId.value}`
const saveDraft = () => {
  if (!started.value || submitted.value) return
  try { sessionStorage.setItem(draftKey(), JSON.stringify({ answers: selectedAnswers.value, deadline, timed: timed.value } satisfies Draft)) } catch { /* optional */ }
}
const clearDraft = () => { try { sessionStorage.removeItem(draftKey()) } catch { /* optional */ } }
const readDraft = (): Draft | null => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey()) || 'null') as Draft | null
    return draft && typeof draft.answers === 'object' ? draft : null
  } catch { return null }
}
const tick = () => {
  if (deadline === null) return
  remainSeconds.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  if (remainSeconds.value <= 0) void submitExercise(true)
}
const startTimer = () => {
  if (timer !== null) clearInterval(timer)
  timer = null
  if (deadline === null) return
  tick()
  if (!submitted.value && !submitting.value) timer = window.setInterval(tick, 500)
}
const showResult = ref(false)
const showTimeUp = ref(false)
const unansweredCount = ref(0)
const score = ref<ScoreResult>({
  total: 0,
  correct: 0,
  wrong: 0
})

interface ExerciseGroup {
  exerciseTypeId: number
  exerciseTypeName: string
  exercises: ExerciseKeyword[]
}
const goToHistory = () => {

  router.push({
    name: "user-exercise-history",
    params: {
      lessonId: lessonId.value
    }
  })

}
interface Lesson {
  lessonId: number
  name: string
  description: string
  reading: string
  bookId: number
}

interface ScoreResult {
  total: number
  correct: number
  wrong: number
}

interface ExerciseKeyword {
  aiSolution?: AiAnswer | null
  audioUrl?: string | null
  audioLabel?: string | null
  exerciseKeywordId: number

  contentNihongo: string

  answerA: string
  answerB: string
  answerC: string
  answerD: string

  correctAnswer: string

  lessonId: number
  exerciseTypeId: number
  exerciseTypeName: string
}

interface ExerciseType {
  exerciseTypeId: number
  name: string
}

const comment = computed(() => {

  if (percent.value >= 95)
    return "Hoàn hảo! Bạn đã nắm rất chắc bài học.";

  if (percent.value >= 80)
    return "Rất tốt! Chỉ còn vài lỗi nhỏ.";

  if (percent.value >= 60)
    return "Khá ổn. Hãy luyện thêm để đạt điểm cao hơn.";

  return "Đừng nản! Làm lại một lần nữa nhé.";

})


const isAutoScrolling =
  ref(false)
const activeGroupId =
  ref<number | null>(null)
const activeExerciseId =
  ref<number | null>(null)

const exercises =
  ref<ExerciseKeyword[]>([])

const loadingExercises =
  ref(true)
const exerciseLoadError = ref(false)

const lesson =
  ref<Lesson | null>(null)

const lessonId = computed(
  () =>
    Number(
      route.params.lessonId
    )
)

const formattedTime = computed(() => {

  const minute = Math.floor(remainSeconds.value / 60)
  const second = remainSeconds.value % 60

  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`

})
const startExercise = (withTimer = true) => {

  if (answersPending.value || started.value || submitted.value || submitting.value || submitFailed.value || !exercises.value.length) {
    return
  }

  started.value = true
  timed.value = withTimer
  draftNotice.value = ''
  deadline = withTimer ? Date.now() + exercises.value.length * 30_000 : null
  remainSeconds.value = withTimer ? exercises.value.length * 30 : 0
  startTimer()
  saveDraft()

}
const percent = computed(() => {

  if (score.value.total === 0) {
    return 0
  }

  return Math.round(
    score.value.correct * 100 / score.value.total
  )

})
const restartExercise = () => {

  started.value = false
  submitted.value = false
  submitFailed.value = false
  confirmingSubmit.value = false
  draftNotice.value = ''
  deadline = null
  clearDraft()

  pendingSubmission = null
  unansweredCount.value = 0

  showResult.value = false
  showTimeUp.value = false

  remainSeconds.value = 0

  selectedAnswers.value = {}

  score.value = {
    total: 0,
    correct: 0,
    wrong: 0
  }

  if (timer != null) {
    clearInterval(timer)
    timer = null
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  })
}
const submitExercise = async (isTimeUp = false, confirmed = false) => {

  if (answersPending.value || submitted.value || submitting.value) {
    return
  }
  // Unanswered questions count as wrong: ask once on the page before submitting (never when time is up).
  if (!isTimeUp && !confirmed && !submitFailed.value && unansweredNow.value > 0) {
    confirmingSubmit.value = true
    return
  }
  confirmingSubmit.value = false

  submitting.value = true
  started.value = false

  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }

  try {
    pendingSubmission ??= {
      submissionId: createSubmissionId(), lessonId: lessonId.value, answers: { ...selectedAnswers.value }
    }
    const { data } = await gatewayUrl.post("/api/nihongo-user/userExerciseAttempt", pendingSubmission)
    score.value = { total: data.totalQuestion, correct: data.correctCount, wrong: data.wrongCount }
    unansweredCount.value = data.unansweredCount ?? 0
    exercises.value.forEach(e => { e.correctAnswer = data.correctAnswers[e.exerciseKeywordId]; e.aiSolution = data.aiSolutions?.[e.exerciseKeywordId] })
    submitted.value = true
    submitFailed.value = false
    deadline = null
    clearDraft()
  } catch {
    submitFailed.value = true
    return
  } finally {
    submitting.value = false
  }

  if (isTimeUp) {

    showTimeUp.value = true

  } else {

    showResult.value = true

  }

}
const exerciseTypes =
  ref<ExerciseType[]>([])

const selectedAnswers = ref<Record<number, string>>({})

const selectAnswer = (
  exerciseId: number,
  answer: string
) => {

  if ((!started.value && !answersPending.value) || submitted.value) {
    return
  }

  selectedAnswers.value[exerciseId] = answer
  confirmingSubmit.value = false
  saveDraft()

}
const scrollToListening = () => {
  document.getElementById('book-listening')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const handleScroll = () => {
  const listening = document.getElementById('book-listening')
  if (!hasListeningExercises.value && !isAutoScrolling.value && listening && listening.getBoundingClientRect().top <= 180) {
    activeGroupId.value = -4
    return
  }

  if (
    isAutoScrolling.value
  ) {
    return
  }

  // Đầu trang
  if (
    window.scrollY < 100 &&
    groupedExercises.value.length
  ) {

    const firstGroup =
      groupedExercises.value[0]

    if (firstGroup) {

      activeGroupId.value =
        firstGroup.exerciseTypeId
    }

    return
  }

  // Cuối trang
  const isBottom =
    window.innerHeight +
    window.scrollY >=
    document.documentElement
      .scrollHeight - 20

  if (
    isBottom &&
    groupedExercises.value.length
  ) {

    const lastGroup =
      groupedExercises.value[
      groupedExercises.value.length - 1
        ]

    if (lastGroup) {

      activeGroupId.value =
        lastGroup.exerciseTypeId

    }

    return
  }

  // Vị trí kích hoạt active
  const triggerLine = 180

  for (const group of groupedExercises.value) {
    const el =
      document.getElementById(
        `group-${group.exerciseTypeId}`
      )

    if (!el) {
      continue
    }

    const rect =
      el.getBoundingClientRect()

    if (
      rect.top <= triggerLine &&
      rect.bottom > triggerLine
    ) {

      activeGroupId.value =
        Number(group.exerciseTypeId)

      return
    }
  }
}
const fetchExerciseTypes =
  async () => {

    const res =
      await gatewayUrl.get(
        "/api/staff/exerciseTypes"
      )

    exerciseTypes.value =
      res.data
  }

const fetchExercises =
  async () => {

    try {

      loadingExercises.value =
        true
      exerciseLoadError.value = false

      const res =
        await gatewayUrl.get(
          `/api/staff/getAllExcercisesKeywordOfLesson/${lessonId.value}`
        )

      exercises.value =
        res.data

    } catch (e) {

      console.error(e)
      exercises.value = []
      exerciseLoadError.value = true

    } finally {

      loadingExercises.value =
        false
    }
  }

const fetchLesson =
  async () => {

    try {

      const res =
        await gatewayUrl.get(
          `/api/staff/lessons/${lessonId.value}`
        )

      lesson.value =
        res.data

    } catch (e) {

      console.error(e)
    }
  }
onMounted(async () => {
  window.addEventListener(
    "scroll",
    handleScroll
  )

  await Promise.all([
    fetchLesson(),
    fetchExercises(),
    fetchExerciseTypes()
  ])
  if (groupedExercises.value.length) {
    activeGroupId.value =
      groupedExercises.value[0]!.exerciseTypeId
  }
  handleScroll()
  restoreDraft()

})
function restoreDraft() {
  const draft = readDraft()
  if (!draft || !exercises.value.length || answersPending.value) return
  const known = new Set(exercises.value.map(e => e.exerciseKeywordId))
  selectedAnswers.value = Object.fromEntries(Object.entries(draft.answers).filter(([id]) => known.has(Number(id))))
  started.value = true
  timed.value = draft.timed
  deadline = draft.timed ? draft.deadline : null
  if (deadline !== null && deadline <= Date.now()) {
    draftNotice.value = 'Đã hết giờ trong lúc bạn rời trang, bài làm dở được nộp tự động.'
    void submitExercise(true)
    return
  }
  draftNotice.value = 'Đã khôi phục bài làm dở của bạn.'
  startTimer()
}
onUnmounted(() => {
  if (timer !== null) clearInterval(timer)

  window.removeEventListener(
    "scroll",
    handleScroll
  )
})

// Opened from Review or a bookmark there may be no in-app history: go to the lesson itself instead of leaving the app.
const goBack = () => {
  const bookId = Number(route.query.bookId || lesson.value?.bookId)
  if (window.history.state?.back) { router.back(); return }
  if (Number.isInteger(bookId) && bookId > 0) {
    void router.push({ name: 'CourseBookDetail', params: { bookId }, query: { ...(route.query.courseId ? { courseId: String(route.query.courseId) } : {}), lessonId: String(lessonId.value) } })
    return
  }
  void router.push('/user/my-courses')
}

// Shared listening players stick just below the sticky toolbar, whose height changes with the screen width.
const tabsBar = ref<HTMLElement | null>(null)
const audioStickyTop = ref(170)
let tabsObserver: ResizeObserver | null = null
const measureTabs = () => {
  const bar = tabsBar.value
  if (!bar) return
  audioStickyTop.value = Math.round((parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight + 8)
}
watch(tabsBar, bar => {
  tabsObserver?.disconnect()
  tabsObserver = null
  if (!bar) return
  measureTabs()
  if (typeof ResizeObserver !== 'undefined') { tabsObserver = new ResizeObserver(measureTabs); tabsObserver.observe(bar) }
})
onUnmounted(() => tabsObserver?.disconnect())

const groupedExercises = computed<ExerciseGroup[]>(() => exerciseGroups(exercises.value, exerciseTypes.value))
const isBookReview = computed(() => exercises.value.some(e => exerciseBookLayout(e.exerciseTypeName)))
const answersPending = computed(() => exercises.value.some(e => bookAnswersPending(e.exerciseTypeName)))
const hasListeningExercises = computed(() => exercises.value.some(e => exerciseBookLayout(e.exerciseTypeName)?.title === '聴解'))
const scrollToGroup =
  (exerciseTypeId: number) => {

    isAutoScrolling.value =
      true

    activeGroupId.value =
      exerciseTypeId

    const element =
      document.getElementById(
        `group-${exerciseTypeId}`
      )

    if (!element) {

      isAutoScrolling.value =
        false

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

    setTimeout(() => {

      isAutoScrolling.value =
        false

    }, 600)
  }
</script>

<template>

  <div class="container-fluid py-4 exercise-page" :class="{ 'book-review': isBookReview }" :style="{ '--audio-sticky-top': `${audioStickyTop}px` }">
    <ContentReport :lesson-id="lessonId" style="margin-bottom:16px" />

    <!-- HEADER -->

    <div
      class="
        page-header
        d-flex
        justify-content-between
        align-items-center
        mb-4
      "
    >

      <div>

        <h2 class="page-title">
          <i class="bi bi-journal-text" aria-hidden="true"></i> Bài tập:
          {{
            lesson?.name ||
            "Đang tải..."
          }}
        </h2>

      </div>

      <div class="header-actions">

        <!-- Lịch sử làm bài -->

        <button
          class="history-btn"
          @click="goToHistory"
        >
          <i class="bi bi-bar-chart-line" aria-hidden="true"></i> Lịch sử làm bài
        </button>

        <!-- Quay lại -->

        <button
          class="back-btn"
          @click="goBack"
        >
          ← Quay lại
        </button>

      </div>

    </div>

    <!-- MENU -->

    <div v-if="!loadingExercises && exercises.length" ref="tabsBar" class="exercise-tabs">

      <div class="tabs-left">

        <button
          v-for="(group, groupIndex) in groupedExercises"
          :key="group.exerciseTypeId"
          class="exercise-tab"
          :class="{
        active:
        activeGroupId ===
        Number(group.exerciseTypeId)
      }"
          @click="
        scrollToGroup(
          Number(group.exerciseTypeId)
        )
      "
        >
          {{ exerciseBookLayout(group.exerciseTypeName) ? '問題' + exerciseBookLayout(group.exerciseTypeName)?.number : 'Bài ' + (groupIndex + 1) }}
        </button>
        <button v-if="isBookReview && !hasListeningExercises" class="exercise-tab" :class="{ active: activeGroupId === -4 }" @click="scrollToListening">問題4</button>

      </div>

      <div v-if="started && !submitted" class="timer" :class="{ warning: timed && remainSeconds <= 60 }" role="timer">
        <template v-if="timed"><i class="bi bi-alarm" aria-hidden="true"></i> {{ formattedTime }} · </template>Đã làm {{ answeredCount }}/{{ exercises.length }}
      </div>

      <button
        v-if="submitted"
        class="restart-btn"
        @click="restartExercise">

        <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Làm lại

      </button>
      <div class="submit-wrap">

        <button
          v-if="!started && !submitted && !submitFailed"
          type="button"
          class="practice-btn"
          title="Làm bài không giới hạn thời gian; kết quả vẫn được lưu"
          :disabled="answersPending || submitting || !exercises.length"
          @click="startExercise(false)">
          Luyện không tính giờ
        </button>
        <button
          class="start-btn"
          @click="startExercise(true)"
          :disabled="answersPending || started || submitted || submitting || submitFailed || !exercises.length">

          {{
            submitted
              ? "Đã kết thúc"
              : started
                ? "Đang làm bài"
                : "Bắt đầu (tính giờ)"
          }}

        </button>

        <button
          class="submit-btn"
          @click="submitExercise()"
          :disabled="answersPending || (!started && !submitFailed) || submitted || submitting"
        >
          {{ submitting ? "Đang nộp..." : submitted ? "Đã nộp" : submitFailed ? "Nộp lại" : "Nộp bài" }}
        </button>

      </div>
    </div>
    <div v-if="confirmingSubmit" class="exercise-notice warning" role="alert">
      <span>Còn {{ unansweredNow }} câu chưa trả lời; câu bỏ trống được tính là sai.</span>
      <span class="notice-actions">
        <button type="button" class="confirm-submit-btn" @click="submitExercise(false, true)">Vẫn nộp bài</button>
        <button type="button" class="keep-working-btn" @click="confirmingSubmit = false">Làm tiếp</button>
      </span>
    </div>
    <p v-if="submitFailed && !submitting" class="exercise-notice error" role="alert">Chưa lưu được bài làm. Đáp án vẫn được giữ, hãy bấm “Nộp lại”.</p>
    <p v-if="draftNotice" class="exercise-notice" role="status">{{ draftNotice }}</p>

    <!-- CONTENT -->

    <div
      class="
        exercise-content
      "
    >

      <div v-if="loadingExercises"
           class="empty-state">
        Đang tải...
      </div>

      <div v-else-if="exerciseLoadError" class="empty-state" role="alert">
        <div class="empty-state-title">Không tải được danh sách bài tập</div>
        <button type="button" class="empty-retry-btn" @click="fetchExercises">Thử lại</button>
      </div>

      <div v-else-if="!exercises.length" class="empty-state" role="status">
        <div class="empty-state-icon" aria-hidden="true"><i class="bi bi-journal-check" aria-hidden="true"></i></div>
        <div class="empty-state-title">Không có bài tập</div>
        <p>Bài học này hiện chưa có bài tập. Bạn có thể quay lại nội dung bài học.</p>
        <button type="button" class="back-btn" @click="goBack">← Quay lại bài học</button>
      </div>

      <div
        v-else
        class="exercise-list"
      >
        <h2 v-if="isBookReview" class="book-review-title" lang="ja">まとめの問題 <small>Bài ôn tập</small></h2>

        <div
          v-for="(group, groupIndex) in groupedExercises"
          :key="group.exerciseTypeId"
          :id="`group-${group.exerciseTypeId}`"
          class="exercise-group">
          <BookExerciseHeading :type-name="group.exerciseTypeName" :index="groupIndex" />
          <!-- Questions that play the same listening file are shown together under one player. -->
          <div
            v-for="block in audioBlocks(group.exercises)"
            :key="block.key"
            :class="{ 'audio-block': importedAudioUrl(block.audioUrl) }"
          >
          <!-- The player stays in view below the toolbar while the questions of its file are answered. -->
          <div v-if="importedAudioUrl(block.audioUrl)" class="audio-block-player">
            <BookAudioPlayer :source="importedAudioUrl(block.audioUrl)" :label="block.label ? `Nghe: ${block.label}` : undefined" />
          </div>
          <div v-if="block.shared || (importedAudioUrl(block.audioUrl) && block.items.length > 1)" class="audio-block-intro">
            <div v-if="block.shared" class="audio-block-shared" v-html="block.shared" />
            <p v-if="importedAudioUrl(block.audioUrl) && block.items.length > 1" class="audio-block-note">{{ block.items.length }} câu dùng chung file nghe này.</p>
          </div>
          <div
            v-for="{ exercise, index, content } in block.items"
            :key="
      exercise.exerciseKeywordId
    "
            :id="
      `exercise-${exercise.exerciseKeywordId}`
    "
            class="exercise-card"
            :class="{
      compact: block.items.length > 1,
      highlight:
        activeExerciseId ===
        exercise.exerciseKeywordId
    }"
          >

            <p v-if="bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06'" class="listening-instruction" lang="ja">2. {{ tryN3Listening.instruction2 }}</p>
            <p v-if="bookListeningItem(bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo))?.item === 1 && bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) !== '06'" class="listening-instruction" lang="ja">聴解 {{ bookListeningItem(bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo))?.part }}</p>
            <div
              class="exercise-header"
            >

              <div class="exercise-title-wrapper">

                <div class="question-number">
                  {{ exerciseBookLayout(group.exerciseTypeName) ? (bookListeningItem(bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo))?.item ?? index + 1) : (block.items.length > 1 ? '' : 'Câu ') + (index + 1) }}
                </div>

                <div
                  v-if="content && !bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)" class="exercise-title"
                  v-html="content"/>

              </div>
              <div class="action-group">
              </div>
            </div>

            <BookAudioPlayer v-if="!importedAudioUrl(exercise.audioUrl) && bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)" :track="bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)!" />
            <div class="answer-grid" :style="{ '--choice-columns': bookChoiceColumns(group.exerciseTypeName, index, exercise.answerD ? 4 : 3) }">

              <div
                class="answer-item"
                :class="{

        selected:
        selectedAnswers[exercise.exerciseKeywordId]=='A',

        wrong:
        submitted &&
        selectedAnswers[exercise.exerciseKeywordId]=='A' &&
        exercise.correctAnswer!='A'

    }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'A')"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerA === '1')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '1' : 'A.') }} {{ exercise.answerA }}
              </div>

              <div
                class="answer-item"
                :class="{

        selected:
        selectedAnswers[exercise.exerciseKeywordId]=='B',

        wrong:
        submitted &&
        selectedAnswers[exercise.exerciseKeywordId]=='B' &&
        exercise.correctAnswer!='B'

    }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'B')"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerB === '2')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '2' : 'B.') }} {{ exercise.answerB }}
              </div>

              <!-- ○/× questions have only A and B. -->
              <div v-if="exercise.answerC"
                class="answer-item"
                :class="{

        selected:
        selectedAnswers[exercise.exerciseKeywordId]=='C',

        wrong:
        submitted &&
        selectedAnswers[exercise.exerciseKeywordId]=='C' &&
        exercise.correctAnswer!='C'

    }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'C')"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerC === '3')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '3' : 'C.') }} {{ exercise.answerC }}
              </div>

              <div v-if="exercise.answerD"
                class="answer-item"
                :class="{

        selected:
        selectedAnswers[exercise.exerciseKeywordId]=='D',

        wrong:
        submitted &&
        selectedAnswers[exercise.exerciseKeywordId]=='D' &&
        exercise.correctAnswer!='D'

    }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'D')"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerD === '4')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '4' : 'D.') }} {{ exercise.answerD }}
              </div>

            </div>
            <BookAiSolution :exercise="exercise" :visible="submitted || answersPending" :answer-key-hidden="!submitted" />
          </div>
          </div>

        </div>

      </div>

    </div>

    <BookListeningPreview v-if="isBookReview && !hasListeningExercises && !loadingExercises" />
  </div>
  <div
    v-if="showTimeUp"
    class="result-mask">

    <div class="result-dialog">

      <div class="result-icon">
        <i class="bi bi-stars" aria-hidden="true"></i>
      </div>

      <h2>Kết quả bài làm</h2>

      <div class="result-summary">

        <div class="summary-item">
          <span>Tổng câu</span>
          <strong>{{ score.total }}</strong>
        </div>

        <div class="summary-item correct">
          <span>Đúng</span>
          <strong>{{ score.correct }}</strong>
        </div>

        <div class="summary-item wrong">
          <span>Sai</span>
          <strong>{{ score.wrong }}</strong>
        </div>
        <div class="summary-item"><span>Chưa trả lời</span><strong>{{ unansweredCount }}</strong></div>

      </div>

      <div class="score-circle">

        {{ percent }}

        <small>điểm</small>

      </div>

      <div class="dialog-actions">

        <button
          class="restart-btn"
          @click="restartExercise">

          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Làm lại

        </button>

        <button
          class="close-btn"
          @click="showTimeUp=false">

          Đóng

        </button>

      </div>

    </div>

  </div>
  <div
    v-if="showResult"
    class="result-mask"
  >

    <div class="result-dialog">

      <div class="result-icon">
        <i class="bi bi-trophy" aria-hidden="true"></i>
      </div>

      <h2>Hoàn thành bài tập</h2>

      <div
        class="badge"
        :class="{
            excellent: percent>=90,
            good: percent>=70 && percent<90,
            normal: percent<70
        }">

        {{
          percent >= 90
            ? 'Xuất sắc'
            : percent >= 70
              ? 'Tốt'
              : 'Cần cố gắng'
        }}

      </div>
      <!-- THÊM Ở ĐÂY -->
      <p class="result-comment">
        {{ comment }}
      </p>

      <div class="score-circle">

        <div class="score-number">
          {{ percent }}
        </div>

        <span>điểm</span>

      </div>
      <div class="result-grid">

        <div class="item">

          <small>Tổng câu</small>

          <strong>{{ score.total }}</strong>

        </div>

        <div class="item correct">

          <small>Đúng</small>

          <strong>{{ score.correct }}</strong>

        </div>

        <div class="item wrong">

          <small>Sai</small>

          <strong>{{ score.wrong }}</strong>

        </div>
        <div class="item"><small>Chưa trả lời</small><strong>{{ unansweredCount }}</strong></div>

      </div>
      <div class="progress-box">

        <div class="progress-bar-custom">

          <div
            class="progress-correct"
            :style="{width: percent+'%'}"/>

          <div
            class="progress-wrong"
            :style="{width:(100-percent)+'%'}"/>

        </div>

        <div class="progress-text">

          {{ percent }}%

        </div>

      </div>
      <div class="dialog-actions">

        <button
          class="restart-btn"
          @click="restartExercise">

          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Làm lại

        </button>

        <button
          class="answer-btn" @click="showResult=false">

          <i class="bi bi-book-half" aria-hidden="true"></i> Xem đáp án

        </button>

        <button
          class="close-btn"
          @click="showResult=false">

          Đóng

        </button>

      </div>
    </div>

  </div>


</template>

<style scoped>
.exercise-notice { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 14px; padding: 10px 14px; border: 1px solid #ded6e6; border-radius: 10px; background: var(--learn-primary-softer); color: var(--learn-heading); font-size: 14px; }
.exercise-notice.warning { border-color: #f3d19c; background: #fff8eb; color: #7a4b00; }
.exercise-notice.error { border-color: #f1b4b4; background: #fff1f1; color: #9b1c1c; }
.notice-actions { display: flex; gap: 8px; }
.notice-actions button, .practice-btn { padding: 7px 12px; border: 1px solid #c9b8d6; border-radius: 9px; background: #fff; color: #5b4370; font-weight: 600; cursor: pointer; }
.confirm-submit-btn { background: #6b4f86 !important; border-color: #6b4f86 !important; color: #fff !important; }
.practice-btn:disabled { opacity: .5; cursor: not-allowed; }
.start-btn:disabled, .submit-btn:disabled { opacity: .5; cursor: not-allowed; }

.page-title {

  font-size: 30px;

  font-weight: 700;

  margin: 0;
}

.exercise-tabs {
  position: sticky;
  top: 80px;
  z-index: 1000;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;

  padding: 18px 24px;

  background: #ffffff;

  border-radius: 22px;

  border: 1px solid rgba(107, 79, 134, .15);

  box-shadow: 0 12px 40px rgba(63, 53, 72, .12),
  0 2px 8px rgba(63, 53, 72, .08);

  margin-bottom: 30px;
}

.exercise-tab {

  border: none;

  padding: 12px 18px;

  border-radius: 14px;

  background: white;

  font-weight: 600;
  cursor: pointer;
}

.exercise-tab:hover {
  background: var(--learn-primary-soft);

  color: var(--learn-primary);

  transform: translateY(-1px);
}

.exercise-tab.active {

  background: linear-gradient(
    135deg,
    var(--learn-primary),
    var(--learn-accent)
  );

  color: white;
}

.empty-state {

  padding: 64px 24px;

  text-align: center;

  color: var(--learn-muted);
}
.empty-state-icon { font-size: 36px; margin-bottom: 12px; }
.empty-state-title { color: var(--learn-heading); font-size: 20px; font-weight: 700; }
.empty-state p { margin: 10px 0 20px; }
.empty-retry-btn { margin-top: 16px; padding: 10px 18px; border: 0; border-radius: 10px; background: #f3eff6; color: var(--learn-primary); font-weight: 600; cursor: pointer; }

.page-title {

  font-size: 30px;

  font-weight: 700;

  margin: 0;

  color: var(--learn-text);
}

.exercise-list {

  display: flex;

  flex-direction: column;

  gap: 18px;
}

.exercise-card {

  background: white;

  border: 1px solid var(--learn-border);

  border-radius: 18px;

  padding: 20px;

  transition: all .35s ease;
}

.exercise-card.highlight {

  border: 2px solid var(--learn-primary);

  box-shadow: 0 0 0 6px rgba(
    79,
    140,
    255,
    .15
  );

  transform: scale(1.02);
}

.exercise-card:hover {

  transform: translateY(-2px);

  box-shadow: 0 10px 30px rgba(
    0,
    0,
    0,
    .08
  );
}

.exercise-header {

  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  margin-bottom: 16px;
}


.answer-grid {

  display: grid;

  grid-template-columns:
    repeat(
      2,
      1fr
    );

  gap: 12px;
}

@media (max-width: 768px) {

  .answer-grid {
    grid-template-columns: 1fr;
  }

  .exercise-header {
    flex-direction: column;
  }

  .action-group {
    width: 100%;
  }
}

.answer-item {

  border: 1px solid var(--learn-border);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--learn-surface-muted);
  cursor: pointer;
  transition: all .2s;
}

.answer-item:hover {
  background: var(--learn-primary-soft);
  border-color: var(--learn-primary);
}

.answer-item.selected {
  background: var(--learn-primary-soft);
  border-color: var(--learn-primary);
  color: var(--learn-primary);
  font-weight: 700;
}

.answer-item.wrong {

  background: #fee2e2;

  border: 2px solid #ef4444;

  color: #991b1b;

  font-weight: 700;

}


.exercise-title {

  font-size: 18px;

  font-weight: 700;

  color: var(--learn-text);
}

.action-group {

  display: flex;

  gap: 8px;

  align-items: center;
}

.exercise-group {
  margin-bottom: 40px;
  scroll-margin-top: 90px;
}

/* One listening file shared by several questions: one player, the instruction once, compact questions. */
.audio-block {
  border: 1px solid var(--learn-border);
  border-left: 4px solid var(--learn-primary);
  border-radius: 16px;
  padding: 0 0 6px;
  margin: 16px 0;
  background: #fff;
}
.audio-block-player {
  position: sticky;
  top: var(--audio-sticky-top, 170px);
  z-index: 20;
  background: var(--learn-primary-softer);
  border-bottom: 1px solid var(--learn-border);
  border-radius: 12px 12px 0 0;
  padding: 6px 14px 4px;
}
.audio-block-intro { padding: 10px 16px 4px; }
.audio-block-shared { font-size: 15px; line-height: 1.6; color: var(--learn-text); }
.audio-block-shared :deep(p) { margin: 0 0 2px; }
.audio-block-note { margin: 4px 0 0; font-size: 13px; color: var(--learn-muted); }
.exercise-card.compact {
  border: 0;
  border-top: 1px dashed var(--learn-border);
  border-radius: 0;
  padding: 10px 16px;
  margin: 0;
  box-shadow: none;
  transform: none;
}
.exercise-card.compact:hover { transform: none; box-shadow: none; background: var(--learn-primary-softer); }
.exercise-card.compact.highlight { box-shadow: inset 3px 0 0 var(--learn-primary); transform: none; }
.exercise-card.compact .exercise-title-wrapper { align-items: baseline; gap: 10px; }
.exercise-card.compact .question-number { min-width: 30px; padding: 2px 8px; font-size: 13px; }
.exercise-card.compact .exercise-title { font-size: 16px; font-weight: 600; }
.exercise-card.compact .exercise-title :deep(p) { margin: 0; }
.exercise-card.compact .answer-grid,
.book-review .exercise-card.compact .answer-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr));
  gap: 6px;
  margin: 8px 0 0 40px;
}
.exercise-card.compact .answer-item { padding: 6px 10px; border-radius: 10px; font-size: 15px; line-height: 1.4; }
@media (max-width: 768px) {
  .audio-block-player { padding: 4px 10px 2px; }
  .audio-block-intro { padding: 8px 12px 2px; }
  .exercise-card.compact { padding: 10px 12px; }
  .exercise-card.compact .exercise-header { flex-direction: row; }
  .exercise-card.compact .answer-grid,
  .book-review .exercise-card.compact .answer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-left: 0; }
}

.group-header {
  display: flex;
  align-items: center;

  margin-bottom: 20px;
  padding: 14px 18px;

  border-radius: 16px;

  background: linear-gradient(
    135deg,
    var(--learn-primary),
    var(--learn-accent)
  );

  color: white;

  font-size: 22px;
  font-weight: 700;

  box-shadow: 0 8px 24px rgba(
    79,
    140,
    255,
    .25
  );
}

.exercise-title-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.question-number {
  min-width: 70px;

  padding: 6px 12px;

  border-radius: 999px;

  background: var(--learn-primary-soft);

  color: var(--learn-primary);

  font-size: 14px;
  font-weight: 700;

  text-align: center;
}

.exercise-title {
  flex: 1;
  word-break: break-word;
  font-size: 20px;
  line-height: 1.8;

  font-family: "Noto Sans JP",
  sans-serif;
}

.tabs-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
}

.tabs-left::-webkit-scrollbar {
  height: 6px;
}

.tabs-left::-webkit-scrollbar-thumb {
  background: var(--learn-border);
  border-radius: 999px;
}

.submit-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.start-btn {
  margin-right: 10px;
}

.submit-btn, .start-btn {
  border: none;
  padding: 12px 18px;
  border-radius: 14px;
  background: white;
  font-weight: 600;
  cursor: pointer;
  font-size: 18px;
  background: linear-gradient(135deg, var(--learn-primary), var(--learn-primary));
  color: white;
}

.timer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: 14px;
  background: var(--learn-surface-muted);
  border: 2px solid var(--learn-primary);
  font-size: 18px;
  font-weight: 700;
}

.time {
  color: #dc2626;
  font-size: 26px;
  font-weight: 800;
  min-width: 70px;
  text-align: center;
}

.timer.warning {

  animation: blink .8s infinite;

}

@keyframes blink {

  0% {
    background: #fff;
  }

  50% {
    background: #fee2e2;
  }

  100% {
    background: #fff;
  }

}

.answer-item.wrong {

  background: #fee2e2;

  border-color: #dc2626;

  color: #dc2626;

}

.result-mask {

  position: fixed;

  inset: 0;

  background: rgba(0, 0, 0, .45);

  display: flex;

  justify-content: center;

  align-items: center;

  z-index: 9999;

  animation: fadeIn .25s ease;

}

.result-dialog h2 {

  margin-bottom: 20px;

  font-size: 28px;

  font-weight: 700;

  color: var(--learn-text);

}

.result-dialog p {

  margin: 12px 0;

  font-size: 18px;

  color: var(--learn-heading);

}

.result-dialog .score {

  margin: 24px 0;

  font-size: 42px;

  font-weight: 800;

  color: var(--learn-primary);

}

.close-btn {

  margin-top: 24px;

  width: 100%;

  padding: 12px;

  border: none;

  border-radius: 12px;

  background: linear-gradient(
    135deg,
    var(--learn-primary),
    var(--learn-primary)
  );

  color: white;

  font-size: 17px;

  font-weight: 700;

  cursor: pointer;

  transition: .2s;

}

.close-btn:hover {

  transform: translateY(-2px);

  box-shadow: 0 10px 20px rgba(107, 79, 134, .35);

}

@keyframes fadeIn {

  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }

}

@keyframes popup {

  from {

    opacity: 0;

    transform: scale(.85);

  }

  to {

    opacity: 1;

    transform: scale(1);

  }

}

.result-icon {

  width: 90px;
  height: 90px;

  margin: auto;

  border-radius: 50%;

  background: var(--learn-primary-soft);

  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 45px;

  margin-bottom: 20px;

}

.result-summary {

  display: grid;

  grid-template-columns:repeat(3, 1fr);

  gap: 15px;

  margin: 25px 0;

}

.summary-item {

  background: var(--learn-surface-muted);

  padding: 15px;

  border-radius: 15px;

}

.summary-item span {

  display: block;

  color: var(--learn-muted);

  margin-bottom: 8px;

}

.summary-item strong {

  font-size: 28px;

}

.summary-item.correct {

  background: #dcfce7;

  color: #15803d;

}

.summary-item.wrong {

  background: #fee2e2;

  color: #dc2626;

}

@keyframes zoom {

  0% {

    transform: scale(.5);

    opacity: 0;

  }

  100% {

    transform: scale(1);

    opacity: 1;

  }

}

.score-circle::before {

  content: "";

  position: absolute;

  width: 240px;

  height: 240px;

  background: rgba(255, 255, 255, .18);

  border-radius: 50%;

  top: -130px;

  left: -40px;

}


.score-circle small {

  font-size: 18px;

  font-weight: 600;

}

.dialog-actions {

  display: flex;

  gap: 15px;

  margin-top: 25px;

}

.dialog-actions button {

  flex: 1;

}

.restart-btn {

  border: none;

  padding: 14px;

  border-radius: 12px;

  background: #f59e0b;

  color: white;

  font-weight: 700;

  cursor: pointer;

  transition: .2s;

}

.restart-btn:hover {

  background: #d97706;

  transform: translateY(-2px);

}

.close-btn {

  margin-top: 0;

}

.result-dialog {

  width: 620px;

  max-width: 92vw;

  border-radius: 32px;

  padding: 40px;

  background: white;

  box-shadow: 0 25px 70px rgba(0, 0, 0, .2);

}

.result-grid {

  display: grid;

  grid-template-columns:repeat(3, 1fr);

  gap: 18px;

  margin: 30px 0;

}

.item {

  background: var(--learn-surface-muted);

  border-radius: 18px;

  padding: 20px;

  text-align: center;
  transition: .25s;
}

.item:hover {

  transform: translateY(-4px);

  box-shadow: 0 10px 30px rgba(0, 0, 0, .08);

}

.score-circle {

  position: relative;
  overflow: hidden;

  width: 170px;
  height: 170px;

  margin: 28px auto;

  border-radius: 50%;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  background: linear-gradient(135deg, var(--learn-primary), var(--learn-accent));

  color: white;

  font-weight: 800;

  box-shadow: 0 18px 40px rgba(107, 79, 134, .35);

  animation: zoom .5s ease;

}

.progress-bar-custom {

  display: flex;

  height: 20px;

  border-radius: 999px;

  box-shadow: inset 0 2px 6px rgba(0, 0, 0, .08);

  overflow: hidden;

  background: var(--learn-surface-muted);

  margin-top: 20px;

}

.progress-correct {

  background: #22c55e;

  transition: 1s;
  animation: fillGreen 1s ease;
}

.progress-wrong {

  background: #ef4444;

  transition: 1s;
  animation: fillRed 1s ease;
}

.badge {

  display: inline-flex;

  align-items: center;

  justify-content: center;

  border-radius: 999px;

  font-size: 20px;

  letter-spacing: 1px;

  padding: 12px 28px;

  font-weight: 700;

  margin: 20px auto;

}

.badge.excellent {

  background: #fef3c7;

  color: #ca8a04;

}

.badge.good {

  background: #dcfce7;

  color: #15803d;

}

.badge.normal {

  background: #fee2e2;

  color: #dc2626;

}

.score-number {

  font-size: 58px;

  font-weight: 900;

  line-height: 1;

}

.score-circle span {

  margin-top: 8px;

  font-size: 18px;

  opacity: .9;

}

.result-comment {

  margin-top: 18px;

  color: var(--learn-muted);

  font-size: 17px;

  line-height: 1.7;

}
.header-actions {

  display: flex;

  align-items: center;

  gap: 10px;

}

.history-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: var(--learn-primary-soft);

  color: var(--learn-primary);

  font-weight: 600;

  cursor: pointer;

  transition: all .2s ease;

}

.history-btn:hover {

  background: var(--learn-primary-soft);

  transform: translateY(-1px);

}

.back-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: white;

  color: var(--learn-heading);

  font-weight: 600;

  cursor: pointer;

  transition: all .2s ease;

}

.back-btn:hover {

  background: var(--learn-surface-muted);

  transform: translateY(-1px);

}

@media (max-width: 768px) {

  .page-header {

    align-items: flex-start !important;

    gap: 15px;

  }

  .header-actions {

    flex-direction: column;

    align-items: stretch;

  }

  .history-btn,
  .back-btn {

    white-space: nowrap;

  }

}

.book-review .exercise-list { background: #fff; border: 1px solid var(--learn-border); border-radius: 12px; padding: 28px; }
.book-review .exercise-group { margin-bottom: 36px; }
.book-review .exercise-card { border: 0; border-radius: 0; box-shadow: none; padding: 20px 0; margin: 0; border-bottom: 1px solid #f1edf5; background: #fff; }
.book-review .exercise-header { gap: 16px; }
.book-review .question-number { min-width: 34px; width: 34px; height: 28px; padding: 0; display: grid; place-items: center; border: 1px solid var(--learn-subtle); border-radius: 0; background: #fff; color: var(--learn-text); font-size: 16px; flex-shrink: 0; }
.book-review .exercise-title { font-size: 18px; font-weight: 400; line-height: 1.9; }
.book-review .answer-grid { grid-template-columns: repeat(var(--choice-columns, 2), minmax(0, 1fr)); margin-top: 16px; gap: 12px; }
.book-review .answer-item { font-size: 16px; line-height: 1.8; padding: 8px 12px; overflow-wrap: anywhere; }
.book-review .page-header { flex-wrap: wrap; gap: 16px; }
.book-review .exercise-card:hover { transform: none; }
@media (max-width: 800px) { .book-review .exercise-list { padding: 20px; }.book-review .answer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.book-review .exercise-title { font-size: 16px; } }
.book-review-title { font-size: 24px; font-weight: 700; color: var(--learn-text); margin: 0 0 30px; }.book-review-title small { font-size: 16px; font-weight: 400; color: var(--learn-muted); margin-left: 12px; }
.listening-instruction { margin: 0 0 24px; font-size: 17px; line-height: 1.9; color: var(--learn-text); }
.result-grid, .result-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }

@media (max-width: 768px) {
  .exercise-page { padding-left: 0; padding-right: 0; }
  .page-header { flex-direction: column; gap: 12px; }
  .page-header > div { min-width: 0; width: 100%; }
  .page-title { font-size: 22px; line-height: 1.5; overflow-wrap: anywhere; }
  .header-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
  .history-btn, .back-btn { min-height: 44px; padding: 10px 12px; font-size: 13px; white-space: normal; border-radius: 10px; }
  .exercise-tabs { display: flex; flex-wrap: wrap; top: 64px; gap: 8px; padding: 10px; border-radius: 14px; margin-bottom: 18px; }
  .tabs-left { flex: 1 1 100%; min-width: 0; gap: 6px; padding-bottom: 4px; }
  .exercise-tab { flex: 0 0 auto; min-height: 44px; padding: 10px 14px; white-space: nowrap; }
  .timer { flex: 0 0 auto; min-width: 0; padding: 8px; font-size: 14px; }
  .submit-wrap { flex: 1 1 0; min-width: 0; gap: 6px; }
  .start-btn, .submit-btn { flex: 1; min-width: 0; min-height: 44px; margin: 0; padding: 8px; font-size: 13px; line-height: 1.4; border-radius: 10px; }
  .exercise-tabs .restart-btn { min-height: 44px; padding: 8px 10px; font-size: 13px; }
  .group-header { padding: 12px; font-size: 18px; line-height: 1.6; overflow-wrap: anywhere; margin-bottom: 14px; }
  .exercise-group { margin-bottom: 24px; scroll-margin-top: 200px; }
  .exercise-list { gap: 12px; }
  .exercise-card { min-width: 0; padding: 14px; border-radius: 14px; }
  .exercise-card.highlight { transform: none; box-shadow: 0 0 0 3px #4f8cff20; }
  .exercise-title-wrapper { width: 100%; gap: 8px; }
  .question-number { flex-shrink: 0; min-width: 48px; padding: 6px 8px; font-size: 12px; }
  .exercise-title { min-width: 0; font-size: 16px; line-height: 1.9; }
  .exercise-title :deep(img) { max-width: 100%; height: auto; }
  .answer-grid, .book-review .answer-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .answer-item, .book-review .answer-item { min-height: 46px; padding: 12px; font-size: 16px; line-height: 1.7; overflow-wrap: anywhere; }
  .book-review .exercise-list { padding: 14px; }
  .book-review .exercise-card { padding: 16px 0; }
  .book-review .exercise-header { gap: 8px; }
  .book-review-title { font-size: 20px; line-height: 1.6; margin-bottom: 18px; }
  .book-review-title small { display: block; margin-left: 0; font-size: 14px; }
  .result-mask { padding: 12px; overflow-y: auto; }
  .result-dialog { box-sizing: border-box; width: 100%; max-width: 440px; max-height: calc(100dvh - 24px); overflow-y: auto; padding: 22px 16px; border-radius: 20px; }
  .result-dialog h2 { font-size: 22px; line-height: 1.5; }
  .result-icon { font-size: 40px; }
  .score-circle { width: 130px; height: 130px; margin: 18px auto; }
  .score-number { font-size: 42px; }
  .result-grid, .result-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 18px 0; }
  .item, .summary-item { min-width: 0; padding: 12px 6px; border-radius: 12px; }
  .item small, .summary-item span { font-size: 12px; }
  .dialog-actions { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin-top: 18px; }
  .dialog-actions button { min-height: 44px; width: 100%; padding: 10px 12px; }
}
</style>

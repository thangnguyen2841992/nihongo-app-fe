<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref} from "vue"
import {useRoute, useRouter} from "vue-router"
import {gatewayUrl} from "@/api/authApi.ts";

import BookExerciseHeading from '@/components/BookExerciseHeading.vue'
import BookAiSolution from '@/components/BookAiSolution.vue'
import type { AiAnswer } from '@/services/bookAiAnswers'
import BookListeningPreview from '@/components/BookListeningPreview.vue'
import { importedAudioUrl } from '@/services/bookImport'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import { exerciseBookLayout, exerciseGroups, bookChoiceColumns, bookAudioTrack, bookListeningItem, bookAnswersPending, tryN3Listening } from '@/services/exerciseBookLayout'

const route = useRoute()
const router = useRouter()
const started = ref(false)
const submitted = ref(false)
const submitting = ref(false)
const submitFailed = ref(false)
const remainSeconds = ref(0)
let timer: number | null = null
const showResult = ref(false)
const showTimeUp = ref(false)
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

  return "Đừng nản! Làm lại một lần nữa nhé 💪";

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
  ref(false)
const showCreateModal =
  ref(false)

const editingExercise =
  ref(null)

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
const startExercise = () => {

  if (answersPending.value || started.value || submitted.value || submitting.value || submitFailed.value || !exercises.value.length) {
    return
  }

  started.value = true

  remainSeconds.value = exercises.value.length * 30

  timer = window.setInterval(async () => {

    if (remainSeconds.value <= 0) {

      remainSeconds.value = 0

      await submitExercise(true)

      return

    }

    remainSeconds.value--

  }, 1000)

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
const submitExercise = async (isTimeUp = false) => {

  if (answersPending.value || submitted.value || submitting.value) {
    return
  }

  submitting.value = true
  started.value = false

  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }

  try {
    const { data } = await gatewayUrl.post("/api/nihongo-user/userExerciseAttempt", {
      lessonId: lessonId.value, answers: selectedAnswers.value
    })
    score.value = { total: data.totalQuestion, correct: data.correctCount, wrong: data.wrongCount }
    exercises.value.forEach(e => { e.correctAnswer = data.correctAnswers[e.exerciseKeywordId]; e.aiSolution = data.aiSolutions?.[e.exerciseKeywordId] })
    submitted.value = true
    submitFailed.value = false
  } catch {
    submitFailed.value = true
    alert("Chưa lưu được bài làm. Vui lòng thử nộp lại.")
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

      const res =
        await gatewayUrl.get(
          `/api/staff/getAllExcercisesKeywordOfLesson/${lessonId.value}`
        )

      exercises.value =
        res.data

    } catch (e) {

      console.error(e)

      alert(
        "Không tải được danh sách bài tập"
      )

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

      alert(
        "Không tải được lesson"
      )
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

})
onUnmounted(() => {
  if (timer !== null) clearInterval(timer)

  window.removeEventListener(
    "scroll",
    handleScroll
  )
})

const reloadExercises =
  async (
    exerciseId?: number
  ) => {

    await fetchExercises()

    if (!exerciseId) {
      return
    }

    activeExerciseId.value =
      exerciseId

    await nextTick()

    document
      .getElementById(
        `exercise-${exerciseId}`
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      })

    setTimeout(() => {
      activeExerciseId.value =
        null
    }, 3000)
  }

const goBack = () => {

  router.back()
}

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

  <div class="container-fluid py-4" :class="{ 'book-review': isBookReview }">

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
          📘 Bài tập:
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
          📊 Lịch sử làm bài
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

    <div class="exercise-tabs">

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

      <div v-if="started && !submitted" class="timer" :class="{ warning: remainSeconds <= 60 }">
        ⏰ {{ formattedTime }}
      </div>

      <button
        v-if="submitted"
        class="restart-btn"
        @click="restartExercise">

        🔄 Làm lại

      </button>
      <div class="submit-wrap">

        <button
          class="start-btn"
          @click="startExercise"
          :disabled="answersPending || started || submitted || submitting || submitFailed || !exercises.length">

          {{
            submitted
              ? "Đã kết thúc"
              : started
                ? "Đang làm bài"
                : "Bắt đầu"
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
          <div
            v-for="
  (exercise, index)
  in group.exercises
"
            :key="
      exercise.exerciseKeywordId
    "
            :id="
      `exercise-${exercise.exerciseKeywordId}`
    "
            class="exercise-card"
            :class="{
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
                  {{ exerciseBookLayout(group.exerciseTypeName) ? (bookListeningItem(bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo))?.item ?? index + 1) : 'Câu ' + (index + 1) }}
                </div>

                <div
                  v-if="!bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)" class="exercise-title"
                  v-html="exercise.contentNihongo"/>

              </div>
              <div class="action-group">
              </div>
            </div>

            <BookAudioPlayer v-if="importedAudioUrl(exercise.audioUrl)" :source="importedAudioUrl(exercise.audioUrl)" />
            <BookAudioPlayer v-else-if="bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)" :track="bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)!" />
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

              <div
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

    <BookListeningPreview v-if="isBookReview && !hasListeningExercises && !loadingExercises" />
  </div>
  <div
    v-if="showTimeUp"
    class="result-mask">

    <div class="result-dialog">

      <div class="result-icon">
        🎉
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

      </div>

      <div class="score-circle">

        {{ Math.round(score.correct * 100 / score.total) }}

        <small>điểm</small>

      </div>

      <div class="dialog-actions">

        <button
          class="restart-btn"
          @click="restartExercise">

          🔄 Làm lại

        </button>

        <button
          class="close-btn"
          @click="showResult=false">

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
        🏆
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

          🔄 Làm lại

        </button>

        <button
          class="answer-btn">

          📖 Xem đáp án

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

  border: 1px solid rgba(37, 99, 235, .15);

  box-shadow: 0 12px 40px rgba(15, 23, 42, .12),
  0 2px 8px rgba(15, 23, 42, .08);

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
  background: #eef4ff;

  color: #2563eb;

  transform: translateY(-1px);
}

.exercise-tab.active {

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;
}

.empty-state {

  padding: 80px;

  text-align: center;

  color: #94a3b8;
}

.page-title {

  font-size: 30px;

  font-weight: 700;

  margin: 0;

  color: #1e293b;
}

.exercise-list {

  display: flex;

  flex-direction: column;

  gap: 18px;
}

.exercise-card {

  background: white;

  border: 1px solid #e2e8f0;

  border-radius: 18px;

  padding: 20px;

  transition: all .35s ease;
}

.exercise-card.highlight {

  border: 2px solid #4f8cff;

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

  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  cursor: pointer;
  transition: all .2s;
}

.answer-item:hover {
  background: #eef4ff;
  border-color: #4f8cff;
}

.answer-item.selected {
  background: #dbeafe;
  border-color: #2563eb;
  color: #1d4ed8;
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

  color: #1e293b;
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

.group-header {
  display: flex;
  align-items: center;

  margin-bottom: 20px;
  padding: 14px 18px;

  border-radius: 16px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
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

  background: #eef4ff;

  color: #2563eb;

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
  background: #d7dfeb;
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
  background: linear-gradient(135deg, #2563eb, #4f8cff);
  color: white;
}

.timer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: 14px;
  background: #f8fafc;
  border: 2px solid #2563eb;
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

  color: #1e293b;

}

.result-dialog p {

  margin: 12px 0;

  font-size: 18px;

  color: #475569;

}

.result-dialog .score {

  margin: 24px 0;

  font-size: 42px;

  font-weight: 800;

  color: #2563eb;

}

.close-btn {

  margin-top: 24px;

  width: 100%;

  padding: 12px;

  border: none;

  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #2563eb,
    #4f8cff
  );

  color: white;

  font-size: 17px;

  font-weight: 700;

  cursor: pointer;

  transition: .2s;

}

.close-btn:hover {

  transform: translateY(-2px);

  box-shadow: 0 10px 20px rgba(37, 99, 235, .35);

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

  background: #eef4ff;

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

  background: #f8fafc;

  padding: 15px;

  border-radius: 15px;

}

.summary-item span {

  display: block;

  color: #64748b;

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

  background: #f8fafc;

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

  background: linear-gradient(135deg, #2563eb, #7c3aed);

  color: white;

  font-weight: 800;

  box-shadow: 0 18px 40px rgba(37, 99, 235, .35);

  animation: zoom .5s ease;

}

.progress-bar-custom {

  display: flex;

  height: 20px;

  border-radius: 999px;

  box-shadow: inset 0 2px 6px rgba(0, 0, 0, .08);

  overflow: hidden;

  background: #f1f5f9;

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

  color: #64748b;

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

  background: #eef4ff;

  color: #2563eb;

  font-weight: 600;

  cursor: pointer;

  transition: all .2s ease;

}

.history-btn:hover {

  background: #dbeafe;

  transform: translateY(-1px);

}

.back-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: white;

  color: #334155;

  font-weight: 600;

  cursor: pointer;

  transition: all .2s ease;

}

.back-btn:hover {

  background: #f1f5f9;

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

.book-review .exercise-list { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; }
.book-review .exercise-group { margin-bottom: 36px; }
.book-review .exercise-card { border: 0; border-radius: 0; box-shadow: none; padding: 20px 0; margin: 0; border-bottom: 1px solid #edf0f5; background: #fff; }
.book-review .exercise-header { gap: 16px; }
.book-review .question-number { min-width: 34px; width: 34px; height: 28px; padding: 0; display: grid; place-items: center; border: 1px solid #94a3b8; border-radius: 0; background: #fff; color: #24334b; font-size: 16px; flex-shrink: 0; }
.book-review .exercise-title { font-size: 18px; font-weight: 400; line-height: 1.9; }
.book-review .answer-grid { grid-template-columns: repeat(var(--choice-columns, 2), minmax(0, 1fr)); margin-top: 16px; gap: 12px; }
.book-review .answer-item { font-size: 16px; line-height: 1.8; padding: 8px 12px; overflow-wrap: anywhere; }
.book-review .page-header { flex-wrap: wrap; gap: 16px; }
.book-review .exercise-card:hover { transform: none; }
@media (max-width: 800px) { .book-review .exercise-list { padding: 20px; }.book-review .answer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.book-review .exercise-title { font-size: 16px; } }
.book-review-title { font-size: 24px; font-weight: 700; color: #24334b; margin: 0 0 30px; }.book-review-title small { font-size: 16px; font-weight: 400; color: #64748b; margin-left: 12px; }
.listening-instruction { margin: 0 0 24px; font-size: 17px; line-height: 1.9; color: #24334b; }
</style>

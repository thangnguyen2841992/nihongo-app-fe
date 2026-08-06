<script setup lang="ts">
import {computed, onMounted,onUnmounted, ref} from "vue"
import {useRoute, useRouter} from "vue-router"
import ExerciseKeywordModal from "@/components/staff/ExerciseKeywordModal.vue";
import {gatewayUrl} from "@/api/authApi.ts";

const route = useRoute()
const router = useRouter()
const started = ref(false)
const submitted = ref(false)
const remainSeconds = ref(0)
let timer: number | null = null
const showResultModal = ref(false)
const totalCorrect = ref(0)
const totalWrong = ref(0)
const score = ref(0)
interface Lesson {
  lessonId: number
  name: string
  description: string
  reading: string
  bookId : number
}
interface ExerciseKeyword {
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
const submitExercise = () => {

  submitted.value = true

  let correct = 0

  exercises.value.forEach(exercise => {

    const selected =
      selectedAnswers.value[
        exercise.exerciseKeywordId
        ]

    if (selected === exercise.correctAnswer) {
      correct++
    }

  })

  totalCorrect.value = correct

  totalWrong.value =
    exercises.value.length - correct

  score.value = Math.round(
    correct * 100 / exercises.value.length
  )

  showResultModal.value = true

}
const exerciseTypes =
  ref<ExerciseType[]>([])

const selectedAnswers = ref<Record<number, string>>({})

const selectAnswer = (
  exerciseId: number,
  answer: string
) => {
  selectedAnswers.value[exerciseId] = answer
}
const handleScroll = () => {

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
        Number(firstGroup[0])

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
        Number(lastGroup[0])

    }

    return
  }

  // Vị trí kích hoạt active
  const triggerLine = 180

  for (
    const [exerciseTypeId]
    of groupedExercises.value
    ) {

    const el =
      document.getElementById(
        `group-${exerciseTypeId}`
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
        Number(exerciseTypeId)

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
  if (
    groupedExercises.value.length
  ) {
    activeGroupId.value =
      Number(
        groupedExercises.value[0]![0]
      )
  }
  handleScroll()

})
onUnmounted(() => {

  window.removeEventListener(
    "scroll",
    handleScroll
  )
})

import { nextTick } from "vue"

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

const groupedExercises =
  computed(() => {

    const groups:
      Record<
        number,
        {
          exerciseTypeName: string
          exercises: ExerciseKeyword[]
        }
      > = {}

    // Tạo trước toàn bộ nhóm
    exerciseTypes.value.forEach(
      type => {

        groups[
          type.exerciseTypeId
          ] = {
          exerciseTypeName:
          type.name,
          exercises: []
        }
      }
    )

    // Đổ câu hỏi vào nhóm tương ứng
    exercises.value.forEach(
      exercise => {

        if (
          !exercise.exerciseTypeId
        ) {
          return
        }

        groups[
          exercise.exerciseTypeId
          ]?.exercises.push(
          exercise
        )
      }
    )

    return Object.entries(
      groups
    )
  })
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

  <div class="container-fluid py-4">

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

      <button
        class="back-btn"
        @click="goBack"
      >
        ← Quay lại
      </button>

    </div>

    <!-- MENU -->

    <div class="exercise-tabs">

      <div class="tabs-left">

        <button
          v-for="
        ([exerciseTypeId, group], groupIndex)
        in groupedExercises
      "
          :key="exerciseTypeId"
          class="exercise-tab"
          :class="{
        active:
        activeGroupId ===
        Number(exerciseTypeId)
      }"
          @click="
        scrollToGroup(
          Number(exerciseTypeId)
        )
      "
        >
          📘 Bài {{ groupIndex + 1 }}
        </button>

      </div>
      <div class="submit-wrap">

        <button
          class="start-btn"
          @click="startExercise"
          :disabled="started"
        >
          {{ started ? "Đang làm bài" : "Bắt đầu" }}
        </button>

        <button
          class="submit-btn"
          @click="submitExercise"
          :disabled="!started || submitted"
        >
          {{ submitted ? "Đã nộp" : "Nộp bài" }}
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

        <div
          v-for="
    ([exerciseTypeId, group], groupIndex)
    in groupedExercises
  "
          :key="exerciseTypeId"
          :id="
    `group-${exerciseTypeId}`
  "
          class="exercise-group"
        >

          <div class="group-header">

            📚 Bài {{ groupIndex + 1 }}:
            {{ group.exerciseTypeName }}

          </div>

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

            <div
              class="exercise-header"
            >

              <div class="exercise-title-wrapper">

                <div class="question-number">
                  Câu {{ index + 1 }}
                </div>

                <div
                  class="exercise-title"
                  v-html="exercise.contentNihongo"/>

              </div>
              <div class="action-group">
              </div>
            </div>

            <div class="answer-grid">

              <div
                class="answer-item"
                :class="{

    selected:
      selectedAnswers[exercise.exerciseKeywordId] === 'A',

    correct:
      submitted &&
      exercise.correctAnswer === 'A',

    wrong:
      submitted &&
      selectedAnswers[exercise.exerciseKeywordId] === 'A' &&
      exercise.correctAnswer !== 'A'

  }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'A')"
              >
                A. {{ exercise.answerA }}
              </div>

              <div
                class="answer-item"
                :class="{

    selected:
      selectedAnswers[exercise.exerciseKeywordId] === 'B',

    correct:
      submitted &&
      exercise.correctAnswer === 'B',

    wrong:
      submitted &&
      selectedAnswers[exercise.exerciseKeywordId] === 'B' &&
      exercise.correctAnswer !== 'B'

  }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'B')"
              >
                B. {{ exercise.answerB }}
              </div>

              <div
                class="answer-item"
                :class="{

    selected:
      selectedAnswers[exercise.exerciseKeywordId] === 'C',

    correct:
      submitted &&
      exercise.correctAnswer === 'C',

    wrong:
      submitted &&
      selectedAnswers[exercise.exerciseKeywordId] === 'C' &&
      exercise.correctAnswer !== 'C'

  }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'C')"
              >
                C. {{ exercise.answerC }}
              </div>

              <div
                class="answer-item"
                :class="{

    selected:
      selectedAnswers[exercise.exerciseKeywordId] === 'D',

    correct:
      submitted &&
      exercise.correctAnswer === 'D',

    wrong:
      submitted &&
      selectedAnswers[exercise.exerciseKeywordId] === 'D' &&
      exercise.correctAnswer !== 'D'

  }"
                @click="selectAnswer(exercise.exerciseKeywordId, 'D')"
              >
                D. {{ exercise.answerD }}
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

  <div
    v-if="showResultModal"
    class="modal-mask"
  >

    <div class="result-modal">

      <h2>🎉 Kết quả</h2>

      <p>
        Tổng số câu:
        {{ exercises.length }}
      </p>

      <p>
        Đúng:
        <b style="color:#16a34a">
          {{ totalCorrect }}
        </b>
      </p>

      <p>
        Sai:
        <b style="color:#dc2626">
          {{ totalWrong }}
        </b>
      </p>

      <h1>
        {{ score }} điểm
      </h1>

      <button
        class="close-btn"
        @click="showResultModal=false"
      >

        Đóng

      </button>

    </div>

  </div>
</template>

<style scoped>

.page-title {

  font-size: 30px;

  font-weight: 700;

  margin: 0;
}

.page-subtitle {

  color: #64748b;

  margin-top: 4px;
}

.back-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: white;

  font-weight: 600;
}

.exercise-tabs {
  position: sticky;
  top: 80px;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;   /* căn giữa theo chiều dọc */
  gap: 16px;
  padding: 12px 20px;
  margin-bottom: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,.06);
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

.exercise-tab.disabled {

  opacity: .5;

  cursor: not-allowed;
}

.exercise-content {

  background: white;

  border-radius: 24px;

  padding: 24px;
}

.section-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 24px;
}

.add-btn {

  border: none;

  border-radius: 12px;

  padding: 10px 18px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-weight: 600;
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

.page-subtitle {

  margin-top: 6px;

  color: #64748b;

  font-size: 15px;
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

  box-shadow:
    0 0 0 6px
    rgba(
      79,
      140,
      255,
      .15
    );

  transform:
    scale(1.02);
}

.exercise-card:hover {

  transform: translateY(-2px);

  box-shadow:
    0 10px 30px
    rgba(
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

.exercise-id {

  font-size: 13px;

  font-weight: 700;

  color: #64748b;
}

.edit-btn {

  border: none;

  background: #eef4ff;

  color: #2563eb;

  border-radius: 10px;

  padding: 8px 14px;

  font-weight: 600;

  transition: .2s;
}
.edit-btn:hover {

  background: #dbeafe;
}
.exercise-question {

  font-size: 22px;

  line-height: 2;

  margin-bottom: 18px;

  font-family:
    "Noto Sans JP",
    sans-serif;
}
.delete-btn {

  border: none;

  background: #fef2f2;

  color: #dc2626;

  border-radius: 10px;

  padding: 8px 14px;

  font-weight: 600;

  transition: .2s;
}

.delete-btn:hover {

  background: #fee2e2;
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
.answer-item.correct{

  background:#dcfce7;

  border:2px solid #22c55e;

  color:#166534;

  font-weight:700;

}

.answer-item.wrong{

  background:#fee2e2;

  border:2px solid #ef4444;

  color:#991b1b;

  font-weight:700;

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

  box-shadow:
    0 8px 24px
    rgba(
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

  font-family:
    "Noto Sans JP",
    sans-serif;
}
.scroll-top-btn {

  position: fixed;

  right: 24px;
  bottom: 24px;

  width: 56px;
  height: 56px;

  border: none;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-size: 22px;

  cursor: pointer;

  z-index: 999;

  box-shadow:
    0 8px 20px
    rgba(
      79,
      140,
      255,
      .35
    );

  transition: all .2s ease;
}

.scroll-top-btn:hover {

  transform:
    translateY(-3px);

  box-shadow:
    0 12px 28px
    rgba(
      79,
      140,
      255,
      .45
    );
}
.tabs-left {
  display: flex;
  gap: 10px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: thin;
}
.tabs-left::-webkit-scrollbar {
  height: 6px;
}

.tabs-left::-webkit-scrollbar-thumb {
  background: #d7dfeb;
  border-radius: 999px;
}

.add-exercise-btn {
  flex-shrink: 0;

  white-space: nowrap;
  border: none;

  padding: 12px 18px;

  border-radius: 14px;

  background: linear-gradient(
    135deg,
    #22c55e,
    #16a34a
  );

  color: white;

  font-weight: 700;

  cursor: pointer;

  transition: .2s;
}

.add-exercise-btn:hover {
  transform: translateY(-2px);

  box-shadow:
    0 8px 20px
    rgba(
      34,
      197,
      94,
      .3
    );
}
.exercise-tabs {
  position: sticky;
  top: 80px;

  z-index: 100;

  display: flex;
  align-items: center;
  gap: 12px;

  margin-bottom: 24px;

  padding: 12px;

  background: white;

  border-radius: 16px;

  box-shadow:
    0 4px 16px
    rgba(0,0,0,.06);
}
.submit-wrap{
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.submit-btn{
  border: none;
  padding: 12px 18px;
  border-radius: 14px;
  background: white;
  font-weight: 600;
  cursor: pointer;
  font-size:18px;
  background:linear-gradient(135deg,#2563eb,#4f8cff);
  color:white;
}
.modal-mask{

  position:fixed;

  inset:0;

  background:rgba(0,0,0,.45);

  display:flex;

  justify-content:center;

  align-items:center;

  z-index:9999;

}

.result-modal{

  background:white;

  width:420px;

  border-radius:20px;

  padding:35px;

  text-align:center;

}

.close-btn{

  margin-top:20px;

  width:100%;

  border:none;

  padding:12px;

  border-radius:10px;

  background:#2563eb;

  color:white;

  font-weight:700;

}
</style>

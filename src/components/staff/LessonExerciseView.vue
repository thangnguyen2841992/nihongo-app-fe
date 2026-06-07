<script setup lang="ts">
import {computed, onMounted, ref} from "vue"
import {useRoute, useRouter} from "vue-router"
import ExerciseKeywordModal from "@/components/staff/ExerciseKeywordModal.vue";
import {gatewayUrl} from "@/api/authApi.ts";

const route = useRoute()
const router = useRouter()

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
}

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

  await Promise.all([
    fetchLesson(),
    fetchExercises()
  ])

})


const openCreateModal =
  () => {
    showCreateModal.value =
      true
  }
const openEditModal =
  (exercise: any) => {
    editingExercise.value =
      exercise

    showCreateModal.value =
      true
  }
const closeCreateModal =
  () => {

    showCreateModal.value =
      false

    editingExercise.value =
      null
  }
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

const deleteExercise =
  async (
    exerciseKeywordId: number
  ) => {

    if (
      !confirm(
        "Bạn có chắc muốn xóa bài tập này?"
      )
    ) {
      return
    }

    try {

      await gatewayUrl.delete(
        `/api/staff/exercises/${exerciseKeywordId}`
      )

      await reloadExercises()

    } catch (e) {

      console.error(e)

      alert(
        "Xóa bài tập thất bại"
      )
    }
  }
const goBack = () => {

  router.back()
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
          {{
            lesson?.name ||
            "Đang tải..."
          }}
        </h2>

        <div class="page-subtitle">
          🎯 Quản lý bài tập Keyword
        </div>

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

      <button
        class="
          exercise-tab
          active
        "
      >
        🎯 Keyword
      </button>

      <button
        class="
          exercise-tab
          disabled
        "
      >
        📖 Reading
      </button>

      <button
        class="
          exercise-tab
          disabled
        "
      >
        🎧 Listening
      </button>

      <button
        class="
          exercise-tab
          disabled
        "
      >
        🈶 Kanji
      </button>

    </div>

    <!-- CONTENT -->

    <div
      class="
        exercise-content
      "
    >

      <div
        class="
          section-header
        "
      >

        <div>
          🎯 Keyword Exercise
        </div>

        <button
          class="add-btn"
          @click="openCreateModal"
        >
          + Thêm bài tập
        </button>

      </div>

      <div v-if="loadingExercises"
           class="empty-state">
        Đang tải...
      </div>

      <div
        v-else-if="!exercises.length"
        class="empty-state"
      >
        🎯 Chưa có bài tập keyword nào
      </div>

      <div
        v-else
        class="exercise-list"
      >

        <div
          v-for="
    (exercise, index)
    in exercises
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

          <div class="exercise-header">

            <div class="exercise-title">
              Câu {{ index + 1 }}
            </div>

            <div class="action-group">

              <button
                class="edit-btn"
                @click="
        openEditModal(
          exercise
        )
      "
              >
                ✏️ Sửa
              </button>

              <button
                class="delete-btn"
                @click="
        deleteExercise(
          exercise.exerciseKeywordId
        )
      "
              >
                🗑 Xóa
              </button>

            </div>

          </div>

          <div
            class="
        exercise-question
      "
            v-html="
        exercise.contentNihongo
      "
          />

          <div
            class="
        answer-grid
      "
          >

            <div
              class="answer-item"
              :class="{
          correct:
            exercise.correctAnswer === 'A'
        }"
            >
              A.
              {{ exercise.answerA }}
            </div>

            <div
              class="answer-item"
              :class="{
          correct:
            exercise.correctAnswer === 'B'
        }"
            >
              B.
              {{ exercise.answerB }}
            </div>

            <div
              class="answer-item"
              :class="{
          correct:
            exercise.correctAnswer === 'C'
        }"
            >
              C.
              {{ exercise.answerC }}
            </div>

            <div
              class="answer-item"
              :class="{
          correct:
            exercise.correctAnswer === 'D'
        }"
            >
              D.
              {{ exercise.answerD }}
            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
  <ExerciseKeywordModal
    v-if="
    showCreateModal &&
    lesson
  "
    :lesson="lesson"
    :exercise="editingExercise"
    @close="closeCreateModal"
    @saved="reloadExercises"
  />
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

  display: flex;

  gap: 12px;

  margin-bottom: 24px;
}

.exercise-tab {

  border: none;

  padding: 12px 18px;

  border-radius: 14px;

  background: white;

  font-weight: 600;
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

  transition:
    all .35s ease;
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

  align-items: center;

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

.answer-item {

  border: 1px solid #e2e8f0;

  border-radius: 12px;

  padding: 12px 14px;

  background: #f8fafc;
}

.answer-item.correct {

  background: #dcfce7;

  border-color: #22c55e;

  font-weight: 700;

  color: #166534;
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
</style>

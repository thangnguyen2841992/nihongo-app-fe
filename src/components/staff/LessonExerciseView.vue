<script setup lang="ts">
import {computed, onMounted,onUnmounted, ref} from "vue"
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
  exerciseTypeId: number
  exerciseTypeName: string
}

interface ExerciseType {
  exerciseTypeId: number
  name: string
}
const showScrollTop =
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

const exerciseTypes =
  ref<ExerciseType[]>([])
const handleScroll = () => {

  showScrollTop.value =
    window.scrollY > 300
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

})
onUnmounted(() => {
  window.removeEventListener(
    "scroll",
    handleScroll
  )
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
    activeGroupId.value =
      exerciseTypeId
    const element =
      document.getElementById(
        `group-${exerciseTypeId}`
      )

    if (!element) {
      return
    }

    const y =
      element.getBoundingClientRect().top +
      window.scrollY -
      90

    window.scrollTo({
      top: y,
      behavior: "smooth"
    })
  }
const scrollToTop = () => {

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  })
  const firstGroup =
    groupedExercises.value[0]

  if (firstGroup) {
    activeGroupId.value =
      Number(firstGroup[0])
  }
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

        <button
          class="floating-add-btn"
          title="Thêm câu hỏi"
          @click="openCreateModal"
        >
          +
        </button>

      </div>

      <div v-if="loadingExercises"
           class="empty-state">
        Đang tải...
      </div>

<!--      <div-->
<!--        v-else-if="!exercises.length"-->
<!--        class="empty-state"-->
<!--      >-->
<!--        🎯 Chưa có bài tập keyword nào-->
<!--      </div>-->

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
                  v-html="
      exercise.contentNihongo
    "
                />

              </div>

              <div
                class="action-group"
              >

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
              class="answer-grid"
            >

              <div
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'A'
        }"
              >
                A. {{ exercise.answerA }}
              </div>

              <div
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'B'
        }"
              >
                B. {{ exercise.answerB }}
              </div>

              <div
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'C'
        }"
              >
                C. {{ exercise.answerC }}
              </div>

              <div
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'D'
        }"
              >
                D. {{ exercise.answerD }}
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
  <button
    v-if="showScrollTop"
    class="scroll-top-btn"
    title="Trở về đầu trang"
    @click="scrollToTop"
  >
    ⬆
  </button>
  <ExerciseKeywordModal
    v-if="
    showCreateModal &&
    lesson
  "
    :lesson="lesson"
    :exercise="editingExercise"
    :exercise-types="exerciseTypes"
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
  position: sticky;
  top: 10px;

  z-index: 100;

  display: flex;
  gap: 12px;

  margin-bottom: 24px;

  padding: 12px;

  background: white;

  border-radius: 16px;

  box-shadow:
    0 4px 16px
    rgba(0,0,0,.06);
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
.floating-add-btn {
  position: fixed;

  right: 24px;
  bottom: 90px;

  width: 56px;
  height: 56px;

  border-radius: 50%;

  border: none;

  background:
    linear-gradient(
      135deg,
      #22c55e,
      #16a34a
    );

  color: white;

  font-size: 28px;

  z-index: 999;
}
</style>

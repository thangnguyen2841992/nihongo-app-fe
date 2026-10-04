<script setup lang="ts">
import {computed, onMounted,onUnmounted, ref} from "vue"
import {useRoute, useRouter} from "vue-router"
import ExerciseKeywordModal from "@/components/staff/ExerciseKeywordModal.vue";
import {gatewayUrl} from "@/api/authApi.ts";

import BookExerciseHeading from '@/components/BookExerciseHeading.vue'
import BookAiSolution from '@/components/BookAiSolution.vue'
import type { AiAnswer } from '@/services/bookAiAnswers'
import BookListeningPreview from '@/components/BookListeningPreview.vue'
import { importedAudioUrl } from '@/services/bookImport'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import { exerciseBookLayout, exerciseGroups, bookChoiceColumns, bookAudioTrack, bookListeningItem, tryN3Listening } from '@/services/exerciseBookLayout'

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

const exerciseTypes =
  ref<ExerciseType[]>([])
const availableExerciseTypes = computed(() => {
  const types = new Map(exerciseTypes.value.map(type => [type.exerciseTypeId, type]))
  for (const exercise of exercises.value) {
    if (!types.has(exercise.exerciseTypeId)) types.set(exercise.exerciseTypeId,
      { exerciseTypeId: exercise.exerciseTypeId, name: exercise.exerciseTypeName })
  }
  return [...types.values()]
})

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

const groupedExercises = computed(() => exerciseGroups(exercises.value, exerciseTypes.value).map(group => [String(group.exerciseTypeId), group] as const))
const isBookReview = computed(() => exercises.value.some(e => exerciseBookLayout(e.exerciseTypeName)))
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
          {{ exerciseBookLayout(group.exerciseTypeName) ? '問題' + exerciseBookLayout(group.exerciseTypeName)?.number : 'Bài ' + (groupIndex + 1) }}
        </button>
        <button v-if="isBookReview && !hasListeningExercises" class="exercise-tab" :class="{ active: activeGroupId === -4 }" @click="scrollToListening">問題4</button>

      </div>

      <button
        class="add-exercise-btn"
        title="Thêm câu hỏi"
        @click="openCreateModal"
      >
        ➕ Thêm câu hỏi
      </button>

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
        <h2 v-if="isBookReview" class="book-review-title" lang="ja">まとめの問題 <small>Bài ôn tập</small></h2>

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

            <BookAudioPlayer v-if="importedAudioUrl(exercise.audioUrl)" :source="importedAudioUrl(exercise.audioUrl)" />
            <BookAudioPlayer v-else-if="bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)" :track="bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo)!" />
            <div
              class="answer-grid" :style="{ '--choice-columns': bookChoiceColumns(group.exerciseTypeName, index, exercise.answerD ? 4 : 3) }"
            >

              <div
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'A'
        }"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerA === '1')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '1' : 'A.') }} {{ exercise.answerA }}
              </div>

              <div
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'B'
        }"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerB === '2')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '2' : 'B.') }} {{ exercise.answerB }}
              </div>

              <div
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'C'
        }"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerC === '3')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '3' : 'C.') }} {{ exercise.answerC }}
              </div>

              <div v-if="exercise.answerD"
                class="answer-item"
                :class="{
          correct:
            exercise.correctAnswer === 'D'
        }"
              >
                {{ (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) === '06' || (bookAudioTrack(group.exerciseTypeName, exercise.contentNihongo) && exercise.answerD === '4')) ? '' : (exerciseBookLayout(group.exerciseTypeName) ? '4' : 'D.') }} {{ exercise.answerD }}
              </div>

            </div>
            <BookAiSolution :exercise="exercise" :visible="true" />
          </div>

        </div>

      </div>

    </div>

    <BookListeningPreview v-if="isBookReview && !hasListeningExercises && !loadingExercises" />
  </div>
  <ExerciseKeywordModal
    v-if="
    showCreateModal &&
    lesson
  "
    :lesson="lesson"
    :exercise="editingExercise"
    :exercise-types="availableExerciseTypes"
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

  top: 80px;

  z-index: 90;

  display: flex;

  align-items: center;

  gap: 10px;

  overflow-x: auto;

  padding: 12px;

  margin-bottom: 20px;

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

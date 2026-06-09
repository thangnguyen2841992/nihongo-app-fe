<script setup lang="ts">
import {computed, nextTick, ref, watch} from "vue"
import {gatewayUrl} from "@/api/authApi.ts"

interface ExerciseKeyword {
  exerciseKeywordId?: number
  contentNihongo: string
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  correctAnswer: string
  lessonId: number
  exerciseTypeId: number | null
}

interface Lesson {
  lessonId: number
  name: string
}

interface ExerciseType {
  exerciseTypeId: number
  name: string
}
interface Props {
  lesson: Lesson
  exercise?: ExerciseKeyword | null
  exerciseTypes: ExerciseType[]
}

const props = defineProps<Props>()
const emit = defineEmits(["close", "saved"])

const loading = ref(false)
const editorRef = ref<HTMLElement | null>(null)

const form = ref<ExerciseKeyword>({
  contentNihongo: "",
  answerA: "",
  answerB: "",
  answerC: "",
  answerD: "",
  correctAnswer: "A",
  lessonId: props.lesson.lessonId,
  exerciseTypeId: null
})

/**
 * ===== LOAD DATA =====
 */
watch(
  () => props.exercise,
  async (value) => {
    if (value) {
      form.value = {
        exerciseKeywordId: value.exerciseKeywordId,
        contentNihongo: value.contentNihongo || "",
        answerA: value.answerA || "",
        answerB: value.answerB || "",
        answerC: value.answerC || "",
        answerD: value.answerD || "",
        correctAnswer: value.correctAnswer || "A",
        lessonId: props.lesson.lessonId,
        exerciseTypeId: value.exerciseTypeId
      }
    } else {
      form.value = {
        contentNihongo: "",
        answerA: "",
        answerB: "",
        answerC: "",
        answerD: "",
        correctAnswer: "A",
        lessonId: props.lesson.lessonId,
        exerciseTypeId: null
      }
    }

    await nextTick()

    if (editorRef.value) {
      editorRef.value.innerHTML = form.value.contentNihongo || ""
    }
  },
  {immediate: true}
)

/**
 * ===== KEYWORD STATE (REALTIME) =====
 */
const keywordCount = ref(0)

const validateKeyword = () => {
  const doc = new DOMParser().parseFromString(
    form.value.contentNihongo,
    "text/html"
  )

  const keywords = doc.querySelectorAll("u")
  keywordCount.value = keywords.length

  return keywords.length === 1
}

const answersValid = computed(() => {
  return (
    form.value.answerA.trim() &&
    form.value.answerB.trim() &&
    form.value.answerC.trim() &&
    form.value.answerD.trim()
  )
})

const formValid = computed(() => {
  return keywordValid.value && answersValid.value
})

const keywordValid = computed(() => keywordCount.value === 1)

/**
 * ===== EDITOR SYNC =====
 */
const syncToModel = () => {
  form.value.contentNihongo = editorRef.value?.innerHTML || ""
  validateKeyword()
}

/**
 * ===== UNDERLINE ACTION =====
 */
const underlineSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  if (range.collapsed) {
    alert("Hãy bôi đen keyword trước")
    return
  }

  const selectedText = range.toString()

  const u = document.createElement("u")
  u.textContent = selectedText

  range.deleteContents()
  range.insertNode(u)

  syncToModel()
}

/**
 * ===== SAVE =====
 */
const isEdit = computed(() => !!form.value.exerciseKeywordId)

const save = async () => {
  validateKeyword()

  if (!keywordValid.value) {
    alert("Phải có đúng 1 keyword được gạch chân")
    return
  }

  if (!answersValid.value) {
    alert("Phải nhập đủ 4 đáp án A B C D")
    return
  }

  try {
    loading.value = true

    if (isEdit.value) {
      const res = await gatewayUrl.put("/api/staff/exercises", form.value)
      emit("saved",
        res.data.exerciseKeywordId)
    } else {
      const res = await gatewayUrl.post("/api/staff/exercises", form.value)
      emit("saved",
        res.data.exerciseKeywordId)
    }

    emit("close")
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop-custom" @click.self="emit('close')">
    <div class="card shadow-lg border-0 exercise-modal">

      <!-- HEADER -->
      <div class="card-header d-flex justify-content-between align-items-center">
        <h4 class="mb-0">
          {{
            isEdit
              ? `Chỉnh sửa keyword - ${props.lesson.name}`
              : `➕ Tạo keyword - ${props.lesson.name}`
          }}
        </h4>

        <button class="btn-close" @click="emit('close')"/>
      </div>

      <!-- BODY -->
      <div class="card-body">
        <div class="mb-3">

          <label class="exercise-type-label">
            📚 Loại bài tập
          </label>

          <select
            v-model="form.exerciseTypeId"
            class="exercise-type-select"
          >
            <option :value="null">
              Chọn loại bài tập
            </option>

            <option
              v-for="(type,index) in exerciseTypes"
              :key="type.exerciseTypeId"
              :value="type.exerciseTypeId"
            >
              Bài {{ index + 1 }} - {{ type.name }}
            </option>

          </select>

        </div>
        <!-- EDITOR -->
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">

            <h6 class="mb-0">Câu hỏi</h6>

            <button
              type="button"
              class="btn btn-outline-primary btn-sm"
              @click="underlineSelection"
            >
              Gạch chân keyword
            </button>

          </div>

          <div
            ref="editorRef"
            class="form-control nihongo-editor"
            contenteditable="true"
            @input="syncToModel"
          />

          <small
            :style="{ color: keywordValid ? '#16a34a' : '#ef4444' }"
          >
            Keyword: {{ keywordCount }} (phải đúng 1)
          </small>
        </div>

        <hr/>

        <!-- ANSWERS -->
        <div class="answer-grid">

          <div
            class="answer-card"
            :class="{ active: form.correctAnswer === 'A' }"
            @click="form.correctAnswer = 'A'"
          >
            <div class="answer-label">A</div>
            <input v-model="form.answerA" class="answer-input"/>
          </div>

          <div
            class="answer-card"
            :class="{ active: form.correctAnswer === 'B' }"
            @click="form.correctAnswer = 'B'"
          >
            <div class="answer-label">B</div>
            <input v-model="form.answerB" class="answer-input"/>
          </div>

          <div
            class="answer-card"
            :class="{ active: form.correctAnswer === 'C' }"
            @click="form.correctAnswer = 'C'"
          >
            <div class="answer-label">C</div>
            <input v-model="form.answerC" class="answer-input"/>
          </div>

          <div
            class="answer-card"
            :class="{ active: form.correctAnswer === 'D' }"
            @click="form.correctAnswer = 'D'"
          >
            <div class="answer-label">D</div>
            <input v-model="form.answerD" class="answer-input"/>
          </div>

        </div>

      </div>

      <!-- FOOTER -->
      <div class="card-footer d-flex justify-content-end gap-2">
        <button class="btn btn-light" @click="emit('close')">
          Hủy
        </button>

        <button
          class="btn btn-primary"
          :disabled="
    loading ||
    !formValid ||
    !form.exerciseTypeId
  "
          @click="save"
        >
          {{ loading ? "Đang lưu..." : "Lưu" }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 9999;
}

.exercise-modal {
  width: 900px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
}

.nihongo-editor {
  min-height: 120px;
  font-size: 20px;
  line-height: 2;
  font-family: "Noto Sans JP", sans-serif;
}

.nihongo-editor:focus {
  outline: none;
}

.answer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.answer-card {
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  padding: 10px;
  display: flex;
  gap: 10px;
  cursor: pointer;
  transition: 0.2s;
}

.answer-card.active {
  border-color: #4f8cff;
  background: #eef4ff;
}

.answer-label {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 700;
  background: #f3f4f6;
}

.answer-card.active .answer-label {
  background: #4f8cff;
  color: white;
}

.answer-input {
  border: none;
  outline: none;
  flex: 1;
}
.exercise-type-select {
  width: 100%;

  height: 48px;

  padding: 0 16px;

  border: 2px solid #e5e7eb;

  border-radius: 14px;

  font-size: 15px;

  font-weight: 500;

  color: #1e293b;

  background-color: #fff;

  transition: all .2s ease;
}

.exercise-type-select:focus {
  border-color: #4f8cff;

  box-shadow:
    0 0 0 4px
    rgba(
      79,
      140,
      255,
      .12
    );

  outline: none;
}
.exercise-type-label {
  display: block;

  margin-bottom: 8px;

  font-size: 15px;

  font-weight: 700;

  color: #334155;
}
</style>

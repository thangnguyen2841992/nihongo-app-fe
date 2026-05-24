<script setup lang="ts">
import {
  ref,
  onMounted,
  nextTick
} from "vue"

import {
  useRoute,
  useRouter
} from "vue-router"

import CreateLessonModal from "@/components/staff/CreateLessonModal.vue"

import { gatewayUrl } from "@/api/authApi.ts"

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
}

interface Grammar {
  grammarId: number
  title: string
  structure: string
  description: string
}

interface Book {
  bookId: number
  bookName: string
}

/* =========================
   STATE
========================= */

const book =
  ref<Book | null>(null)

const lessons =
  ref<Lesson[]>([])

const grammars =
  ref<Grammar[]>([])

const selectedLesson =
  ref<Lesson | null>(null)

const showEditor =
  ref(false)

const showLessonModal =
  ref(false)

const editingGrammarId =
  ref<number | null>(null)

const editorRef =
  ref<HTMLDivElement | null>(null)

const grammarForm = ref({
  title: "",
  structure: "",
  description: ""
})

/* =========================
   TOOLBAR ACTIVE
========================= */

const activeFormats = ref({
  bold: false,
  italic: false,
  strikeThrough: false
})

/* =========================
   BOOK ID
========================= */

const bookId =
  Number(route.params.bookId)

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
        res.data

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

      grammars.value =
        res.data

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

    showLessonModal.value =
      true
  }

const closeLessonModal =
  async () => {

    showLessonModal.value =
      false

    await fetchLessons()
  }

/* =========================
   OPEN LESSON
========================= */

const openLesson =
  async (lesson: Lesson) => {

    selectedLesson.value =
      lesson

    await fetchGrammars(
      lesson.lessonId
    )
  }

/* =========================
   TOOLBAR STATE
========================= */

const updateToolbarState =
  () => {

    activeFormats.value.bold =
      document.queryCommandState(
        "bold"
      )

    activeFormats.value.italic =
      document.queryCommandState(
        "italic"
      )

    activeFormats.value.strikeThrough =
      document.queryCommandState(
        "strikeThrough"
      )
  }

/* =========================
   EDITOR
========================= */

const exec = (
  command: string,
  value?: string
) => {

  document.execCommand(
    command,
    false,
    value
  )

  syncEditor()

  updateToolbarState()
}

const syncEditor = () => {

  if (!editorRef.value)
    return

  grammarForm.value.structure =
    editorRef.value.innerHTML

  updateToolbarState()
}

/* =========================
   FORMULA
========================= */

const createGrammarFormulaHtml = (
  leftItems: string[],
  rightItems: string[]
) => {

  const leftHtml =
    leftItems
      .map(
        item =>
          `<div>${item}</div>`
      )
      .join("")

  const rightHtml =
    rightItems
      .map(
        item =>
          `<div>${item}</div>`
      )
      .join("")

  return `

<div
  class="grammar-formula"
  contenteditable="false"
>

  <div
    class="formula-side"
  >

    <div
      class="formula-content"
      contenteditable="true"
    >
      ${leftHtml}
    </div>

    <div class="formula-bracket">
      }
    </div>

  </div>

  <div class="formula-plus">
    +
  </div>

  <div
    class="formula-side"
  >

    <div
      class="formula-content"
      contenteditable="true"
    >
      ${rightHtml}
    </div>

    <div class="formula-bracket">
      ]
    </div>

  </div>

</div>

<div><br></div>

`
}

const insertGrammarFormula =
  () => {

    const html =
      createGrammarFormulaHtml(
        ["Vます"],
        ["たいです"]
      )

    exec(
      "insertHTML",
      html
    )
  }

/* =========================
   CREATE
========================= */

const createGrammar =
  async () => {

    if (
      !selectedLesson.value
    ) {
      return
    }

    try {

      await gatewayUrl.post(
        "/api/staff/grammars",
        {
          title:
          grammarForm.value
            .title,

          structure:
          grammarForm.value
            .structure,

          description:
          grammarForm.value
            .description,

          lessonId:
          selectedLesson.value
            .lessonId
        }
      )

      resetForm()

      await fetchGrammars(
        selectedLesson.value
          .lessonId
      )

    } catch (e) {

      console.error(e)

      alert(
        "Tạo grammar thất bại"
      )
    }
  }

/* =========================
   EDIT
========================= */

const startEdit =
  (grammar: Grammar) => {

    editingGrammarId.value =
      grammar.grammarId

    showEditor.value = true

    grammarForm.value = {
      title:
      grammar.title,

      structure:
      grammar.structure,

      description:
      grammar.description
    }

    nextTick(() => {

      if (
        editorRef.value
      ) {

        editorRef.value.innerHTML =
          grammar.structure
      }
    })
  }

/* =========================
   RESET
========================= */

const resetForm = () => {

  grammarForm.value = {
    title: "",
    structure: "",
    description: ""
  }

  if (editorRef.value) {

    editorRef.value.innerHTML =
      ""
  }

  editingGrammarId.value =
    null
}

/* =========================
   BACK
========================= */

const goBack = () => {

  router.push("/staff")
}

/* =========================
   MOUNT
========================= */

onMounted(async () => {

  await fetchBook()

  await fetchLessons()
})
</script>

<template>

  <div class="container-fluid py-4">

    <!-- HEADER -->

    <div
      class="
        d-flex
        justify-content-between
        align-items-center
        mb-4
      "
    >

      <div>

        <button
          class="back-btn mb-3"
          @click="goBack"
        >
          ← Quay lại
        </button>

        <h2 class="fw-bold mb-1">
          📚 {{ book?.bookName }}
        </h2>

        <div class="sub-title">
          Quản lý grammar & bài học
        </div>

      </div>

    </div>

    <!-- BODY -->

    <div class="row g-4">

      <!-- LEFT -->

      <div class="col-lg-4">

        <div class="lesson-panel">

          <div
            class="
              d-flex
              justify-content-between
              align-items-center
              mb-3
            "
          >

            <div class="fw-bold">
              Danh sách bài học
            </div>

            <button
              class="lesson-btn"
              @click="
                openLessonModal()
              "
            >
              + Lesson
            </button>

          </div>

          <div
            v-for="lesson in lessons"
            :key="
              lesson.lessonId
            "
            class="lesson-item"
            :class="{
              active:
                selectedLesson?.lessonId ===
                lesson.lessonId
            }"
            @click="
              openLesson(
                lesson
              )
            "
          >

            <div class="lesson-name">
              {{ lesson.name }}
            </div>

            <div class="lesson-desc">
              {{
                lesson.description
              }}
            </div>

          </div>

        </div>

      </div>

      <!-- RIGHT -->

      <div class="col-lg-8">

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
              Hãy chọn lesson bên trái
              để xem grammar.
            </div>

          </div>

          <template v-else>

            <div class="top-actions">

              <div class="selected-lesson">
                {{ selectedLesson.name }}
              </div>

              <button
                class="add-btn"
                @click="
                  showEditor =
                  !showEditor
                "
              >
                + Grammar
              </button>

            </div>

            <!-- EDITOR -->

            <div
              v-if="showEditor"
              class="editor-card"
            >

              <input
                v-model="
                  grammarForm.title
                "
                class="
                  form-control
                  custom-input
                  mb-3
                "
                placeholder="
                  Tiêu đề grammar
                "
              />

              <!-- TOOLBAR -->

              <div class="toolbar">

                <button
                  class="tool-btn"
                  :class="{
                    active:
                    activeFormats.bold
                  }"
                  @click="
                    exec('bold')
                  "
                >
                  B
                </button>

                <button
                  class="tool-btn"
                  :class="{
                    active:
                    activeFormats.italic
                  }"
                  @click="
                    exec('italic')
                  "
                >
                  I
                </button>

                <button
                  class="tool-btn"
                  :class="{
                    active:
                    activeFormats.strikeThrough
                  }"
                  @click="
                    exec(
                      'strikeThrough'
                    )
                  "
                >
                  S̶
                </button>

                <button
                  class="tool-btn"
                  @click="
                    exec(
                      'insertUnorderedList'
                    )
                  "
                >
                  •
                </button>

                <button
                  class="formula-btn"
                  @click="
                    insertGrammarFormula()
                  "
                >
                  Formula
                </button>

              </div>

              <!-- EDITOR -->

              <div
                ref="editorRef"
                class="
                  rich-editor
                "
                contenteditable="true"
                @input="
                  syncEditor
                "
                @mouseup="
                  updateToolbarState
                "
                @keyup="
                  updateToolbarState
                "
              ></div>

              <textarea
                v-model="
                  grammarForm.description
                "
                rows="3"
                class="
                  form-control
                  custom-input
                  mt-3
                "
                placeholder="
                  Mô tả grammar
                "
              ></textarea>

              <div
                class="
                  editor-actions
                "
              >

                <button
                  class="
                    cancel-btn
                  "
                  @click="
                    resetForm()
                  "
                >
                  Hủy
                </button>

                <button
                  class="
                    save-btn
                  "
                  @click="
                    createGrammar()
                  "
                >
                  Lưu Grammar
                </button>

              </div>

            </div>

            <!-- LIST -->

            <div class="grammar-scroll">

              <div
                v-for="
                  (
                    grammar,
                    index
                  ) in grammars
                "
                :key="
                  grammar.grammarId
                "
                class="
                  grammar-card
                "
              >

                <div
                  class="
                    grammar-header
                  "
                >

                  <div
                    class="
                      grammar-title
                    "
                  >

                    <div
                      class="
                        grammar-number
                      "
                    >
                      {{
                        index + 1
                      }}
                    </div>

                    {{
                      grammar.title
                    }}

                  </div>

                  <button
                    class="
                      edit-btn
                    "
                    @click="
                      startEdit(
                        grammar
                      )
                    "
                  >
                    ✏️
                  </button>

                </div>

                <div
                  class="
                    grammar-structure
                  "
                  v-html="
                    grammar.structure
                  "
                ></div>

                <div
                  class="
                    grammar-description
                  "
                >
                  {{
                    grammar.description
                  }}
                </div>

              </div>

            </div>

          </template>

        </div>

      </div>

    </div>

    <!-- CREATE LESSON MODAL -->

    <CreateLessonModal
      v-if="showLessonModal"
      :book-id="bookId"
      :book-name="
        book?.bookName || ''
      "
      @close="
        showLessonModal = false
      "
      @created="
        closeLessonModal
      "
    />

  </div>

</template>

<style scoped>

/* =========================
   PAGE
========================= */

.container-fluid {
  background:
    #f4f7fb;
  //min-height: 100vh;
}

/* =========================
   HEADER
========================= */

.back-btn {
  border: none;
  background: white;
  padding: 10px 18px;
  border-radius: 12px;
  font-weight: 600;
  box-shadow:
    0 2px 10px rgba(0,0,0,0.06);
  transition: 0.2s;
}

.back-btn:hover {
  transform: translateY(-2px);
}

.sub-title {
  color: #7c8595;
  font-size: 14px;
}

/* =========================
   PANEL
========================= */

.lesson-panel,
.grammar-panel {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow:
    0 10px 30px rgba(0,0,0,0.06);
}

/* =========================
   LESSON
========================= */

.lesson-item {
  padding: 18px;
  border-radius: 18px;
  margin-bottom: 14px;
  cursor: pointer;
  transition: 0.2s;
  border:
    1px solid #edf1f6;
}

.lesson-item:hover {
  transform: translateY(-2px);
  background: #f8fbff;
}

.lesson-item.active {
  background:
    linear-gradient(
      135deg,
      #4f8cff,
      #7b61ff
    );

  color: white;
}

.lesson-name {
  font-weight: 700;
  margin-bottom: 6px;
}

.lesson-desc {
  font-size: 13px;
  opacity: 0.85;
}

/* =========================
   BUTTONS
========================= */

.lesson-btn,
.add-btn,
.save-btn,
.cancel-btn {
  border: none;
  border-radius: 12px;
  transition: 0.2s;
  font-weight: 600;
}

.lesson-btn,
.add-btn,
.save-btn {
  background:
    linear-gradient(
      135deg,
      #4f8cff,
      #7b61ff
    );
  color: white;
  padding: 10px 18px;
}

.lesson-btn:hover,
.add-btn:hover,
.save-btn:hover {
  transform: translateY(-2px);
}

.cancel-btn {
  background: #eef2f7;
  padding: 10px 18px;
}

/* =========================
   TOP ACTION
========================= */

.top-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.selected-lesson {
  font-size: 22px;
  font-weight: 700;
}

/* =========================
   EDITOR
========================= */

.editor-card {
  background: #fafcff;
  border:
    1px solid #e8edf5;
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 24px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.tool-btn,
.formula-btn {
  border: none;
  height: 44px;
  min-width: 44px;
  padding: 0 18px;
  border-radius: 14px;
  background: white;
  border:
    1px solid #dfe6ef;
  transition: 0.2s;
  font-weight: 700;
}

.tool-btn:hover,
.formula-btn:hover {
  background: #f5f8ff;
}

.tool-btn.active {
  background:
    linear-gradient(
      135deg,
      #4f8cff,
      #7b61ff
    );

  color: white;
  border: none;
}

.rich-editor {
  min-height: 260px;
  background: white;
  border:
    1px solid #dbe3ee;
  border-radius: 18px;
  padding: 18px;
  outline: none;
  line-height: 1.8;
  font-size: 16px;
}

.rich-editor:focus {
  border-color: #4f8cff;
}

.custom-input {
  border-radius: 14px;
  border:
    1px solid #dfe6ef;
  padding: 12px 14px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

/* =========================
   GRAMMAR CARD
========================= */

.grammar-scroll {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.grammar-card {
  background: white;
  border:
    1px solid #edf1f5;
  border-radius: 22px;
  padding: 22px;
  transition: 0.2s;
}

.grammar-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(0,0,0,0.05);
}

.grammar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.grammar-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
}

.grammar-number {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background:
    linear-gradient(
      135deg,
      #4f8cff,
      #7b61ff
    );

  color: white;

  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.edit-btn {
  border: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #f3f6fb;
  transition: 0.2s;
}

.edit-btn:hover {
  background: #e8efff;
}

.grammar-description {
  margin-top: 16px;
  color: #657082;
  line-height: 1.7;
}

/* =========================
   EMPTY
========================= */

.empty-state {
  text-align: center;
  padding: 90px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 18px;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
}

.empty-desc {
  color: #7c8595;
}

/* =========================
   FORMULA
========================= */

.grammar-formula {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      #f8fbff,
      #f3f7ff
    );

  border:
    1px solid #dfe9ff;

  margin: 12px 0;
}

.formula-side {
  display: flex;
  align-items: stretch;
}

.formula-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
  padding: 0 10px;
}

.formula-content div {
  background: white;
  border-radius: 10px;
  padding: 6px 12px;
  border:
    1px solid #e5ebf5;
}

.formula-bracket {
  font-size: 72px;
  line-height: 1;
  color: #4f8cff;
  display: flex;
  align-items: center;
  font-weight: 300;
}

.formula-plus {
  font-size: 28px;
  font-weight: 700;
  color: #7b61ff;
}

/* =========================
   RESPONSIVE
========================= */

@media (max-width: 768px) {

  .top-actions {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .grammar-formula {
    flex-direction: column;
    align-items: flex-start;
  }

}

</style>

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

import {gatewayUrl} from "@/api/authApi.ts"

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

interface Example {
  exampleId: number
  nihongo: string
  vietnamese: string
  grammarId: number
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

const examples =
  ref<Record<number, Example[]>>({})

const expandedGrammar =
  ref<Record<number, boolean>>({})

const exampleForms =
  ref<Record<number, {
    nihongo: string
    vietnamese: string
  }>>({})

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

      grammars.value = res.data
      grammars.value.forEach(
        grammar => {

          if (
            !exampleForms.value[
              grammar.grammarId
              ]
          ) {

            exampleForms.value[
              grammar.grammarId
              ] = {
              nihongo: "",
              vietnamese: ""
            }
          }
        }
      )

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
   FETCH EXAMPLE
========================= */
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
const createExample =
  async (grammarId: number) => {

    const form =
      exampleForms.value[grammarId]

    if (
      !form?.nihongo ||
      !form?.vietnamese
    ) {
      return
    }

    try {

      await gatewayUrl.post(
        "/api/staff/examples",
        {
          nihongo:
          form.nihongo,

          vietnamese:
          form.vietnamese,

          grammarId
        }
      )

      exampleForms.value[grammarId] = {
        nihongo: "",
        vietnamese: ""
      }

      await fetchExamples(
        grammarId
      )

      expandedGrammar.value[grammarId] =
        true

    } catch (e) {

      console.error(e)

      alert(
        "Tạo ví dụ thất bại"
      )
    }
  }

/* =========================
   FORMULA
========================= */

const insertNestedFormula =
  () => {

    const html = `

<div class="jp-formula">

<pre>
Aい + く               ｝
Aな        ｝ + じゃ     ｝ + なさそうだ
N
</pre>

</div>

<p><br></p>

`

    exec(
      "insertHTML",
      html
    )
  }

const createGrammarFormulaHtml = (
  leftItems: string[],
  rightItems: string[]
) => {

  const leftHtml =
    leftItems
      .map(
        item =>
          `<div class="formula-item left">${item}</div>`
      )
      .join("")

  const rightHtml =
    rightItems
      .map(
        item =>
          `<div class="formula-item right">${item}</div>`
      )
      .join("")

  return `

<div class="grammar-formula-wrapper">

  <table class="grammar-formula-table">

    <tr>

      <!-- LEFT -->

      <td class="formula-left-cell">

        <table>

          <tr>

            <td>

              <div class="formula-column">
                ${leftHtml}
              </div>

            </td>

            <td class="formula-bracket-cell">
              }
            </td>

          </tr>

        </table>

      </td>

      <!-- PLUS -->

      <td class="formula-plus-cell">
        +
      </td>

      <!-- RIGHT -->

      <td class="formula-right-cell">

        <table>

          <tr>

            <td class="formula-open-cell">
              [
            </td>

            <td>

              <div class="formula-column">
                ${rightHtml}
              </div>

            </td>

          </tr>

        </table>

      </td>

    </tr>

  </table>

</div>

<p><br></p>

`
}

const insertGrammarFormula =
  () => {

    const html =
      createGrammarFormulaHtml(
        [
          "Vる",
          "Vない"
        ],
        [
          "ように言う",
          "ように頼む",
          "ように注意する",
          "ように伝える"
        ]
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
 UPDATE
========================= */

const updateGrammar =
  async () => {

    if (
      !selectedLesson.value ||
      !editingGrammarId.value
    ) {
      return
    }

    try {

      await gatewayUrl.put(
        "/api/staff/grammars",
        {
          grammarId:
          editingGrammarId.value,

          title:
          grammarForm.value.title,

          structure:
          grammarForm.value.structure,

          description:
          grammarForm.value.description,

          lessonId:
          selectedLesson.value.lessonId
        }
      )

      resetForm()

      showEditor.value = false

      await fetchGrammars(
        selectedLesson.value.lessonId
      )

    } catch (e) {

      console.error(e)

      alert(
        "Cập nhật grammar thất bại"
      )
    }
  }
/* =========================
 DELETE
========================= */

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

  showEditor.value =
    false
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

  /* AUTO OPEN FIRST LESSON */

  if (
    lessons.value.length > 0
  ) {

    await openLesson(
      lessons.value[0]
    )
  }

})
</script>

<template>

  <div class="container-fluid py-4">

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

                <button
                  class="formula-btn"
                  @click="
                    insertNestedFormula()
                  "
                >
                  Formula 2
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
    editingGrammarId
      ? updateGrammar()
      : createGrammar()
  "
                >
                  {{
                    editingGrammarId
                      ? "Cập nhật Grammar"
                      : "Lưu Grammar"
                  }}
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

                  <div class="grammar-actions">

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

                    <button
                      class="
      delete-btn
    "
                      @click="
      deleteGrammar(
        grammar.grammarId
      )
    "
                    >
                      🗑️
                    </button>

                  </div>

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
                <!-- EXAMPLE ACTION -->

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

                  <!-- EXPAND CONTENT -->

                  <div
                    v-if="
      expandedGrammar[
        grammar.grammarId
      ]
    "
                    class="example-expand"
                  >

                    <!-- CREATE -->

                    <div class="example-create">

      <textarea
        v-model="
          exampleForms[
            grammar.grammarId
          ].nihongo
        "
        class="
          form-control
          custom-input
        "
        rows="2"
        placeholder="
          Ví dụ tiếng Nhật
        "
      ></textarea>

                      <textarea
                        v-model="
          exampleForms[
            grammar.grammarId
          ].vietnamese
        "
                        class="
          form-control
          custom-input
        "
                        rows="2"
                        placeholder="
          Nghĩa tiếng Việt
        "
                      ></textarea>

                      <button
                        class="save-example-btn"
                        @click="
          createExample(
            grammar.grammarId
          )
        "
                      >
                        + Lưu ví dụ
                      </button>

                    </div>

                    <!-- LIST -->

                    <div
                      v-if="
        examples[
          grammar.grammarId
        ]?.length
      "
                      class="example-list"
                    >

                      <div
                        v-for="
          example in
          examples[
            grammar.grammarId
          ]
        "
                        :key="
          example.exampleId
        "
                        class="example-card"
                      >

                        <div class="jp-text">
                          {{
                            example.nihongo
                          }}
                        </div>

                        <div class="vn-text">
                          {{
                            example.vietnamese
                          }}
                        </div>

                      </div>

                    </div>

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

    </div>

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

.container-fluid {
  background: #f4f7fb;
}

.back-btn {
  border: none;
  background: white;
  padding: 10px 18px;
  border-radius: 12px;
  font-weight: 600;
}

.sub-title {
  color: #7c8595;
}

.lesson-panel,
.grammar-panel {
  background: white;
  border-radius: 24px;
  padding: 24px;
}

.lesson-item {
  padding: 18px;
  border-radius: 18px;
  margin-bottom: 14px;
  cursor: pointer;
  border: 1px solid #edf1f6;
}

.lesson-item.active {
  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;
}

.lesson-btn,
.add-btn,
.save-btn,
.cancel-btn {
  border: none;
  border-radius: 12px;
}

.lesson-btn,
.add-btn,
.save-btn {
  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;
  padding: 10px 18px;
}

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

.editor-card {
  background: #fafcff;
  border: 1px solid #e8edf5;
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 24px;
}

.toolbar {
  display: flex;
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
  border: 1px solid #dfe6ef;
}

.rich-editor {
  min-height: 260px;
  background: white;
  border: 1px solid #dbe3ee;
  border-radius: 18px;
  padding: 18px;
  outline: none;
}

.custom-input {
  border-radius: 14px;
  border: 1px solid #dfe6ef;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.grammar-scroll {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.grammar-card {
  background: white;
  border: 1px solid #edf1f5;
  border-radius: 22px;
  padding: 22px;
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
  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn {
  border: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.grammar-description {
  margin-top: 16px;
  color: #657082;
}

.empty-state {
  text-align: center;
  padding: 90px 20px;
}

/* =========================
   FORMULA
========================= */

.grammar-formula-wrapper {

  overflow-x: auto;

  margin: 28px 0;
}

.grammar-formula-table {

  border-collapse: separate;

  /* khoảng cách giữa 3 phần */
  border-spacing: 72px 0;

  background: #f5f5f5;

  border-radius: 30px;

  /* padding ngoài */
  padding: 46px 72px;

  display: inline-table;
}

/* CELLS */

.formula-left-cell,
.formula-right-cell,
.formula-plus-cell {
  vertical-align: top;
}

/* COLUMN */

.formula-column {

  display: flex;

  flex-direction: column;

  gap: 34px;
}

/* ITEMS */

.formula-item {

  font-size: 62px;

  line-height: 1;

  white-space: nowrap;

  font-family: "Noto Sans JP",
  sans-serif;

  font-weight: 400;
}

.formula-item.left {
  color: #2147a8;
}

.formula-item.right {
  color: #c30000;
}

/* BRACKET */

.formula-bracket-cell {

  font-size: 92px;

  line-height: 0.8;

  padding-left: 18px;

  color: #53331d;

  transform: scaleY(3.5);

  transform-origin: top;
}

/* OPEN */

.formula-open-cell {

  font-size: 92px;

  line-height: 0.8;

  padding-right: 18px;

  color: #53331d;

  transform: scaleY(5);

  transform-origin: top;
}

/* PLUS */

.formula-plus-cell {

  font-size: 60px;

  font-weight: 300;

  vertical-align: middle;

  padding: 0 28px;
}

/* MOBILE */

@media (max-width: 768px) {

  .grammar-formula-table {

    border-spacing: 22px 0;

    padding: 20px 22px;
  }

  .formula-item {
    font-size: 72px;
  }

  .formula-plus-cell {
    font-size: 34px;
  }

  .formula-bracket-cell,
  .formula-open-cell {
    font-size: 54px;
  }

}

/* =========================
   SIMPLE JP FORMULA
========================= */

.jp-formula {

  display: inline-block;

  background: #f3f3f3;

  border-radius: 28px;

  padding: 36px 52px;

  margin: 24px 0;
}

.jp-formula pre {

  margin: 0;

  font-size: 62px;

  line-height: 1.5;

  white-space: pre;

  font-family: "Noto Sans JP",
  monospace;

  color: #1d3896;
}

.grammar-actions {

  display: flex;

  gap: 10px;
}

.delete-btn {

  border: none;

  width: 42px;

  height: 42px;

  border-radius: 12px;

  background: #ffe7e7;

  color: #d10000;

  transition: 0.2s;
}

.delete-btn:hover {

  background: #ffd0d0;
}

/* =========================
   TOOLBAR ACTIVE
========================= */

.tool-btn {

  display: flex;

  align-items: center;

  justify-content: center;

  font-weight: 700;

  transition: all 0.2s ease;

  cursor: pointer;
}

.tool-btn:hover {

  background: #f3f7ff;

  border-color: #4f8cff;
}

/* ACTIVE */

.tool-btn.active {

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  border-color: transparent;

  box-shadow: 0 6px 18px rgba(
    79,
    140,
    255,
    0.35
  );

  transform: translateY(-1px);
}

tool-btn.active:hover {
  opacity: 0.95;
}
/* =========================
   EXAMPLES
========================= */

.example-section {

  margin-top: 28px;
}

/* TOGGLE BUTTON */

.expand-btn {

  border: none;

  background: linear-gradient(
    135deg,
    #f4f8ff,
    #eef2ff
  );

  color: #3158d8;

  padding: 12px 18px;

  border-radius: 16px;

  font-weight: 700;

  font-size: 14px;

  transition: all 0.25s ease;

  display: flex;

  align-items: center;

  gap: 10px;

  border: 1px solid #dce6ff;
}

.expand-btn:hover {

  transform: translateY(-1px);

  box-shadow:
    0 8px 24px rgba(
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

  margin-top: 20px;

  background: linear-gradient(
    180deg,
    #fcfdff,
    #f7f9ff
  );

  border-radius: 24px;

  border: 1px solid #e6ecf7;

  padding: 24px;
}

/* CREATE FORM */

.example-create {

  display: flex;

  flex-direction: column;

  gap: 16px;

  margin-bottom: 28px;
}

.example-create textarea {

  border-radius: 18px !important;

  border: 1px solid #dbe4f0 !important;

  padding: 16px !important;

  min-height: 90px;

  resize: vertical;

  transition: all 0.2s ease;

  font-size: 15px;

  background: white;
}

.example-create textarea:focus {

  border-color: #4f8cff !important;

  box-shadow:
    0 0 0 4px rgba(
      79,
      140,
      255,
      0.12
    ) !important;
}

/* SAVE BUTTON */

.save-example-btn {

  align-self: flex-end;

  border: none;

  padding: 12px 22px;

  border-radius: 16px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-weight: 700;

  transition: all 0.25s ease;

  box-shadow:
    0 10px 24px rgba(
      79,
      140,
      255,
      0.28
    );
}

.save-example-btn:hover {

  transform: translateY(-2px);

  box-shadow:
    0 16px 32px rgba(
      79,
      140,
      255,
      0.38
    );
}

/* LIST */

.example-list {

  display: flex;

  flex-direction: column;

  gap: 18px;
}

/* CARD */

.example-card {

  position: relative;

  overflow: hidden;

  background: white;

  border-radius: 22px;

  padding: 22px;

  border: 1px solid #e9eef7;

  transition: all 0.25s ease;
}

.example-card:hover {

  transform: translateY(-2px);

  box-shadow:
    0 14px 32px rgba(
      0,
      0,
      0,
      0.06
    );
}

/* LEFT ACCENT */

.example-card::before {

  content: "";

  position: absolute;

  left: 0;

  top: 0;

  width: 6px;

  height: 100%;

  background: linear-gradient(
    180deg,
    #4f8cff,
    #7b61ff
  );
}

/* JAPANESE */

.jp-text {

  font-size: 28px;

  line-height: 1.8;

  font-family:
    "Noto Sans JP",
    sans-serif;

  font-weight: 700;

  color: #1a2c73;

  margin-bottom: 16px;

  letter-spacing: 0.4px;
}

/* VIETNAMESE */

.vn-text {

  position: relative;

  padding-left: 18px;

  color: #647084;

  line-height: 1.8;

  font-size: 16px;
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

/* MOBILE */

@media (max-width: 768px) {

  .example-expand {

    padding: 18px;
  }

  .jp-text {

    font-size: 22px;
  }

  .vn-text {

    font-size: 15px;
  }

  .save-example-btn {

    width: 100%;
  }
}
</style>

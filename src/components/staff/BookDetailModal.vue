<script setup lang="ts">
import {
  ref,
  onMounted,
  nextTick
} from "vue"

import gatewayUrl from "@/api/authApi.ts"

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

const props = defineProps<{
  book: any
}>()

/* =========================
   STATE
========================= */

const lessons =
  ref<Lesson[]>([])

const grammars =
  ref<Grammar[]>([])

const selectedLesson =
  ref<Lesson | null>(null)

const showEditor =
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
   FETCH
========================= */

const fetchLessons = async () => {

  const res =
    await gatewayUrl.get(
      "/api/staff/getLessonsByBook",
      {
        params: {
          bookId:
          props.book.bookId
        }
      }
    )

  lessons.value = res.data
}

const fetchGrammars =
  async (lessonId: number) => {

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
}

const syncEditor = () => {

  if (!editorRef.value)
    return

  grammarForm.value.structure =
    editorRef.value.innerHTML
}

/* =========================
   EXPORT
========================= */

const exportHtml = () => {

  const blob =
    new Blob(
      [
        grammarForm.value
          .structure
      ],
      {
        type: "text/html"
      }
    )

  const url =
    URL.createObjectURL(
      blob
    )

  const a =
    document.createElement("a")

  a.href = url

  a.download =
    "grammar.html"

  a.click()

  URL.revokeObjectURL(url)
}

const exportMarkdown = () => {

  const text =
    editorRef.value?.innerText ||
    ""

  const blob =
    new Blob(
      [text],
      {
        type:
          "text/markdown"
      }
    )

  const url =
    URL.createObjectURL(
      blob
    )

  const a =
    document.createElement("a")

  a.href = url

  a.download =
    "grammar.md"

  a.click()

  URL.revokeObjectURL(url)
}

/* =========================
   STANDARD FORMULA BLOCK
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

  <!-- LEFT -->

  <div
    class="formula-side formula-curly"
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

  <!-- PLUS -->

  <div class="formula-plus">
    +
  </div>

  <!-- RIGHT -->

  <div
    class="formula-side formula-square"
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
  (
    leftItems: string[],
    rightItems: string[]
  ) => {

    const html =
      createGrammarFormulaHtml(
        leftItems,
        rightItems
      )

    exec(
      "insertHTML",
      html
    )
  }

/* =========================
   JLPT TEMPLATE
========================= */

const insertTemplate = (
  level: string
) => {

  if (level === "N5") {

    insertGrammarFormula(
      ["Vます"],
      [
        "たいです",
        "たくないです"
      ]
    )
  }

  if (level === "N4") {

    insertGrammarFormula(
      [
        "Vる",
        "Vない"
      ],
      [
        "ように言う",
        "ように頼む",
        "ように注意する"
      ]
    )
  }

  if (level === "N3") {

    insertGrammarFormula(
      [
        "普通形",
        "N"
      ],
      [
        "わけだ",
        "ということだ"
      ]
    )
  }
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
   MOUNT
========================= */

onMounted(async () => {

  await fetchLessons()
})
</script>

<template>

  <div class="modal fade show d-block">

    <div
      class="
        modal-dialog
        modal-xl
        modal-dialog-centered
      "
    >

      <div class="modal-content custom-modal">

        <!-- HEADER -->

        <div class="modal-header custom-header">

          <div>

            <h3 class="fw-bold mb-1">
              📚 JLPT Rich Editor
            </h3>

            <div class="sub-title">
              Word mini cho grammar
            </div>

          </div>

          <button
            class="btn-close"
            @click="$emit('close')"
          ></button>

        </div>

        <!-- BODY -->

        <div class="modal-body">

          <div class="row g-4">

            <!-- LEFT -->

            <div class="col-lg-4">

              <div class="lesson-panel">

                <div
                  v-for="lesson in lessons"
                  :key="
                    lesson.lessonId
                  "
                  class="lesson-item"
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

                <div class="top-actions">

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
                      @click="
                        exec('bold')
                      "
                    >
                      B
                    </button>

                    <button
                      class="tool-btn"
                      @click="
                        exec('italic')
                      "
                    >
                      I
                    </button>

                    <button
                      class="tool-btn"
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

                    <!-- FORMULA -->

                    <button
                      class="formula-btn"
                      @click="
                        insertGrammarFormula(
                          ['Vます'],
                          ['たいです']
                        )
                      "
                    >
                      Formula
                    </button>

                    <!-- TEMPLATE -->

                    <button
                      class="
                        template-btn
                      "
                      @click="
                        insertTemplate(
                          'N5'
                        )
                      "
                    >
                      N5
                    </button>

                    <button
                      class="
                        template-btn
                      "
                      @click="
                        insertTemplate(
                          'N4'
                        )
                      "
                    >
                      N4
                    </button>

                    <button
                      class="
                        template-btn
                      "
                      @click="
                        insertTemplate(
                          'N3'
                        )
                      "
                    >
                      N3
                    </button>

                    <!-- EXPORT -->

                    <button
                      class="
                        export-btn
                      "
                      @click="
                        exportHtml()
                      "
                    >
                      HTML
                    </button>

                    <button
                      class="
                        export-btn
                      "
                      @click="
                        exportMarkdown()
                      "
                    >
                      MD
                    </button>

                  </div>

                  <!-- RICH EDITOR -->

                  <div
                    ref="editorRef"
                    class="
                      rich-editor
                    "
                    contenteditable="true"
                    @input="
                      syncEditor
                    "
                  ></div>

                  <!-- DESC -->

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

                  <!-- ACTION -->

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

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</template>

<style scoped>

.custom-modal{
  border:none;
  border-radius:30px;
  overflow:hidden;
}

.custom-header{
  padding:24px 28px;
  background:linear-gradient(
    135deg,
    #f8fbff,
    #eef4ff
  );
}

.sub-title{
  color:#6b7280;
  font-size:13px;
}

.lesson-panel,
.grammar-panel{
  background:#f8fafc;
  border-radius:24px;
  padding:20px;
}

.lesson-item{
  background:white;
  border-radius:18px;
  padding:16px;
  margin-bottom:14px;
  cursor:pointer;
  border:1px solid #e5e7eb;
  transition:.2s;
}

.lesson-item:hover{
  transform:translateY(-2px);
  border-color:#93c5fd;
}

.lesson-name{
  font-weight:700;
  margin-bottom:6px;
}

.lesson-desc{
  color:#6b7280;
  font-size:13px;
}

.top-actions{
  display:flex;
  justify-content:flex-end;
  margin-bottom:18px;
}

.add-btn,
.save-btn,
.cancel-btn{
  border:none;
  border-radius:14px;
  padding:10px 18px;
  font-weight:700;
}

.add-btn{
  background:linear-gradient(
    135deg,
    #60a5fa,
    #2563eb
  );
  color:white;
}

.save-btn{
  background:#16a34a;
  color:white;
}

.cancel-btn{
  background:#eef2f7;
}

.editor-card{
  background:white;
  border-radius:24px;
  padding:20px;
  margin-bottom:24px;
}

.toolbar{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-bottom:16px;
}

.tool-btn,
.template-btn,
.export-btn,
.formula-btn{

  border:none;

  border-radius:12px;

  height:42px;

  padding:0 16px;

  font-weight:700;

  background:#eef2ff;

  transition:.2s;
}

.tool-btn{
  width:42px;
  padding:0;
}

.formula-btn{
  background:#dcfce7;
}

.tool-btn:hover,
.template-btn:hover,
.export-btn:hover,
.formula-btn:hover{
  background:#dbeafe;
  transform:translateY(-2px);
}

.rich-editor{

  min-height:320px;

  border:1px solid #bfdbfe;

  border-radius:20px;

  padding:22px;

  background:white;

  font-size:20px;

  line-height:2;

  outline:none;

  overflow:auto;
}

.rich-editor:focus{
  border-color:#60a5fa;
  box-shadow:
    0 0 0 4px
    rgba(96,165,250,.15);
}

.editor-actions{
  display:flex;
  justify-content:flex-end;
  gap:12px;
  margin-top:20px;
}

.grammar-scroll{
  max-height:700px;
  overflow:auto;

  display:flex;
  flex-direction:column;
  gap:18px;
}

.grammar-card{
  background:white;
  border-radius:24px;
  padding:22px;

  border:1px solid #e5e7eb;

  transition:.2s;
}

.grammar-card:hover{
  transform:translateY(-2px);
}

.grammar-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:18px;
}

.grammar-title{
  display:flex;
  align-items:center;
  gap:12px;

  font-size:18px;
  font-weight:700;
}

.grammar-number{
  width:36px;
  height:36px;

  border-radius:50%;

  display:flex;
  align-items:center;
  justify-content:center;

  background:linear-gradient(
    135deg,
    #60a5fa,
    #2563eb
  );

  color:white;
}

.edit-btn{
  border:none;

  width:40px;
  height:40px;

  border-radius:12px;

  background:#dbeafe;
}

.grammar-structure{
  background:#f8fafc;

  border-radius:20px;

  padding:20px;

  font-size:20px;

  line-height:2;

  overflow:auto;

  border:1px dashed #bfdbfe;
}

.grammar-description{
  margin-top:16px;
  color:#4b5563;
  line-height:1.8;
}

.custom-input{
  border-radius:14px;
}

/* =========================
   FORMULA BLOCK
========================= */

:deep(.grammar-formula){

  display:flex;

  align-items:center;

  justify-content:center;

  gap:34px;

  padding:28px;

  margin:20px 0;

  border-radius:26px;

  background:white;

  border:2px solid #dbeafe;

  overflow:auto;
}

:deep(.formula-side){

  display:flex;

  align-items:center;

  gap:14px;
}

:deep(.formula-content){

  min-width:140px;

  font-size:34px;

  font-weight:700;

  line-height:1.8;

  white-space:pre-wrap;
}

:deep(.formula-curly .formula-content){
  color:#2563eb;
}

:deep(.formula-square .formula-content){
  color:#dc2626;
}

:deep(.formula-bracket){

  font-size:110px;

  line-height:1;

  font-weight:200;

  transform:scaleY(1.4);

  color:#374151;
}

:deep(.formula-plus){

  font-size:52px;

  font-weight:800;

  color:#16a34a;

  margin:0 10px;
}

</style>

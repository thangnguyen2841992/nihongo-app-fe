<script setup lang="ts">
import {
  ref,
  watch,
  nextTick
} from "vue"

import { gatewayUrl } from "@/api/authApi"

interface Grammar {
  grammarId: number
  title: string
  structure: string
  description: string
}

const props = defineProps<{
  lessonId: number
  grammar?: Grammar | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const editorRef =
  ref<HTMLDivElement | null>(null)

const grammarForm = ref({
  title: "",
  structure: "",
  description: ""
})

const activeFormats = ref({
  bold: false,
  italic: false,
  strikeThrough: false
})

watch(
  () => props.grammar,
  async grammar => {

    if (grammar) {

      grammarForm.value = {
        title: grammar.title,
        structure: grammar.structure,
        description: grammar.description
      }

      await nextTick()

      if (editorRef.value) {

        editorRef.value.innerHTML =
          grammar.structure
      }

    } else {

      grammarForm.value = {
        title: "",
        structure: "",
        description: ""
      }

      await nextTick()

      if (editorRef.value) {
        editorRef.value.innerHTML = ""
      }
    }
  },
  {
    immediate: true
  }
)

const updateToolbarState =
  () => {

    activeFormats.value.bold =
      document.queryCommandState("bold")

    activeFormats.value.italic =
      document.queryCommandState("italic")

    activeFormats.value.strikeThrough =
      document.queryCommandState("strikeThrough")
  }

const syncEditor =
  () => {

    if (!editorRef.value) {
      return
    }

    grammarForm.value.structure =
      editorRef.value.innerHTML

    updateToolbarState()
  }

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

      <td class="formula-plus-cell">
        +
      </td>

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

    exec(
      "insertHTML",
      createGrammarFormulaHtml(
        [
          "Vる",
          "Vない"
        ],
        [
          "ように言う",
          "ように頼む"
        ]
      )
    )
  }

const saveGrammar =
  async () => {

    try {

      if (props.grammar) {

        await gatewayUrl.put(
          "/api/staff/grammars",
          {
            grammarId:
            props.grammar.grammarId,

            lessonId:
            props.lessonId,

            ...grammarForm.value
          }
        )

      } else {

        await gatewayUrl.post(
          "/api/staff/grammars",
          {
            lessonId:
            props.lessonId,

            ...grammarForm.value
          }
        )
      }

      emit("saved")

    } catch (e) {

      console.error(e)

      alert("Lưu grammar thất bại")
    }
  }
</script>

<template>

  <div class="modal-backdrop">

    <div class="grammar-modal">

      <div class="modal-header">

        <h4>
          {{
            grammar
              ? "Cập nhật Grammar"
              : "Tạo Grammar"
          }}
        </h4>

        <button
          class="close-btn"
          @click="emit('close')"
        >
          ✕
        </button>

      </div>

      <input
        v-model="grammarForm.title"
        class="form-control mb-3"
        placeholder="Tiêu đề grammar"
      >

      <div class="toolbar">

        <button
          class="tool-btn"
          :class="{
            active:
              activeFormats.bold
          }"
          @click="exec('bold')"
        >
          B
        </button>

        <button
          class="tool-btn"
          :class="{
            active:
              activeFormats.italic
          }"
          @click="exec('italic')"
        >
          I
        </button>

        <button
          class="tool-btn"
          :class="{
            active:
              activeFormats.strikeThrough
          }"
          @click="exec('strikeThrough')"
        >
          S
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

      <div
        ref="editorRef"
        class="rich-editor"
        contenteditable="true"
        @input="syncEditor"
        @keyup="updateToolbarState"
        @mouseup="updateToolbarState"
      />

      <textarea
        v-model="
          grammarForm.description
        "
        rows="4"
        class="form-control mt-3"
        placeholder="Mô tả"
      />

      <div class="modal-actions">

        <button
          class="cancel-btn"
          @click="emit('close')"
        >
          Hủy
        </button>

        <button
          class="save-btn"
          @click="saveGrammar"
        >
          Lưu
        </button>

      </div>

    </div>

  </div>

</template>
<style scoped>
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
</style>

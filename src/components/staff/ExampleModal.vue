<script setup lang="ts">
import {
  ref,
  watch,
  nextTick
} from "vue"

import { gatewayUrl } from "@/api/authApi"

interface Example {
  exampleId: number
  nihongo: string
  vietnamese: string
  grammarId: number
}

const props = defineProps<{
  grammarId: number
  example?: Example | null
}>()

const emit = defineEmits<{
  close: []
  saved: [exampleId: number]
}>()

const nihongoRef =
  ref<HTMLDivElement | null>(null)

const vietnameseRef =
  ref<HTMLDivElement | null>(null)

const activeFormats = ref({
  bold: false,
  italic: false
})

const form = ref({
  nihongo: "",
  vietnamese: ""
})

/**
 * Loading state khi tạo / cập nhật example
 */
const isSaving = ref(false)

watch(
  () => props.example,
  async value => {

    // Không reset form trong lúc đang save
    if (isSaving.value) {
      return
    }

    if (value) {

      form.value = {
        nihongo: value.nihongo,
        vietnamese: value.vietnamese
      }

    } else {

      form.value = {
        nihongo: "",
        vietnamese: ""
      }
    }

    await nextTick()

    if (nihongoRef.value) {

      nihongoRef.value.innerHTML =
        form.value.nihongo
    }

    if (vietnameseRef.value) {

      vietnameseRef.value.innerHTML =
        form.value.vietnamese
    }
  },
  {
    immediate: true
  }
)

const syncEditor = () => {

  form.value.nihongo =
    nihongoRef.value?.innerHTML || ""

  form.value.vietnamese =
    vietnameseRef.value?.innerHTML || ""

  updateToolbarState()
}

const exec = (
  command: string
) => {

  // Không cho chỉnh sửa trong lúc save
  if (isSaving.value) {
    return
  }

  document.execCommand(
    command,
    false
  )

  syncEditor()
}

const updateToolbarState =
  () => {

    if (isSaving.value) {
      return
    }

    activeFormats.value.bold =
      document.queryCommandState(
        "bold"
      )

    activeFormats.value.italic =
      document.queryCommandState(
        "italic"
      )
  }

const save = async () => {

  // Chặn double click / gọi API nhiều lần
  if (isSaving.value) {
    return
  }

  syncEditor()

  const nihongoText =
    nihongoRef.value?.innerText
      .trim() || ""

  const vnText =
    vietnameseRef.value?.innerText
      .trim() || ""

  if (
    !nihongoText ||
    !vnText
  ) {

    alert(
      "Vui lòng nhập đầy đủ thông tin"
    )

    return
  }

  // Bắt đầu loading
  isSaving.value = true

  try {

    if (props.example) {

      const res =
        await gatewayUrl.put(
          "/api/staff/examples",
          {
            exampleId:
            props.example.exampleId,

            nihongo:
            form.value.nihongo,

            vietnamese:
            form.value.vietnamese,

            grammarId:
            props.grammarId
          }
        )

      emit(
        "saved",
        res.data.exampleId
      )

    } else {

      const res =
        await gatewayUrl.post(
          "/api/staff/examples",
          {
            nihongo:
            form.value.nihongo,

            vietnamese:
            form.value.vietnamese,

            grammarId:
            props.grammarId
          }
        )

      emit(
        "saved",
        res.data.exampleId
      )
    }

  } catch (e) {

    console.error(e)

    alert(
      "Lưu ví dụ thất bại"
    )

  } finally {

    // Nếu request lỗi thì cho phép save lại
    isSaving.value = false
  }
}
</script>

<template>

  <div class="modal-backdrop">

    <div class="example-modal">

      <div class="modal-header">

        <h4>
          {{
            example
              ? "Sửa ví dụ"
              : "Thêm ví dụ"
          }}
        </h4>

        <button
          class="close-btn"
          :disabled="isSaving"
          :class="{
            disabled: isSaving
          }"
          @click="emit('close')"
        >
          ✕
        </button>

      </div>

      <!-- TOOLBAR -->

      <div class="toolbar">

        <button
          class="tool-btn"
          :class="{
            active:
              activeFormats.bold
          }"
          :disabled="isSaving"
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
          :disabled="isSaving"
          @click="exec('italic')"
        >
          I
        </button>

      </div>

      <!-- NHẬT -->

      <div
        class="editor-label"
      >
        Ví dụ tiếng Nhật
      </div>

      <div
        ref="nihongoRef"
        class="rich-editor"
        :class="{
          'editor-disabled':
            isSaving
        }"
        contenteditable="true"
        :contenteditable="
          !isSaving
        "
        @input="syncEditor"
        @mouseup="
          updateToolbarState
        "
        @keyup="
          updateToolbarState
        "
      ></div>

      <!-- VIỆT -->

      <div
        class="
          editor-label
          mt-3
        "
      >
        Nghĩa tiếng Việt
      </div>

      <div
        ref="vietnameseRef"
        class="
          rich-editor
          vn-editor
        "
        :class="{
          'editor-disabled':
            isSaving
        }"
        contenteditable="true"
        :contenteditable="
          !isSaving
        "
        @input="syncEditor"
        @mouseup="
          updateToolbarState
        "
        @keyup="
          updateToolbarState
        "
      ></div>

      <!-- LOADING BAR -->

      <div
        v-if="isSaving"
        class="saving-loading"
      >

        <div
          class="saving-loading-bar"
        ></div>

        <span>
          {{
            example
              ? "Đang cập nhật ví dụ..."
              : "Đang tạo ví dụ..."
          }}
        </span>

      </div>

      <!-- ACTIONS -->

      <div class="modal-actions">

        <button
          class="cancel-btn"
          :disabled="isSaving"
          :class="{
            disabled: isSaving
          }"
          @click="emit('close')"
        >
          Hủy
        </button>

        <button
          class="save-btn"
          :disabled="isSaving"
          :class="{
            saving: isSaving
          }"
          @click="save"
        >

          <template v-if="isSaving">

            <span
              class="loading-spinner"
            ></span>

            {{
              example
                ? "Đang cập nhật..."
                : "Đang tạo..."
            }}

          </template>

          <template v-else>

            {{
              example
                ? "Cập nhật"
                : "Tạo mới"
            }}

          </template>

        </button>

      </div>

    </div>

  </div>

</template>

<style scoped>

.modal-backdrop {

  position: fixed;

  inset: 0;

  background: rgba(
    0,
    0,
    0,
    0.45
  );

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 9999;
}

.example-modal {

  width: 700px;

  max-width: 95vw;

  background: white;

  border-radius: 24px;

  padding: 24px;

  box-shadow:
    0 20px 60px rgba(
      0,
      0,
      0,
      0.18
    );
}

.modal-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 20px;
}

.modal-header h4 {

  margin: 0;

  font-weight: 700;
}

.close-btn {

  border: none;

  background: transparent;

  font-size: 20px;

  cursor: pointer;

  transition: all 0.2s ease;
}

.close-btn:hover:not(:disabled) {

  background: #f1f5f9;

  border-radius: 10px;
}

.close-btn.disabled {

  opacity: 0.4;

  cursor: not-allowed;
}

.custom-input {

  border-radius: 14px;

  border: 1px solid #dfe6ef;
}

.custom-input:focus {

  border-color: #4f8cff;

  box-shadow:
    0 0 0 4px rgba(
      79,
      140,
      255,
      0.12
    );
}

.modal-actions {

  display: flex;

  justify-content: flex-end;

  gap: 12px;

  margin-top: 20px;
}

.cancel-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: #eef2f7;

  color: #4d5a6d;

  font-weight: 600;

  cursor: pointer;

  transition: all 0.2s ease;
}

.cancel-btn:hover:not(:disabled) {

  background: #e3e9f1;
}

.cancel-btn:disabled {

  opacity: 0.5;

  cursor: not-allowed;
}

.cancel-btn.disabled {

  opacity: 0.5;

  cursor: not-allowed;
}

.save-btn {

  border: none;

  min-width: 120px;

  padding: 10px 18px;

  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-weight: 600;

  cursor: pointer;

  transition: all 0.2s ease;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 8px;
}

.save-btn:hover:not(:disabled) {

  opacity: 0.95;

  transform: translateY(-1px);
}

.save-btn:disabled {

  cursor: not-allowed;

  opacity: 0.75;

  transform: none;
}

.save-btn.saving {

  cursor: wait;
}

/* =========================
   LOADING SPINNER
   ========================= */

.loading-spinner {

  width: 16px;

  height: 16px;

  border: 2px solid rgba(
    255,
    255,
    255,
    0.4
  );

  border-top-color: white;

  border-radius: 50%;

  animation:
    spinner-rotate
    0.7s linear infinite;
}

@keyframes spinner-rotate {

  to {
    transform: rotate(360deg);
  }
}

/* =========================
   LOADING BAR
   ========================= */

.saving-loading {

  position: relative;

  display: flex;

  align-items: center;

  gap: 10px;

  margin-top: 18px;

  padding: 10px 14px;

  border-radius: 10px;

  background: #f4f7ff;

  color: #4f6fb5;

  font-size: 13px;

  font-weight: 600;

  overflow: hidden;
}

.saving-loading::before {

  content: "";

  position: absolute;

  left: 0;

  top: 0;

  width: 100%;

  height: 3px;

  background: #e1e8ff;
}

.saving-loading-bar {

  position: absolute;

  left: 0;

  top: 0;

  width: 35%;

  height: 3px;

  background: linear-gradient(
    90deg,
    #4f8cff,
    #7b61ff
  );

  animation:
    loading-progress
    1.2s ease-in-out infinite;
}

@keyframes loading-progress {

  0% {
    left: -35%;
  }

  100% {
    left: 100%;
  }
}

/* =========================
   TOOLBAR
   ========================= */

.toolbar {

  display: flex;

  gap: 10px;

  margin-bottom: 16px;
}

.tool-btn {

  border: none;

  width: 42px;

  height: 42px;

  border-radius: 12px;

  background: white;

  border: 1px solid #dfe6ef;

  font-weight: 700;

  transition: all 0.2s ease;

  cursor: pointer;
}

.tool-btn:hover:not(:disabled) {

  background: #f4f8ff;
}

.tool-btn.active {

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  border-color: transparent;
}

.tool-btn:disabled {

  opacity: 0.45;

  cursor: not-allowed;
}

/* =========================
   EDITOR
   ========================= */

.editor-label {

  font-size: 14px;

  font-weight: 700;

  color: #556274;

  margin-bottom: 8px;
}

.rich-editor {

  min-height: 120px;

  border: 1px solid #dfe6ef;

  border-radius: 14px;

  padding: 14px;

  outline: none;

  background: white;

  line-height: 1.8;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.rich-editor:focus {

  border-color: #4f8cff;

  box-shadow:
    0 0 0 4px rgba(
      79,
      140,
      255,
      0.12
    );
}

.rich-editor.editor-disabled {

  background: #f8fafc;

  cursor: not-allowed;

  opacity: 0.75;
}

.vn-editor {

  min-height: 140px;
}

</style>

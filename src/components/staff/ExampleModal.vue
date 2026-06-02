```vue
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
  saved: []
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

watch(
  () => props.example,
  async value => {

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

  document.execCommand(
    command,
    false
  )

  syncEditor()
}

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
  }

const save = async () => {

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

  try {

    if (props.example) {

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

    } else {

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
    }

    emit("saved")

  } catch (e) {

    console.error(e)

    alert(
      "Lưu ví dụ thất bại"
    )
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
        contenteditable="true"
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
        contenteditable="true"
        @input="syncEditor"
        @mouseup="
    updateToolbarState
  "
        @keyup="
    updateToolbarState
  "
      ></div>

      <div class="modal-actions">

        <button
          class="cancel-btn"
          @click="emit('close')"
        >
          Hủy
        </button>

        <button
          class="save-btn"
          @click="save"
        >
          {{
            example
              ? "Cập nhật"
              : "Tạo mới"
          }}
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
}

.save-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-weight: 600;
}

.save-btn:hover {

  opacity: 0.95;
}

.cancel-btn:hover {

  background: #e3e9f1;
}
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

.tool-btn:hover {

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

.vn-editor {

  min-height: 140px;
}
</style>

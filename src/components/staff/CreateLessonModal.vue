```vue
<!-- CreateLessonModal.vue -->

<script setup lang="ts">
import {
  computed,
  ref,
  watch
} from "vue"

import { gatewayUrl } from "@/api/authApi.ts"

interface Lesson {
  lessonId: number
  bookId: number
  name: string
  description: string
  reading: string
}

interface Props {
  bookId: number
  bookName: string
  lesson?: Lesson | null
}

const props = defineProps<Props>()

const emit = defineEmits([
  "close",
  "created"
])

const loading = ref(false)

const form = ref({
  name: "",
  description: "",
  reading: ""
})

const isEdit =
  computed(() => !!props.lesson)

const bookDisplayName =
  computed(() =>
    props.bookName ||
    "Không xác định"
  )

watch(
  () => props.lesson,
  lesson => {

    if (!lesson) {

      form.value = {
        name: "",
        description: "",
        reading: ""
      }

      return
    }

    form.value = {
      name: lesson.name,
      description:
        lesson.description || "",
      reading:
        lesson.reading || ""
    }
  },
  {
    immediate: true
  }
)

const submit = async () => {

  if (!form.value.name.trim()) {

    alert("Vui lòng nhập tên bài học")

    return
  }

  loading.value = true

  try {

    const payload = {
      lessonId: props.lesson?.lessonId,
      name: form.value.name,
      description: form.value.description,
      reading: form.value.reading,
      bookId: props.bookId
    }

    if (isEdit.value) {

      await gatewayUrl.put(
        "/api/staff/lessons",
        payload
      )

    } else {

      await gatewayUrl.post(
        "/api/staff/lessons",
        payload
      )
    }

    alert(
      isEdit.value
        ? "Cập nhật bài học thành công"
        : "Tạo bài học thành công"
    )

    emit("created")

  } catch (e) {

    console.error(e)

    alert(
      isEdit.value
        ? "Cập nhật thất bại"
        : "Tạo thất bại"
    )

  } finally {

    loading.value = false
  }
}
</script>

<template>

  <div class="modal-overlay">

    <div class="lesson-modal">

      <!-- HEADER -->

      <div class="modal-header">

        <div>

          <h5 class="modal-title">

            <i
              class="bi bi-journal-plus me-2 text-primary"
            ></i>

            {{
              isEdit
                ? "Cập nhật bài học"
                : "Thêm bài học"
            }}

          </h5>

          <div class="book-info">

            <i
              class="bi bi-book me-1"
            ></i>

            {{ bookDisplayName }}

          </div>

        </div>

        <button
          class="btn-close"
          @click="$emit('close')"
        ></button>

      </div>

      <!-- BODY -->

      <div class="modal-body">

        <!-- NAME -->

        <div class="mb-4">

          <label
            class="form-label"
          >
            Tên bài học
          </label>

          <input
            v-model="form.name"
            class="form-control"
            placeholder="Nhập tên bài học"
          />

        </div>

        <!-- DESCRIPTION -->

        <div class="mb-4">

          <label
            class="form-label"
          >
            Mô tả
          </label>

          <textarea
            v-model="
              form.description
            "
            class="form-control"
            rows="4"
            placeholder="Mô tả ngắn cho bài học"
          ></textarea>

        </div>

        <!-- READING -->

        <div>

          <label
            class="form-label"
          >
            Bài đọc
          </label>

          <textarea
            v-model="form.reading"
            class="
              form-control
              reading-textarea
            "
            placeholder="Nhập nội dung bài đọc..."
          ></textarea>

        </div>

      </div>

      <!-- FOOTER -->

      <div class="modal-footer">

        <button
          class="
            btn
            btn-light
            border
          "
          @click="$emit('close')"
        >
          Đóng
        </button>

        <button
          class="
            btn
            btn-primary
            px-4
          "
          @click="submit"
          :disabled="loading"
        >

          <span
            v-if="loading"
            class="
              spinner-border
              spinner-border-sm
              me-2
            "
          ></span>

          {{
            isEdit
              ? "Cập nhật"
              : "Lưu bài học"
          }}

        </button>

      </div>

    </div>

  </div>

</template>

<style scoped>

.modal-overlay {

  position: fixed;

  inset: 0;

  z-index: 9999;

  display: flex;

  justify-content: center;

  align-items: center;

  padding: 20px;

  background: rgba(
    15,
    23,
    42,
    0.45
  );

  backdrop-filter: blur(6px);
}

.lesson-modal {

  width: 100%;

  max-width: 900px;

  background: white;

  border-radius: 24px;

  overflow: hidden;

  display: flex;

  flex-direction: column;

  max-height: 90vh;

  box-shadow:
    0 25px 60px rgba(
      0,
      0,
      0,
      0.18
    );
}

.modal-header {

  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  padding: 22px 24px;

  border-bottom:
    1px solid #eef2f7;

  flex-shrink: 0;
}

.modal-title {

  margin: 0 0 8px;

  font-size: 22px;

  font-weight: 700;
}

.modal-body {

  padding: 24px;

  overflow-y: auto;

  flex: 1;
}

.modal-footer {

  padding: 18px 24px;

  border-top:
    1px solid #eef2f7;

  display: flex;

  justify-content: flex-end;

  gap: 12px;

  flex-shrink: 0;
}

.form-label {

  display: block;

  margin-bottom: 8px;

  font-weight: 700;

  color: #334155;
}

.form-control {

  border-radius: 14px;

  padding: 12px 16px;

  border: 1px solid #dbe3ef;

  transition: all .2s ease;
}

.form-control:focus {

  border-color: #4f8cff;

  box-shadow:
    0 0 0 4px rgba(
      79,
      140,
      255,
      0.12
    );
}

textarea.form-control {

  resize: vertical;
}

.reading-textarea {

  min-height: 280px;

  line-height: 2;

  font-size: 16px;

  font-family:
    "Noto Sans JP",
    "Noto Sans",
    sans-serif;
}

.book-info {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  padding: 6px 12px;

  border-radius: 999px;

  background: #eef4ff;

  color: #0d6efd;

  font-size: 13px;

  font-weight: 600;
}

@media (max-width: 768px) {

  .modal-overlay {

    padding: 10px;
  }

  .lesson-modal {

    max-height: 95vh;

    border-radius: 18px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {

    padding: 16px;
  }

  .modal-title {

    font-size: 18px;
  }

  .reading-textarea {

    min-height: 180px;
  }

  .modal-footer {

    flex-direction: column;
  }

  .modal-footer button {

    width: 100%;
  }
}

</style>

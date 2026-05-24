<!-- CreateLessonModal.vue -->

<script setup lang="ts">
import {computed, ref} from "vue"
import {gatewayUrl} from "@/api/authApi.ts"

interface Props {
  bookId: number
  bookName: string
}

const props = defineProps<Props>()

const emit = defineEmits([
  "close",
  "created"
])

const loading = ref(false)

const form = ref({
  name: "",
  description: ""
})

const bookDisplayName =
  computed(() =>
    props.bookName || "Không xác định"
  )

const submit = async () => {

  if (
    !form.value.name.trim()
  ) {
    alert("Vui lòng nhập tên bài học")
    return
  }

  loading.value = true

  try {

    await gatewayUrl.post(
      "/api/staff/lessons",
      {
        name: form.value.name,
        description: form.value.description,
        bookId: props.bookId
      }
    )

    alert("Tạo bài học thành công")

    emit("created")

  } catch (e) {

    console.error(e)

    alert("Tạo bài học thất bại")

  } finally {

    loading.value = false
  }
}
</script>

<template>
  <div class="modal fade show d-block">

    <div class="modal-dialog modal-lg">

      <div
        class="modal-content shadow border-0"
      >

        <!-- HEADER -->
        <div class="modal-header">

          <div>

            <h5
              class="modal-title fw-bold mb-1"
            >
              <i
                class="bi bi-journal-plus me-2 text-primary"
              ></i>

              Thêm bài học
            </h5>

            <!-- BOOK NAME -->
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
          <div class="mb-3">

            <label
              class="form-label fw-semibold"
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
          <div class="mb-3">

            <label
              class="form-label fw-semibold"
            >
              Mô tả
            </label>

            <textarea
              v-model="
                form.description
              "
              class="form-control"
              rows="5"
              placeholder="Nhập mô tả bài học"
            ></textarea>

          </div>

        </div>

        <!-- FOOTER -->
        <div class="modal-footer">

          <button
            class="btn btn-light border"
            @click="$emit('close')"
          >
            Đóng
          </button>

          <button
            class="btn btn-primary px-4"
            @click="submit"
            :disabled="loading"
          >

            <span
              v-if="loading"
              class="spinner-border spinner-border-sm me-2"
            ></span>

            Lưu bài học

          </button>

        </div>

      </div>

    </div>

  </div>

  <div class="modal-backdrop fade show"></div>
</template>

<style scoped>
.modal-content {
  border-radius: 18px;
}

.form-control {
  border-radius: 12px;
  padding: 10px 14px;
}

textarea.form-control {
  resize: none;
}

.book-info {
  display: inline-flex;
  align-items: center;

  gap: 4px;

  background: #eef4ff;

  color: #0d6efd;

  padding: 6px 12px;

  border-radius: 999px;

  font-size: 13px;
  font-weight: 600;
}
</style>

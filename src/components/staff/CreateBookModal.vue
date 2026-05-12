<script setup lang="ts">
import {onMounted, ref} from "vue"
import axios from "axios"
import gatewayUrl from "@/api/authApi.ts"

const files = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const emit = defineEmits(["close", "created"])

interface Type {
  typeId: number
  typeName: string
}

interface Level {
  levelId: number
  levelName: string
}

const types = ref<Type[]>([])
const levels = ref<Level[]>([])

const loading = ref(false)

const form = ref<{
  bookName: string
  typeId: number | null
  levelId: number | null
  urls: string
}>({
  bookName: "",
  typeId: null,
  levelId: null,
  urls: ""
})

onMounted(async () => {

  const [t, l] = await Promise.all([
    gatewayUrl.get('/api/staff/types'),
    gatewayUrl.get('/api/staff/levels')
  ])

  types.value = t.data
  levels.value = l.data

  if (types.value.length > 0) {
    form.value.typeId =
      types.value[types.value.length - 1]?.typeId ?? null
  }

  if (levels.value.length > 0) {
    form.value.levelId =
      levels.value[levels.value.length - 1]?.levelId ?? null
  }
})

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const handleFiles = (e: Event) => {

  const target =
    e.target as HTMLInputElement

  if (!target.files) return

  files.value =
    Array.from(target.files)
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
}

const submit = async () => {

  loading.value = true

  try {
    const urls = await Promise.all(
      files.value.map(file =>
        uploadFile(file)
      )
    )

    await gatewayUrl.post(
      '/api/staff/books',
      {
        bookName: form.value.bookName,
        typeId: form.value.typeId,
        levelId: form.value.levelId,
        urls: urls
      }
    )

    emit('created')

  } catch (e) {

    console.error(e)

  } finally {

    loading.value = false
  }
}

const uploadFile = async (
  file: File
) => {

  const formData = new FormData()

  formData.append('file', file)

  formData.append(
    'upload_preset',
    'nihongo_unsigned'
  )

  const res = await axios.post(
    'https://api.cloudinary.com/v1_1/dxzcptxy0/image/upload',
    formData
  )

  return res.data.secure_url
}
</script>

<template>
  <div class="modal fade show d-block">
    <div class="modal-dialog">
      <div class="modal-content shadow">

        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-book me-2"></i>
            Thêm sách mới
          </h5>

          <button
            class="btn-close"
            @click="$emit('close')"
          ></button>
        </div>

        <div class="modal-body">

          <div class="mb-3">
            <label class="form-label">
              Tên sách
            </label>

            <input
              v-model="form.bookName"
              class="form-control"
              placeholder="Nhập tên sách"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">
              Thể loại
            </label>

            <select
              v-model="form.typeId"
              class="form-select"
            >
              <option
                v-for="t in types"
                :key="t.typeId"
                :value="t.typeId"
              >
                {{ t.typeName }}
              </option>
            </select>
          </div>

          <!-- LEVEL -->
          <div class="mb-3">
            <label class="form-label">
              Trình độ
            </label>

            <select
              v-model="form.levelId"
              class="form-select"
            >
              <option
                v-for="l in levels"
                :key="l.levelId"
                :value="l.levelId"
              >
                {{ l.levelName }}
              </option>
            </select>
          </div>

          <div class="mb-3">

            <label class="form-label d-block">
              Hình ảnh
            </label>

            <input
              ref="fileInputRef"
              type="file"
              multiple
              hidden
              @change="handleFiles"
            />

            <button
              type="button"
              class="btn btn-outline-primary"
              @click="openFilePicker"
            >
              <i class="bi bi-upload me-2"></i>
              Chọn ảnh
            </button>

            <div
              v-if="files.length > 0"
              class="mt-3"
            >

              <div
                v-for="(file, index) in files"
                :key="index"
                class="selected-file"
              >

                <div class="d-flex align-items-center gap-2">

                  <i class="bi bi-image text-primary"></i>

                  <span class="file-name">
                    {{ file.name }}
                  </span>

                </div>

                <button
                  class="btn btn-sm btn-danger"
                  @click="removeFile(index)"
                >
                  ✕
                </button>

              </div>

            </div>

            <div
              v-else
              class="text-muted small mt-2"
            >
              Chưa chọn file nào
            </div>

          </div>

        </div>

        <div class="modal-footer">

          <button
            class="btn btn-secondary"
            @click="$emit('close')"
          >
            Đóng
          </button>

          <button
            class="btn btn-primary"
            @click="submit"
            :disabled="loading"
          >

            <span
              v-if="loading"
              class="spinner-border spinner-border-sm me-1"
            ></span>

            Lưu sách

          </button>

        </div>

      </div>
    </div>
  </div>

  <div class="modal-backdrop fade show"></div>
</template>

<style scoped>
.selected-file {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 10px 12px;

  border: 1px solid #dee2e6;
  border-radius: 10px;

  margin-bottom: 10px;

  background: #f8f9fa;
}

.file-name {
  max-width: 250px;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: 14px;
}
</style>

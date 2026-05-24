<script setup lang="ts">
import { ref, watch } from "vue"
import axios from "axios"
import {gatewayUrl} from "@/api/authApi.ts"

interface ImageDTO {
  imageId: number
  imgUrl: string
}

const props = defineProps<{
  bookId: number
  images: ImageDTO[]
}>()

const emit = defineEmits([
  "update:images"
])

const originalImages =
  ref<ImageDTO[]>([])

const existingImages =
  ref<ImageDTO[]>([])

const newFiles =
  ref<File[]>([])

const uploadedUrls =
  ref<string[]>([])

const loading = ref(false)
const message = ref("")

watch(
  () => props.images,
  (val) => {
    if (!val) return
    originalImages.value =
      val.map(img => ({
        imageId: img.imageId,
        imgUrl: img.imgUrl
      }))

    existingImages.value =
      val.map(img => ({
        imageId: img.imageId,
        imgUrl: img.imgUrl
      }))
  },
  {
    immediate: true,
    deep: true
  }
)

const getPreviewUrl = (
  file: File
) => {
  return window.URL.createObjectURL(file)
}

const removeExistingImage = (
  imageId: number
) => {

  existingImages.value =
    existingImages.value.filter(
      img => img.imageId !== imageId
    )
}

const handleFiles = (
  e: Event
) => {

  const target =
    e.target as HTMLInputElement

  if (!target.files) return

  const files =
    Array.from(target.files)

  newFiles.value.push(...files)

  target.value = ""
}


const removeNewFile = (
  index: number
) => {

  newFiles.value.splice(index, 1)
}


const uploadFile = async (
  file: File
) => {

  const formData = new FormData()

  formData.append("file", file)

  formData.append(
    "upload_preset",
    "nihongo_unsigned"
  )

  const res = await axios.post(
    "https://api.cloudinary.com/v1_1/dxzcptxy0/image/upload",
    formData
  )

  return res.data.secure_url
}


const uploadAllImages = async () => {

  const deletedImageIds =
    originalImages.value
      .filter(oldImg => {

        const exists =
          existingImages.value.some(
            current =>
              Number(current.imageId) ===
              Number(oldImg.imageId)
          )

        return !exists
      })
      .map(img => img.imageId)

  const hasRemovedImages =
    deletedImageIds.length > 0

  const hasNewImages =
    newFiles.value.length > 0

  if (
    !hasRemovedImages &&
    !hasNewImages
  ) {

    message.value =
      "Không có thay đổi hình ảnh"

    alert(message.value)

    return
  }

  loading.value = true

  message.value = ""

  try {

    uploadedUrls.value =
      await Promise.all(
        newFiles.value.map(file =>
          uploadFile(file)
        )
      )

    const res =
      await gatewayUrl.post(
        "/api/staff/images",
        {
          bookId: props.bookId,

          listDeleteImg:
          deletedImageIds,

          listAddImg:
          uploadedUrls.value
        }
      )

    existingImages.value =
      res.data.map((img: ImageDTO) => ({
        imageId: img.imageId,
        imgUrl: img.imgUrl
      }))

    originalImages.value =
      res.data.map((img: ImageDTO) => ({
        imageId: img.imageId,
        imgUrl: img.imgUrl
      }))

    newFiles.value = []

    uploadedUrls.value = []

    emit(
      "update:images",
      existingImages.value
    )

    message.value =
      "Cập nhật hình ảnh thành công"

    alert(message.value)

  } catch (e) {

    console.error(e)

    message.value =
      "Cập nhật hình ảnh thất bại"

    alert(message.value)

  } finally {

    loading.value = false
  }
}

defineExpose({
  uploadAllImages,
  existingImages,
  uploadedUrls
})
</script>

<template>

  <div>

    <!-- HEADER -->
    <div
      class="d-flex justify-content-between align-items-center mb-3"
    >

      <h6 class="fw-bold mb-0">
        🖼 Quản lý hình ảnh
      </h6>

      <label
        class="btn btn-primary btn-sm"
      >

        <i class="bi bi-plus-circle me-1"></i>

        Thêm ảnh

        <input
          type="file"
          multiple
          hidden
          @change="handleFiles"
        />

      </label>

    </div>

    <!-- CURRENT IMAGES -->
    <div
      v-if="existingImages.length"
      class="mb-4"
    >

      <div class="section-title">
        Ảnh hiện tại
      </div>

      <div class="image-grid">

        <div
          v-for="img in existingImages"
          :key="img.imageId"
          class="image-card"
        >

          <img
            :src="img.imgUrl"
            class="preview-image"
            alt="image"
          />

          <div class="image-overlay">

            <button
              class="delete-btn"
              @click="
                removeExistingImage(
                  img.imageId
                )
              "
            >
              ✕
            </button>

          </div>

        </div>

      </div>

    </div>

    <!-- NEW FILES -->
    <div
      v-if="newFiles.length"
    >

      <div class="section-title">
        Ảnh mới
      </div>

      <div class="image-grid">

        <div
          v-for="(file, index) in newFiles"
          :key="index"
          class="image-card"
        >

          <img
            :src="
              getPreviewUrl(file)
            "
            class="preview-image"
            alt="preview"
          />

          <div class="new-badge">
            Mới
          </div>

          <div class="image-overlay">

            <button
              class="delete-btn"
              @click="
                removeNewFile(index)
              "
            >
              ✕
            </button>

          </div>

          <div class="file-name">

            {{ file.name }}

          </div>

        </div>

      </div>

    </div>

    <!-- ACTION -->
    <div class="mt-4">

      <button
        class="btn btn-success"
        @click="uploadAllImages"
        :disabled="loading"
      >

        <span
          v-if="loading"
          class="spinner-border spinner-border-sm me-2"
        ></span>

        {{ loading
        ? "Đang lưu..."
        : "Lưu ảnh" }}

      </button>

    </div>

  </div>

</template>

<style scoped>

.section-title {
  font-weight: 700;

  margin-bottom: 14px;

  color: #374151;
}

.image-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fill, minmax(120px, 1fr));

  gap: 14px;
}

.image-card {
  position: relative;

  border-radius: 14px;

  overflow: hidden;

  border: 1px solid #e5e7eb;

  background: white;

  transition: 0.2s ease;
}

.image-card:hover {
  transform: translateY(-2px);

  box-shadow:
    0 8px 20px rgba(0,0,0,0.08);
}

.preview-image {
  width: 100%;
  height: 120px;

  object-fit: cover;

  display: block;
}

.image-overlay {
  position: absolute;
  inset: 0;

  background:
    rgba(0,0,0,0.35);

  opacity: 0;

  display: flex;
  justify-content: center;
  align-items: center;

  transition: 0.2s ease;
}

.image-card:hover
.image-overlay {
  opacity: 1;
}

.delete-btn {
  width: 38px;
  height: 38px;

  border: none;
  border-radius: 50%;

  background: #dc3545;

  color: white;

  font-size: 18px;
  font-weight: bold;

  cursor: pointer;

  transition: 0.2s ease;
}

.delete-btn:hover {
  transform: scale(1.08);
}


.file-name {
  padding: 8px;

  font-size: 11px;

  text-align: center;

  color: #6b7280;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.new-badge {
  position: absolute;

  top: 8px;
  left: 8px;

  background: #198754;

  color: white;

  font-size: 10px;
  font-weight: 700;

  padding: 4px 8px;

  border-radius: 999px;
}

</style>

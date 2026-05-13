<script setup lang="ts">
import {ref, watch} from "vue"
import axios from "axios"
import gatewayUrl from "@/api/authApi.ts";

interface ImageDTO {
  imageId: number
  imgUrl: string
}

const props = defineProps<{
  bookId: number
  images: ImageDTO[]
}>()

const originalImages =
  ref<ImageDTO[]>([])

const emit = defineEmits([
  "update:images"
])

const existingImages = ref<ImageDTO[]>([])

const newFiles = ref<File[]>([])

const uploadedUrls = ref<string[]>([])

const loading = ref(false)

const message = ref("")


watch(
  () => props.images,
  (val) => {

    existingImages.value = [...val]

    originalImages.value = [...val]

  },
  { immediate: true }
)

const removeExistingImage = (
  imageId: number
) => {

  existingImages.value =
    existingImages.value.filter(
      img => img.imageId !== imageId
    )
  emit(
    "update:images",
    existingImages.value
  )
}

const handleFiles = (
  e: Event
) => {

  const target =
    e.target as HTMLInputElement

  if (!target.files) return

  newFiles.value.push(
    ...Array.from(target.files)
  )
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
      .filter(
        oldImg =>
          !existingImages.value.some(
            current =>
              current.imageId === oldImg.imageId
          )
      )
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

    /* =========================
       UPLOAD CLOUDINARY
    ========================= */

    uploadedUrls.value =
      await Promise.all(
        newFiles.value.map(file =>
          uploadFile(file)
        )
      )

    /* =========================
       CALL API
    ========================= */

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

    /* =========================
       UPDATE UI
    ========================= */

    existingImages.value =
      res.data

    originalImages.value =
      [...res.data]

    newFiles.value = []

    emit(
      "update:images",
      res.data
    )

    message.value =
      "Cập nhật hình ảnh thành công"

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

    <!-- EXISTING IMAGES -->
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

        Lưu ảnh

      </button>

    </div>

  </div>

</template>

<style scoped>

/* =========================
   SECTION
========================= */

.section-title {
  font-weight: 700;

  margin-bottom: 14px;

  color: #374151;
}

/* =========================
   GRID
========================= */

.image-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fill, minmax(140px, 1fr));

  gap: 16px;
}

/* =========================
   CARD
========================= */

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

  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

/* =========================
   IMAGE
========================= */

.preview-image {
  width: 100%;
  height: 150px;

  object-fit: cover;

  display: block;
}

/* =========================
   OVERLAY
========================= */

.image-overlay {
  position: absolute;
  inset: 0;

  background: rgba(0, 0, 0, 0.35);

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

/* =========================
   DELETE
========================= */

.delete-btn {
  width: 42px;
  height: 42px;

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

/* =========================
   FILE NAME
========================= */

.file-name {
  padding: 10px;

  font-size: 12px;

  text-align: center;

  color: #6b7280;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* =========================
   BADGE
========================= */

.new-badge {
  position: absolute;

  top: 10px;
  left: 10px;

  background: #198754;

  color: white;

  font-size: 11px;
  font-weight: 700;

  padding: 4px 10px;

  border-radius: 999px;
}

</style>

<script setup lang="ts">
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount
} from "vue"

import axios from "axios"

import { gatewayUrl } from "@/api/authApi"

interface Grammar {
  grammarId: number
  title: string
  description: string
  imageUrl?: string
}

const props = defineProps<{
  lessonId: number
  grammar?: Grammar | null
}>()

const emit = defineEmits<{
  close: []
  saved: [grammarId: number]
}>()

const fileInputRef =
  ref<HTMLInputElement | null>(null)

const imageFile =
  ref<File | null>(null)

const imagePreview =
  ref("")

const isHoveringUpload =
  ref(false)

/**
 * Loading state
 */
const isSaving =
  ref(false)

const grammarForm = ref({
  title: "",
  description: "",
  imageUrl: ""
})

/**
 * Cleanup object URL
 */
const revokePreviewUrl = () => {

  if (
    imagePreview.value &&
    imagePreview.value.startsWith("blob:")
  ) {
    URL.revokeObjectURL(
      imagePreview.value
    )
  }
}

/**
 * Load grammar data when editing
 */
watch(
  () => props.grammar,
  grammar => {

    revokePreviewUrl()

    if (grammar) {

      grammarForm.value = {
        title: grammar.title,
        description:
        grammar.description,
        imageUrl:
          grammar.imageUrl || ""
      }

      imagePreview.value =
        grammar.imageUrl || ""

      imageFile.value = null

    } else {

      grammarForm.value = {
        title: "",
        description: "",
        imageUrl: ""
      }

      imagePreview.value = ""

      imageFile.value = null
    }
  },
  {
    immediate: true
  }
)

/**
 * Open file picker
 */
const openFilePicker = () => {

  if (isSaving.value) {
    return
  }

  fileInputRef.value?.click()
}

/**
 * Handle file selection
 */
const handleFile = (
  e: Event
) => {

  if (isSaving.value) {
    return
  }

  const target =
    e.target as HTMLInputElement

  const file =
    target.files?.[0]

  if (!file) {
    return
  }

  revokePreviewUrl()

  imageFile.value = file

  imagePreview.value =
    URL.createObjectURL(file)
}

/**
 * Upload image to Cloudinary
 */
const uploadImage = async (
  file: File
) => {

  const formData =
    new FormData()

  formData.append(
    "file",
    file
  )

  formData.append(
    "upload_preset",
    "nihongo_unsigned"
  )

  const res =
    await axios.post(
      "https://api.cloudinary.com/v1_1/dxzcptxy0/image/upload",
      formData
    )

  return res.data.secure_url
}

/**
 * Save grammar
 */
const saveGrammar =
  async () => {

    /**
     * Prevent double click
     */
    if (isSaving.value) {
      return
    }

    try {

      isSaving.value = true

      let imageUrl =
        grammarForm.value.imageUrl

      /**
       * Upload new image if selected
       */
      if (imageFile.value) {

        imageUrl =
          await uploadImage(
            imageFile.value
          )
      }

      const payload = {

        title:
        grammarForm.value.title,

        description:
        grammarForm.value.description,

        imageUrl,

        lessonId:
        props.lessonId
      }

      /**
       * Update grammar
       */
      if (props.grammar) {

        const res =
          await gatewayUrl.put(
            "/api/staff/grammars",
            {
              grammarId:
              props.grammar
                .grammarId,

              ...payload
            }
          )

        emit(
          "saved",
          res.data.grammarId
        )

      }

      /**
       * Create grammar
       */
      else {

        const res =
          await gatewayUrl.post(
            "/api/staff/grammars",
            payload
          )

        emit(
          "saved",
          res.data.grammarId
        )
      }

    } catch (e) {

      console.error(
        "Save grammar error:",
        e
      )

      alert(
        "Lưu grammar thất bại"
      )

    } finally {

      /**
       * Always unlock button
       * even when API/upload fails
       */
      isSaving.value = false
    }
  }

/**
 * Handle paste image
 */
const handlePaste = (
  e: ClipboardEvent
) => {

  if (
    isSaving.value ||
    !isHoveringUpload.value
  ) {
    return
  }

  const items =
    e.clipboardData?.items

  if (!items) {
    return
  }

  for (
    const item of items
    ) {

    if (
      item.type.startsWith(
        "image/"
      )
    ) {

      const file =
        item.getAsFile()

      if (!file) {
        continue
      }

      revokePreviewUrl()

      imageFile.value =
        file

      imagePreview.value =
        URL.createObjectURL(
          file
        )

      e.preventDefault()

      return
    }
  }
}

/**
 * Prevent closing while saving
 */
const closeModal = () => {

  if (isSaving.value) {
    return
  }

  emit("close")
}

onMounted(() => {

  window.addEventListener(
    "paste",
    handlePaste
  )
})

onBeforeUnmount(() => {

  window.removeEventListener(
    "paste",
    handlePaste
  )

  revokePreviewUrl()
})
</script>

<template>

  <div class="modal-backdrop">

    <div class="grammar-modal">

      <!-- ================================= -->
      <!-- LOADING BAR -->
      <!-- ================================= -->

      <div
        v-if="isSaving"
        class="loading-bar"
      >
        <div class="loading-bar-progress"></div>
      </div>


      <!-- ================================= -->
      <!-- HEADER -->
      <!-- ================================= -->

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
          :disabled="isSaving"
          @click="closeModal"
        >
          ✕
        </button>

      </div>


      <!-- ================================= -->
      <!-- TITLE -->
      <!-- ================================= -->

      <input
        v-model="grammarForm.title"
        class="form-control mb-3"
        placeholder="Tiêu đề grammar"
        :disabled="isSaving"
      >


      <!-- ================================= -->
      <!-- IMAGE UPLOAD -->
      <!-- ================================= -->

      <div class="image-upload-section">

        <label class="upload-label">
          Cấu trúc ngữ pháp
        </label>

        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          hidden
          :disabled="isSaving"
          @change="handleFile"
        >

        <div
          class="upload-card"
          :class="{
            'upload-disabled':
              isSaving
          }"
          @mouseenter="
            isHoveringUpload = true
          "
          @mouseleave="
            isHoveringUpload = false
          "
          @click="openFilePicker"
        >

          <!-- Empty -->
          <template
            v-if="!imagePreview"
          >

            <div class="upload-placeholder">

              <div class="upload-icon">
                🖼️
              </div>

              <div class="upload-title">
                Chọn ảnh cấu trúc
              </div>

              <div class="upload-subtitle">
                JPG, PNG, WEBP
              </div>

            </div>

          </template>


          <!-- Preview -->
          <template v-else>

            <img
              :src="imagePreview"
              class="preview-image"
              alt=""
            >

            <button
              type="button"
              class="change-image-btn"
              :disabled="isSaving"
              @click.stop="openFilePicker"
            >
              ✏️
            </button>

          </template>

        </div>

      </div>


      <!-- ================================= -->
      <!-- DESCRIPTION -->
      <!-- ================================= -->

      <textarea
        v-model="
          grammarForm.description
        "
        rows="4"
        class="form-control mt-3"
        placeholder="Mô tả"
        :disabled="isSaving"
      />


      <!-- ================================= -->
      <!-- ACTIONS -->
      <!-- ================================= -->

      <div class="modal-actions">

        <button
          class="cancel-btn"
          :disabled="isSaving"
          @click="closeModal"
        >
          Hủy
        </button>


        <button
          class="save-btn"
          :class="{
            'save-loading':
              isSaving
          }"
          :disabled="isSaving"
          @click="saveGrammar"
        >

          <span
            v-if="isSaving"
            class="spinner"
          ></span>

          <span>
            {{
              isSaving
                ? "Đang lưu..."
                : "Lưu"
            }}
          </span>

        </button>

      </div>

    </div>

  </div>

</template>

<style>

/* =========================================
   MODAL
========================================= */

.modal-backdrop {

  padding: 16px;

  position: fixed;

  inset: 0;

  background:
    rgba(
      15,
      23,
      42,
      0.45
    );

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 9999;

  backdrop-filter:
    blur(6px);
}

.grammar-modal {

  position: relative;

  display: flex;

  flex-direction: column;

  width:
    min(
      900px,
      calc(100vw - 32px)
    );

  max-height:
    calc(100vh - 32px);

  background: white;

  border-radius: 24px;

  padding: 24px;

  overflow: hidden;
}


/* =========================================
   LOADING BAR
========================================= */

.loading-bar {

  position: absolute;

  top: 0;

  left: 0;

  right: 0;

  height: 4px;

  overflow: hidden;

  background:
    #e2e8f0;

  z-index: 100;
}

.loading-bar-progress {

  width: 40%;

  height: 100%;

  background:
    linear-gradient(
      90deg,
      #4f8cff,
      #7b61ff,
      #4f8cff
    );

  animation:
    loadingProgress
    1.2s
    ease-in-out
    infinite;
}

@keyframes loadingProgress {

  0% {
    transform:
      translateX(-120%);
  }

  50% {
    transform:
      translateX(120%);
  }

  100% {
    transform:
      translateX(300%);
  }
}


/* =========================================
   HEADER
========================================= */

.modal-header {

  display: flex;

  justify-content:
    space-between;

  align-items:
    center;

  margin-bottom: 24px;
}

.modal-header h4 {

  margin: 0;

  font-size: 24px;

  font-weight: 700;

  color: #1e293b;
}

.close-btn {

  width: 42px;

  height: 42px;

  border: none;

  border-radius: 12px;

  background:
    #f1f5f9;

  color:
    #475569;

  font-size: 18px;

  transition:
    all 0.2s ease;
}

.close-btn:hover:not(:disabled) {

  background:
    #e2e8f0;
}

.close-btn:disabled {

  opacity: 0.5;

  cursor:
    not-allowed;
}


/* =========================================
   FORM
========================================= */

.form-control {

  border-radius: 16px;

  border:
    1px solid
    #dbe3ee;

  padding:
    12px 16px;

  transition:
    all 0.2s ease;
}

.form-control:focus {

  box-shadow:
    0 0 0 4px
    rgba(
      79,
      140,
      255,
      0.1
    );

  border-color:
    #4f8cff;
}

.form-control:disabled {

  background:
    #f8fafc;

  cursor:
    not-allowed;

  opacity:
    0.7;
}


/* =========================================
   IMAGE UPLOAD
========================================= */

.image-upload-section {

  margin-bottom: 24px;
}

.upload-label {

  display: block;

  margin-bottom: 12px;

  font-size: 15px;

  font-weight: 600;

  color: #334155;
}

.upload-card {

  position: relative;

  width: 100%;

  min-height: 180px;

  border:
    2px dashed
    #dbe3ee;

  border-radius: 18px;

  background:
    #fafcff;

  cursor: pointer;

  transition:
    all .2s ease;

  overflow: hidden;

  outline: none;

  display: flex;

  align-items: center;

  justify-content: center;
}

.upload-card:hover {

  border-color:
    #4f8cff;

  background:
    #f8fbff;
}

.upload-card.upload-disabled {

  cursor:
    not-allowed;

  opacity:
    0.65;

  pointer-events:
    none;
}

.upload-placeholder {

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  min-height: 220px;

  width: 100%;

  text-align: center;
}

.upload-icon {

  font-size: 48px;

  margin-bottom: 10px;
}

.upload-title {

  font-size: 17px;

  font-weight: 700;

  color:
    #1e293b;
}

.upload-subtitle {

  margin-top: 6px;

  color:
    #94a3b8;

  font-size: 13px;
}


/* =========================================
   IMAGE PREVIEW
========================================= */

.preview-image {

  display: block;

  width: auto;

  height: auto;

  max-width: 100%;

  max-height: 40vh;

  margin: auto;

  object-fit: contain;
}


/* =========================================
   CHANGE IMAGE
========================================= */

.change-image-btn {

  position: absolute;

  top: 12px;

  right: 12px;

  width: 42px;

  height: 42px;

  border: none;

  border-radius: 50%;

  background:
    #2563eb;

  color: white;

  font-size: 18px;

  display: flex;

  align-items: center;

  justify-content: center;

  box-shadow:
    0 8px 20px
    rgba(
      37,
      99,
      235,
      0.35
    );

  transition:
    all .2s ease;

  z-index: 20;
}

.change-image-btn:hover:not(:disabled) {

  transform:
    scale(1.05);
}

.change-image-btn:disabled {

  cursor:
    not-allowed;

  opacity:
    0.5;
}


/* =========================================
   ACTIONS
========================================= */

.modal-actions {

  display: flex;

  justify-content:
    flex-end;

  gap: 12px;

  margin-top: 24px;
}

.cancel-btn {

  border: none;

  padding:
    12px 22px;

  border-radius:
    14px;

  background:
    #eef2f7;

  color:
    #475569;

  font-weight: 700;

  transition:
    all .2s ease;
}

.cancel-btn:hover:not(:disabled) {

  background:
    #e2e8f0;
}

.cancel-btn:disabled {

  opacity:
    0.5;

  cursor:
    not-allowed;
}


/* =========================================
   SAVE BUTTON
========================================= */

.save-btn {

  border: none;

  padding:
    12px 22px;

  border-radius:
    14px;

  background:
    linear-gradient(
      135deg,
      #4f8cff,
      #7b61ff
    );

  color: white;

  font-weight: 700;

  box-shadow:
    0 10px 24px
    rgba(
      79,
      140,
      255,
      0.25
    );

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 9px;

  min-width: 110px;

  transition:
    all .2s ease;
}

.save-btn:hover:not(:disabled) {

  transform:
    translateY(-1px);
}

.save-btn:disabled {

  cursor:
    not-allowed;

  opacity:
    0.75;

  transform:
    none;
}

.save-btn.save-loading {

  cursor:
    wait;
}


/* =========================================
   SPINNER
========================================= */

.spinner {

  width: 16px;

  height: 16px;

  border:
    2px solid
    rgba(
      255,
      255,
      255,
      0.4
    );

  border-top-color:
    white;

  border-radius:
    50%;

  animation:
    spinnerRotate
    .7s
    linear
    infinite;
}

@keyframes spinnerRotate {

  to {

    transform:
      rotate(360deg);
  }
}


/* =========================================
   RESPONSIVE
========================================= */

@media (max-width: 768px) {

  .grammar-modal {

    width: 96vw;

    padding: 18px;
  }

  .modal-actions {

    flex-direction:
      column;
  }

  .save-btn,
  .cancel-btn {

    width: 100%;
  }
}

</style>

<script setup lang="ts">
import {
  ref,
  watch,
  nextTick
} from "vue"
import axios from "axios"

import {gatewayUrl} from "@/api/authApi"

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
  saved: []
}>()

const fileInputRef =
  ref<HTMLInputElement | null>(null)

const imageFile =
  ref<File | null>(null)

const imagePreview =
  ref("")

const grammarForm = ref({
  title: "",
  description: "",
  imageUrl: ""
})

watch(
  () => props.grammar,
  grammar => {

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
const openFilePicker = () => {
  fileInputRef.value?.click()
}

const handleFile = (
  e: Event
) => {

  const target =
    e.target as HTMLInputElement

  if (!target.files?.length) {
    return
  }

  imageFile.value =
    target.files[0]

  imagePreview.value =
    URL.createObjectURL(
      imageFile.value
    )
}
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

const saveGrammar =
  async () => {

    try {

      let imageUrl =
        grammarForm.value.imageUrl

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

      if (props.grammar) {

        await gatewayUrl.put(
          "/api/staff/grammars",
          {
            grammarId:
            props.grammar
              .grammarId,

            ...payload
          }
        )

      } else {

        await gatewayUrl.post(
          "/api/staff/grammars",
          payload
        )
      }

      emit("saved")

    } catch (e) {

      console.error(e)

      alert(
        "Lưu grammar thất bại"
      )
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

      <div class="image-upload-section">

        <label class="upload-label">
          Cấu trúc ngữ pháp
        </label>

        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          hidden
          @change="handleFile"
        >

        <div
          class="upload-card"
          @click="openFilePicker"
        >

          <template v-if="!imagePreview">

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

          <template v-else>

            <img
              :src="imagePreview"
              class="preview-image"
              alt=""
            >

            <button
              type="button"
              class="change-image-btn"
              @click.stop="openFilePicker"
            >
              ✏️
            </button>

          </template>

        </div>

      </div>

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
<style>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);

  display: flex;
  align-items: center;
  justify-content: center;

  z-index: 9999;

  backdrop-filter: blur(6px);
}

.grammar-modal {
  width: min(1100px, 92vw);
  max-height: 92vh;

  overflow-y: auto;

  background: white;

  border-radius: 28px;

  padding: 28px;

  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.12),
  0 8px 24px rgba(0, 0, 0, 0.08);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

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

  background: #f1f5f9;

  color: #475569;

  font-size: 18px;

  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e2e8f0;
}

.form-control {
  border-radius: 16px;

  border: 1px solid #dbe3ee;

  padding: 12px 16px;
}

.form-control:focus {
  box-shadow: 0 0 0 4px rgba(
    79,
    140,
    255,
    0.1
  );

  border-color: #4f8cff;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;

  gap: 12px;

  margin-top: 24px;
}

.cancel-btn {
  border: none;

  padding: 12px 22px;

  border-radius: 14px;

  background: #eef2f7;

  color: #475569;

  font-weight: 700;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.save-btn {
  border: none;

  padding: 12px 22px;

  border-radius: 14px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-weight: 700;

  box-shadow: 0 10px 24px rgba(
    79,
    140,
    255,
    0.25
  );
}

.save-btn:hover {
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .grammar-modal {
    width: 96vw;

    padding: 18px;
  }

  .modal-actions {
    flex-direction: column;
  }

  .save-btn,
  .cancel-btn {
    width: 100%;
  }
}

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

.upload-card:hover {

  border-color: #4f8cff;

  background: #f8fbff;
}

.upload-placeholder {

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  height: 260px;

  text-align: center;
}

.upload-icon {

  font-size: 56px;

  margin-bottom: 12px;
}

.upload-title {

  font-size: 18px;

  font-weight: 700;

  color: #1e293b;
}

.upload-subtitle {

  margin-top: 6px;

  color: #94a3b8;

  font-size: 14px;
}

.upload-card {

  //width: fit-content;
  width: 100%;
  max-width: 100%;

  min-width: 260px;

  min-height: 120px;

  padding: 20px;
}

.preview-image {

  max-height: 160px;

  width: auto;

  max-width: 100%;

  object-fit: contain;
}

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

  min-height: 220px;

  border: 2px dashed #dbe3ee;

  border-radius: 18px;

  background: #fafcff;

  cursor: pointer;

  transition: all .2s ease;

  overflow: hidden;
}

.upload-card:hover {

  border-color: #4f8cff;

  background: #f8fbff;
}

.upload-placeholder {

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  min-height: 220px;

  width: 100%;
}

.upload-icon {

  font-size: 48px;

  margin-bottom: 10px;
}

.upload-title {

  font-size: 17px;

  font-weight: 700;

  color: #1e293b;
}

.upload-subtitle {

  margin-top: 6px;

  color: #94a3b8;

  font-size: 13px;
}

.preview-image {

  display: block;

  width: 100%;

  max-height: 300px;

  object-fit: contain;

  padding: 20px;
}

.change-image-btn {

  position: absolute;

  top: 10px;

  right: 10px;

  border: none;

  border-radius: 10px;

  padding: 8px 12px;

  background: rgba(
    255,
    255,
    255,
    0.96
  );

  font-size: 13px;

  font-weight: 600;

  color: #334155;

  box-shadow:
    0 4px 12px rgba(
      0,
      0,
      0,
      0.12
    );

  transition: all .2s ease;

  z-index: 10;
}

.change-image-btn {

  position: absolute;

  top: 12px;

  right: 12px;

  width: 42px;

  height: 42px;

  border: none;

  border-radius: 50%;

  background: #2563eb;

  color: white;

  font-size: 18px;

  display: flex;

  align-items: center;

  justify-content: center;

  box-shadow:
    0 8px 20px rgba(
      37,
      99,
      235,
      0.35
    );

  z-index: 20;
}

</style>

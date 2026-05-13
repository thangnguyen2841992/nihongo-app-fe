<script setup lang="ts">
import {ref, watch, onMounted} from "vue"
import gatewayUrl from "@/api/authApi.ts"
import BookImageEditor from "@/components/staff/BookImageEditor.vue"

interface ImageDTO {
  imageId: number
  imgUrl: string
}

interface Book {
  bookId: number
  bookName: string
  typeName: string
  levelName: string
  typeId?: number
  levelId?: number
  imageUrls: ImageDTO[]
}

interface Type {
  typeId: number
  typeName: string
}

interface Level {
  levelId: number
  levelName: string
}

const props = defineProps<{
  book: Book
}>()

const emit = defineEmits([
  "close",
  "preview-images",
  "updated"
])


const isEditing = ref(false)
const loading = ref(false)
const types = ref<Type[]>([])
const levels = ref<Level[]>([])

const form = ref({
  bookName: "",
  typeId: null as number | null,
  levelId: null as number | null
})

onMounted(async () => {

  try {

    const [t, l] = await Promise.all([
      gatewayUrl.get("/api/staff/types"),
      gatewayUrl.get("/api/staff/levels")
    ])

    types.value = t.data
    levels.value = l.data

  } catch (e) {

    console.error(e)
  }
})

watch(
  () => props.book,
  (newBook) => {
    form.value.bookName = newBook.bookName
    const foundType = types.value.find(
      t => t.typeName === newBook.typeName
    )
    const foundLevel = levels.value.find(
      l => l.levelName === newBook.levelName
    )
    form.value.typeId =
      foundType?.typeId ?? null

    form.value.levelId =
      foundLevel?.levelId ?? null
  },
  {
    immediate: true,
    deep: true
  }
)

watch(
  [types, levels],
  () => {
    const foundType = types.value.find(
      t => t.typeName === props.book.typeName
    )
    const foundLevel = levels.value.find(
      l => l.levelName === props.book.levelName
    )
    form.value.typeId =
      foundType?.typeId ?? null
    form.value.levelId =
      foundLevel?.levelId ?? null
  },
  {
    immediate: true
  }
)


const handleUpdate = async () => {

  loading.value = true
  try {

    await gatewayUrl.put(
      `/api/staff/books/${props.book.bookId}`,
      {
        bookName: form.value.bookName,
        typeId: form.value.typeId,
        levelId: form.value.levelId
      }
    )
    emit("updated")
    isEditing.value = false
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>

  <div class="modal fade show d-block">

    <div class="modal-dialog modal-xl modal-dialog-centered">

      <div class="modal-content custom-modal shadow">

        <!-- HEADER -->
        <div class="modal-header custom-header">

          <!-- LEFT -->
          <div>

            <h5 class="modal-title fw-bold mb-1">

              <template v-if="isEditing">
                ✏️ Chỉnh sửa sách
              </template>

              <template v-else>
                📚 Chi tiết sách
              </template>

            </h5>

            <div class="sub-title">

              <template v-if="isEditing">
                Cập nhật thông tin và hình ảnh sách
              </template>

              <template v-else>
                Xem thông tin và hình ảnh sách
              </template>

            </div>

          </div>

          <!-- RIGHT -->
          <div class="header-actions">

            <!-- NORMAL -->
            <template v-if="!isEditing">

              <button
                class="edit-btn"
                @click="isEditing = true"
              >

                <i class="bi bi-pencil-square me-2"></i>

                Chỉnh sửa

              </button>

            </template>

            <!-- EDIT -->
            <template v-else>

              <button
                class="cancel-btn"
                @click="isEditing = false"
              >
                Hủy
              </button>

              <button
                class="save-btn"
                @click="handleUpdate"
                :disabled="loading"
              >

        <span
          v-if="loading"
          class="spinner-border spinner-border-sm me-2"
        ></span>

                <i
                  v-else
                  class="bi bi-check-circle-fill me-1"
                ></i>

                Lưu

              </button>

            </template>

            <!-- CLOSE -->
            <button
              class="btn-close"
              @click="$emit('close')"
            ></button>

          </div>

        </div>

        <!-- BODY -->
        <div class="modal-body">

          <!-- =========================
               NORMAL VIEW
          ========================== -->

          <template v-if="!isEditing">

            <div class="row g-4">

              <!-- IMAGE -->
              <div class="col-lg-4">

                <div class="image-card">

                  <img
                    v-if="book.imageUrls?.length"
                    :src="book.imageUrls[0]!.imgUrl"
                    class="main-image"
                    alt="book"
                    @click="$emit('preview-images', book.imageUrls)"
                  />

                  <div
                    v-else
                    class="empty-image"
                  >

                    <i class="bi bi-image"></i>

                    <span>
                      Chưa có ảnh
                    </span>

                  </div>

                </div>

              </div>

              <!-- INFO -->
              <div class="col-lg-8">

                <div class="info-container">

                  <div class="info-card">

                    <div class="info-label">
                      Tên sách
                    </div>

                    <div class="info-value">
                      {{ book.bookName }}
                    </div>

                  </div>

                  <div class="row g-3">

                    <div class="col-md-6">

                      <div class="info-card">

                        <div class="info-label">
                          Thể loại
                        </div>

                        <span class="badge info-badge">
                          {{ book.typeName }}
                        </span>

                      </div>

                    </div>

                    <div class="col-md-6">

                      <div class="info-card">

                        <div class="info-label">
                          Trình độ
                        </div>

                        <span class="badge secondary-badge">
                          {{ book.levelName }}
                        </span>

                      </div>

                    </div>

                  </div>

                  <div class="info-card">

                    <div class="info-label">
                      Số lượng ảnh
                    </div>

                    <div class="info-value">
                      {{ book.imageUrls.length }} ảnh
                    </div>

                  </div>

                </div>

              </div>

            </div>

            <!-- GALLERY -->
            <div
              v-if="book.imageUrls?.length"
              class="gallery-section"
            >

              <div class="gallery-title">

                <i class="bi bi-images me-2"></i>

                Hình ảnh sách

              </div>

              <div class="gallery-grid">

                <div
                  v-for="(img, index) in book.imageUrls"
                  :key="img.imageId"
                  class="gallery-item"
                >

                  <img
                    :src="img.imgUrl"
                    class="gallery-image"
                    @click="$emit('preview-images', book.imageUrls, index)"
                  />

                  <div
                    class="gallery-overlay"
                    @click="$emit('preview-images', book.imageUrls, index)"
                  >

                    <i class="bi bi-zoom-in"></i>

                  </div>

                </div>

              </div>

            </div>

          </template>

          <!-- =========================
               EDIT MODE
          ========================== -->

          <template v-else>

            <div class="edit-layout">

              <!-- LEFT -->
              <div class="edit-info-section">

                <div class="edit-section-title">
                  <i class="bi bi-info-circle me-2"></i>
                  Thông tin sách
                </div>

                <!-- BOOK NAME -->
                <div class="edit-card">

                  <label class="form-label">
                    Tên sách
                  </label>

                  <input
                    v-model="form.bookName"
                    class="form-control custom-input"
                    placeholder="Nhập tên sách"
                  />

                </div>

                <!-- TYPE -->
                <div class="edit-card">

                  <label class="form-label">
                    Thể loại
                  </label>

                  <select
                    v-model="form.typeId"
                    class="form-select custom-input"
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
                <div class="edit-card">

                  <label class="form-label">
                    Trình độ
                  </label>

                  <select
                    v-model="form.levelId"
                    class="form-select custom-input"
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

              </div>

              <!-- RIGHT -->
              <div class="edit-image-section">

                <BookImageEditor
                  :book-id="book.bookId"
                  :images="book.imageUrls"
                  @update:images="
    book.imageUrls = $event
  "
                />

              </div>

            </div>

          </template>

        </div>

      </div>

    </div>

  </div>

  <!-- BACKDROP -->
  <div class="modal-backdrop fade show"></div>

</template>

<style scoped>

/* =========================
   MODAL
========================= */

.custom-modal {
  border: none;
  border-radius: 24px;
  overflow: hidden;
}

/* =========================
   HEADER
========================= */

.custom-header {
  padding: 22px 26px;
  border-bottom: 1px solid #f1f3f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.sub-title {
  font-size: 13px;
  color: #6b7280;
}

.edit-btn,
.save-btn,
.cancel-btn {
  border: none;
  border-radius: 14px;
  padding: 10px 16px;
  font-weight: 600;
  transition: 0.2s ease;
}

.edit-btn {
  background: linear-gradient(
    135deg,
    #0d6efd,
    #3d8bfd
  );

  color: white;
}

.save-btn {
  background: linear-gradient(
    135deg,
    #16a34a,
    #22c55e
  );

  color: white;
}

.cancel-btn {
  background: #eef1f4;
  color: #374151;
}

.edit-btn:hover,
.save-btn:hover,
.cancel-btn:hover {
  transform: translateY(-2px);
}


.image-card {
  background: #f8fafc;
  border-radius: 18px;
  padding: 14px;
}

.main-image {
  width: 100%;
  height: 420px;
  object-fit: cover;
  border-radius: 16px;
  cursor: pointer;
  transition: 0.25s ease;
}

.main-image:hover {
  transform: scale(1.02);
}

.empty-image {
  height: 420px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  color: #9ca3af;
}

.empty-image i {
  font-size: 42px;
}

.info-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.info-card {
  background: #f8fafc;
  border-radius: 18px;
  padding: 18px;
}

.info-label {
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.info-value {
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

/* =========================
   BADGES
========================= */

.badge {
  padding: 9px 15px;
  border-radius: 999px;
  font-size: 14px;
}

.info-badge {
  background: #dbeafe;
  color: #1d4ed8;
}

.secondary-badge {
  background: #ede9fe;
  color: #6d28d9;
}

/* =========================
   GALLERY
========================= */

.gallery-section {
  margin-top: 40px;
}

.gallery-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 18px;
}

.gallery-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fill, minmax(150px, 1fr));

  gap: 16px;
}

.gallery-item {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
}

.gallery-image {
  width: 100%;
  height: 150px;

  object-fit: cover;

  transition: 0.25s ease;
}

.gallery-overlay {
  position: absolute;
  inset: 0;

  background: rgba(0, 0, 0, 0.45);

  display: flex;
  justify-content: center;
  align-items: center;

  opacity: 0;

  transition: 0.25s ease;

  cursor: pointer;
}

.gallery-overlay i {
  color: white;
  font-size: 28px;
}

.gallery-item:hover .gallery-overlay {
  opacity: 1;
}

.gallery-item:hover .gallery-image {
  transform: scale(1.05);
}

/* =========================
   EDIT MODE
========================= */

.edit-layout {
  display: grid;

  grid-template-columns:
    380px 1fr;

  gap: 24px;
}

.edit-section-title {
  font-size: 18px;
  font-weight: 700;

  margin-bottom: 18px;

  display: flex;
  align-items: center;
}

.edit-info-section,
.edit-image-section {
  background: #f8fafc;

  border-radius: 20px;

  padding: 20px;
}

.edit-card {
  background: white;

  border-radius: 16px;

  padding: 18px;

  margin-bottom: 18px;

  border: 1px solid #edf1f5;
}

.custom-input {
  min-height: 48px;

  border-radius: 12px;

  border: 1px solid #dbe1e8;
}

.custom-input:focus {
  box-shadow: none;
  border-color: #0d6efd;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 992px) {

  .edit-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {

  .main-image,
  .empty-image {
    height: 280px;
  }

  .gallery-image {
    height: 120px;
  }
}

</style>

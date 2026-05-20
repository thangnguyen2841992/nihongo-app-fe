<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

import CreateBookModal from "@/components/staff/CreateBookModal.vue"
import ImagePreviewModal from "@/components/common/ImagePreviewModal.vue"
import BookDetailModal from "@/components/staff/BookDetailModal.vue"
import CreateLessonModal from "@/components/staff/CreateLessonModal.vue"


import gatewayUrl from "@/api/authApi.ts"

/* =========================
   ROUTER
========================= */

const router = useRouter()

/* =========================
   TYPES
========================= */

interface ImageDTO {
  imageId: number
  imgUrl: string
}

interface Book {
  bookId: number
  bookName: string
  typeName: string
  levelName: string
  imageUrls: ImageDTO[]
}

/* =========================
   STATE
========================= */

const books = ref<Book[]>([])

const showModal = ref(false)

/* =========================
   IMAGE MODAL
========================= */

const showImageModal = ref(false)

const selectedImages = ref<ImageDTO[]>([])

const selectedIndex = ref(0)

const openImageModal = (
  images: ImageDTO[],
  index = 0
) => {
  selectedImages.value = images
  selectedIndex.value = index
  showImageModal.value = true
}

/* =========================
   BOOK DETAIL MODAL
========================= */

const showBookDetailModal =
  ref(false)

const selectedBook =
  ref<Book | null>(null)

const openBookDetail = (
  book: Book
) => {
  selectedBook.value = book
  showBookDetailModal.value = true
}

/* =========================
   FETCH BOOKS
========================= */

const fetchBooks = async () => {
  try {

    const res =
      await gatewayUrl.get(
        "/api/staff/books"
      )

    books.value = res.data

  } catch (e) {

    console.error(e)

    alert("Không thể tải danh sách sách")
  }
}

onMounted(fetchBooks)

/* =========================
   CREATE BOOK
========================= */

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const onCreated = () => {

  fetchBooks()

  closeModal()
}

/* =========================
   ADD LESSON
========================= */

const showLessonModal =
  ref(false)

const selectedBookWhenCreateLesson =
  ref<Book | null>(null)

const addLesson = (
  book: Book
) => {

  selectedBookWhenCreateLesson.value =
    book

  showLessonModal.value =
    true
}

const closeLessonModal =
  () => {

    showLessonModal.value =
      false

    selectedBookWhenCreateLesson.value =
      null
  }

/* =========================
   DELETE BOOK
========================= */

const deleteBook = async (
  bookId: number
) => {

  const confirmed = confirm(
    "Bạn có chắc chắn muốn xóa sách này?"
  )

  if (!confirmed) return

  try {

    await gatewayUrl.delete(
      `/api/staff/books/${bookId}`
    )

    books.value =
      books.value.filter(
        b => b.bookId !== bookId
      )

    alert("Xóa sách thành công")

  } catch (e) {

    console.error(e)

    alert("Xóa sách thất bại")
  }
}
</script>

<template>
  <div class="container mt-4">

    <!-- HEADER -->
    <div
      class="d-flex justify-content-between align-items-center mb-3"
    >

      <h3 class="fw-bold">
        📚 Quản lý sách
      </h3>

      <button
        class="btn btn-primary"
        @click="openModal"
      >
        <i class="bi bi-plus-circle me-1"></i>
        Thêm sách
      </button>

    </div>

    <!-- TABLE -->
    <div class="card shadow-sm border-0">

      <div class="card-body">

        <table
          class="table table-hover align-middle"
        >

          <thead class="table-light">

          <tr>

            <th width="70">
              STT
            </th>

            <th width="100">
              Ảnh
            </th>

            <th>
              Tên sách
            </th>

            <th width="150">
              Thể loại
            </th>

            <th width="120">
              Trình độ
            </th>

            <th width="120">
              Thao tác
            </th>

          </tr>

          </thead>

          <tbody>

          <tr
            v-for="(b, index) in books"
            :key="b.bookId"
          >

            <!-- STT -->
            <td>
              {{ index + 1 }}
            </td>

            <!-- IMAGE -->
            <td>

              <div
                v-if="
                  b.imageUrls &&
                  b.imageUrls.length > 0
                "
                class="thumbnail-wrapper"
                @click="
                  openImageModal(
                    b.imageUrls
                  )
                "
              >

                <img
                  :src="
                    b.imageUrls[0]!.imgUrl
                  "
                  alt="book"
                  class="book-thumbnail"
                />

                <!-- OVERLAY -->
                <div
                  class="thumbnail-overlay"
                >
                  👁 Xem ảnh
                </div>

              </div>

              <span
                v-else
                class="text-muted small"
              >
                Chưa có ảnh
              </span>

            </td>

            <!-- NAME -->
            <td>

              <span
                class="book-name"
                @click="
                  openBookDetail(b)
                "
              >
                {{ b.bookName }}
              </span>

            </td>

            <!-- TYPE -->
            <td>

              <span
                class="badge bg-info-subtle text-info-emphasis px-3 py-2"
              >
                {{ b.typeName }}
              </span>

            </td>

            <!-- LEVEL -->
            <td>

              <span
                class="badge bg-secondary-subtle text-secondary-emphasis px-3 py-2"
              >
                {{ b.levelName }}
              </span>

            </td>

            <!-- ACTIONS -->
            <td>

              <div
                class="action-buttons"
              >

                <!-- ADD LESSON -->
                <button
                  class="action-btn add-btn"
                  @click="
                    addLesson(
                      b
                    )
                  "
                  title="Thêm bài học"
                >
                  <i
                    class="bi bi-journal-plus"
                  ></i>
                </button>

                <!-- DELETE -->
                <button
                  class="action-btn delete-btn"
                  @click="
                    deleteBook(
                      b.bookId
                    )
                  "
                  title="Xóa sách"
                >
                  <i
                    class="bi bi-trash"
                  ></i>
                </button>

              </div>

            </td>

          </tr>

          </tbody>

        </table>

        <!-- EMPTY -->
        <div
          v-if="books.length === 0"
          class="text-center text-muted py-4"
        >
          Không có sách nào
        </div>

      </div>

    </div>

    <!-- CREATE BOOK MODAL -->
    <CreateBookModal
      v-if="showModal"
      @close="closeModal"
      @created="onCreated"
    />

    <!-- IMAGE PREVIEW MODAL -->
    <ImagePreviewModal
      v-if="showImageModal"
      :images="selectedImages"
      v-model:currentIndex="selectedIndex"
      @close="
        showImageModal = false
      "
    />

    <!-- BOOK DETAIL -->
    <BookDetailModal
      v-if="
        showBookDetailModal &&
        selectedBook
      "
      :book="selectedBook"
      @close="
        showBookDetailModal = false
      "
      @preview-images="
        openImageModal
      "
    />

    <CreateLessonModal
      v-if="
    showLessonModal &&
    selectedBookWhenCreateLesson
  "
      :book-id="
    selectedBookWhenCreateLesson.bookId
  "
      :book-name="
    selectedBookWhenCreateLesson.bookName
  "
      @close="closeLessonModal"
      @created="closeLessonModal"
    />

  </div>
</template>

<style scoped>
/* =========================
   THUMBNAIL
========================= */

.thumbnail-wrapper {
  position: relative;

  width: 70px;
  height: 90px;

  overflow: hidden;

  border-radius: 10px;

  cursor: pointer;
}

.book-thumbnail {
  width: 100%;
  height: 100%;

  object-fit: cover;

  border-radius: 10px;

  border: 1px solid #e5e7eb;

  transition: transform 0.25s ease;
}

/* =========================
   IMAGE OVERLAY
========================= */

.thumbnail-overlay {
  position: absolute;
  inset: 0;

  background: rgba(0, 0, 0, 0.55);

  color: white;

  display: flex;
  justify-content: center;
  align-items: center;

  text-align: center;

  font-size: 12px;
  font-weight: 600;

  opacity: 0;

  transition: opacity 0.25s ease;

  padding: 6px;
}

.thumbnail-wrapper:hover
.thumbnail-overlay {
  opacity: 1;
}

.thumbnail-wrapper:hover
.book-thumbnail {
  transform: scale(1.06);
}

/* =========================
   BOOK NAME
========================= */

.book-name {
  font-weight: 600;

  cursor: pointer;

  color: #0d6efd;

  transition: 0.2s;
}

.book-name:hover {
  color: #0a58ca;

  text-decoration: underline;
}

/* =========================
   ACTION BUTTONS
========================= */

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn {
  width: 38px;
  height: 38px;

  border: none;
  border-radius: 12px;

  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 16px;

  cursor: pointer;

  transition: all 0.2s ease;
}

/* ADD BUTTON */

.add-btn {
  background: #e8f7ee;

  color: #198754;
}

.add-btn:hover {
  background: #198754;

  color: white;

  transform: translateY(-2px);

  box-shadow:
    0 6px 16px rgba(
      25,
      135,
      84,
      0.25
    );
}

/* DELETE BUTTON */

.delete-btn {
  background: #fdecec;

  color: #dc3545;
}

.delete-btn:hover {
  background: #dc3545;

  color: white;

  transform: translateY(-2px);

  box-shadow:
    0 6px 16px rgba(
      220,
      53,
      69,
      0.25
    );
}
</style>

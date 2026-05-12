<script setup lang="ts">
import {onMounted, ref} from "vue"
import CreateBookModal from "@/components/staff/CreateBookModal.vue"
import ImagePreviewModal from "@/components/common/ImagePreviewModal.vue"
import gatewayUrl from "@/api/authApi.ts"
import BookDetailModal from "@/components/staff/BookDetailModal.vue";

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

const books = ref<Book[]>([])
const showModal = ref(false)


// image modal
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
//

// book detail modal
const showBookDetailModal = ref(false)
const selectedBook = ref<Book | null>(null)

const openBookDetail = (book: Book) => {
  selectedBook.value = book
  showBookDetailModal.value = true
}
//

const fetchBooks = async () => {
  const res = await gatewayUrl.get("/api/staff/books")
  books.value = res.data
}

onMounted(fetchBooks)

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


</script>

<template>
  <div class="container mt-4">

    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="fw-bold">📚 Quản lý sách</h3>

      <button class="btn btn-primary" @click="openModal">
        <i class="bi bi-plus-circle me-1"></i>
        Thêm sách
      </button>
    </div>

    <!-- TABLE -->
    <div class="card shadow-sm">
      <div class="card-body">

        <table class="table table-hover align-middle">
          <thead class="table-light">
          <tr>
            <th>STT</th>
            <th>Ảnh</th>
            <th>Tên sách</th>
            <th>Thể loại</th>
            <th>Trình độ</th>
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
                v-if="b.imageUrls && b.imageUrls.length > 0"
                class="thumbnail-wrapper"
                @click="openImageModal(b.imageUrls)"
              >

                <img
                  :src="b.imageUrls[0]!.imgUrl"
                  alt="book"
                  class="book-thumbnail"
                />

                <!-- OVERLAY -->
                <div class="thumbnail-overlay">
                  👁 Xem chi tiết ảnh
                </div>

              </div>

              <span v-else class="text-muted">
    Chưa có ảnh
  </span>

            </td>

            <td>

  <span
    class="book-name"
    @click="openBookDetail(b)"
  >
    {{ b.bookName }}
  </span>

            </td>

            <!-- TYPE -->
            <td>
              <span class="badge bg-info text-dark">
                {{ b.typeName }}
              </span>
            </td>

            <!-- LEVEL -->
            <td>
              <span class="badge bg-secondary">
                {{ b.levelName }}
              </span>
            </td>

          </tr>

          </tbody>
        </table>

        <!-- EMPTY -->
        <div
          v-if="books.length === 0"
          class="text-center text-muted py-3"
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
      @close="showImageModal = false"
    />

    <BookDetailModal
      v-if="showBookDetailModal && selectedBook"
      :book="selectedBook"
      @close="showBookDetailModal = false"
      @preview-images="openImageModal"
    />

  </div>
</template>

<style scoped>
.thumbnail-wrapper {
  position: relative;

  width: 70px;
  height: 90px;

  cursor: pointer;

  overflow: hidden;

  border-radius: 8px;
}

.book-thumbnail {
  width: 100%;
  height: 100%;

  object-fit: cover;

  border-radius: 8px;

  border: 1px solid #ddd;

  transition: transform 0.25s ease;
}

/* OVERLAY */
.thumbnail-overlay {
  position: absolute;
  inset: 0;

  background: rgba(0,0,0,0.55);

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

/* HOVER */
.thumbnail-wrapper:hover .thumbnail-overlay {
  opacity: 1;
}

.thumbnail-wrapper:hover .book-thumbnail {
  transform: scale(1.06);
}

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
</style>

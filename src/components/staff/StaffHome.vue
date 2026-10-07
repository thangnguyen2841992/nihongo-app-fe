<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import CreateBookModal from "@/components/staff/CreateBookModal.vue"
import ImagePreviewModal from "@/components/common/ImagePreviewModal.vue"
import CreateLessonModal from "@/components/staff/CreateLessonModal.vue"

import { gatewayUrl } from "@/api/authApi.ts"
import { useAuthState } from "@/services/authState"

/* =========================
   ROUTER
========================= */

const router = useRouter()
const route = useRoute()
const { userRole } = useAuthState()

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
  publicationStatus: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
}

interface PublicationReview {
  bookId: number
  status: Book['publicationStatus']
  errors: string[]
  warnings: string[]
}

/* =========================
   STATE
========================= */

const books = ref<Book[]>([])
const publicationReview = ref<PublicationReview | null>(null)
const publicationBusy = ref(false)
const publicationError = ref('')
const publicationNotice = ref('')
const statusLabel = (status: Book['publicationStatus']) => ({ DRAFT: 'Bản nháp', IN_REVIEW: 'Chờ duyệt', PUBLISHED: 'Đã xuất bản' })[status]

async function inspectPublication(book: Book) {
  publicationError.value = ''
  try {
    const { data } = await gatewayUrl.get<PublicationReview>(`/api/staff/books/${book.bookId}/publication`)
    publicationReview.value = data
  } catch { publicationError.value = 'Không kiểm tra được nội dung sách.' }
}

async function changePublication(book: Book, action: 'submit' | 'publish' | 'draft') {
  if (action === 'draft' && !confirm('Chuyển về bản nháp sẽ tạm ẩn sách với học viên. Tiếp tục?')) return
  publicationBusy.value = true
  publicationError.value = ''
  publicationNotice.value = ''
  try {
    const { data } = await gatewayUrl.post<PublicationReview>(`/api/staff/books/${book.bookId}/publication/${action}`)
    publicationReview.value = data
    publicationNotice.value = action === 'submit' ? 'Đã gửi sách để duyệt.' : action === 'publish' ? 'Đã xuất bản sách.' : 'Đã chuyển sách về bản nháp.'
    await fetchBooks()
  } catch {
    await inspectPublication(book)
    publicationError.value = 'Không đổi được trạng thái. Hãy kiểm tra nội dung sách và thử lại.'
  } finally { publicationBusy.value = false }
}

const showModal = ref(false)
if (route.query.create === '1') showModal.value = true

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
   BOOK DETAIL PAGE
========================= */

const openBookDetail = (
  book: Book
) => {

  router.push(
    `/staff/books/${book.bookId}`
  )
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

    alert(
      "Không thể tải danh sách sách"
    )
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
  if (route.query.create === '1') void router.replace('/staff')
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

</script>

<template>

  <div class="container mt-4">

    <!-- HEADER -->

    <div
      class="
        d-flex
        justify-content-between
        align-items-center
        mb-3
      "
    >

      <h3 class="fw-bold">
        📚 Quản lý sách
      </h3>

      <div class="d-flex gap-2 flex-wrap">
      <RouterLink to="/staff/imports/books" class="btn btn-outline-primary">Nhập sách từ PDF</RouterLink>
      <button
        class="btn btn-primary"
        @click="openModal"
      >

        <i
          class="
            bi bi-plus-circle
            me-1
          "
        ></i>

        Thêm sách

      </button>
      </div>

    </div>

    <div v-if="publicationError" class="alert alert-danger" role="alert">{{ publicationError }}</div>
    <div v-if="publicationNotice" class="alert alert-success" role="status">{{ publicationNotice }}</div>
    <div v-if="publicationReview" class="alert alert-light border d-flex justify-content-between gap-3 align-items-start">
      <div>
        <strong>Kiểm tra sách #{{ publicationReview.bookId }}</strong>
        <p v-if="!publicationReview.errors.length && !publicationReview.warnings.length" class="mb-0">Nội dung đã sẵn sàng để gửi duyệt.</p>
        <p v-for="message in publicationReview.errors" :key="message" class="text-danger mb-1">{{ message }}</p>
        <p v-for="message in publicationReview.warnings" :key="message" class="text-warning-emphasis mb-1">{{ message }}</p>
      </div>
      <button class="btn-close" aria-label="Đóng kết quả kiểm tra" @click="publicationReview = null"></button>
    </div>

    <!-- TABLE -->

    <div
      class="
        card
        shadow-sm
        border-0
      "
    >

      <div class="card-body">

        <div class="table-responsive">

        <table
          class="
            table
            table-hover
            align-middle
          "
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

            <th width="140">Xuất bản</th>

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
                  class="
                    thumbnail-overlay
                  "
                >
                  👁 Xem ảnh
                </div>

              </div>

              <span
                v-else
                class="
                  text-muted
                  small
                "
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
                class="
                  badge
                  bg-info-subtle
                  text-info-emphasis
                  px-3
                  py-2
                "
              >
                {{ b.typeName }}
              </span>

            </td>

            <!-- LEVEL -->

            <td>

              <span
                class="
                  badge
                  bg-secondary-subtle
                  text-secondary-emphasis
                  px-3
                  py-2
                "
              >
                {{ b.levelName }}
              </span>

            </td>

            <td><span class="badge" :class="b.publicationStatus === 'PUBLISHED' ? 'bg-success' : b.publicationStatus === 'IN_REVIEW' ? 'bg-info text-dark' : 'bg-secondary'">{{ statusLabel(b.publicationStatus) }}</span></td>

            <!-- ACTIONS -->

            <td>

              <div
                class="
                  action-buttons
                "
              >

                <!-- ADD LESSON -->

                <button
                  v-if="b.publicationStatus === 'DRAFT'"
                  class="
                    action-btn
                    add-btn
                  "
                  @click="
                    addLesson(b)
                  "
                  title="
                    Thêm bài học
                  "
                >

                  <i
                    class="
                      bi
                      bi-journal-plus
                    "
                  ></i>

                </button>

              </div>

              <div class="d-flex gap-1 flex-wrap mt-2">
                <button class="btn btn-sm btn-outline-secondary" :disabled="publicationBusy" @click="inspectPublication(b)">Kiểm tra</button>
                <button v-if="b.publicationStatus === 'DRAFT'" class="btn btn-sm btn-outline-primary" :disabled="publicationBusy" @click="changePublication(b, 'submit')">Gửi duyệt</button>
                <button v-if="b.publicationStatus === 'IN_REVIEW' && userRole === 'ADMIN'" class="btn btn-sm btn-success" :disabled="publicationBusy" @click="changePublication(b, 'publish')">Xuất bản</button>
                <button v-if="b.publicationStatus !== 'DRAFT' && userRole === 'ADMIN'" class="btn btn-sm btn-outline-warning" :disabled="publicationBusy" @click="changePublication(b, 'draft')">Về bản nháp</button>
              </div>

            </td>

          </tr>

          </tbody>

        </table>

        </div>

        <!-- EMPTY -->

        <div
          v-if="books.length === 0"
          class="
            text-center
            text-muted
            py-4
          "
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
      v-model:currentIndex="
        selectedIndex
      "
      @close="
        showImageModal = false
      "
    />

    <!-- CREATE LESSON MODAL -->

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

  background:
    rgba(0, 0, 0, 0.55);

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
    0 6px 16px
    rgba(
      25,
      135,
      84,
      0.25
    );
}

</style>

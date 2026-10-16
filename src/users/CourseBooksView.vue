<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import './studyPages.css'

interface BookImage { imageId: number; imgUrl: string }
interface Book { bookId: number; bookName: string; description: string | null; imageUrls: BookImage[]; typeName: string; levelName: string }

const route = useRoute()
const router = useRouter()
const books = ref<Book[]>([])
const loading = ref(true)
const error = ref('')
const courseId = computed(() => Number(route.params.courseId))
const isN3 = computed(() => books.value.some(book => book.levelName.toUpperCase() === 'N3'))

async function loadBooks() {
  loading.value = true
  error.value = ''
  try { books.value = (await gatewayUrl.get(`/api/nihongo-user/getBooksByLevel/${courseId.value}`)).data }
  catch { error.value = 'Không tải được danh sách giáo trình. Vui lòng thử lại.' }
  finally { loading.value = false }
}

function openBook(bookId: number) {
  void router.push({ name: 'CourseBookDetail', params: { bookId }, query: { courseId: String(courseId.value) } })
}

onMounted(loadBooks)
</script>

<template>
  <div class="study-page">
    <header class="study-hero books-hero">
      <div><p class="study-eyebrow">Khóa học</p><h1>Giáo trình của bạn</h1><p>Chọn giáo trình để xem danh sách bài học và tiếp tục tiến độ gần nhất.</p></div>
      <span v-if="books.length" class="book-total"><strong>{{ books.length }}</strong> giáo trình</span>
    </header>

    <nav class="course-tools" aria-label="Công cụ khóa học">
      <RouterLink v-if="isN3" :to="`/course/${courseId}/vocabulary-flashcards`"><i class="bi bi-card-text" aria-hidden="true"></i><span><strong>Flashcard từ vựng N3</strong><small>Ôn từ theo giáo trình</small></span></RouterLink>
      <RouterLink :to="`/course/${courseId}/conversation-listening`"><i class="bi bi-headphones" aria-hidden="true"></i><span><strong>Luyện nghe hội thoại</strong><small>Dành cho gói VIP còn hạn</small></span></RouterLink>
    </nav>

    <p v-if="error" class="study-error" role="alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ error }} <button type="button" @click="loadBooks">Thử lại</button></p>
    <div v-if="loading" class="study-loading" role="status"><span class="study-spinner" aria-hidden="true"></span><span>Đang tải giáo trình...</span></div>
    <section v-else-if="!books.length && !error" class="study-empty books-empty"><span><i class="bi bi-journal-x" aria-hidden="true"></i></span><h2>Chưa có giáo trình</h2><p>Nội dung của khóa học này đang được chuẩn bị.</p><RouterLink class="study-button secondary" to="/user/my-courses">Về khóa học của tôi</RouterLink></section>

    <section v-else class="book-list" aria-label="Danh sách giáo trình">
      <article v-for="book in books" :key="book.bookId" class="book-row">
        <div class="book-cover-wrap">
          <img v-if="book.imageUrls[0]?.imgUrl" :src="book.imageUrls[0].imgUrl" class="book-cover" :alt="`Bìa ${book.bookName}`" loading="lazy" decoding="async">
          <span v-else class="book-cover-placeholder"><i class="bi bi-book" aria-hidden="true"></i></span>
        </div>
        <div class="book-info">
          <div class="book-badges"><span class="study-badge">{{ book.levelName }}</span><span class="study-badge muted">{{ book.typeName }}</span></div>
          <h2>{{ book.bookName }}</h2>
          <p>{{ book.description || 'Mở giáo trình để xem nội dung và danh sách bài học.' }}</p>
        </div>
        <button class="study-button" @click="openBook(book.bookId)"><i class="bi bi-play-circle" aria-hidden="true"></i>Học ngay</button>
      </article>
    </section>
  </div>
</template>

<style scoped>
.books-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; }.book-total { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 6px; flex-shrink: 0; padding: 10px 14px; border: 1px solid #dfd2e4; border-radius: 12px; background: #ffffffa8; color: #8b7b93; font-size: 11px; }.book-total strong { color: #725680; font-size: 19px; }
.course-tools { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin-top: 18px; }.course-tools a { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 14px 16px; border: 1px solid #e5dce8; border-radius: 14px; background: #ffffffe8; color: #6d5a77; }.course-tools a:hover { background: #f8f2fa; border-color: #d6c5dd; }.course-tools i { display: grid; place-items: center; width: 37px; height: 37px; flex-shrink: 0; border-radius: 11px; background: #efe6f2; color: #866692; }.course-tools span { display: grid; gap: 2px; min-width: 0; }.course-tools strong { font-size: 12px; }.course-tools small { color: #9a8da1; font-size: 10px; }
.book-list { display: grid; gap: 14px; margin-top: 20px; }.book-row { display: grid; grid-template-columns: 96px minmax(0,1fr) auto; align-items: center; gap: 20px; min-width: 0; padding: 18px; border: 1px solid #e5dce8; border-radius: 18px; background: #fffffff0; box-shadow: 0 7px 22px #55475e0b; }.book-cover-wrap { width: 96px; height: 126px; overflow: hidden; border-radius: 11px; background: #f0e9f2; }.book-cover { display: block; width: 100%; height: 100%; object-fit: cover; }.book-cover-placeholder { display: grid; place-items: center; width: 100%; height: 100%; color: #aa94b2; font-size: 26px; }.book-info { min-width: 0; }.book-badges { display: flex; flex-wrap: wrap; gap: 6px; }.book-badges .muted { background: #f3f1f4; color: #817886; }.book-info h2 { margin: 10px 0 7px; color: #50435e; font-size: 19px; overflow-wrap: anywhere; }.book-info p { display: -webkit-box; margin: 0; overflow: hidden; color: #85798c; font-size: 12px; line-height: 1.7; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }.book-row > .study-button { min-width: 118px; }
.books-empty { display: grid; justify-items: center; gap: 9px; margin-top: 20px; }.books-empty > span { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; background: #f0e7f3; color: #856793; font-size: 22px; }.books-empty h2,.books-empty p { margin: 0; }
@media(max-width:700px) { .course-tools { grid-template-columns: minmax(0,1fr); }.book-row { grid-template-columns: 78px minmax(0,1fr); gap: 14px; }.book-cover-wrap { width: 78px; height: 104px; }.book-row > .study-button { grid-column: 1 / -1; width: 100%; }.book-info h2 { font-size: 16px; } }
@media(max-width:500px) { .books-hero { align-items: flex-start; flex-direction: column; }.book-row { align-items: start; padding: 15px; }.book-info p { -webkit-line-clamp: 3; } }
</style>

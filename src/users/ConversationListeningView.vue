<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import './studyPages.css'
interface Course { courseId: number; courseName: string }
interface Recording { id: string; title: string; videoId: string }
const route = useRoute()
const courses = ref<Course[]>([])
const recordings = ref<Recording[]>([])
const loading = ref(false)
const error = ref('')
let request = 0
watch(() => route.params.courseId, async (courseId) => {
  const current = ++request
  loading.value = true
  error.value = ''
  recordings.value = []
  courses.value = []
  try {
    const response = await gatewayUrl.get(courseId ? `/api/nihongo-user/courses/${courseId}/conversation-listening` : '/api/nihongo-user/my-courses-dto')
    if (current === request) {
      if (courseId) recordings.value = response.data
      else courses.value = response.data
    }
  } catch (e) {
    if (current === request) {
      const status = (e as { response?: { status: number } }).response?.status
      error.value = status === 403 ? 'Luyện nghe hội thoại dành cho gói VIP còn hạn của khóa học này.' : 'Không thể tải nội dung. Vui lòng thử lại.'
    }
  } finally {
    if (current === request) loading.value = false
  }
}, { immediate: true })
</script>
<template>
  <div class="study-page">
    <header class="study-hero">
      <h1>Luyện nghe hội thoại</h1>
      <p>Nội dung theo từng khóa học, dành cho học viên mua gói VIP còn hạn.</p>
    </header>
    <section class="study-panel">
      <p v-if="loading" role="status">Đang tải nội dung...</p>
      <template v-else-if="error">
        <p role="alert">{{ error }}</p>
        <RouterLink class="study-button secondary" to="/courses">Xem các gói khóa học</RouterLink>
      </template>
      <template v-else-if="!route.params.courseId">
        <h2>Chọn khóa học để luyện nghe</h2>
        <p>Gói VIP của khóa nào mở nội dung hội thoại của khóa đó. Các bản ghi hiện có thuộc khóa N3.</p>
        <div class="course-links">
          <RouterLink v-for="course in courses" :key="course.courseId" class="study-button secondary" :to="`/course/${course.courseId}/conversation-listening`">{{ course.courseName }}</RouterLink>
        </div>
        <RouterLink v-if="!courses.length" class="study-button secondary" to="/courses">Khám phá khóa học VIP</RouterLink>
      </template>
      <template v-else>
        <RouterLink :to="`/course/${route.params.courseId}/books`">Quay lại khóa học</RouterLink>
        <p v-if="!recordings.length">Khóa học này chưa có bản ghi hội thoại. Nội dung sẽ được bổ sung sau.</p>
        <article v-for="recording in recordings" :key="recording.id">
          <h2>{{ recording.title }}</h2>
          <div class="conversation-video">
            <iframe :src="`https://www.youtube-nocookie.com/embed/${recording.videoId}`" :title="recording.title" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
          <p>Nghe một lượt, sau đó nghe lại từng đoạn và ghi lại những từ hoặc câu bạn chưa hiểu.</p>
          <a class="study-button secondary" :href="`https://www.youtube.com/watch?v=${recording.videoId}`" target="_blank" rel="noopener noreferrer">Mở video trên YouTube</a>
        </article>
      </template>
    </section>
  </div>
</template>
<style scoped>
.study-panel { margin-top: 20px; }
.course-links { display: flex; flex-wrap: wrap; gap: 12px; }
.conversation-video { margin: 16px 0; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 12px; background: #111827; }
.conversation-video iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>

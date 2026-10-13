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
async function load(courseId: string | string[] | undefined = route.params.courseId) {
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
}
watch(() => route.params.courseId, courseId => void load(courseId), { immediate: true })
</script>
<template>
  <div class="study-page">
    <header class="study-hero listening-hero">
      <div><p class="study-eyebrow">Luyện tập</p><h1>Luyện nghe hội thoại</h1><p>Nghe theo tình huống thực tế, ghi lại từ mới và luyện phản xạ theo đúng trình độ khóa học.</p></div>
      <span class="vip-label"><i class="bi bi-stars" aria-hidden="true"></i>Nội dung VIP</span>
    </header>
    <section class="study-panel listening-panel">
      <div v-if="loading" class="study-loading" role="status"><span class="study-spinner" aria-hidden="true"></span><span>Đang tải nội dung nghe...</span></div>
      <template v-else-if="error">
        <div class="listening-state"><span class="state-icon"><i class="bi bi-lock" aria-hidden="true"></i></span><h2>Chưa mở được nội dung</h2><p role="alert">{{ error }}</p><div class="study-actions"><button class="study-button" @click="load()"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i>Thử lại</button><RouterLink class="study-button secondary" to="/courses">Xem các gói khóa học</RouterLink></div></div>
      </template>
      <template v-else-if="!route.params.courseId">
        <div class="study-section-heading"><div class="study-heading-copy"><span class="study-icon"><i class="bi bi-headphones" aria-hidden="true"></i></span><div><h2>Chọn khóa học</h2><p>Gói VIP của khóa nào sẽ mở nội dung hội thoại thuộc khóa đó.</p></div></div></div>
        <div v-if="courses.length" class="course-links">
          <RouterLink v-for="course in courses" :key="course.courseId" :to="`/course/${course.courseId}/conversation-listening`"><span class="course-letter">{{ course.courseName.trim().charAt(0).toUpperCase() }}</span><span><strong>{{ course.courseName }}</strong><small>Mở danh sách bài nghe</small></span><i class="bi bi-chevron-right" aria-hidden="true"></i></RouterLink>
        </div>
        <div v-else class="listening-state compact"><span class="state-icon"><i class="bi bi-journal-x" aria-hidden="true"></i></span><h2>Chưa có khóa học phù hợp</h2><p>Đăng ký gói VIP của khóa học để mở nội dung luyện nghe.</p><RouterLink class="study-button secondary" to="/courses">Khám phá khóa học VIP</RouterLink></div>
      </template>
      <template v-else>
        <RouterLink class="back-link" :to="`/course/${route.params.courseId}/books`"><i class="bi bi-arrow-left" aria-hidden="true"></i>Quay lại khóa học</RouterLink>
        <div v-if="!recordings.length" class="listening-state compact"><span class="state-icon"><i class="bi bi-soundwave" aria-hidden="true"></i></span><h2>Nội dung đang được chuẩn bị</h2><p>Khóa học này chưa có bản ghi hội thoại. Nội dung sẽ được bổ sung sau.</p></div>
        <article v-for="(recording, index) in recordings" :key="recording.id" class="recording-card">
          <div class="recording-heading"><span>Bài nghe {{ String(index + 1).padStart(2, '0') }}</span><h2>{{ recording.title }}</h2></div>
          <div class="conversation-video">
            <iframe :src="`https://www.youtube-nocookie.com/embed/${recording.videoId}`" :title="recording.title" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
          <div class="listening-tip"><i class="bi bi-lightbulb" aria-hidden="true"></i><p>Nghe trọn một lượt, sau đó nghe lại từng đoạn và ghi vào sổ tay những từ hoặc câu bạn chưa hiểu.</p></div>
          <a class="study-button secondary" :href="`https://www.youtube.com/watch?v=${recording.videoId}`" target="_blank" rel="noopener noreferrer"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>Mở trên YouTube</a>
        </article>
      </template>
    </section>
  </div>
</template>
<style scoped>
.listening-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; }.vip-label { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 8px 12px; border: 1px solid #dfcee5; border-radius: 999px; background: #ffffffa6; color: #7a5c87; font-size: 11px; font-weight: 700; }
.listening-panel { margin-top: 20px; }.course-links { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 12px; }.course-links a { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; min-width: 0; padding: 15px; border: 1px solid #e5dce8; border-radius: 14px; color: #5e5067; background: #fbf9fc; }.course-links a:hover { border-color: #d1bdd9; background: #f7f1f9; }.course-letter { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: #eadfed; color: #7d6089; font-weight: 750; }.course-links a > span:nth-child(2) { display: grid; gap: 3px; min-width: 0; }.course-links strong { overflow-wrap: anywhere; font-size: 13px; }.course-links small { color: #998ca0; font-size: 10px; }.course-links a > i { color: #a08ca9; font-size: 11px; }
.back-link { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 18px; color: #80628e; font-size: 12px; font-weight: 650; }.recording-card + .recording-card { padding-top: 24px; margin-top: 28px; border-top: 1px solid #ebe4ed; }.recording-heading span { color: #9b80a7; font-size: 10px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }.recording-heading h2 { margin-top: 6px; }
.conversation-video { margin: 16px 0; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 15px; background: #17131a; box-shadow: 0 10px 24px #33253d1c; }
.conversation-video iframe { display: block; width: 100%; height: 100%; border: 0; }
.listening-tip { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; margin-bottom: 14px; border-radius: 11px; background: #f7f2f8; color: #997da5; }.listening-tip p { margin: 0; font-size: 12px; }.listening-state { display: grid; justify-items: center; gap: 10px; padding: 36px 20px; text-align: center; }.listening-state.compact { padding: 28px 14px; }.listening-state h2,.listening-state p { margin: 0; }.state-icon { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 16px; background: #f0e7f3; color: #856793; font-size: 21px; }
@media(max-width:600px) { .listening-hero { align-items: flex-start; flex-direction: column; }.course-links { grid-template-columns: minmax(0,1fr); }.listening-panel { padding: 16px; }.conversation-video { margin-inline: -4px; border-radius: 12px; } }
</style>

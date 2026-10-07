<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveLearningPosition } from '@/api/learningPosition'
import { getMyCourses, getOverview, type MyCourse } from '@/api/study'
import './studyPages.css'

const router = useRouter()
const courses = ref<MyCourse[]>([])
const dueCount = ref(0)
const weakCount = ref(0)
const loading = ref(true)
const error = ref('')
const opening = ref(false)
const recent = computed(() => [...courses.value].filter(c => Date.parse(c.expiredAt) > Date.now())
  .sort((a, b) => Number(Boolean(b.startedAt)) - Number(Boolean(a.startedAt)) || Date.parse(b.lastStudiedAt || b.startedAt || b.enrolledAt) - Date.parse(a.lastStudiedAt || a.startedAt || a.enrolledAt))[0])

async function load() {
  loading.value = true; error.value = ''
  const [courseResult, overviewResult] = await Promise.allSettled([getMyCourses(), getOverview()])
  if (courseResult.status === 'fulfilled') courses.value = courseResult.value
  if (overviewResult.status === 'fulfilled') { dueCount.value = overviewResult.value.dueCards; weakCount.value = overviewResult.value.weakLessons }
  if ([courseResult, overviewResult].some(r => r.status === 'rejected')) error.value = 'Một số dữ liệu học tập chưa tải được. Hãy thử tải lại.'
  loading.value = false
}
async function continueCourse(course: MyCourse) {
  if (opening.value) return
  opening.value = true; error.value = ''
  try {
    if (!course.startedAt) await saveLearningPosition(course.courseId)
    if (course.lastBookId) await router.push({ name: 'CourseBookDetail', params: { bookId: course.lastBookId }, query: { courseId: String(course.courseId), ...(course.lastLessonId ? { lessonId: String(course.lastLessonId) } : {}) } })
    else await router.push({ name: 'CourseBooks', params: { courseId: course.courseId } })
  } catch { error.value = 'Không mở được khóa học. Hãy thử lại.' }
  finally { opening.value = false }
}
onMounted(load)
</script>

<template>
  <div class="study-page">
    <header class="study-hero"><h1>Học hôm nay</h1><p>Tiếp tục bài đang học và ôn lại đúng phần bạn cần.</p></header>
    <p v-if="error" class="study-error" role="alert">{{ error }} <button type="button" @click="load">Tải lại</button></p>
    <p v-if="loading" role="status">Đang tải hành trình học...</p>
    <div v-else class="study-grid">
      <section class="study-panel"><h2>Tiếp tục học</h2>
        <template v-if="recent"><p>{{ recent.courseName }}</p><div class="study-progress"><span :style="{ width: `${Math.max(0, Math.min(100, recent.progress || 0))}%` }"></span></div><p class="study-meta">Đã hoàn thành {{ recent.progress || 0 }}%</p><button class="study-button" :disabled="opening" @click="continueCourse(recent)">{{ opening ? 'Đang mở...' : 'Học tiếp' }}</button></template>
        <template v-else><p>Bạn chưa có khóa học đang hoạt động.</p><RouterLink class="study-button" to="/courses">Khám phá khóa học</RouterLink></template>
      </section>
      <section class="study-panel"><h2>Thẻ cần ôn</h2><div class="study-count">{{ dueCount }}</div><p>Thẻ đã đến lịch ôn tập.</p><RouterLink class="study-button secondary" to="/user/review">Ôn tập ngay</RouterLink></section>
      <section class="study-panel"><h2>Bài cần luyện lại</h2><div class="study-count">{{ weakCount }}</div><p>Bài có lần làm gần nhất dưới 80 điểm.</p><RouterLink class="study-button secondary" to="/user/review">Xem bài yếu</RouterLink></section>
    </div>
  </div>
</template>

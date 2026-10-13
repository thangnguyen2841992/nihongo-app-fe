<script setup lang="ts">
import {computed, onMounted, ref} from "vue"
import {gatewayUrl} from "@/api/authApi"
import { useRouter } from "vue-router"
import { saveLearningPosition } from '@/api/learningPosition'
import './studyPages.css'

interface MyCourse {
  courseId: number
  courseName: string
  packageName: string
  progress: number
  startedAt: string | null
  lastBookId: number | null
  lastLessonId: number | null
  enrolledAt: string
  expiredAt: string
}

const courses = ref<MyCourse[]>([])
const loading = ref(true)
const openingCourseId = ref<number | null>(null)
const actionError = ref('')
const loadError = ref('')
const router = useRouter()

const sortedCourses = computed(() => [...courses.value].sort((a, b) => {
  const activeDifference = Number(isExpired(a.expiredAt)) - Number(isExpired(b.expiredAt))
  return activeDifference || Date.parse(b.enrolledAt) - Date.parse(a.enrolledAt)
}))
const activeCount = computed(() => courses.value.filter(course => !isExpired(course.expiredAt)).length)

const loadCourses = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await gatewayUrl.get("/api/nihongo-user/my-courses-dto")
    courses.value = res.data
  } catch (e) {
    console.error(e)
    loadError.value = 'Không tải được danh sách khóa học. Vui lòng thử lại.'
  } finally {
    loading.value = false
  }
}

const openCourse = async (course: MyCourse) => {
  if (openingCourseId.value !== null) return
  openingCourseId.value = course.courseId
  actionError.value = ''
  try {
    if (!course.startedAt) {
      await saveLearningPosition(course.courseId)
      course.startedAt = new Date().toISOString()
    }
    if (course.lastBookId) {
      await router.push({
        name: 'CourseBookDetail',
        params: { bookId: course.lastBookId },
        query: {
          courseId: String(course.courseId),
          ...(course.lastLessonId ? { lessonId: String(course.lastLessonId) } : {})
        }
      })
    } else {
      await router.push({ name: 'CourseBooks', params: { courseId: course.courseId } })
    }
  } catch (error) {
    console.error(error)
    actionError.value = 'Không thể mở khóa học. Vui lòng thử lại.'
  } finally {
    openingCourseId.value = null
  }
}

/**
 * tính số ngày còn lại
 */
const getRemainingDays = (expiredAt: string) => {
  const now = new Date().getTime()
  const end = new Date(expiredAt).getTime()

  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  return diff > 0 ? diff : 0
}

const isExpired = (expiredAt: string) => {
  return getRemainingDays(expiredAt) <= 0
}

const progressValue = (value: number) => Math.max(0, Math.min(100, Number(value) || 0))
const formatDate = (value: string) => new Date(value).toLocaleDateString('vi-VN')

onMounted(loadCourses)
</script>

<template>
  <div class="study-page">
    <header class="study-hero course-hero">
      <div>
        <p class="study-eyebrow">Không gian học tập</p>
        <h1>Khóa học của tôi</h1>
        <p>Theo dõi tiến độ, thời hạn và tiếp tục đúng nơi bạn đã dừng lại.</p>
      </div>
      <div v-if="!loading && courses.length" class="course-summary" aria-label="Tổng quan khóa học">
        <strong>{{ activeCount }}</strong><span>khóa đang hoạt động</span>
      </div>
    </header>

    <p v-if="actionError" role="alert" class="study-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ actionError }}</p>
    <p v-if="loadError" role="alert" class="study-error"><i class="bi bi-wifi-off" aria-hidden="true"></i>{{ loadError }} <button type="button" @click="loadCourses">Tải lại</button></p>

    <div v-if="loading" class="study-loading" role="status"><span class="study-spinner" aria-hidden="true"></span><span>Đang tải khóa học...</span></div>

    <section v-else-if="!loadError && courses.length === 0" class="study-empty empty-courses">
      <span class="empty-icon"><i class="bi bi-journals" aria-hidden="true"></i></span>
      <h2>Bắt đầu khóa học đầu tiên</h2>
      <p>Bạn chưa đăng ký khóa học nào. Hãy chọn trình độ và gói học phù hợp.</p>
      <RouterLink to="/courses" class="study-button"><i class="bi bi-compass" aria-hidden="true"></i>Khám phá khóa học</RouterLink>
    </section>

    <div v-else-if="!loadError" class="course-grid">
      <article v-for="course in sortedCourses" :key="course.courseId" class="course-card" :class="{ expired: isExpired(course.expiredAt) }">
        <header class="course-card-heading">
          <div>
            <span class="study-badge" :class="{ danger: isExpired(course.expiredAt) }">{{ course.packageName }}</span>
            <h2>{{ course.courseName }}</h2>
          </div>
          <span class="course-status" :class="{ complete: progressValue(course.progress) >= 100, active: course.startedAt && progressValue(course.progress) < 100 }">
            {{ isExpired(course.expiredAt) ? 'Đã hết hạn' : progressValue(course.progress) >= 100 ? 'Hoàn thành' : course.startedAt ? 'Đang học' : 'Chưa bắt đầu' }}
          </span>
        </header>

        <dl class="course-details">
          <div><dt>Đăng ký</dt><dd>{{ formatDate(course.enrolledAt) }}</dd></div>
          <div><dt>Thời hạn</dt><dd :class="{ urgent: !isExpired(course.expiredAt) && getRemainingDays(course.expiredAt) <= 3 }">{{ isExpired(course.expiredAt) ? 'Đã hết hạn' : `${getRemainingDays(course.expiredAt)} ngày còn lại` }}</dd></div>
        </dl>

        <div class="course-progress-copy"><span>Tiến độ học</span><strong>{{ progressValue(course.progress) }}%</strong></div>
        <div class="study-progress" role="progressbar" :aria-label="`Tiến độ ${course.courseName}`" :aria-valuenow="progressValue(course.progress)" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${progressValue(course.progress)}%` }"></span></div>

        <div class="study-actions mobile-stack">
          <RouterLink v-if="isExpired(course.expiredAt)" to="/courses" class="study-button"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>Gia hạn khóa học</RouterLink>
          <button v-else class="study-button" :disabled="openingCourseId !== null" @click="openCourse(course)">
            <i class="bi" :class="course.startedAt ? 'bi-play-circle' : 'bi-book'" aria-hidden="true"></i>{{ openingCourseId === course.courseId ? 'Đang mở...' : course.startedAt ? 'Học tiếp' : 'Bắt đầu học' }}
          </button>
          <RouterLink v-if="course.packageName.toUpperCase() === 'VIP' && !isExpired(course.expiredAt)" class="study-button secondary" :to="`/course/${course.courseId}/conversation-listening`"><i class="bi bi-headphones" aria-hidden="true"></i>Luyện nghe</RouterLink>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.course-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.course-summary { position: relative; z-index: 1; display: grid; flex: 0 0 154px; padding: 16px 18px; border: 1px solid #e2d6e6; border-radius: 16px; background: #ffffffa8; }
.course-summary strong { color: #745782; font-size: 28px; line-height: 1; }.course-summary span { margin-top: 7px; color: #8c7c94; font-size: 11px; line-height: 1.5; }
.course-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; margin-top: 20px; }
.course-card { display: flex; flex-direction: column; min-width: 0; padding: 22px; border: 1px solid #e5dce8; border-radius: 18px; background: #fffffff0; box-shadow: 0 8px 24px #55475e0c; }.course-card.expired { background: #fbfafbde; }
.course-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }.course-card-heading > div { min-width: 0; }.course-card h2 { margin: 10px 0 0; color: #50435e; font-size: 19px; line-height: 1.45; overflow-wrap: anywhere; }
.course-status { flex-shrink: 0; padding: 5px 9px; border-radius: 999px; background: #f1eef3; color: #817489; font-size: 10px; font-weight: 700; }.course-status.active { background: #eaf5ef; color: #4e8065; }.course-status.complete { background: #eee8f7; color: #705690; }
.course-details { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin: 22px 0; }.course-details div { padding: 12px; border-radius: 11px; background: #f8f5f9; }.course-details dt { color: #9b8ca2; font-size: 10px; }.course-details dd { margin: 4px 0 0; color: #695d72; font-size: 12px; font-weight: 650; }.course-details dd.urgent { color: #ad762c; }
.course-progress-copy { display: flex; justify-content: space-between; margin-bottom: 8px; color: #817489; font-size: 12px; }.course-progress-copy strong { color: #71567e; }.course-card .study-progress { height: 8px; }.course-card .study-actions { margin-top: auto; padding-top: 22px; }
.empty-courses { display: grid; justify-items: center; max-width: 620px; margin: 24px auto 0; }.empty-courses h2 { margin: 0; color: #584b62; font-size: 20px; }.empty-courses p { max-width: 450px; margin: 0; }.empty-icon { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 17px; background: #efe5f2; color: #856793; font-size: 24px; }
@media(max-width:850px) { .course-grid { grid-template-columns: minmax(0,1fr); } }
@media(max-width:600px) { .course-hero { align-items: stretch; flex-direction: column; }.course-summary { display: flex; align-items: baseline; gap: 7px; flex-basis: auto; }.course-summary strong { font-size: 23px; }.course-card { padding: 18px; }.course-card-heading { flex-direction: column; }.course-details { margin: 18px 0; } }
</style>

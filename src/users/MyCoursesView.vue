<script setup lang="ts">
import {onMounted, ref} from "vue"
import {gatewayUrl} from "@/api/authApi"
import { useRouter } from "vue-router"
import { saveLearningPosition } from '@/api/learningPosition'

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
const router = useRouter()

const loadCourses = async () => {
  try {
    const res = await gatewayUrl.get("/api/nihongo-user/my-courses-dto")
    courses.value = res.data
  } catch (e) {
    console.error(e)
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

onMounted(loadCourses)
</script>

<template>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <h1>📚 Khóa học của tôi</h1>
      <p>Theo dõi tiến độ & thời hạn khóa học</p>
    </div>

    <!-- LOADING -->
    <p v-if="actionError" role="alert" class="action-error">{{ actionError }}</p>
    <div v-if="loading" class="loading" role="status">
      Đang tải dữ liệu...
    </div>

    <!-- EMPTY -->
    <div v-else-if="courses.length === 0" class="empty">
      <div class="emoji">📖</div>
      <h2>Bạn chưa đăng ký khóa học nào</h2>
      <a href="/courses" class="btn-primary">
        Khám phá khóa học
      </a>
    </div>

    <!-- TABLE -->
    <div v-else class="table-wrap">

      <table class="table">

        <thead>
        <tr>
          <th>Khóa học</th>
          <th>Gói</th>
          <th>Ngày đăng ký</th>
          <th>Còn lại</th>
          <th>Tiến độ</th>
          <th>Trạng thái</th>
          <th></th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="c in courses" :key="c.courseId">

          <!-- COURSE -->
          <td class="course-cell">
            <div class="course-name">
              {{ c.courseName }}
            </div>
          </td>

          <!-- PACKAGE -->
          <td class="detail-cell" data-label="Gói học">
              <span class="badge">
                {{ c.packageName }}
              </span>
          </td>

          <!-- DATE -->
          <td class="detail-cell" data-label="Ngày đăng ký">
            {{ new Date(c.enrolledAt).toLocaleDateString("vi-VN") }}
          </td>

          <!-- REMAINING DAYS -->
          <td class="detail-cell" data-label="Còn lại">
              <span
                class="days"
                :class="{
                  danger: getRemainingDays(c.expiredAt) <= 3,
                  expired: isExpired(c.expiredAt)
                }"
              >
                <template v-if="isExpired(c.expiredAt)">
                  Hết hạn
                </template>
                <template v-else>
                  {{ getRemainingDays(c.expiredAt) }} ngày
                </template>
              </span>
          </td>

          <!-- PROGRESS -->
          <td class="progress-cell" data-label="Tiến độ">
            <div class="progress-text">
              {{ c.progress }}%
            </div>

            <div class="bar">
              <div
                class="fill"
                :style="{ width: c.progress + '%' }"
              />
            </div>
          </td>

          <!-- STATUS -->
          <td class="detail-cell" data-label="Trạng thái">
              <span
                class="status"
                :class="{
                  done: c.progress >= 100,
                  active: c.progress < 100 && !!c.startedAt,
                  waiting: !c.startedAt
                }"
              >
                {{
                  c.progress >= 100
                    ? "Hoàn thành"
                    : c.startedAt ? "Đang học" : "Chưa học"
                }}
              </span>
          </td>

          <!-- ACTION -->
          <td class="action-cell">
            <button
              class="btn"
              :class="{ 'btn-continue': !!c.startedAt }"
              @click="openCourse(c)"
              :disabled="isExpired(c.expiredAt) || openingCourseId !== null"
            >
              {{ c.startedAt ? '▶ Học tiếp' : '📖 Bắt đầu học' }}
            </button>
          </td>

        </tr>
        </tbody>

      </table>

    </div>

  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  background: #f6f7fb;
  min-height: 100vh;
}

/* HEADER */
.header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
}

.header p {
  color: #666;
}

/* TABLE */
.table-wrap {
  margin-top: 20px;
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  background: #f5f7fa;
  padding: 14px;
  text-align: left;
  font-size: 13px;
}

.table td {
  padding: 14px;
  border-top: 1px solid #eee;
}
.progress-cell { width: 200px; }

/* COURSE */
.course-name {
  font-weight: 600;
}

/* BADGE */
.badge {
  background: #eef4ff;
  color: #1677ff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

/* DAYS */
.days {
  font-weight: 600;
}

.days.danger {
  color: #fa8c16;
}

.days.expired {
  color: #ff4d4f;
}

/* PROGRESS */
.bar {
  height: 6px;
  background: #eee;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 4px;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #95de64);
}

/* STATUS */
.status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.status.active {
  background: #e6f4ff;
  color: #1677ff;
}
.status.waiting {
  background: #f1f5f9;
  color: #64748b;
}

.status.done {
  background: #f6ffed;
  color: #389e0d;
}

/* BUTTON */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 150px;
  height: 40px;
  white-space: nowrap;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: #1677ff;
  color: white;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: #0f5fd6;
}

.btn.btn-continue {
  background: #389e0d;
}

.btn.btn-continue:hover:not(:disabled) {
  background: #237804;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* EMPTY */
.empty {
  text-align: center;
  margin-top: 80px;
}

.emoji {
  font-size: 60px;
}

.btn-primary {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 16px;
  background: #1677ff;
  color: white;
  border-radius: 10px;
  text-decoration: none;
}

/* LOADING */
.loading {
  text-align: center;
  padding: 40px;
}
.action-error { color: #c62828; margin-top: 16px; }

@media (max-width: 1100px) {
  .page { padding: 20px 16px; min-height: auto; }
  .table-wrap { background: transparent; box-shadow: none; overflow: visible; }
  .table, .table tbody { display: block; }
  .table thead { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .table tbody { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; }
  .table tr { display: block; min-width: 0; padding: 18px; background: #fff; border: 1px solid #e6e1e8; border-radius: 18px; box-shadow: 0 6px 20px #55475e0b; }
  .table td { display: block; padding: 10px 0; border: 0; background: transparent; color: #334155; box-shadow: none; }
  .table .course-cell { padding: 0 0 14px; border-bottom: 1px solid #f0edf3; margin-bottom: 4px; }
  .course-name { font-size: 18px; line-height: 1.5; color: #50435e; overflow-wrap: anywhere; }
  .table .detail-cell { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .detail-cell::before, .progress-cell::before { content: attr(data-label); color: #697386; font-size: 13px; font-weight: 500; flex-shrink: 0; }
  .badge { white-space: normal; text-align: right; line-height: 1.5; overflow-wrap: anywhere; }
  .status { flex-shrink: 0; }
  .table .progress-cell { width: auto; display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  .progress-text { font-size: 14px; font-weight: 650; }
  .bar { grid-column: 1 / -1; height: 8px; margin: 0; }
  .table .action-cell { padding: 12px 0 0; }
  .btn { width: 100%; height: auto; min-height: 46px; border-radius: 11px; font-weight: 650; }
}

@media (max-width: 600px) {
  .page { padding: 8px 0 24px; }
  .header h1 { font-size: 23px; line-height: 1.4; color: #50435e; }
  .header p { font-size: 14px; line-height: 1.6; margin: 8px 0 0; }
  .table-wrap { margin-top: 18px; }
  .table tbody { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .empty { margin-top: 32px; padding: 24px 16px; background: #fff; border-radius: 18px; }
  .empty h2 { font-size: 19px; line-height: 1.5; }
  .btn-primary { min-height: 44px; }
}
</style>

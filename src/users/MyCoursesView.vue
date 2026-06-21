<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import { gatewayUrl } from "@/api/authApi"

interface MyCourse {
  courseId: number
  courseName: string
  packageName: string
  progress: number
  enrolledAt: string
  expiredAt: string
}

const courses = ref<MyCourse[]>([])
const loading = ref(true)

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

const continueLearning = (courseId: number) => {
  window.location.href = `/course/${courseId}`
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
    <div v-if="loading" class="loading">
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
          <td>
            <div class="course-name">
              {{ c.courseName }}
            </div>
          </td>

          <!-- PACKAGE -->
          <td>
              <span class="badge">
                {{ c.packageName }}
              </span>
          </td>

          <!-- DATE -->
          <td>
            {{ new Date(c.enrolledAt).toLocaleDateString("vi-VN") }}
          </td>

          <!-- REMAINING DAYS -->
          <td>
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
          <td style="width: 200px;">
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
          <td>
              <span
                class="status"
                :class="{
                  done: c.progress >= 100,
                  active: c.progress < 100
                }"
              >
                {{
                  c.progress >= 100
                    ? "Hoàn thành"
                    : "Đang học"
                }}
              </span>
          </td>

          <!-- ACTION -->
          <td>
            <button
              class="btn"
              @click="continueLearning(c.courseId)"
              :disabled="isExpired(c.expiredAt)"
            >
              ▶ Học tiếp
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

.status.done {
  background: #f6ffed;
  color: #389e0d;
}

/* BUTTON */
.btn {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: #1677ff;
  color: white;
  cursor: pointer;
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
</style>

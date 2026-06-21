<script setup lang="ts">
import { onMounted, ref } from "vue"
import { gatewayUrl } from "@/api/authApi"

interface CoursePackage {
  packageId: number
  packageName: string
  durationDays: number
  price: number
}

interface Course {
  courseId: number
  courseName: string
  courseDescription: string
  active: string
  packages: CoursePackage[]
}

const courses = ref<Course[]>([])
const registering = ref<number | null>(null)
const registeredCourseIds = ref<number[]>([])

const showPackageModal = ref(false)
const selectedCourse = ref<Course | null>(null)

const openPackageModal = (course: Course) => {
  selectedCourse.value = course
  showPackageModal.value = true
}

const subscribe = async (packageId: number) => {
  if (!selectedCourse.value) return

  try {
    registering.value = selectedCourse.value.courseId

    await gatewayUrl.post("/api/nihongo-user/subscriptions", null, {
      params: {
        courseId: selectedCourse.value.courseId,
        packageId
      }
    })

    registeredCourseIds.value.push(selectedCourse.value.courseId)

    showPackageModal.value = false
    selectedCourse.value = null

  } catch (e) {
    console.error(e)
    alert("Đăng ký thất bại")
  } finally {
    registering.value = null
  }
}

const loadCourses = async () => {
  const res = await gatewayUrl.get("/api/nihongo-user/courses")
  courses.value = res.data
}

const loadMyCourses = async () => {
  const res = await gatewayUrl.get("/api/nihongo-user/my-courses")
  registeredCourseIds.value = res.data
}

const isRegistered = (id: number) =>
  registeredCourseIds.value.includes(id)

onMounted(() => {
  loadCourses()
  loadMyCourses()
})
</script>

<template>
  <div class="page">

    <h2 class="title">📚 Khóa học tiếng Nhật</h2>

    <div v-if="courses.length" class="grid">

      <div
        v-for="course in courses"
        :key="course.courseId"
        class="card"
      >

        <!-- TOP BADGE -->
        <div class="badge" v-if="course.active">
          {{ course.active }}
        </div>

        <!-- TITLE -->
        <h3 class="course-name">
          {{ course.courseName }}
        </h3>

        <!-- DESC -->
        <p class="desc">
          {{ course.courseDescription }}
        </p>

        <!-- PACKAGES PREVIEW -->
        <div class="packages">
          <div
            v-for="p in course.packages"
            :key="p.packageId"
            class="pkg"
          >
            <span class="pkg-name">{{ p.packageName }}</span>
            <span class="pkg-price">
              {{ p.price.toLocaleString("vi-VN") }}đ
            </span>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">

          <button
            class="btn"
            :class="{
              primary: !isRegistered(course.courseId),
              success: isRegistered(course.courseId)
            }"
            :disabled="isRegistered(course.courseId) || registering === course.courseId"
            @click="openPackageModal(course)"
          >
            <span v-if="isRegistered(course.courseId)">
              ✓ Đã đăng ký
            </span>

            <span v-else-if="registering === course.courseId">
              ⏳ Đang xử lý
            </span>

            <span v-else>
              🚀 Mua khóa học
            </span>
          </button>

        </div>

      </div>
    </div>

    <div v-else class="empty">
      Chưa có khóa học nào
    </div>

    <!-- MODAL -->
    <div v-if="showPackageModal" class="modal">

      <div class="modal-box">

        <h3>
          {{ selectedCourse?.courseName }}
        </h3>

        <p class="sub">
          Chọn gói phù hợp với bạn
        </p>

        <div class="package-grid">

          <div
            v-for="p in selectedCourse?.packages"
            :key="p.packageId"
            class="package-card"
          >

            <div class="pkg-title">
              {{ p.packageName }}
            </div>

            <div class="pkg-time">
              {{ p.durationDays }} ngày
            </div>

            <div class="pkg-price">
              {{ p.price.toLocaleString("vi-VN") }}đ
            </div>

            <button
              class="buy-btn"
              @click="subscribe(p.packageId)"
              :disabled="registering === selectedCourse?.courseId"
            >
              Chọn gói
            </button>

          </div>

        </div>

        <button class="close" @click="showPackageModal = false">
          Đóng
        </button>

      </div>
    </div>

  </div>
</template>

<style scoped>
.page {
  padding: 20px;
  background: #f6f7fb;
  min-height: 100vh;
}

.title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

/* CARD */
.card {
  background: white;
  border-radius: 18px;
  padding: 18px;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  transition: 0.25s;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 50px rgba(0,0,0,0.12);
}

/* BADGE */
.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg,#4f8cff,#1677ff);
  color: white;
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 999px;
}

/* TEXT */
.course-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.desc {
  font-size: 13px;
  color: #666;
  min-height: 40px;
}

/* PACKAGES */
.packages {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pkg {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 10px;
  background: #f8f9ff;
  border-radius: 8px;
}

/* FOOTER */
.footer {
  margin-top: 14px;
}

/* BUTTON */
.btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(135deg,#1677ff,#4f8cff);
  color: white;
}

.btn.success {
  background: linear-gradient(135deg,#20c997,#198754);
  color: white;
}

/* EMPTY */
.empty {
  text-align: center;
  padding: 50px;
  color: #777;
}

/* MODAL */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-box {
  background: white;
  width: 650px;
  padding: 22px;
  border-radius: 16px;
}

.sub {
  color: #666;
  margin-bottom: 16px;
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.package-card {
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  transition: 0.2s;
}

.package-card:hover {
  transform: scale(1.05);
  border-color: #1677ff;
}

.pkg-title {
  font-weight: 700;
}

.pkg-time {
  font-size: 12px;
  color: #666;
}

.pkg-price {
  color: #dc3545;
  font-weight: 700;
  margin: 6px 0;
}

.buy-btn {
  width: 100%;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: #1677ff;
  color: white;
}

.close {
  margin-top: 12px;
  width: 100%;
  padding: 10px;
  border: none;
  background: #eee;
  border-radius: 10px;
}
</style>

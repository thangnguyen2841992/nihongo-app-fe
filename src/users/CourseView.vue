<script setup lang="ts">
import {onMounted, ref, watch} from "vue"
import { useRouter } from "vue-router"
import { useAuthState } from "@/services/authState"
import {gatewayUrl, publicClient} from "@/api/authApi"

const router = useRouter()
const { isAuthenticated } = useAuthState()
const loading = ref(true)
const loadError = ref("")
const goToLogin = () => router.push({ path: "/login", query: { redirect: "/courses" } })

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

interface MyCourse {
  courseId: number
  expiredAt: string
}

const courses = ref<Course[]>([])
const registering = ref<number | null>(null)
const registeredCourseIds = ref<number[]>([])
const isRenewMode = ref(false)
const showPackageModal = ref(false)
const selectedCourse = ref<Course | null>(null)
const myCourses = ref<MyCourse[]>([])

const openPackageModal = (course: Course, renew = false) => {
  if (!isAuthenticated.value) { void goToLogin(); return }
  selectedCourse.value = course
  isRenewMode.value = renew
  showPackageModal.value = true
}

const subscribe = async (packageId: number) => {
  if (!isAuthenticated.value) { void goToLogin(); return }
  if (!selectedCourse.value) return

  try {
    registering.value = selectedCourse.value.courseId

    await gatewayUrl.post("/api/nihongo-user/subscriptions", null, {
      params: {
        courseId: selectedCourse.value.courseId,
        packageId
      }
    })

    await loadMyCourses();

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
  loading.value = true
  loadError.value = ""
  try {
    const res = await publicClient.get("/api/nihongo-user/courses", { withCredentials: false })
    courses.value = res.data
  } catch {
    loadError.value = "Không thể tải danh sách khóa học. Vui lòng thử lại."
  } finally { loading.value = false }
}

const loadMyCourses = async () => {
  if (!isAuthenticated.value) return
  const res = await gatewayUrl.get("/api/nihongo-user/my-courses-dto")

  myCourses.value = res.data

  registeredCourseIds.value = res.data.map((x: MyCourse) => x.courseId)
}

const isExpired = (courseId: number) => {
  const course = myCourses.value.find(c => c.courseId === courseId)

  if (!course) return false

  return new Date(course.expiredAt).getTime() < Date.now()
}

const getExpiredDate = (courseId: number) => {
  const course = myCourses.value.find(c => c.courseId === courseId)

  if (!course) return ""

  return new Date(course.expiredAt).toLocaleDateString("vi-VN")
}

const isRegistered = (id: number) =>
  registeredCourseIds.value.includes(id);
const renewSubscription = async (packageId: number) => {

  if (!isAuthenticated.value) { void goToLogin(); return }
  if (!selectedCourse.value) return

  try {

    registering.value = selectedCourse.value.courseId

    await gatewayUrl.post(
      "/api/nihongo-user/subscriptions/renew",
      null,
      {
        params: {
          courseId: selectedCourse.value.courseId,
          packageId
        }
      }
    )

    alert("Gia hạn thành công!")

    showPackageModal.value = false
    selectedCourse.value = null

    await loadMyCourses()

  } catch (e) {

    console.error(e)
    alert("Gia hạn thất bại")

  } finally {

    registering.value = null

  }

}
const renewCourse = (courseId: number) => {

  const course = courses.value.find(c => c.courseId === courseId)

  if (!course) return

  openPackageModal(course, true)

}

const continueLearning = (courseId: number) => {
  alert('Học tiếp nào ' + courseId)
}

onMounted(() => { void loadCourses() })
watch(isAuthenticated, async authenticated => {
  registeredCourseIds.value = []
  myCourses.value = []
  showPackageModal.value = false
  if (authenticated) {
    try { await loadMyCourses() }
    catch { loadError.value = "Không thể tải trạng thái đăng ký khóa học. Vui lòng thử lại." }
  }
}, { immediate: true })
</script>

<template>
  <div class="page">

    <div v-if="!isAuthenticated" class="guest-intro">
      <span class="intro-label">HỌC TIẾNG NHẬT CÙNG NIHONGO</span>
      <h1>Bắt đầu hành trình tiếng Nhật của bạn</h1>
      <p>Khám phá khóa học và chọn gói học phù hợp. Đăng nhập khi bạn sẵn sàng đăng ký.</p>
    </div>
    <h2 class="title">📚 Khóa học tiếng Nhật</h2>
    <p v-if="loading" role="status" class="empty">Đang tải khóa học...</p>
    <div v-else-if="loadError" role="alert" class="alert alert-warning">
      {{ loadError }} <button type="button" class="btn btn-link" @click="loadCourses">Thử lại</button>
    </div>

    <div v-if="!loading && !loadError && courses.length" class="grid">

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
        <div class="course-status">

          <template v-if="isRegistered(course.courseId)">

    <span
      v-if="isExpired(course.courseId)"
      class="expired"
    >
      🔴 Đã hết hạn
      {{ getExpiredDate(course.courseId) }}
    </span>

            <span
              v-else
              class="active"
            >
      🟢 Đang học
    </span>

          </template>

          <template v-else>
    <span class="placeholder">
      &nbsp;
    </span>
          </template>

        </div>
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
    success: isRegistered(course.courseId) && !isExpired(course.courseId),
    warning: isRegistered(course.courseId) && isExpired(course.courseId)
}"
            :disabled="registering === course.courseId"
            @click="
    isRegistered(course.courseId)
        ? isExpired(course.courseId)
            ? renewCourse(course.courseId)
            : continueLearning(course.courseId)
        : openPackageModal(course)">
           <span v-if="isRegistered(course.courseId)">
    {{ isExpired(course.courseId) ? "🔄 Gia hạn" : "▶ Học tiếp" }}
</span>

            <span v-else-if="registering === course.courseId">
              ⏳ Đang xử lý
            </span>

            <span v-else>
              {{ isAuthenticated ? "🚀 Mua khóa học" : "Đăng nhập để đăng ký" }}
            </span>
          </button>

        </div>

      </div>
    </div>

    <div v-else-if="!loading && !loadError" class="empty">
      Chưa có khóa học nào
    </div>

    <!-- MODAL -->
    <div v-if="showPackageModal" class="modal">

      <div class="modal-box">

        <h3>
          {{ selectedCourse?.courseName }}
        </h3>

        <p class="sub">
          {{
            isRenewMode
              ? "Chọn gói để gia hạn khóa học"
              : "Chọn gói phù hợp với bạn"
          }}
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
              :disabled="registering === selectedCourse?.courseId"
              @click="
      isRenewMode
        ? renewSubscription(p.packageId)
        : subscribe(p.packageId)
  "
            >
              {{ isRenewMode ? 'Gia hạn gói' : 'Chọn gói' }}
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
.guest-intro { padding: 36px 0 30px; max-width: 760px; }
.intro-label { color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; }
.guest-intro h1 { color: #172554; font-size: clamp(28px, 4vw, 42px); font-weight: 750; margin: 14px 0; line-height: 1.25; }
.guest-intro p { color: #64748b; font-size: 16px; line-height: 1.7; }
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px;
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
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  transition: 0.25s;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
}

/* BADGE */
.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #4f8cff, #1677ff);
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
  background: linear-gradient(135deg, #1677ff, #4f8cff);
  color: white;
}

.btn.success {
  background: linear-gradient(135deg, #20c997, #198754);
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
  background: rgba(0, 0, 0, 0.55);
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

.course-status {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
}

.course-status .expired {
  color: #dc3545;
}

.course-status .active {
  color: #28a745;
}

.btn.warning{
  background:#fa8c16;
  color:white;
}
@media (max-width: 1000px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .grid, .package-grid { grid-template-columns: 1fr; }
  .page { padding: 20px; }
  .modal-box { width: calc(100% - 32px); max-height: 85vh; overflow-y: auto; }
}
</style>

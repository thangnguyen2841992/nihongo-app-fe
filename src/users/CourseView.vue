<script setup lang="ts">
import {onMounted, ref, watch} from "vue"
import { useRouter } from "vue-router"
import { purchaseCourse } from "@/services/coursePurchase"
import { useAuthState } from "@/services/authState"
import {gatewayUrl, publicClient} from "@/api/authApi"
import { saveLearningPosition } from '@/api/learningPosition'

const router = useRouter()
const { isAuthenticated, userEmail } = useAuthState()
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
  startedAt: string | null
  lastBookId: number | null
  lastLessonId: number | null
}

const courses = ref<Course[]>([])
const registering = ref<number | null>(null)
const registeredCourseIds = ref<number[]>([])
const isRenewMode = ref(false)
const showPackageModal = ref(false)
const selectedCourse = ref<Course | null>(null)
const myCourses = ref<MyCourse[]>([])
const couponCode = ref('')
const couponBusy = ref(false)
const couponError = ref('')
const couponQuotes = ref<Record<number, { originalPrice: number; discount: number; payable: number }>>({})
watch(couponCode, () => { couponQuotes.value = {}; couponError.value = '' })
async function applyCoupon() {
  if (!selectedCourse.value || !couponCode.value.trim() || couponBusy.value) return
  couponBusy.value = true; couponError.value = ''; couponQuotes.value = {}
  const course = selectedCourse.value, code = couponCode.value.trim().toUpperCase()
  const quotes = await Promise.allSettled(course.packages.map(async p => ({ packageId: p.packageId, quote: (await gatewayUrl.get<{ originalPrice: number; discount: number; payable: number }>('/api/nihongo-user/promotions/quote', { params: { courseId: course.courseId, packageId: p.packageId, code } })).data })))
  if (selectedCourse.value?.courseId === course.courseId && couponCode.value.trim().toUpperCase() === code) {
    for (const result of quotes) if (result.status === 'fulfilled') couponQuotes.value[result.value.packageId] = result.value.quote
    if (!Object.keys(couponQuotes.value).length) couponError.value = 'Mã không áp dụng được. Kiểm tra thời hạn, lượt dùng và khóa học.'
  }
  couponBusy.value = false
}

const openPackageModal = (course: Course, renew = false) => {
  if (!isAuthenticated.value) { void goToLogin(); return }
  selectedCourse.value = course
  couponCode.value = ''; couponQuotes.value = {}; couponError.value = ''
  isRenewMode.value = renew
  showPackageModal.value = true
}

const subscribe = async (packageId: number) => {
  if (!isAuthenticated.value) { void goToLogin(); return }
  if (!selectedCourse.value || registering.value !== null) return

  try {
    registering.value = selectedCourse.value.courseId

    await purchaseCourse(userEmail?.value || "current", selectedCourse.value.courseId, packageId, false, couponCode.value.trim() || undefined, couponQuotes.value[packageId]?.payable ?? selectedCourse.value.packages.find(p => p.packageId === packageId)?.price)

    await loadMyCourses();

    showPackageModal.value = false
    selectedCourse.value = null

  } catch (e: any) {
    console.error(e)
    alert(e.response?.data?.message || "Đăng ký thất bại. Có thể thử lại cùng yêu cầu.")
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
  if (!selectedCourse.value || registering.value !== null) return

  try {

    registering.value = selectedCourse.value.courseId

    await purchaseCourse(userEmail?.value || "current", selectedCourse.value.courseId, packageId, true, couponCode.value.trim() || undefined, couponQuotes.value[packageId]?.payable ?? selectedCourse.value.packages.find(p => p.packageId === packageId)?.price)

    alert("Gia hạn thành công!")

    showPackageModal.value = false
    selectedCourse.value = null

    await loadMyCourses()

  } catch (e: any) {

    console.error(e)
    alert(e.response?.data?.message || "Gia hạn thất bại. Có thể thử lại cùng yêu cầu.")

  } finally {

    registering.value = null

  }

}
const renewCourse = (courseId: number) => {

  const course = courses.value.find(c => c.courseId === courseId)

  if (!course) return

  openPackageModal(course, true)

}

const continueLearning = async (courseId: number) => {
  const course = myCourses.value.find(item => item.courseId === courseId)
  if (!course) return
  try {
    if (!course.startedAt) {
      await saveLearningPosition(courseId)
      course.startedAt = new Date().toISOString()
    }
    if (course.lastBookId) {
      await router.push({
        name: 'CourseBookDetail',
        params: { bookId: course.lastBookId },
        query: {
          courseId: String(courseId),
          ...(course.lastLessonId ? { lessonId: String(course.lastLessonId) } : {})
        }
      })
    } else {
      await router.push({ name: 'CourseBooks', params: { courseId } })
    }
  } catch (error) {
    console.error(error)
    loadError.value = 'Không thể mở khóa học. Vui lòng thử lại.'
  }
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
  <div class="page" :class="{ 'authenticated-page': isAuthenticated }">

    <div v-if="!isAuthenticated" class="guest-intro">
      <span class="intro-label">HỌC TIẾNG NHẬT CÙNG NIHONGO</span>
      <h1>Bắt đầu hành trình tiếng Nhật của bạn</h1>
      <p>Khám phá khóa học và chọn gói học phù hợp. Đăng nhập khi bạn sẵn sàng đăng ký.</p>
    </div>
    <div class="catalog-heading"><span class="catalog-icon"><i class="bi bi-compass" aria-hidden="true"></i></span><div><p class="catalog-eyebrow">LỘ TRÌNH THEO TRÌNH ĐỘ</p><h2 class="title">Khóa học tiếng Nhật</h2><p>Chọn khóa học và gói phù hợp với mục tiêu của bạn.</p></div></div>
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
          {{ course.active === 'ACTIVE' ? 'Đang mở' : course.active }}
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
            <span class="pkg-name pkg-copy"><strong>{{ p.packageName }}</strong><small>{{ p.durationDays }} ngày truy cập</small></span>
            <small v-if="p.packageName.toUpperCase() === 'VIP'">Bao gồm luyện nghe hội thoại theo khóa học</small>
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
    <div v-if="showPackageModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="package-modal-title" @click.self="showPackageModal = false">

      <div class="modal-box">

        <h3 id="package-modal-title">
          {{ selectedCourse?.courseName }}
        </h3>

        <p class="sub">
          {{
            isRenewMode
              ? "Chọn gói để gia hạn khóa học"
              : "Chọn gói phù hợp với bạn"
          }}
        </p>

        <p class="sub">Thanh toán bằng số dư ví. Số tiền của gói sẽ được trừ khi đăng ký hoặc gia hạn thành công.</p>
        <form class="coupon-form" @submit.prevent="applyCoupon"><label for="purchase-coupon">Mã giảm giá (nếu có)</label><div class="d-flex gap-2"><input id="purchase-coupon" v-model="couponCode" class="form-control" maxlength="32" :disabled="couponBusy || registering !== null" placeholder="Nhập mã giảm giá"><button class="btn btn-outline-primary" :disabled="couponBusy || registering !== null || !couponCode.trim()">{{ couponBusy ? 'Đang kiểm tra...' : 'Kiểm tra mã' }}</button></div><small>Mỗi mã dùng một lần cho mỗi tài khoản. Kiểm tra mã để xem số tiền thanh toán.</small><p v-if="couponError" role="alert" class="text-danger">{{ couponError }}</p></form>
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
              <del v-if="couponQuotes[p.packageId]" class="d-block small text-muted">{{ p.price.toLocaleString('vi-VN') }}đ</del>
              {{ (couponQuotes[p.packageId]?.payable ?? p.price).toLocaleString("vi-VN") }}đ
            </div>

            <button
              class="buy-btn"
              :disabled="registering === selectedCourse?.courseId || couponBusy || (Boolean(couponCode.trim()) && !couponQuotes[p.packageId])"
              @click="
      isRenewMode
        ? renewSubscription(p.packageId)
        : subscribe(p.packageId)
  "
            >
              {{ isRenewMode ? 'Thanh toán gia hạn' : 'Thanh toán từ ví' }}
            </button>

          </div>

        </div>

        <button class="close" aria-label="Đóng cửa sổ chọn gói" @click="showPackageModal = false">
          Đóng
        </button>

      </div>
    </div>

  </div>
</template>

<style scoped>
.guest-intro { padding: 36px 0 30px; max-width: 760px; }
.intro-label { color: #866692; font-size: 11px; font-weight: 750; letter-spacing: 1.5px; }
.guest-intro h1 { color: #50435e; font-size: clamp(28px, 4vw, 42px); font-weight: 750; margin: 14px 0; line-height: 1.25; }
.guest-intro p { color: #64748b; font-size: 16px; line-height: 1.7; }
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 18px 60px;
  background: transparent;
  min-height: calc(100vh - 64px);
}

.catalog-heading { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 22px; }
.catalog-icon { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 14px; background: #eee5f1; color: #80628e; font-size: 20px; }
.catalog-eyebrow { margin: 0 0 3px; color: #9a84a2; font-size: 9px; font-weight: 750; letter-spacing: .13em; }
.catalog-heading > div > p:last-child { margin: 6px 0 0; color: #887b90; font-size: 13px; }

.title {
  color: #50435e;
  font-size: 27px;
  font-weight: 750;
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

/* CARD */
.card {
  background: #fffffff0;
  border: 1px solid #e5dce8;
  border-radius: 18px;
  padding: 20px;
  position: relative;
  box-shadow: 0 8px 24px #55475e0c;
  transition: transform .18s, box-shadow .18s, border-color .18s;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-3px);
  border-color: #d9c9df;
  box-shadow: 0 14px 34px #55475e16;
}

/* BADGE */
.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #80628e;
  color: white;
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 999px;
}

/* TEXT */
.course-name {
  padding-right: 78px;
  color: #50435e;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.desc {
  font-size: 13px;
  color: #81758a;
  min-height: 44px;
  line-height: 1.65;
}

/* PACKAGES */
.packages {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pkg {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  align-items: center;
  gap: 4px 12px;
  font-size: 13px;
  padding: 6px 10px;
  background: #f8f4f9;
  border: 1px solid #eee6f0;
  border-radius: 10px;
}
.pkg-copy { display: grid; gap: 2px; min-width: 0; }
.pkg-copy strong { color: #695973; font-size: 12px; }
.pkg-copy small, .pkg > small { color: #998aa1; font-size: 9px; }
.pkg > small { grid-column: 1 / -1; }

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
  background: #80628e;
  color: white;
}

.btn.success {
  background: #5f8b70;
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
  z-index: 2000;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.modal-box {
  background: white;
  width: min(680px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 26px;
  border: 1px solid #e7dfea;
  border-radius: 20px;
  box-shadow: 0 24px 80px #30253a42;
}
.modal-box h3 { margin: 0 0 8px; color: #50435e; font-size: 22px; }

.sub {
  color: #666;
  margin-bottom: 16px;
}
.coupon-form { padding: 14px; margin-bottom: 16px; border: 1px solid #ece4ef; border-radius: 12px; background: #faf7fb; }
.coupon-form > label { display: block; margin-bottom: 7px; color: #675a70; font-size: 12px; font-weight: 650; }
.coupon-form .btn { width: auto; flex-shrink: 0; border: 1px solid #80628e; color: #705582; background: white; }
.coupon-form small { display: block; margin-top: 7px; color: #968a9c; font-size: 10px; line-height: 1.5; }

.package-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.package-card {
  border: 1px solid #e7dfea;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  transition: 0.2s;
}

.package-card:hover {
  transform: translateY(-2px);
  border-color: #bba5c5;
}

.pkg-title {
  font-weight: 700;
}

.pkg-time {
  font-size: 12px;
  color: #666;
}

.pkg-price {
  color: #71547f;
  font-weight: 700;
  margin: 6px 0;
}

.buy-btn {
  width: 100%;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: #80628e;
  color: white;
}

.close {
  margin-top: 12px;
  width: 100%;
  padding: 10px;
  border: none;
  background: #f1edf3;
  color: #6f6277;
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
  background:#a77542;
  color:white;
}
@media (max-width: 1000px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) {
  .grid, .package-grid { grid-template-columns: 1fr; }
  .page { padding: 14px 0 40px; }
  .modal { align-items: flex-end; padding: 0; }
  .modal-box { width: 100%; max-height: 90dvh; padding: 22px 18px max(22px,env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; }
  .catalog-heading { margin-top: 4px; }
  .title { font-size: 23px; }
  .card { padding: 18px; }
  .coupon-form .d-flex { flex-direction: column; }
  .coupon-form .btn { width: 100%; }
}
</style>

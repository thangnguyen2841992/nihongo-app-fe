<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, watch} from "vue"
import { useRoute, useRouter } from "vue-router"
import { getWallet } from "@/services/walletApi"
import { purchaseCourse } from "@/services/coursePurchase"
import { useAuthState } from "@/services/authState"
import {gatewayUrl, publicClient} from "@/api/authApi"
import { saveLearningPosition } from '@/api/learningPosition'

const router = useRouter()
const route = useRoute()
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
  levelId?: number | null
  active: string
  packages: CoursePackage[]
}

interface MyCourse {
  courseId: number
  packageId?: number | null
  expiredAt: string
  startedAt: string | null
  lastBookId: number | null
  lastLessonId: number | null
}

const courses = ref<Course[]>([])
const registering = ref<number | null>(null)
const isRenewMode = ref(false)
const showPackageModal = ref(false)
const selectedCourse = ref<Course | null>(null)
const myCourses = ref<MyCourse[]>([])
const subscriptionsByCourse = computed(() => new Map(myCourses.value.map(course => [course.courseId, course])))
let subscriptionRequest: AbortController | undefined
let catalogRequest: AbortController | undefined
// Messages stay on the page (no browser dialogs): errors inside the package window, success above the catalog.
const purchaseError = ref('')
const insufficientFunds = ref(false)
const purchased = ref<{ courseId: number; courseName: string; renewal: boolean; expiredAt?: string } | null>(null)
const balance = ref<number | null>(null)
interface SyllabusBook { bookId: number; bookName: string; lessons: number }
const syllabus = ref<Record<number, SyllabusBook[] | 'loading' | 'error'>>({})
async function toggleSyllabus(course: Course) {
  const current = syllabus.value[course.courseId]
  if (current && current !== 'error') { const next = { ...syllabus.value }; delete next[course.courseId]; syllabus.value = next; return }
  if (!course.levelId) { syllabus.value = { ...syllabus.value, [course.courseId]: [] }; return }
  syllabus.value = { ...syllabus.value, [course.courseId]: 'loading' }
  try {
    const { data } = await publicClient.get<SyllabusBook[]>(`/api/staff/public/levels/${course.levelId}/syllabus`, { withCredentials: false })
    syllabus.value = { ...syllabus.value, [course.courseId]: Array.isArray(data) ? data : [] }
  } catch { syllabus.value = { ...syllabus.value, [course.courseId]: 'error' } }
}
/** Early renewal keeps the current package (the server enforces it); after expiry any package can be chosen. */
const modalPackages = computed(() => {
  const course = selectedCourse.value
  if (!course) return []
  const current = subscriptionsByCourse.value.get(course.courseId)
  if (isRenewMode.value && current && !isExpired(course.courseId) && current.packageId)
    return course.packages.filter(p => p.packageId === current.packageId)
  return course.packages
})
const payable = (p: CoursePackage) => couponQuotes.value[p.packageId]?.payable ?? p.price
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
  purchaseError.value = ''; insufficientFunds.value = false; purchased.value = null
  showPackageModal.value = true
  balance.value = null
  void getWallet().then(wallet => { if (showPackageModal.value) balance.value = wallet.balance }).catch(() => { balance.value = null })
}
function purchaseFailed(e: any, fallback: string) {
  const message: string = e?.response?.data?.message || fallback
  insufficientFunds.value = /số dư không đủ/i.test(message)
  purchaseError.value = message
}

const subscribe = async (packageId: number) => {
  if (!isAuthenticated.value) { void goToLogin(); return }
  if (!selectedCourse.value || registering.value !== null) return

  try {
    registering.value = selectedCourse.value.courseId

    await purchaseCourse(userEmail?.value || "current", selectedCourse.value.courseId, packageId, false, couponCode.value.trim() || undefined, couponQuotes.value[packageId]?.payable ?? selectedCourse.value.packages.find(p => p.packageId === packageId)?.price)

    const course = selectedCourse.value
    await loadMyCourses().catch(() => {})
    purchased.value = { courseId: course.courseId, courseName: course.courseName, renewal: false }
    showPackageModal.value = false
    selectedCourse.value = null

  } catch (e: any) {
    console.error(e)
    purchaseFailed(e, "Đăng ký thất bại. Có thể thử lại cùng yêu cầu.")
  } finally {
    registering.value = null
  }
}

const loadCourses = async () => {
  catalogRequest?.abort()
  const controller = new AbortController()
  catalogRequest = controller
  loading.value = true
  loadError.value = ""
  try {
    const res = await publicClient.get("/api/nihongo-user/courses", { withCredentials: false, signal: controller.signal })
    if (controller.signal.aborted) return
    courses.value = res.data
  } catch {
    if (!controller.signal.aborted) loadError.value = "Không thể tải danh sách khóa học. Vui lòng thử lại."
  } finally { if (!controller.signal.aborted) loading.value = false }
}

const loadMyCourses = async () => {
  subscriptionRequest?.abort()
  if (!isAuthenticated.value) return
  const controller = new AbortController()
  subscriptionRequest = controller
  const res = await gatewayUrl.get<MyCourse[]>("/api/nihongo-user/my-courses-dto", { signal: controller.signal })
  if (controller.signal.aborted) return
  myCourses.value = res.data
}

const isExpired = (courseId: number) => {
  const course = subscriptionsByCourse.value.get(courseId)

  if (!course) return false

  return new Date(course.expiredAt).getTime() < Date.now()
}

const getExpiredDate = (courseId: number) => {
  const course = subscriptionsByCourse.value.get(courseId)

  if (!course) return ""

  return new Date(course.expiredAt).toLocaleDateString("vi-VN")
}

const isRegistered = (id: number) =>
  subscriptionsByCourse.value.has(id);
const renewSubscription = async (packageId: number) => {

  if (!isAuthenticated.value) { void goToLogin(); return }
  if (!selectedCourse.value || registering.value !== null) return

  try {

    registering.value = selectedCourse.value.courseId

    await purchaseCourse(userEmail?.value || "current", selectedCourse.value.courseId, packageId, true, couponCode.value.trim() || undefined, couponQuotes.value[packageId]?.payable ?? selectedCourse.value.packages.find(p => p.packageId === packageId)?.price)

    const course = selectedCourse.value
    showPackageModal.value = false
    selectedCourse.value = null
    await loadMyCourses().catch(() => {})
    purchased.value = { courseId: course.courseId, courseName: course.courseName, renewal: true, expiredAt: subscriptionsByCourse.value.get(course.courseId)?.expiredAt }

  } catch (e: any) {

    console.error(e)
    purchaseFailed(e, "Gia hạn thất bại. Có thể thử lại cùng yêu cầu.")

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
  const course = subscriptionsByCourse.value.get(courseId)
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
// "Gia hạn" links from My courses / reminders arrive as /courses?renew=<courseId>.
watch(() => [route.query.renew, courses.value, myCourses.value] as const, ([renew]) => {
  const id = Number(renew)
  if (!Number.isInteger(id) || id <= 0 || showPackageModal.value || !isRegistered(id)) return
  const course = courses.value.find(c => c.courseId === id)
  if (!course) return
  openPackageModal(course, true)
  void router.replace({ query: { ...route.query, renew: undefined } })
})
watch(() => [isAuthenticated.value, userEmail.value] as const, ([authenticated], _, cleanup) => {
  subscriptionRequest?.abort()
  cleanup(() => subscriptionRequest?.abort())
  myCourses.value = []
  showPackageModal.value = false
  if (authenticated) {
    const pending = loadMyCourses()
    const controller = subscriptionRequest
    void pending.catch(() => {
      if (!controller?.signal.aborted) loadError.value = "Không thể tải trạng thái đăng ký khóa học. Vui lòng thử lại."
    })
  }
}, { immediate: true })
onUnmounted(() => { catalogRequest?.abort(); subscriptionRequest?.abort() })
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
    <div v-else-if="loadError" role="alert" class="learn-alert warning">
      <i class="bi bi-wifi-off" aria-hidden="true"></i><span>{{ loadError }}</span> <button type="button" @click="loadCourses">Thử lại</button>
    </div>

    <div v-if="purchased" class="purchase-done" role="status">
      <p><i class="bi bi-check-circle" aria-hidden="true"></i>
        {{ purchased.renewal ? 'Đã gia hạn' : 'Đã đăng ký' }} <strong>{{ purchased.courseName }}</strong><template v-if="purchased.expiredAt"> · học đến {{ new Date(purchased.expiredAt).toLocaleDateString('vi-VN') }}</template>.</p>
      <div class="purchase-actions"><button type="button" class="btn primary" @click="continueLearning(purchased.courseId)">Vào học ngay</button><button type="button" class="link-button" @click="purchased = null">Đóng</button></div>
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
      <i class="bi bi-circle-fill" aria-hidden="true"></i> Đã hết hạn
      {{ getExpiredDate(course.courseId) }}
    </span>

            <span
              v-else
              class="active"
            >
      <i class="bi bi-circle-fill" aria-hidden="true"></i> Đang học
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

        <div class="syllabus">
          <button type="button" class="link-button" :aria-expanded="Boolean(syllabus[course.courseId] && syllabus[course.courseId] !== 'error')" @click="toggleSyllabus(course)">
            <i class="bi bi-journals" aria-hidden="true"></i> {{ syllabus[course.courseId] && syllabus[course.courseId] !== 'error' ? 'Ẩn giáo trình' : 'Xem giáo trình trong khóa' }}
          </button>
          <p v-if="syllabus[course.courseId] === 'loading'" role="status">Đang tải giáo trình...</p>
          <p v-else-if="syllabus[course.courseId] === 'error'" role="alert">Chưa tải được giáo trình. <button type="button" class="link-button" @click="toggleSyllabus(course)">Thử lại</button></p>
          <template v-else-if="Array.isArray(syllabus[course.courseId])">
            <ul v-if="(syllabus[course.courseId] as SyllabusBook[]).length"><li v-for="book in (syllabus[course.courseId] as SyllabusBook[])" :key="book.bookId">{{ book.bookName }} <small>· {{ book.lessons }} bài</small></li></ul>
            <p v-else>Giáo trình đang được chuẩn bị.</p>
          </template>
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
    <i class="bi" :class="isExpired(course.courseId) ? 'bi-arrow-repeat' : 'bi-play-fill'" aria-hidden="true"></i> {{ isExpired(course.courseId) ? "Gia hạn" : "Học tiếp" }}
</span>

            <span v-else-if="registering === course.courseId">
              <i class="bi bi-hourglass-split" aria-hidden="true"></i> Đang xử lý
            </span>

            <span v-else>
              <template v-if="isAuthenticated"><i class="bi bi-bag-plus" aria-hidden="true"></i> Mua khóa học</template><template v-else>Đăng nhập để đăng ký</template>
            </span>
          </button>
          <button v-if="isRegistered(course.courseId) && !isExpired(course.courseId)" type="button" class="btn renew-early"
                  :disabled="registering === course.courseId" @click="renewCourse(course.courseId)">
            Gia hạn thêm
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
        <p class="sub wallet-line">Số dư hiện tại: <strong>{{ balance === null ? '…' : `${balance.toLocaleString('vi-VN')}đ` }}</strong> · <RouterLink to="/wallet">Nạp tiền vào ví</RouterLink></p>
        <p v-if="isRenewMode && selectedCourse && !isExpired(selectedCourse.courseId)" class="sub">Khóa học còn hạn: thời gian mới được cộng tiếp vào ngày hết hạn hiện tại, giữ nguyên gói đang dùng.</p>
        <p v-if="purchaseError" role="alert" class="purchase-error">{{ purchaseError }} <RouterLink v-if="insufficientFunds" to="/wallet">Nạp tiền ngay</RouterLink></p>
        <form class="coupon-form" @submit.prevent="applyCoupon"><label for="purchase-coupon">Mã giảm giá (nếu có)</label><div class="d-flex gap-2"><input id="purchase-coupon" v-model="couponCode" class="form-control" maxlength="32" :disabled="couponBusy || registering !== null" placeholder="Nhập mã giảm giá"><button class="btn btn-outline-primary" :disabled="couponBusy || registering !== null || !couponCode.trim()">{{ couponBusy ? 'Đang kiểm tra...' : 'Kiểm tra mã' }}</button></div><small>Mỗi mã dùng một lần cho mỗi tài khoản. Kiểm tra mã để xem số tiền thanh toán.</small><p v-if="couponError" role="alert" class="text-danger">{{ couponError }}</p></form>
        <div class="package-grid">

          <div
            v-for="p in modalPackages"
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
              {{ payable(p).toLocaleString("vi-VN") }}đ
            </div>
            <small v-if="balance !== null && payable(p) > balance" class="purchase-error">Cần nạp thêm {{ (payable(p) - balance).toLocaleString('vi-VN') }}đ</small>

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
.course-status .bi-circle-fill { font-size: 8px; vertical-align: middle; margin-right: 4px; }
.purchase-done { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 16px; padding: 14px 16px; border: 1px solid #b7dfc6; border-radius: 12px; background: #eefaf2; color: #24583a; }
.purchase-done p { margin: 0; }
.purchase-done i { margin-right: 6px; }
.purchase-error { color: #b42318; }
.wallet-line a, .purchase-error a { font-weight: 600; }
.syllabus { margin: 8px 0 4px; font-size: 13px; }
.link-button { padding: 0; border: 0; background: none; color: #6b4f86; font-size: 13px; font-weight: 600; text-decoration: underline; cursor: pointer; }
.purchase-actions { display: flex; align-items: center; gap: 12px; }
.purchase-actions .btn { width: auto; padding: 8px 16px; }
.syllabus ul { margin: 6px 0 0; padding-left: 18px; }
.syllabus small { color: #6b7280; }
.btn.renew-early { margin-top: 8px; background: transparent; border: 1px solid #b9a6c4; color: #6b4f86; }
.guest-intro { padding: 36px 0 30px; max-width: 760px; }
.intro-label { color: #866692; font-size: var(--learn-text-xs); font-weight: 750; letter-spacing: 1.5px; }
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
.catalog-eyebrow { margin: 0 0 3px; color: #9a84a2; font-size: var(--learn-text-xs); font-weight: 750; letter-spacing: .13em; }
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
.pkg-copy small, .pkg > small { color: #998aa1; font-size: var(--learn-text-xs); }
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
.coupon-form small { display: block; margin-top: 7px; color: #968a9c; font-size: var(--learn-text-xs); line-height: 1.5; }

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

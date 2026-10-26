<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { getMyCourses, type MyCourse } from '@/api/study'
import { saveLearningPosition } from '@/api/learningPosition'
import { useAuthState } from '@/services/authState'

const emit = defineEmits<{ navigate: [] }>()
const { isAuthenticated, userEmail, userRole } = useAuthState()
const owner = computed(() =>
  isAuthenticated.value && userRole.value.replace(/^ROLE_/, '') === 'USER' ? userEmail.value : '',
)
const route = useRoute(),
  router = useRouter()
const courses = ref<MyCourse[]>([]),
  loading = ref(false),
  error = ref(''),
  opening = ref<number | null>(null)
const now = ref(Date.now())
const activeCourses = computed(() =>
  courses.value
    .filter((course) => Date.parse(course.expiredAt) > now.value)
    .sort((a, b) => recent(b) - recent(a)),
)
function recent(course: MyCourse) {
  return Date.parse(course.lastStudiedAt || course.startedAt || course.enrolledAt) || 0
}
function destination(course: MyCourse) {
  return course.lastBookId
    ? {
        name: 'CourseBookDetail',
        params: { bookId: course.lastBookId },
        query: {
          courseId: String(course.courseId),
          ...(course.lastLessonId ? { lessonId: String(course.lastLessonId) } : {}),
        },
      }
    : { name: 'CourseBooks', params: { courseId: course.courseId } }
}
function isCurrent(course: MyCourse) {
  return Number(route.query.courseId || route.params.courseId) === course.courseId
}
function isN3(course: MyCourse) {
  return /\bN\s*3\b/i.test(course.courseName.normalize('NFKC'))
}
function sections(course: MyCourse) {
  const params = { courseId: course.courseId }
  return [
    { name: 'CourseBooks', label: 'Giáo trình sách', icon: 'bi-journal-bookmark', to: { name: 'CourseBooks', params } },
    { name: 'course-vocabulary-flashcards', label: 'Flashcard từ vựng', icon: 'bi-card-text', to: { name: 'course-vocabulary-flashcards', params } },
    { name: 'course-conversation-listening', label: 'Hội thoại', icon: 'bi-headphones', to: { name: 'course-conversation-listening', params } },
  ]
}
function isSectionCurrent(course: MyCourse, name: string) {
  return isCurrent(course) && (route.name === name || (name === 'CourseBooks'
    && ['CourseBookDetail', 'course-lesson-exercises'].includes(String(route.name))))
}
function progress(course: MyCourse) {
  return Math.round(Math.max(0, Math.min(100, Number(course.progress) || 0)))
}
let request: AbortController | undefined,
  disposed = false,
  lastLoaded = 0,
  ownerVersion = 0,
  selectionVersion = 0
const startRequests = new Map<number, Promise<void>>()
async function load(force = false) {
  now.value = Date.now()
  if (!owner.value || disposed || (loading.value && !force)) return
  request?.abort()
  const controller = new AbortController()
  request = controller
  loading.value = true
  error.value = ''
  try {
    const result = await getMyCourses(controller.signal)
    if (!controller.signal.aborted && !disposed) {
      courses.value = result
      lastLoaded = Date.now()
    }
  } catch {
    if (!controller.signal.aborted && !disposed) error.value = 'Chưa tải được khóa học.'
  } finally {
    if (!controller.signal.aborted && !disposed) loading.value = false
  }
}
async function openCourse(event: MouseEvent, course: MyCourse, target?: RouteLocationRaw) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (!(Date.parse(course.expiredAt) > Date.now())) {
    error.value = 'Khóa học đã hết hạn.'
    now.value = Date.now()
    return
  }
  const currentOwner = owner.value
  const version = ownerVersion
  const selection = ++selectionVersion
  const isOwner = () => Boolean(currentOwner) && currentOwner === owner.value && version === ownerVersion && !disposed
  const isLatest = () => isOwner() && selection === selectionVersion
  opening.value = course.courseId
  error.value = ''
  try {
    if (!course.startedAt) {
      let start = startRequests.get(course.courseId)
      if (!start) {
        start = saveLearningPosition(course.courseId)
        startRequests.set(course.courseId, start)
      }
      try { await start }
      finally {
        if (startRequests.get(course.courseId) === start) startRequests.delete(course.courseId)
      }
    }
    if (!isOwner()) return
    if (!course.startedAt) course.startedAt = new Date().toISOString()
    if (!isLatest()) return
    await router.push(target ?? destination(course))
    if (isLatest()) emit('navigate')
  } catch {
    if (isLatest())
      error.value = 'Chưa mở được khóa học. Vui lòng thử lại.'
  } finally {
    if (isLatest()) opening.value = null
  }
}
function refreshIfStale() {
  now.value = Date.now()
  if (!document.hidden && Date.now() - lastLoaded > 30000) void load()
}
function membershipChanged() {
  void load(true)
}
watch(
  owner,
  () => {
    ownerVersion++
    selectionVersion++
    startRequests.clear()
    request?.abort()
    courses.value = []
    loading.value = false
    opening.value = null
    error.value = ''
    lastLoaded = 0
    if (owner.value) void load()
  },
  { immediate: true },
)
watch(() => route.fullPath, refreshIfStale)
onMounted(() => {
  window.addEventListener('focus', refreshIfStale)
  window.addEventListener('wallet:changed', membershipChanged)
})
onBeforeUnmount(() => {
  disposed = true
  request?.abort()
  window.removeEventListener('focus', refreshIfStale)
  window.removeEventListener('wallet:changed', membershipChanged)
})
</script>

<template>
  <div class="sidebar-my-courses" aria-label="Khóa học đang tham gia" :aria-busy="loading">
    <p v-if="loading && !courses.length" class="course-message" role="status">Đang tải khóa học…</p>
    <p v-if="error" class="course-message course-error" role="alert">
      {{ error }} <button type="button" :disabled="loading" @click="load()">Thử lại</button>
    </p>
    <ul v-if="activeCourses.length" class="quick-courses">
      <li v-for="course in activeCourses" :key="course.courseId">
        <a
          :href="router.resolve(destination(course)).href"
          class="quick-course"
          :class="{ selected: isCurrent(course) }"
          :aria-current="isCurrent(course) ? (isN3(course) ? 'location' : 'page') : undefined"
          :aria-busy="opening === course.courseId"
          :title="course.courseName"
          @click="openCourse($event, course)"
          ><i class="bi bi-book" aria-hidden="true"></i
          ><span
            ><strong>{{ course.courseName }}</strong
            ><small>{{
              opening === course.courseId
                ? 'Đang mở…'
                : `${progress(course)}% · ${course.startedAt ? 'Học tiếp' : 'Bắt đầu học'}`
            }}</small></span
          ></a
        >
        <ul v-if="isN3(course)" class="course-sections" :aria-label="`Nội dung ${course.courseName}`">
          <li v-for="section in sections(course)" :key="section.name">
            <a
              :href="router.resolve(section.to).href"
              class="course-section"
              :class="{ selected: isSectionCurrent(course, section.name) }"
              :aria-current="isSectionCurrent(course, section.name) ? 'page' : undefined"
              @click="openCourse($event, course, section.to)"
            ><i class="bi" :class="section.icon" aria-hidden="true"></i><span>{{ section.label }}</span></a>
          </li>
        </ul>
      </li>
    </ul>
    <p v-else-if="!loading && !error" class="course-message">Chưa có khóa học còn hạn.</p>
  </div>
</template>

<style scoped>
.sidebar-my-courses {
  margin: 0 0 10px 15px;
  padding-left: 9px;
  border-left: 1px solid #ddd0e0;
  min-width: 0;
}
.quick-courses {
  list-style: none;
  padding: 0;
  margin: 0;
}
.quick-course {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 8px 6px;
  border-radius: 8px;
  color: #84728e;
  text-decoration: none;
  min-width: 0;
}
.quick-course > i {
  flex-shrink: 0;
  font-size: 14px;
  margin-top: 2px;
  color: #a083ad;
}
.quick-course > span {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.quick-course strong {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.quick-course small {
  font-size: var(--learn-text-sm);
  color: #85768f;
}
.quick-course:hover,
.quick-course.selected {
  background: #ece0f1;
  color: #73538a;
}
.quick-course[aria-busy='true'] {
  opacity: 0.65;
  cursor: wait;
}
.quick-course:focus-visible,
.course-section:focus-visible,
.course-message button:focus-visible {
  outline: 2px solid #b59ac7;
  outline-offset: 2px;
}
.course-sections {
  list-style: none;
  margin: 2px 0 9px 12px;
  padding: 0 0 0 6px;
  border-left: 1px solid #ddd0e0;
}
.course-section {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px;
  border-radius: 7px;
  color: #84728e;
  font-size: var(--learn-text-sm);
  line-height: 1.5;
  text-decoration: none;
}
.course-section i { flex-shrink: 0; font-size: 14px; }
.course-section span { min-width: 0; overflow-wrap: anywhere; }
.course-section:hover,
.course-section.selected { color: #73538a; background: #ece0f1; }
.course-section.selected { font-weight: 650; }
.course-message {
  padding: 7px 5px;
  margin: 0;
  color: #a18dab;
  font-size: var(--learn-text-sm);
  line-height: 1.6;
}
.course-error {
  color: #a65063;
}
.course-message button {
  border: 0;
  background: transparent;
  color: #76588b;
  text-decoration: underline;
  padding: 2px;
  font: inherit;
}
</style>

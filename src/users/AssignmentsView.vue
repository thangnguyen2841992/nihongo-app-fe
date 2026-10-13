<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { readFeature, writeFeature, featureError, type Assignment, type Attempt, type Page } from '@/services/additionalFeatures'
import OpsPager from '@/components/operations/OpsPager.vue'
import './studyPages.css'

const router = useRouter()
const rows = ref<Page<Assignment>>({ content: [], number: 0, totalPages: 0, totalElements: 0 })
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | undefined
const openCount = computed(() => rows.value.content.filter(item => Date.parse(item.startsAt) <= now.value && Date.parse(item.dueAt) >= now.value).length)

async function load(page = 0) {
  if (busy.value) return
  busy.value = true
  loading.value = true
  error.value = ''
  try { rows.value = await readFeature('/api/nihongo-user/study/assignments', { page }) }
  catch (cause) { error.value = featureError(cause) }
  finally { busy.value = false; loading.value = false }
}

async function start(id: number) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const attempt = await writeFeature<Attempt>(`/api/nihongo-user/study/assignments/${id}/start`)
    await router.push(`/user/attempts/${attempt.id}`)
  } catch (cause) { error.value = featureError(cause) }
  finally { busy.value = false }
}

function time(value: string) {
  return new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}
function state(item: Assignment) {
  if (Date.parse(item.startsAt) > now.value) return 'upcoming'
  if (Date.parse(item.dueAt) < now.value) return 'closed'
  return 'open'
}
function stateLabel(item: Assignment) {
  return state(item) === 'upcoming' ? 'Sắp mở' : state(item) === 'closed' ? 'Đã hết hạn' : 'Đang mở'
}

onMounted(() => { void load(); clockTimer = setInterval(() => { now.value = Date.now() }, 60_000) })
onBeforeUnmount(() => clearInterval(clockTimer))
</script>

<template>
  <div class="study-page">
    <header class="study-hero assignment-hero">
      <div><p class="study-eyebrow">Luyện tập</p><h1>Bài được giao & thi online</h1><p>Theo dõi thời gian mở đề, hạn nộp và tiếp tục bài đang làm trên mọi thiết bị.</p></div>
      <button class="study-button secondary" :disabled="busy" @click="load(rows.number)"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i>Cập nhật</button>
    </header>

    <p v-if="error" class="study-error" role="alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ error }} <button type="button" @click="load(rows.number)">Thử lại</button></p>
    <div v-if="loading" class="study-loading" role="status"><span class="study-spinner" aria-hidden="true"></span><span>Đang tải danh sách bài...</span></div>

    <template v-else>
      <div v-if="rows.content.length" class="assignment-overview">
        <span><strong>{{ rows.totalElements }}</strong> bài được giao</span>
        <span><strong>{{ openCount }}</strong> bài đang mở trên trang này</span>
      </div>
      <section v-if="!rows.content.length" class="study-empty empty-assignment">
        <span class="empty-icon"><i class="bi bi-clipboard-check" aria-hidden="true"></i></span>
        <h2>Chưa có bài được giao</h2>
        <p>Bài tập và đề thi từ lớp học sẽ xuất hiện tại đây.</p>
        <RouterLink class="study-button secondary" to="/"><i class="bi bi-house-heart" aria-hidden="true"></i>Về trang học hôm nay</RouterLink>
      </section>
      <div v-else class="assignment-list">
        <article v-for="item in rows.content" :key="item.id" class="assignment-card">
          <div class="assignment-main">
            <div class="assignment-title-row">
              <span class="assignment-type"><i class="bi" :class="item.kind === 'EXAM' ? 'bi-stopwatch' : 'bi-pencil-square'" aria-hidden="true"></i>{{ item.kind === 'EXAM' ? 'Bài thi' : 'Bài tập' }}</span>
              <span class="study-badge" :class="{ success: state(item) === 'open', danger: state(item) === 'closed', warning: state(item) === 'upcoming' }">{{ stateLabel(item) }}</span>
            </div>
            <h2>{{ item.title }}</h2>
            <div class="assignment-times">
              <span><i class="bi bi-calendar-check" aria-hidden="true"></i><span>Mở lúc<strong>{{ time(item.startsAt) }}</strong></span></span>
              <span><i class="bi bi-calendar-x" aria-hidden="true"></i><span>Hạn nộp<strong>{{ time(item.dueAt) }}</strong></span></span>
              <span v-if="item.kind === 'EXAM'"><i class="bi bi-hourglass-split" aria-hidden="true"></i><span>Thời gian<strong>{{ item.minutes }} phút</strong></span></span>
            </div>
          </div>
          <button class="study-button assignment-action" :disabled="busy || state(item) !== 'open'" @click="start(item.id)">
            <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>{{ state(item) === 'upcoming' ? 'Chưa đến giờ' : state(item) === 'closed' ? 'Đã đóng' : 'Mở bài làm' }}
          </button>
        </article>
      </div>
      <OpsPager :page="rows.number" :total-pages="rows.totalPages" :total-elements="rows.totalElements" :busy="busy" @change="load" />
    </template>
  </div>
</template>

<style scoped>
.assignment-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.assignment-hero > div { min-width: 0; }.assignment-hero .study-button { position: relative; z-index: 1; flex-shrink: 0; }
.assignment-overview { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 0; }.assignment-overview span { padding: 8px 12px; border: 1px solid #e4dbe7; border-radius: 999px; background: #ffffffc7; color: #85768e; font-size: 11px; }.assignment-overview strong { color: #6e537b; font-size: 13px; }
.assignment-list { display: grid; gap: 12px; margin-top: 18px; }.assignment-card { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 22px; border: 1px solid #e5dce8; border-radius: 18px; background: #fffffff0; box-shadow: 0 7px 22px #55475e0c; }.assignment-main { min-width: 0; flex: 1; }.assignment-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }.assignment-type { display: inline-flex; align-items: center; gap: 6px; color: #92769d; font-size: 11px; font-weight: 700; }.assignment-card h2 { margin: 9px 0 16px; color: #50435e; font-size: 18px; overflow-wrap: anywhere; }
.assignment-times { display: flex; flex-wrap: wrap; gap: 12px 22px; }.assignment-times > span { display: flex; align-items: center; gap: 8px; color: #a08da9; font-size: 15px; }.assignment-times > span > span { display: grid; gap: 2px; color: #9a8c9f; font-size: 10px; }.assignment-times strong { color: #695e71; font-size: 12px; }.assignment-action { flex-shrink: 0; min-width: 132px; }
.empty-assignment { display: grid; justify-items: center; gap: 10px; margin-top: 20px; }.empty-assignment h2,.empty-assignment p { margin: 0; }.empty-icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; background: #f0e7f3; color: #856793; font-size: 22px; }
:deep(.ops-pager) { color: #8b7b93; font-size: 12px; }:deep(.ops-button) { min-height: 40px; border-color: #d9cbe1; background: white; color: #765786; border-radius: 10px; }
@media(max-width:650px) { .assignment-hero { align-items: stretch; flex-direction: column; }.assignment-hero .study-button { width: 100%; }.assignment-card { align-items: stretch; flex-direction: column; padding: 18px; }.assignment-action { width: 100%; }.assignment-times { display: grid; gap: 10px; } }
</style>

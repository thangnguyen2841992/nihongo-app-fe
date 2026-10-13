<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { readFeature, featureError, type Page, type Refund } from '@/services/additionalFeatures'
import { money } from '@/services/operationsApi'
import OpsPager from '@/components/operations/OpsPager.vue'
import './studyPages.css'

interface Completion { id: number; lessonId: number; name: string; completedAt: string }
interface Recommendation { key: string; title: string; explanation: string; path: string }

const recommendations = ref<Recommendation[]>([])
const completed = ref<Page<Completion>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const refunds = ref<Page<Refund>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const loading = ref(true)
const busySection = ref<'completed' | 'refunds' | null>(null)
const error = ref('')

async function completions(page = 0) {
  busySection.value = 'completed'
  error.value = ''
  try { completed.value = await readFeature('/api/nihongo-user/study/completions', { page }) }
  catch (cause) { error.value = featureError(cause) }
  finally { busySection.value = null }
}
async function refundPage(page = 0) {
  busySection.value = 'refunds'
  error.value = ''
  try { refunds.value = await readFeature('/api/nihongo-user/study/refunds', { page }) }
  catch (cause) { error.value = featureError(cause) }
  finally { busySection.value = null }
}
async function load() {
  loading.value = true
  error.value = ''
  const results = await Promise.allSettled([
    readFeature<Recommendation[]>('/api/nihongo-user/study/recommendations'),
    readFeature<Page<Completion>>('/api/nihongo-user/study/completions', { page: 0 }),
    readFeature<Page<Refund>>('/api/nihongo-user/study/refunds', { page: 0 }),
  ])
  if (results[0].status === 'fulfilled') recommendations.value = results[0].value
  if (results[1].status === 'fulfilled') completed.value = results[1].value
  if (results[2].status === 'fulfilled') refunds.value = results[2].value
  const failed = results.find(result => result.status === 'rejected')
  if (failed?.status === 'rejected') error.value = `Một số dữ liệu chưa tải được. ${featureError(failed.reason)}`
  loading.value = false
}
function refundStatus(value: string) {
  return ({ PENDING: 'Đang xử lý', APPROVED: 'Đã hoàn tiền', REJECTED: 'Không được duyệt', CANCELLED: 'Đã hủy' } as Record<string, string>)[value] || value
}
function date(value: string) { return new Date(value).toLocaleString('vi-VN') }

onMounted(load)
</script>

<template>
  <div class="study-page">
    <header class="study-hero"><p class="study-eyebrow">Học tập</p><h1>Lộ trình của tôi</h1><p>Gợi ý bước học tiếp theo dựa trên lịch ôn, kết quả gần nhất và quyền truy cập khóa học.</p></header>
    <p v-if="error" class="study-error" role="alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ error }} <button type="button" @click="load">Tải lại</button></p>
    <div v-if="loading" class="study-loading" role="status"><span class="study-spinner" aria-hidden="true"></span><span>Đang xây dựng lộ trình của bạn...</span></div>

    <template v-else>
      <section class="plan-section" aria-labelledby="next-step-title">
        <div class="section-title"><div><p class="study-eyebrow">Ưu tiên hôm nay</p><h2 id="next-step-title">Bước học tiếp theo</h2></div><RouterLink class="study-button ghost" to="/"><i class="bi bi-house-heart" aria-hidden="true"></i>Học hôm nay</RouterLink></div>
        <div v-if="recommendations.length" class="recommendation-grid">
          <RouterLink v-for="(item, index) in recommendations" :key="item.key" :to="item.path" class="recommendation-card">
            <span class="recommendation-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <div><h3>{{ item.title }}</h3><p>{{ item.explanation }}</p></div>
            <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </RouterLink>
        </div>
        <div v-else class="study-empty">Chưa có gợi ý mới. Bạn có thể tiếp tục khóa học gần nhất từ trang Học hôm nay.</div>
      </section>

      <section class="study-panel plan-panel">
        <div class="study-section-heading">
          <div class="study-heading-copy"><span class="study-icon"><i class="bi bi-check2-circle" aria-hidden="true"></i></span><div><h2>Bài đã hoàn thành</h2><p>Tiến độ do bạn đánh dấu trong màn hình bài học.</p></div></div>
          <span class="study-badge">{{ completed.totalElements }} bài</span>
        </div>
        <div v-if="completed.content.length" class="completion-list">
          <article v-for="item in completed.content" :key="item.id"><span class="completion-check"><i class="bi bi-check-lg" aria-hidden="true"></i></span><div><strong>{{ item.name }}</strong><time :datetime="item.completedAt">Hoàn thành {{ date(item.completedAt) }}</time></div></article>
        </div>
        <p v-else class="study-empty">Bạn chưa đánh dấu hoàn thành bài học nào.</p>
        <OpsPager :page="completed.number" :total-pages="completed.totalPages" :total-elements="completed.totalElements" :busy="busySection === 'completed'" @change="completions" />
      </section>

      <section class="study-panel plan-panel">
        <div class="study-section-heading">
          <div class="study-heading-copy"><span class="study-icon"><i class="bi bi-receipt" aria-hidden="true"></i></span><div><h2>Yêu cầu hoàn tiền</h2><p>Theo dõi các yêu cầu liên quan đến giao dịch khóa học.</p></div></div>
          <RouterLink class="study-button secondary" to="/wallet"><i class="bi bi-wallet2" aria-hidden="true"></i>Mở ví</RouterLink>
        </div>
        <div v-if="refunds.content.length" class="refund-list">
          <article v-for="item in refunds.content" :key="item.id">
            <div><strong>Giao dịch #{{ item.purchaseId }}</strong><span>{{ item.reviewNote || item.reason }}</span></div>
            <div class="refund-side"><strong>{{ money(item.amount) }}</strong><span class="study-badge" :class="{ success: item.status === 'APPROVED', danger: ['REJECTED','CANCELLED'].includes(item.status), warning: item.status === 'PENDING' }">{{ refundStatus(item.status) }}</span></div>
          </article>
        </div>
        <p v-else class="study-empty">Chưa có yêu cầu hoàn tiền.</p>
        <OpsPager :page="refunds.number" :total-pages="refunds.totalPages" :total-elements="refunds.totalElements" :busy="busySection === 'refunds'" @change="refundPage" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.plan-section { margin-top: 24px; }.section-title { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 14px; }.section-title h2 { margin: 0; color: #50435e; font-size: 21px; }.section-title .study-eyebrow { margin-bottom: 4px !important; }
.recommendation-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 12px; }.recommendation-card { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px; min-width: 0; padding: 18px; border: 1px solid #e4dbe7; border-radius: 16px; background: #fffffff0; color: #594d61; box-shadow: 0 6px 20px #55475e0a; }.recommendation-card:hover { border-color: #d4c2da; background: #fff; }.recommendation-card h3 { margin: 0 0 5px; font-size: 15px; }.recommendation-card p { margin: 0; color: #85798c; font-size: 12px; line-height: 1.6; }.recommendation-number { color: #b09ab9; font-size: 12px; font-weight: 750; }.recommendation-card > i { color: #9b80a7; }
.plan-panel { margin-top: 20px; }.completion-list,.refund-list { display: grid; }.completion-list article,.refund-list article { display: flex; align-items: center; gap: 12px; padding: 14px 2px; border-top: 1px solid #eee8f0; }.completion-check { display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%; background: #eaf5ef; color: #5f8b70; }.completion-list article > div { display: grid; gap: 4px; }.completion-list strong,.refund-list strong { color: #615568; font-size: 13px; }.completion-list time,.refund-list span { color: #94889b; font-size: 11px; }
.refund-list article { justify-content: space-between; }.refund-list article > div:first-child { display: grid; min-width: 0; gap: 5px; }.refund-side { display: flex; align-items: flex-end; flex-direction: column; flex-shrink: 0; gap: 7px; }
:deep(.ops-pager) { color: #8b7b93; font-size: 12px; }:deep(.ops-button) { min-height: 40px; border-color: #d9cbe1; background: white; color: #765786; border-radius: 10px; }
@media(max-width:600px) { .section-title { align-items: flex-start; flex-direction: column; }.recommendation-grid { grid-template-columns: minmax(0,1fr); }.refund-list article { align-items: flex-start; flex-direction: column; }.refund-side { align-items: flex-start; }.study-section-heading .study-button { width: 100%; } }
</style>

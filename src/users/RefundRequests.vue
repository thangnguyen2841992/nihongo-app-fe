<script setup lang="ts">
import { ref } from 'vue'
import { readFeature, featureError, type Page, type Refund } from '@/services/additionalFeatures'
import { money } from '@/services/operationsApi'
import OpsPager from '@/components/operations/OpsPager.vue'

// Refunds are money matters, so they live on the wallet page. Loaded only when the section is opened.
const refunds = ref<Page<Refund>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const loaded = ref(false), busy = ref(false), error = ref('')
async function load(page = 0) {
  busy.value = true; error.value = ''
  try { refunds.value = await readFeature<Page<Refund>>('/api/nihongo-user/study/refunds', { page }); loaded.value = true }
  catch (cause) { error.value = featureError(cause) }
  finally { busy.value = false }
}
function opened(event: Event) { if ((event.target as HTMLDetailsElement).open && !loaded.value && !busy.value) void load() }
function status(value: string) {
  return ({ PENDING: 'Đang xử lý', APPROVED: 'Đã hoàn tiền', REJECTED: 'Không được duyệt', CANCELLED: 'Đã hủy' } as Record<string, string>)[value] || value
}
</script>

<template>
  <details class="refund-requests" @toggle="opened">
    <summary><i class="bi bi-receipt" aria-hidden="true"></i> Yêu cầu hoàn tiền khóa học</summary>
    <p v-if="busy && !loaded" role="status">Đang tải...</p>
    <p v-if="error" role="alert" class="refund-error">{{ error }} <button type="button" @click="load(refunds.number)">Thử lại</button></p>
    <template v-if="loaded">
      <div v-if="refunds.content.length" class="refund-list">
        <article v-for="item in refunds.content" :key="item.id">
          <div><strong>Giao dịch #{{ item.purchaseId }}</strong><span>{{ item.reviewNote || item.reason }}</span></div>
          <div class="refund-side"><strong>{{ money(item.amount) }}</strong><span class="refund-status" :class="item.status.toLowerCase()">{{ status(item.status) }}</span></div>
        </article>
      </div>
      <p v-else class="refund-empty">Chưa có yêu cầu hoàn tiền. Cần hoàn tiền một khóa học, hãy liên hệ hỗ trợ.</p>
      <OpsPager :page="refunds.number" :total-pages="refunds.totalPages" :total-elements="refunds.totalElements" :busy="busy" @change="load" />
    </template>
  </details>
</template>

<style scoped>
.refund-requests { margin-top: 20px; padding: 16px 18px; border: 1px solid #e4dbe7; border-radius: 16px; background: #fffffff0; }
.refund-requests summary { color: #594d61; font-weight: 650; cursor: pointer; }
.refund-list { display: grid; margin-top: 10px; }
.refund-list article { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 2px; border-top: 1px solid #eee8f0; }
.refund-list article > div:first-child { display: grid; min-width: 0; gap: 4px; }
.refund-list strong { color: #615568; font-size: 13px; }
.refund-list span { color: #94889b; font-size: 12px; }
.refund-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.refund-status { padding: 3px 8px; border-radius: 999px; background: #f1eef3; font-weight: 650; }
.refund-status.approved { background: #eaf5ef; color: #2f6b47; }
.refund-status.pending { background: #fff6e5; color: #8a5a00; }
.refund-status.rejected, .refund-status.cancelled { background: #fdecec; color: #9b1c1c; }
.refund-empty { margin: 10px 0 0; color: #85798c; font-size: 13px; }
.refund-error { color: #b42318; }
@media (max-width: 600px) { .refund-list article { flex-direction: column; align-items: flex-start; } .refund-side { align-items: flex-start; } }
</style>

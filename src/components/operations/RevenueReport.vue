<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { downloadCsv, featureError } from '@/services/additionalFeatures'
import { onMounted, ref } from 'vue'
import { getOps, opsError, commerceBase, money, type Revenue } from '@/services/operationsApi'
import './operations.css'
const today = new Date()
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const to = ref(localDay(today)), from = ref(localDay(new Date(today.getFullYear(),today.getMonth(),1)))
const data = ref<Revenue | null>(null), loading = ref(false), error = ref('')
const request = useLatestRequest()
async function load() {
 const pending = request.begin(); loading.value = true; error.value = ''
 try { const result = await getOps<Revenue>(commerceBase + '/revenue', { from: from.value, to: to.value }, pending.signal); if (pending.isCurrent()) data.value = result }
 catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
onMounted(load)
async function exportCsv(){try{await downloadCsv(commerceBase+'/revenue/export','doanh-thu.csv',{from:from.value,to:to.value})}catch(cause){error.value=featureError(cause)}}
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Báo cáo doanh thu</h1><p>Giao dịch mua khóa và gia hạn được tách khỏi tiền nạp ví.</p></div></header><form class="ops-panel ops-form" @submit.prevent="load"><label>Từ ngày<input v-model="from" type="date" required :max="to"></label><label>Đến ngày<input v-model="to" type="date" required :min="from"></label><button class="ops-button" :disabled="loading">Xem báo cáo</button><button class="ops-button secondary" type="button" :disabled="loading" @click="exportCsv">Xuất CSV</button><p class="ops-muted wide">Khoảng tối đa 366 ngày, gồm cả ngày kết thúc; thời điểm theo múi giờ hệ thống.</p></form><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="loading" role="status">Đang tổng hợp doanh thu...</p>
<template v-if="data && !loading"><div class="ops-grid"><article class="ops-panel"><h2>Mua khóa mới</h2><div class="ops-number">{{ money(data.sales) }}</div></article><article class="ops-panel"><h2>Gia hạn</h2><div class="ops-number">{{ money(data.renewals) }}</div></article><article class="ops-panel"><h2>Doanh số trước hoàn tiền</h2><div class="ops-number">{{ money(data.sales + data.renewals) }}</div></article><article class="ops-panel"><h2>Hoàn về ví</h2><div class="ops-number">{{ money(data.refunds || 0) }}</div></article><article class="ops-panel"><h2>Bán khóa sau hoàn tiền</h2><div class="ops-number">{{ money(data.sales + data.renewals - (data.refunds || 0)) }}</div></article><article class="ops-panel"><h2>Nạp ví đã duyệt</h2><div class="ops-number">{{ money(data.walletDeposits) }}</div><p class="ops-muted">Theo ngày đối soát thành công, không cộng vào doanh thu bán khóa.</p></article></div><section class="ops-panel"><h2>Theo khóa học</h2><div class="ops-table-wrap"><table v-if="data.byCourse.length" class="ops-table"><thead><tr><th>Khóa</th><th>Loại giao dịch</th><th>Số lượt</th><th>Số tiền thực thu</th></tr></thead><tbody><tr v-for="item in data.byCourse" :key="`${item.courseId}:${item.renewal}`"><td>{{ item.courseName }}</td><td>{{ item.renewal ? 'Gia hạn' : 'Mua mới' }}</td><td>{{ item.purchases }}</td><td>{{ money(item.amount) }}</td></tr></tbody></table></div><p v-if="!data.byCourse.length" class="ops-empty">Chưa có giao dịch bán khóa trong khoảng ngày này.</p><p class="ops-muted">Số tiền thực thu đã trừ khuyến mãi, lấy từ giao dịch đã hoàn tất.</p></section></template></div></template>


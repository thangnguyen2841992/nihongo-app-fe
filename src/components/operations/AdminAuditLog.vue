<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { downloadCsv, featureError } from '@/services/additionalFeatures'
import { ref, watch } from 'vue'
import { getOps, opsError, contentBase, commerceBase, dateTime, type OpsPage, type Audit, type ReviewEntry, type Revision } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
import './operations.css'
const tab = ref('commerce'), loading = ref(false), error = ref('')
const rows = ref<OpsPage<Audit>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const tabs = [{ key: 'commerce', label: 'Khóa, giá & khuyến mãi' }, { key: 'accounts', label: 'Tài khoản & quyền' }, { key: 'deposits', label: 'Đối soát tiền' }, { key: 'reviews', label: 'Duyệt nội dung' }, { key: 'revisions', label: 'Sửa & khôi phục' }, { key: 'operations', label: 'Báo lỗi & đề luyện' }, { key: 'notification', label: 'Vận hành email' }]
const actions: Record<string,string> = { COURSE_CREATE: 'Tạo khóa', COURSE_UPDATE: 'Sửa khóa', PACKAGE_CREATE: 'Tạo gói', PACKAGE_UPDATE: 'Sửa giá / gói', PROMOTION_CREATE: 'Tạo khuyến mãi', PROMOTION_UPDATE: 'Sửa khuyến mãi', INVITE: 'Mời tài khoản', ROLE_CHANGE: 'Đổi quyền', STATUS_CHANGE: 'Đổi trạng thái tài khoản', DEPOSIT_SUCCESS: 'Duyệt nạp tiền', DEPOSIT_CANCELLED: 'Từ chối nạp tiền', SUBMIT: 'Gửi duyệt', PUBLISH: 'Xuất bản', RETURN_DRAFT: 'Chuyển về nháp', ASSIGN: 'Phân công', REVIEW_FEEDBACK: 'Phản hồi duyệt', EDIT: 'Sửa nội dung', RESTORE: 'Khôi phục nội dung' }
const request = useLatestRequest()
const exportFrom=ref(''),exportTo=ref('')
async function exportCsv(){const path=tab.value==='accounts'?'/api/users/admin/audit/export':tab.value==='operations'?contentBase+'/audit/operations/export':tab.value==='reviews'?contentBase+'/audit/reviews/export':tab.value==='revisions'?contentBase+'/audit/revisions/export':tab.value==='deposits'?commerceBase+'/deposit-audit/export':commerceBase+'/audit/export';try{await downloadCsv(path,'nhat-ky.csv',{from:exportFrom.value||undefined,to:exportTo.value||undefined})}catch(cause){error.value=featureError(cause)}}
async function load(page = 0) {
 const pending = request.begin(); loading.value = true; error.value = ''
 try {
  let result: OpsPage<Audit>
  if (tab.value === 'reviews') { const r = await getOps<OpsPage<ReviewEntry>>(contentBase + '/audit/reviews', { page }, pending.signal); result = { ...r, content: r.content.map(e => ({ id: e.id, actor: e.actor, action: e.action, target: 'Sách ' + e.bookId, detail: (e.note || '') + (e.assignee ? ' · giao ' + e.assignee : ''), createdAt: e.createdAt })) } }
  else if (tab.value === 'revisions') { const r = await getOps<OpsPage<Revision>>(contentBase + '/audit/revisions', { page }, pending.signal); result = { ...r, content: r.content.map(e => ({ id: e.id, actor: e.actor, action: e.action, target: e.kind + ' ' + e.resourceId, detail: 'Sách ' + e.bookId + ' · bản trước thao tác đã được lưu', createdAt: e.createdAt })) } }
  else { const path = tab.value === 'notification' ? '/api/notification/admin/operations/audit' : tab.value === 'accounts' ? '/api/users/admin/audit' : tab.value === 'operations' ? contentBase + '/audit/operations' : commerceBase + (tab.value === 'deposits' ? '/deposit-audit' : '/audit'); result = await getOps<OpsPage<Audit>>(path, { page }, pending.signal) }
  if (pending.isCurrent()) rows.value = result
 } catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
watch(tab, () => { void load() }, { immediate: true })
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Nhật ký quản trị</h1><p>Tra cứu người thao tác, thời gian và nội dung thay đổi.</p></div><button class="ops-button secondary" :disabled="loading" @click="load(rows.number)">Tải lại</button><button v-if="tab !== 'notification'" class="ops-button secondary" :disabled="loading" @click="exportCsv">Xuất CSV</button><label>Từ ngày xuất<input v-model="exportFrom" type="date"></label><label>Đến ngày xuất<input v-model="exportTo" type="date"></label></header><div class="ops-actions" role="tablist" aria-label="Nguồn nhật ký"><button v-for="t in tabs" :key="t.key" role="tab" :aria-selected="tab === t.key" class="ops-button" :class="{ secondary: tab !== t.key }" @click="tab = t.key">{{ t.label }}</button></div><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="loading" role="status">Đang tải nhật ký...</p><section v-else class="ops-panel"><div class="ops-table-wrap"><table v-if="rows.content.length" class="ops-table"><thead><tr><th>Thời gian</th><th>Người thao tác</th><th>Hành động</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead><tbody><tr v-for="a in rows.content" :key="a.id"><td>{{ dateTime(a.createdAt) }}</td><td>{{ a.actor }}</td><td>{{ actions[a.action] || a.action }}</td><td>{{ a.target }}</td><td class="ops-content">{{ a.detail }}</td></tr></tbody></table></div><p v-if="!rows.content.length" class="ops-empty">Chưa có thao tác được ghi ở nhóm này.</p><OpsPager v-bind="{ page: rows.number, totalPages: rows.totalPages, totalElements: rows.totalElements, busy: loading }" @change="load" /></section></div></template>

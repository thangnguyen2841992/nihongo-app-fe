<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getOps, sendOps, opsError, contentBase, plain, dateTime, type Revision, type RevisionHistory } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
import './operations.css'
const route = useRoute()
const kind = ref('BOOK'), resourceId = ref<number | null>(null), history = ref<RevisionHistory | null>(null), selected = ref<Revision | null>(null)
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const kinds: Record<string,string> = { BOOK: 'Sách', LESSON: 'Bài học', GRAMMAR: 'Ngữ pháp', EXAMPLE: 'Câu ví dụ', EXERCISE: 'Câu hỏi' }
const labels: Record<string,string> = { bookName: 'Tên sách', description: 'Mô tả', levelId: 'Cấp độ', typeId: 'Loại sách', name: 'Tên bài', reading: 'Bài đọc', audioTrack: 'Track nghe', audioImportId: 'Nguồn file nghe', audioAssetId: 'File nghe', title: 'Tiêu đề', imageUrl: 'Ảnh', nihongo: 'Tiếng Nhật', vietnamese: 'Tiếng Việt', contentNihongo: 'Câu hỏi', answerA: 'Lựa chọn A', answerB: 'Lựa chọn B', answerC: 'Lựa chọn C', answerD: 'Lựa chọn D', correctAnswer: 'Đáp án', lessonId: 'Bài học', exerciseTypeId: 'Dạng bài' }
function fields(value: string) { return JSON.parse(value) as Record<string,string | number | null> }
const currentFields = computed(() => history.value ? fields(history.value.current) : {})
const selectedFields = computed(() => selected.value ? fields(selected.value.snapshot) : {})
function value(v: string | number | null | undefined) { return typeof v === 'string' ? plain(v) : v ?? 'Trống' }
const request = useLatestRequest()
async function load(page = 0) {
 if (!resourceId.value || resourceId.value <= 0) { error.value = 'Chọn mã nội dung hợp lệ.'; return }
 const pending = request.begin(), type = kind.value, resource = resourceId.value; loading.value = true; error.value = ''; selected.value = null
 try { const r = await getOps<RevisionHistory>(`${contentBase}/revisions/${type}/${resource}`, { page }, pending.signal); if (pending.isCurrent() && kind.value === type && resourceId.value === resource) history.value = r }
 catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
async function restore() {
 if (!selected.value || !history.value || busy.value || !confirm('Khôi phục nội dung về phiên bản đang xem? Nội dung hiện tại sẽ được lưu để có thể khôi phục lại.')) return
 busy.value = true; error.value = ''
 try { await sendOps('post', `${contentBase}/revisions/${kind.value}/${resourceId.value}/restore`, { revisionId: selected.value.id, token: history.value.token }); notice.value = 'Đã khôi phục nội dung. Sách vẫn ở trạng thái bản nháp.'; await load() }
 catch (e) { error.value = opsError(e) } finally { busy.value = false }
}
watch([kind,resourceId], () => { history.value = null; selected.value = null; request.cancel(); loading.value = false }, { flush: 'sync' })
watch(() => route.query, query => { if (typeof query.kind === 'string' && kinds[query.kind]) kind.value = query.kind; if (Number(query.id) > 0) { resourceId.value = Number(query.id); void load() } }, { immediate: true })
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Phiên bản nội dung</h1><p>Xem nội dung trước mỗi lần sửa và khôi phục khi cần.</p></div></header><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="notice" class="ops-notice" role="status">{{ notice }}</p><form class="ops-form ops-panel" @submit.prevent="load()"><label>Loại nội dung<select v-model="kind" :disabled="busy"><option v-for="(label,key) in kinds" :key="key" :value="key">{{ label }}</option></select></label><label>Mã nội dung<input v-model.number="resourceId" type="number" min="1" required :disabled="busy"></label><button class="ops-button" :disabled="loading || busy">Xem lịch sử</button><p class="ops-muted wide">Có thể mở trực tiếp lịch sử từ ngân hàng câu hỏi hoặc trang chỉnh sửa sách/bài. Khôi phục chỉ áp dụng cho sách ở trạng thái bản nháp.</p></form><p v-if="loading" role="status">Đang tải phiên bản...</p>
<section v-if="history && !loading" class="ops-panel"><h2>Nội dung hiện tại</h2><div class="ops-table-wrap"><table class="ops-table"><tbody><tr v-for="(v,key) in currentFields" :key="key"><th>{{ labels[key] || key }}</th><td class="ops-content">{{ value(v) }}</td></tr></tbody></table></div><h2 style="margin-top:22px">Các bản trước lần sửa</h2><div class="ops-table-wrap"><table v-if="history.revisions.content.length" class="ops-table"><thead><tr><th>Ngày lưu</th><th>Người sửa</th><th>Thao tác</th><th></th></tr></thead><tbody><tr v-for="item in history.revisions.content" :key="item.id"><td>{{ dateTime(item.createdAt) }}</td><td>{{ item.actor }}</td><td>{{ item.action === 'RESTORE' ? 'Trước khi khôi phục' : 'Trước khi sửa' }}</td><td><button class="ops-button secondary" :disabled="busy" @click="selected = item">So sánh phiên bản</button></td></tr></tbody></table></div><p v-if="!history.revisions.content.length" class="ops-empty">Chưa có lần sửa được ghi kể từ khi bật lịch sử phiên bản.</p><OpsPager v-bind="{ page: history.revisions.number, totalPages: history.revisions.totalPages, totalElements: history.revisions.totalElements, busy: loading || busy }" @change="load" /></section>
<section v-if="selected && history" class="ops-panel"><h2>So sánh với bản lưu {{ dateTime(selected.createdAt) }}</h2><div class="ops-table-wrap"><table class="ops-table"><thead><tr><th>Nội dung</th><th>Bản đã lưu</th><th>Hiện tại</th></tr></thead><tbody><tr v-for="(v,key) in selectedFields" :key="key" :style="currentFields[key] !== v ? 'background:#fff8e8' : ''"><th>{{ labels[key] || key }}</th><td class="ops-content">{{ value(v) }}</td><td class="ops-content">{{ value(currentFields[key]) }}</td></tr></tbody></table></div><div class="ops-actions"><button class="ops-button" :disabled="busy" @click="restore">Khôi phục bản này</button><button class="ops-button secondary" :disabled="busy" @click="selected = null">Đóng so sánh</button></div></section></div></template>

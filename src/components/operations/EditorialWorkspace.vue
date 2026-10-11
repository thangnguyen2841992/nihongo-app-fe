<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import { getOps, sendOps, opsError, contentBase, issueLabels, categoryLabels, publicationLabels, reviewActionLabels, dateTime, type Member, type Issue, type ReviewBook, type ReviewEntry, type OpsPage } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
import './operations.css'
const props = withDefaults(defineProps<{ initialTab?: 'issues' | 'reviews' }>(), { initialTab: 'issues' })
const { userRole } = useAuthState()
const admin = computed(() => userRole.value === 'ADMIN')
const tab = ref(props.initialTab), status = ref('OPEN'), bookStatus = ref('IN_REVIEW')
const directory = ref<Member[]>([]), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const issueRows = ref<OpsPage<Issue>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const reviewRows = ref<OpsPage<ReviewBook>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const selectedIssue = ref<Issue | null>(null), selectedBook = ref<ReviewBook | null>(null)
const issueForm = ref({ status: 'OPEN', assignee: '', resolution: '' })
const reviewForm = ref({ assignee: '', note: '' })
const history = ref<OpsPage<ReviewEntry>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const request = useLatestRequest()
const historyRequest = useLatestRequest()
async function load(page = 0) {
 const pending = request.begin(); historyRequest.cancel(); loading.value = true; error.value = ''; selectedIssue.value = null; selectedBook.value = null
 try {
  if (tab.value === 'issues') { const r = await getOps<OpsPage<Issue>>(contentBase + '/issues', { status: status.value || undefined, page }, pending.signal); if (pending.isCurrent()) issueRows.value = r }
  else { const r = await getOps<OpsPage<ReviewBook>>(contentBase + '/reviews', { status: bookStatus.value, page }, pending.signal); if (pending.isCurrent()) reviewRows.value = r }
 } catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
function editIssue(item: Issue) { selectedIssue.value = { ...item }; issueForm.value = { status: item.status, assignee: item.assignee || '', resolution: item.resolution || '' }; notice.value = '' }
async function saveIssue() {
 if (!selectedIssue.value || busy.value) return
 busy.value = true; error.value = ''
 try { await sendOps('put', `${contentBase}/issues/${selectedIssue.value.id}`, { ...issueForm.value, assignee: issueForm.value.assignee || null, version: selectedIssue.value.version }); notice.value = 'Đã cập nhật báo lỗi.'; await load(issueRows.value.number) }
 catch (e) { error.value = opsError(e) } finally { busy.value = false }
}
async function openBook(item: ReviewBook) {
 selectedBook.value = item; reviewForm.value = { assignee: item.assignee || '', note: '' }; notice.value = ''; history.value = { content: [], number: 0, totalElements: 0, totalPages: 0 }
 await loadHistory()
}
async function loadHistory(page = 0) {
 if (!selectedBook.value) return
 const id = selectedBook.value.bookId
 const pending = historyRequest.begin()
 try { const result = await getOps<OpsPage<ReviewEntry>>(`${contentBase}/reviews/${id}/history`, { page }, pending.signal); if (pending.isCurrent() && selectedBook.value?.bookId === id) history.value = result }
 catch (e) { if (pending.isCurrent()) error.value = opsError(e) }
}
async function review(action: string) {
 if (!selectedBook.value || busy.value) return
 busy.value = true; error.value = ''
 try { await sendOps('post', `${contentBase}/reviews/${selectedBook.value.bookId}`, { action, ...reviewForm.value, assignee: reviewForm.value.assignee || null, expectedStatus: selectedBook.value.status }); notice.value = 'Đã lưu quyết định duyệt và phản hồi.'; await load(reviewRows.value.number) }
 catch (e) { error.value = opsError(e) } finally { busy.value = false }
}
function name(id: string | null) { return directory.value.find(m => m.userId === id)?.name || id || 'Chưa phân công' }
watch([tab, status, bookStatus], () => { void load() }, { immediate: true })
onMounted(async () => { try { directory.value = await getOps<Member[]>('/api/users/staff-directory') } catch (e) { error.value = opsError(e, 'Chưa tải được danh sách người xử lý.') } })
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Báo lỗi & duyệt nội dung</h1><p>Phân công xử lý, phản hồi rõ ràng và theo dõi những lần duyệt.</p></div><button class="ops-button secondary" :disabled="loading || busy" @click="load()">Tải lại</button></header>
<div class="ops-actions" role="tablist" aria-label="Quản lý nội dung"><button role="tab" class="ops-button" :class="{ secondary: tab !== 'issues' }" :aria-selected="tab === 'issues'" :disabled="busy" @click="tab = 'issues'">Báo lỗi học viên</button><button role="tab" class="ops-button" :class="{ secondary: tab !== 'reviews' }" :aria-selected="tab === 'reviews'" :disabled="busy" @click="tab = 'reviews'">Duyệt sách & phản hồi</button></div>
<p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="notice" class="ops-notice" role="status">{{ notice }}</p><p v-if="loading" role="status">Đang tải...</p>
<template v-if="tab === 'issues'"><form class="ops-form ops-panel" @submit.prevent="load()"><label>Trạng thái<select v-model="status" :disabled="busy"><option value="">Tất cả</option><option v-for="(label,key) in issueLabels" :key="key" :value="key">{{ label }}</option></select></label></form>
<section v-if="!loading" class="ops-panel"><div v-if="issueRows.content.length" class="ops-table-wrap"><table class="ops-table"><thead><tr><th>Bài / câu</th><th>Loại lỗi</th><th>Mô tả</th><th>Trạng thái / người xử lý</th><th></th></tr></thead><tbody><tr v-for="item in issueRows.content" :key="item.id"><td>{{ item.lessonId }}<span v-if="item.exerciseId"> / {{ item.exerciseId }}</span><p class="ops-muted">{{ dateTime(item.createdAt) }}</p></td><td>{{ categoryLabels[item.category] }}</td><td class="ops-content">{{ item.detail }}</td><td>{{ issueLabels[item.status] }}<br><span class="ops-muted">{{ name(item.assignee) }}</span></td><td><button class="ops-button secondary" :disabled="busy" @click="editIssue(item)">Xử lý</button></td></tr></tbody></table></div><p v-else class="ops-empty">Chưa có báo lỗi thuộc nhóm này.</p><OpsPager v-bind="{ page: issueRows.number, totalPages: issueRows.totalPages, totalElements: issueRows.totalElements, busy: loading || busy }" @change="load" /></section>
<section v-if="selectedIssue" class="ops-panel"><h2>Xử lý báo lỗi · Bài {{ selectedIssue.lessonId }}</h2><p class="ops-content">{{ selectedIssue.detail }}</p><form class="ops-form" @submit.prevent="saveIssue"><label>Trạng thái<select v-model="issueForm.status"><option v-for="(label,key) in issueLabels" :key="key" :value="key">{{ label }}</option></select></label><label>Người xử lý<select v-model="issueForm.assignee"><option value="">Chưa phân công</option><option v-for="m in directory" :key="m.userId" :value="m.userId">{{ m.name }} · {{ m.role }}</option></select></label><label class="wide">Phản hồi / cách xử lý<textarea v-model="issueForm.resolution" maxlength="2000" rows="3" :required="['RESOLVED','DISMISSED'].includes(issueForm.status)"></textarea></label><button class="ops-button" :disabled="busy">Lưu xử lý</button><RouterLink class="ops-button secondary" :to="`/staff/lesson/${selectedIssue.lessonId}/exercises`">Mở bài tập</RouterLink></form></section></template>
<template v-else><form class="ops-form ops-panel" @submit.prevent="load()"><label>Trạng thái sách<select v-model="bookStatus" :disabled="busy"><option v-for="(label,key) in publicationLabels" :key="key" :value="key">{{ label }}</option></select></label></form>
<section v-if="!loading" class="ops-panel"><article v-for="item in reviewRows.content" :key="item.bookId" style="border-bottom:1px solid #e3eaf4;padding:14px 0"><h2>{{ item.name }}</h2><p><span class="ops-badge">{{ publicationLabels[item.status] }}</span> · {{ name(item.assignee) }}</p><div class="ops-actions"><button class="ops-button secondary" :disabled="busy" @click="openBook(item)">Phản hồi & lịch sử duyệt</button><RouterLink class="ops-button secondary" :to="`/staff/books/${item.bookId}`">Xem nội dung</RouterLink></div></article><p v-if="!reviewRows.content.length" class="ops-empty">Chưa có sách thuộc trạng thái này.</p><OpsPager v-bind="{ page: reviewRows.number, totalPages: reviewRows.totalPages, totalElements: reviewRows.totalElements, busy: loading || busy }" @change="load" /></section>
<section v-if="selectedBook" class="ops-panel"><h2>{{ selectedBook.name }}</h2><form class="ops-form" @submit.prevent><label v-if="admin">Giao người xử lý<select v-model="reviewForm.assignee"><option value="">Chưa phân công</option><option v-for="m in directory" :key="m.userId" :value="m.userId">{{ m.name }}</option></select></label><label class="wide">Ghi chú duyệt / yêu cầu sửa<textarea v-model="reviewForm.note" rows="3" maxlength="2000" placeholder="Ghi rõ nội dung cần sửa khi trả bài"></textarea></label><div class="ops-actions wide"><button v-if="selectedBook.status === 'DRAFT'" type="button" class="ops-button" :disabled="busy" @click="review('SUBMIT')">Gửi duyệt</button><button v-if="admin && selectedBook.status === 'IN_REVIEW'" type="button" class="ops-button" :disabled="busy" @click="review('PUBLISH')">Duyệt xuất bản</button><button v-if="admin && selectedBook.status === 'IN_REVIEW'" type="button" class="ops-button secondary" :disabled="busy" @click="review('REQUEST_CHANGES')">Trả bài yêu cầu sửa</button><button v-if="admin" type="button" class="ops-button secondary" :disabled="busy" @click="review('ASSIGN')">Lưu phân công</button></div></form><h3>Lịch sử duyệt</h3><article v-for="item in history.content" :key="item.id" style="border-top:1px solid #e3eaf4;padding:12px 0"><strong>{{ reviewActionLabels[item.action] || item.action }}</strong><p class="ops-content">{{ item.note }}</p><p class="ops-muted">{{ name(item.actor) }} · {{ dateTime(item.createdAt) }}<span v-if="item.assignee"> · giao {{ name(item.assignee) }}</span></p></article><p v-if="!history.content.length" class="ops-muted">Chưa có lịch sử duyệt được ghi.</p><OpsPager v-bind="{ page: history.number, totalPages: history.totalPages, totalElements: history.totalElements, busy }" @change="loadHistory" /></section></template></div></template>


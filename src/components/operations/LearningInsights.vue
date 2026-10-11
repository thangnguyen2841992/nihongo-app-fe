<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { computed, ref, watch } from 'vue'
import { getOps, opsError, dateTime, type OpsPage } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
import LearnerNotes from './LearnerNotes.vue'
import './operations.css'
interface Row { lessonId?: number; exerciseId?: number; attempts?: number; learners?: number; averageScore?: number; lastWrong?: string; userId?: string; lastStudiedAt?: string | null; courses?: number; recentScore?: number; previousScore?: number; lastAttempt?: string }
interface Learner { userId: string; name: string; email: string }
const tab = ref('lessons'), loading = ref(false), error = ref(''), selected = ref<string | null>(null)
const names = ref<Record<string,Learner>>({})
const rows = ref<OpsPage<Row>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const request = useLatestRequest()
const support = computed(() => tab.value === 'inactive' || tab.value === 'declining')
const tabs = [{ key: 'lessons', label: 'Chất lượng bài tập' }, { key: 'questions', label: 'Câu đang sai nhiều' }, { key: 'inactive', label: 'Ít hoạt động' }, { key: 'declining', label: 'Điểm đang giảm' }]
async function load(page = 0) {
 const pending = request.begin(); loading.value = true; error.value = ''; selected.value = null
 try {
  const result = await getOps<OpsPage<Row>>(`/api/nihongo-user/staff/analytics/${tab.value}`, { page }, pending.signal)
  if (!pending.isCurrent()) return
  rows.value = result
  const ids = result.content.flatMap(r => r.userId ? [r.userId] : [])
  if (ids.length) {
   try { const learners = await getOps<Learner[]>('/api/users/staff/learners', { ids: ids.join(',') }, pending.signal); if (pending.isCurrent()) names.value = Object.fromEntries(learners.map(l => [l.userId,l])) }
   catch { /* IDs still identify students when the directory is unavailable. */ }
  }
 } catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
watch(tab, () => { void load() }, { immediate: true })
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Chất lượng học tập & hỗ trợ</h1><p>Nhận diện nội dung khó và học viên cần được quan tâm.</p></div><button class="ops-button secondary" :disabled="loading" @click="load(rows.number)">Tải lại</button></header><div class="ops-actions" role="tablist" aria-label="Báo cáo học tập"><button v-for="item in tabs" :key="item.key" class="ops-button" :class="{ secondary: tab !== item.key }" role="tab" :aria-selected="tab === item.key" @click="tab = item.key">{{ item.label }}</button></div>
<p class="ops-muted">{{ tab === 'lessons' ? 'Điểm trung bình và số lượt nộp trong 30 ngày gần nhất, xếp từ điểm thấp.' : tab === 'questions' ? 'Số học viên hiện còn câu này trong danh sách câu sai; không phải tỷ lệ sai của toàn bộ lịch sử.' : tab === 'inactive' ? 'Có khóa còn hạn, đã đăng ký ít nhất 7 ngày và không ghi nhận học/ôn/làm bài trong 7 ngày.' : 'Điểm trung bình 7 ngày gần nhất giảm ít nhất 10 điểm so với 23 ngày trước đó. Cần có dữ liệu ở cả hai giai đoạn.' }}</p>
<p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="loading" role="status">Đang tải báo cáo...</p><section v-else class="ops-panel"><div v-if="rows.content.length" class="ops-table-wrap"><table class="ops-table"><thead><tr v-if="tab === 'lessons'"><th>Bài</th><th>Lượt nộp</th><th>Học viên</th><th>Điểm TB</th><th></th></tr><tr v-else-if="tab === 'questions'"><th>Câu hỏi</th><th>Bài</th><th>Học viên còn sai</th><th>Lần sai gần nhất</th><th></th></tr><tr v-else><th>Học viên</th><th>{{ tab === 'inactive' ? 'Lần mở bài gần nhất' : 'Điểm trước → gần đây' }}</th><th>{{ tab === 'inactive' ? 'Khóa còn hạn' : 'Lần làm gần nhất' }}</th><th></th></tr></thead>
<tbody><tr v-for="(row,index) in rows.content" :key="row.userId || row.exerciseId || row.lessonId || index"><template v-if="tab === 'lessons'"><td>Bài {{ row.lessonId }}</td><td>{{ row.attempts }}</td><td>{{ row.learners }}</td><td>{{ Math.round(row.averageScore || 0) }}</td><td><RouterLink class="ops-button secondary" :to="`/staff/lesson/${row.lessonId}/exercises`">Xem bài</RouterLink></td></template><template v-else-if="tab === 'questions'"><td>{{ row.exerciseId }}</td><td>{{ row.lessonId }}</td><td>{{ row.learners }}</td><td>{{ dateTime(row.lastWrong || null) }}</td><td><RouterLink class="ops-button secondary" :to="`/staff/lesson/${row.lessonId}/exercises`">Kiểm tra câu hỏi</RouterLink></td></template><template v-else><td>{{ names[row.userId!]?.name || row.userId }}<br><span class="ops-muted">{{ names[row.userId!]?.email || '' }}</span></td><td>{{ tab === 'inactive' ? dateTime(row.lastStudiedAt || null) : `${Math.round(row.previousScore || 0)} → ${Math.round(row.recentScore || 0)}` }}</td><td>{{ tab === 'inactive' ? row.courses : dateTime(row.lastAttempt || null) }}</td><td><button class="ops-button secondary" @click="selected = row.userId || null">Ghi chú hỗ trợ</button></td></template></tr></tbody></table></div><p v-else class="ops-empty">Chưa có dữ liệu thuộc nhóm này.</p><OpsPager v-bind="{ page: rows.number, totalPages: rows.totalPages, totalElements: rows.totalElements, busy: loading }" @change="load" /></section><LearnerNotes v-if="support && selected" :key="selected" :user-id="selected" :name="names[selected]?.name || selected" /></div></template>


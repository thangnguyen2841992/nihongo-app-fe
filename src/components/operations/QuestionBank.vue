<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { onMounted, ref } from 'vue'
import { getOps, sendOps, opsError, contentBase, difficultyLabels, plain, dateTime, type OpsPage, type Question, type Exam, type ExamSummary } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
import './operations.css'
const rows = ref<OpsPage<Question>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const exams = ref<OpsPage<ExamSummary>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const levels = ref<Array<{ levelId: number; levelName: string }>>([]), types = ref<Array<{ exerciseTypeId: number; name: string }>>([])
const level = ref(''), type = ref(''), difficulty = ref(''), search = ref(''), title = ref('')
const selected = ref(new Map<number,Question>()), preview = ref<Exam | null>(null), showKey = ref(false)
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const request = useLatestRequest()
const examsRequest = useLatestRequest()
async function load(page = 0) {
 const pending = request.begin(); loading.value = true; error.value = ''
 try { const r = await getOps<OpsPage<Question>>(contentBase + '/questions', { page, level: level.value || undefined, type: type.value || undefined, difficulty: difficulty.value || undefined, search: search.value }, pending.signal); if (pending.isCurrent()) rows.value = r }
 catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
async function loadExams(page = 0) {
 const pending = examsRequest.begin()
 try { const result = await getOps<OpsPage<ExamSummary>>(contentBase + '/exams', { page }, pending.signal); if (pending.isCurrent()) exams.value = result }
 catch (e) { if (pending.isCurrent()) error.value = opsError(e) }
}
function toggle(q: Question, checked: boolean) { if (checked) selected.value.set(q.id,q); else selected.value.delete(q.id) }
async function setDifficulty(q: Question, value: string) { busy.value = true; error.value = ''; try { await sendOps('put', `${contentBase}/questions/${q.id}/difficulty`, { difficulty: value }); q.difficulty = value } catch (e) { error.value = opsError(e) } finally { busy.value = false } }
async function createExam() {
 if (busy.value || !selected.value.size) return
 busy.value = true; error.value = ''; notice.value = ''
 try { preview.value = await sendOps<Exam>('post', contentBase + '/exams', { title: title.value, questionIds: [...selected.value.keys()] }); showKey.value = false; selected.value.clear(); title.value = ''; notice.value = 'Đã tạo đề. Nội dung câu hỏi được lưu tại thời điểm tạo đề.'; await loadExams() }
 catch (e) { error.value = opsError(e) } finally { busy.value = false }
}
async function openExam(id: number) { busy.value = true; try { preview.value = await getOps<Exam>(`${contentBase}/exams/${id}`); showKey.value = false } catch (e) { error.value = opsError(e) } finally { busy.value = false } }
function exportExam() {
 if (!preview.value) return
 const e = preview.value
 const text = [e.title, ...e.questions.map((q,i) => `${i+1}. ${plain(q.content)}\nA. ${plain(q.answerA)}\nB. ${plain(q.answerB)}\nC. ${plain(q.answerC)}\nD. ${plain(q.answerD)}`), ...(showKey.value ? ['ĐÁP ÁN', e.questions.map((q,i) => `${i+1}: ${q.correctAnswer}`).join(' · ')] : [])].join('\n\n')
 const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = `de-luyen-${e.id}.txt`; a.click(); URL.revokeObjectURL(url)
}
function printExam() { window.print() }
onMounted(async () => {
 const results = await Promise.allSettled([getOps<typeof levels.value>('/api/staff/levels'), getOps<typeof types.value>('/api/staff/exerciseTypes'), load(), loadExams()])
 if (results[0]?.status === 'fulfilled') levels.value = results[0].value
 if (results[1]?.status === 'fulfilled') types.value = results[1].value
 if (results.some(r => r.status === 'rejected')) error.value = 'Một số bộ lọc chưa tải được. Hãy tải lại trang.'
})
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Ngân hàng câu hỏi & tạo đề</h1><p>Chọn câu theo cấp độ, dạng bài và độ khó; lưu đề có nội dung cố định.</p></div></header><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="notice" class="ops-notice" role="status">{{ notice }}</p>
<form class="ops-panel ops-form" @submit.prevent="load()"><label>Cấp độ<select v-model="level"><option value="">Tất cả</option><option v-for="l in levels" :key="l.levelId" :value="l.levelId">{{ l.levelName }}</option></select></label><label>Dạng bài<select v-model="type"><option value="">Tất cả</option><option v-for="t in types" :key="t.exerciseTypeId" :value="t.exerciseTypeId">{{ t.name }}</option></select></label><label>Độ khó<select v-model="difficulty"><option value="">Tất cả</option><option v-for="(label,key) in difficultyLabels" :key="key" :value="key">{{ label }}</option></select></label><label>Tìm trong câu hỏi<input v-model="search" maxlength="200"></label><button class="ops-button" :disabled="loading || busy">Lọc câu hỏi</button></form>
<p v-if="loading" role="status">Đang tải câu hỏi...</p><section v-else class="ops-panel"><article v-for="q in rows.content" :key="q.id" style="padding:14px 0;border-bottom:1px solid #e3eaf4"><div class="ops-select-line"><input type="checkbox" :aria-label="`Chọn câu ${q.id}`" :checked="selected.has(q.id)" :disabled="busy || (!selected.has(q.id) && selected.size >= 100)" @change="toggle(q, ($event.target as HTMLInputElement).checked)"><div style="flex:1;min-width:0"><h3 lang="ja">{{ plain(q.content) }}</h3><p class="ops-muted">{{ q.levelName }} · {{ q.bookName }} · {{ q.lessonName }} · {{ q.typeName }}</p><p>A. {{ plain(q.answerA) }}<br>B. {{ plain(q.answerB) }}<br>C. {{ plain(q.answerC) }}<br>D. {{ plain(q.answerD) }}</p><div class="ops-actions"><span>Đáp án: <strong>{{ q.correctAnswer || 'Chưa có' }}</strong></span><label>Độ khó <select :value="q.difficulty" :disabled="busy" @change="setDifficulty(q, ($event.target as HTMLSelectElement).value)"><option v-for="(label,key) in difficultyLabels" :key="key" :value="key">{{ label }}</option></select></label><RouterLink class="ops-button secondary" :to="{ path: '/staff/revisions', query: { kind: 'EXERCISE', id: q.id } }">Lịch sử sửa câu</RouterLink></div></div></div></article><p v-if="!rows.content.length" class="ops-empty">Không có câu hỏi phù hợp.</p><OpsPager v-bind="{ page: rows.number, totalPages: rows.totalPages, totalElements: rows.totalElements, busy: loading || busy }" @change="load" /></section>
<form class="ops-panel ops-form" @submit.prevent="createExam"><label>Tên đề<input v-model="title" required maxlength="200" placeholder="Ví dụ: Luyện ngữ pháp N3 tuần 1"></label><p>Đã chọn {{ selected.size }} / 100 câu <button type="button" class="ops-button secondary" :disabled="busy" @click="selected.clear()">Bỏ chọn tất cả</button></p><button class="ops-button" :disabled="busy || !selected.size">Tạo đề từ câu đã chọn</button></form>
<section class="ops-panel"><h2>Đề đã tạo</h2><div class="ops-table-wrap"><table v-if="exams.content.length" class="ops-table"><thead><tr><th>Tên đề</th><th>Số câu</th><th>Ngày tạo</th><th></th></tr></thead><tbody><tr v-for="e in exams.content" :key="e.id"><td>{{ e.title }}</td><td>{{ e.questions }}</td><td>{{ dateTime(e.createdAt) }}</td><td><button class="ops-button secondary" :disabled="busy" @click="openExam(e.id)">Xem đề</button></td></tr></tbody></table></div><p v-if="!exams.content.length" class="ops-muted">Chưa có đề nào.</p><OpsPager v-bind="{ page: exams.number, totalPages: exams.totalPages, totalElements: exams.totalElements, busy }" @change="loadExams" /></section>
<section v-if="preview" class="ops-panel ops-print"><h2>{{ preview.title }}</h2><div class="ops-actions"><label><input v-model="showKey" type="checkbox"> Hiện đáp án</label><button class="ops-button secondary" @click="exportExam">Tải đề dạng văn bản</button><button class="ops-button secondary" @click="printExam">In đề</button><button class="ops-button secondary" @click="preview = null">Đóng đề</button></div><article v-for="(q,i) in preview.questions" :key="q.id" class="ops-exam-question"><h3>{{ i + 1 }}. {{ plain(q.content) }}</h3><p>A. {{ plain(q.answerA) }}<br>B. {{ plain(q.answerB) }}<br>C. {{ plain(q.answerC) }}<br>D. {{ plain(q.answerD) }}</p><p v-if="showKey"><strong>Đáp án: {{ q.correctAnswer }}</strong></p></article></section></div></template>


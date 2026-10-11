<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getOps, sendOps, opsError, commerceBase, dateTime, type Promotion, type Catalog, type OpsPage } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
import './operations.css'
const rows = ref<OpsPage<Promotion>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const courses = ref<Catalog[]>([]), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const editing = ref<number | null>(null), showForm = ref(false)
function localTime(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}` }
function defaults() { const now = new Date(), end = new Date(); end.setDate(end.getDate()+30); return { code: '', courseId: '' as string | number, percent: 10, maxUses: 100, startsAt: localTime(now), endsAt: localTime(end), active: true, version: 0 } }
const form = ref(defaults())
async function load(page = 0) { loading.value = true; error.value = ''; try { rows.value = await getOps<OpsPage<Promotion>>(commerceBase + '/promotions', { page }) } catch (e) { error.value = opsError(e) } finally { loading.value = false } }
function edit(p?: Promotion) { editing.value = p?.id || null; form.value = p ? { ...p, courseId: p.courseId || '', startsAt: p.startsAt.slice(0,16), endsAt: p.endsAt.slice(0,16) } : defaults(); showForm.value = true; notice.value = '' }
async function save() {
 if (busy.value) return
 busy.value = true; error.value = ''
 try { await sendOps(editing.value ? 'put' : 'post', commerceBase + '/promotions' + (editing.value ? '/' + editing.value : ''), { ...form.value, courseId: form.value.courseId ? Number(form.value.courseId) : null }); showForm.value = false; notice.value = 'Đã lưu mã giảm giá.'; await load() }
 catch (e) { error.value = opsError(e) } finally { busy.value = false }
}
onMounted(async () => { await Promise.allSettled([load(), getOps<Catalog[]>(commerceBase + '/catalog').then(r => { courses.value = r })]) })
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Mã giảm giá & khuyến mãi</h1><p>Giới hạn thời gian, lượt sử dụng và khóa học được áp dụng.</p></div><button class="ops-button" :disabled="busy" @click="edit()">Tạo mã giảm giá</button></header><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="notice" class="ops-notice" role="status">{{ notice }}</p>
<form v-if="showForm" class="ops-panel ops-form" @submit.prevent="save"><h2 class="wide">{{ editing ? 'Sửa khuyến mãi' : 'Tạo khuyến mãi' }}</h2><label>Mã giảm giá<input v-model="form.code" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_-]{3,32}" :disabled="editing !== null" placeholder="VD: NIHONGO10"></label><label>Khóa áp dụng<select v-model="form.courseId"><option value="">Tất cả khóa</option><option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option></select></label><label>Giảm (%)<input v-model.number="form.percent" required type="number" min="1" max="100"></label><label>Tổng lượt tối đa<input v-model.number="form.maxUses" required type="number" min="1" max="1000000"></label><label>Bắt đầu<input v-model="form.startsAt" required type="datetime-local"></label><label>Kết thúc<input v-model="form.endsAt" required type="datetime-local" :min="form.startsAt"></label><label><span><input v-model="form.active" type="checkbox"> Cho phép sử dụng</span></label><p class="ops-muted wide">Mỗi tài khoản dùng một lần cho mỗi mã. Giá giảm được làm tròn xuống đến đồng VND; thời gian theo múi giờ hệ thống. Tắt mã để dừng khuyến mãi.</p><button class="ops-button" :disabled="busy">Lưu mã giảm giá</button><button type="button" class="ops-button secondary" :disabled="busy" @click="showForm = false">Hủy</button></form>
<p v-if="loading" role="status">Đang tải khuyến mãi...</p><section v-else class="ops-panel"><div class="ops-table-wrap"><table v-if="rows.content.length" class="ops-table"><thead><tr><th>Mã</th><th>Khóa</th><th>Giảm</th><th>Đã dùng / tối đa</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody><tr v-for="p in rows.content" :key="p.id"><td><strong>{{ p.code }}</strong></td><td>{{ courses.find(c => c.id === p.courseId)?.name || (p.courseId ? 'Khóa ' + p.courseId : 'Tất cả') }}</td><td>{{ p.percent }}%</td><td>{{ p.used }} / {{ p.maxUses }}</td><td>{{ dateTime(p.startsAt) }}<br>{{ dateTime(p.endsAt) }}</td><td>{{ p.active ? 'Cho phép' : 'Đã tắt' }}</td><td><button class="ops-button secondary" :disabled="busy" @click="edit(p)">Sửa</button></td></tr></tbody></table></div><p v-if="!rows.content.length" class="ops-empty">Chưa có mã giảm giá.</p><OpsPager v-bind="{ page: rows.number, totalPages: rows.totalPages, totalElements: rows.totalElements, busy: loading || busy }" @change="load" /></section></div></template>


<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getOps, sendOps, opsError, commerceBase, money, type Catalog, type Pack } from '@/services/operationsApi'
import './operations.css'
const courses = ref<Catalog[]>([]), levels = ref<Array<{ levelId: number; levelName: string }>>([])
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const courseId = ref<number | null>(null), showCourseForm = ref(false)
const course = ref({ name: '', description: '', levelId: 0, status: 'ACTIVE', version: 0 })
const packageCourse = ref<Catalog | null>(null), packageId = ref<number | null>(null)
const pack = ref({ name: '', durationDays: 30, price: 0, active: true, version: 0 })
const statuses: Record<string,string> = { ACTIVE: 'Đang hoạt động', FULL: 'Đã đủ người', INACTIVE: 'Tạm ngưng' }
async function load() { loading.value = true; error.value = ''; try { courses.value = await getOps<Catalog[]>(commerceBase + '/catalog') } catch (e) { error.value = opsError(e) } finally { loading.value = false } }
function editCourse(c?: Catalog) { courseId.value = c?.id || null; course.value = { name: c?.name || '', description: c?.description || '', levelId: c?.levelId || levels.value[0]?.levelId || 0, status: c?.status || 'ACTIVE', version: c?.version || 0 }; showCourseForm.value = true; packageCourse.value = null; notice.value = '' }
async function saveCourse() {
 if (busy.value) return
 busy.value = true; error.value = ''
 try { await sendOps(courseId.value ? 'put' : 'post', commerceBase + '/courses' + (courseId.value ? '/' + courseId.value : ''), course.value); showCourseForm.value = false; notice.value = 'Đã lưu khóa học.'; await load() }
 catch (e) { error.value = opsError(e) } finally { busy.value = false }
}
function editPackage(c: Catalog,p?: Pack) { packageCourse.value = c; packageId.value = p?.id || null; pack.value = { name: p?.name || '', durationDays: p?.durationDays || 30, price: p?.price || 0, active: p?.active ?? true, version: p?.version || 0 }; showCourseForm.value = false; notice.value = '' }
async function savePackage() {
 if (busy.value || !packageCourse.value) return
 busy.value = true; error.value = ''
 try { await sendOps(packageId.value ? 'put' : 'post', `${commerceBase}/courses/${packageCourse.value.id}/packages` + (packageId.value ? '/' + packageId.value : ''), pack.value); packageCourse.value = null; notice.value = 'Đã lưu gói học. Giá mới áp dụng cho giao dịch tiếp theo.'; await load() }
 catch (e) { error.value = opsError(e) } finally { busy.value = false }
}
onMounted(async () => { await Promise.allSettled([load(), getOps<typeof levels.value>('/api/staff/levels').then(r => { levels.value = r })]) })
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Khóa học & gói giá</h1><p>Quản lý thời hạn, giá bán và trạng thái khóa học.</p></div><div class="ops-actions"><button class="ops-button" :disabled="busy" @click="editCourse()">Tạo khóa học</button><button class="ops-button secondary" :disabled="busy || loading" @click="load">Tải lại</button></div></header><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="notice" class="ops-notice" role="status">{{ notice }}</p>
<form v-if="showCourseForm" class="ops-panel ops-form" @submit.prevent="saveCourse"><h2 class="wide">{{ courseId ? 'Sửa khóa học' : 'Tạo khóa học' }}</h2><label>Tên khóa<input v-model="course.name" required maxlength="255"></label><label>Cấp độ<select v-model.number="course.levelId" required><option :value="0" disabled>Chọn cấp độ</option><option v-for="l in levels" :key="l.levelId" :value="l.levelId">{{ l.levelName }}</option></select></label><label>Trạng thái<select v-model="course.status"><option v-for="(label,key) in statuses" :key="key" :value="key">{{ label }}</option></select></label><label class="wide">Mô tả<textarea v-model="course.description" maxlength="255" rows="2"></textarea></label><p class="ops-muted wide">Tạm ngưng khóa sẽ chặn quyền truy cập nội dung khóa đó. Giá đã thanh toán và hạn đăng ký hiện có được giữ.</p><button class="ops-button" :disabled="busy || !course.levelId">Lưu khóa học</button><button type="button" class="ops-button secondary" :disabled="busy" @click="showCourseForm = false">Hủy</button></form>
<form v-if="packageCourse" class="ops-panel ops-form" @submit.prevent="savePackage"><h2 class="wide">{{ packageId ? 'Sửa gói' : 'Thêm gói' }} · {{ packageCourse.name }}</h2><label>Tên gói<input v-model="pack.name" required maxlength="255"></label><label>Thời hạn (ngày)<input v-model.number="pack.durationDays" required type="number" min="1" max="36500"></label><label>Giá (VND)<input v-model.number="pack.price" required type="number" min="0" max="9999999999999" step="1"></label><label><span><input v-model="pack.active" type="checkbox"> Đang bán</span></label><button class="ops-button" :disabled="busy">Lưu gói học</button><button type="button" class="ops-button secondary" :disabled="busy" @click="packageCourse = null">Hủy</button></form>
<p v-if="loading" role="status">Đang tải khóa học...</p><template v-else><section v-for="c in courses" :key="c.id" class="ops-panel"><h2>{{ c.name }}</h2><p>{{ c.description }}</p><span class="ops-badge">{{ statuses[c.status] }}</span><div class="ops-actions"><button class="ops-button secondary" :disabled="busy" @click="editCourse(c)">Sửa khóa</button><button class="ops-button secondary" :disabled="busy" @click="editPackage(c)">Thêm gói</button></div><div class="ops-table-wrap"><table v-if="c.packages.length" class="ops-table"><thead><tr><th>Gói</th><th>Thời hạn</th><th>Giá</th><th>Trạng thái</th><th></th></tr></thead><tbody><tr v-for="p in c.packages" :key="p.id"><td>{{ p.name }}</td><td>{{ p.durationDays }} ngày</td><td>{{ money(p.price) }}</td><td>{{ p.active ? 'Đang bán' : 'Ngừng bán' }}</td><td><button class="ops-button secondary" :disabled="busy" @click="editPackage(c,p)">Sửa gói</button></td></tr></tbody></table></div><p v-if="!c.packages.length" class="ops-muted">Chưa có gói học.</p></section><p v-if="!courses.length" class="ops-empty">Chưa có khóa học.</p></template></div></template>


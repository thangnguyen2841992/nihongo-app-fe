<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { ref, watch } from 'vue'
import { getOps, sendOps, opsError, dateTime, type OpsPage } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
const props = defineProps<{ userId: string; name: string }>()
interface Note { id: number; actor: string; status: string; note: string; createdAt: string }
const rows = ref<OpsPage<Note>>({ content: [], number: 0, totalElements: 0, totalPages: 0 })
const loading = ref(false), saving = ref(false), error = ref(''), note = ref(''), status = ref('OPEN'), saved = ref('')
const request = useLatestRequest()
async function load(page = 0) {
 const pending = request.begin(); loading.value = true; error.value = ''
 try { const result = await getOps<OpsPage<Note>>(`/api/nihongo-user/staff/analytics/learners/${props.userId}/notes`, { page }, pending.signal); if (pending.isCurrent()) rows.value = result }
 catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
async function save() {
 if (saving.value) return
 saving.value = true; error.value = ''; saved.value = ''
 try { await sendOps('post', `/api/nihongo-user/staff/analytics/learners/${props.userId}/notes`, { status: status.value, note: note.value }); note.value = ''; saved.value = 'Đã lưu ghi chú hỗ trợ.'; await load() }
 catch (e) { error.value = opsError(e) } finally { saving.value = false }
}
watch(() => props.userId, () => { note.value = ''; saved.value = ''; void load() }, { immediate: true })
const labels: Record<string,string> = { OPEN: 'Cần hỗ trợ', CONTACTED: 'Đã liên hệ', RESOLVED: 'Đã xử lý' }
</script>
<template><section class="ops-panel"><h2>Hỗ trợ {{ name || userId }}</h2><p class="ops-muted">Ghi chú nội bộ cho staff/admin.</p><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="saved" class="ops-notice" role="status">{{ saved }}</p><form class="ops-form" @submit.prevent="save"><label>Trạng thái<select v-model="status"><option v-for="(label,key) in labels" :key="key" :value="key">{{ label }}</option></select></label><label class="wide">Ghi chú<textarea v-model="note" minlength="5" maxlength="2000" required rows="3"></textarea></label><button class="ops-button" :disabled="saving">{{ saving ? 'Đang lưu...' : 'Lưu ghi chú' }}</button></form><p v-if="loading" role="status">Đang tải ghi chú...</p><article v-for="item in rows.content" :key="item.id" style="border-top:1px solid #e3eaf4;padding-top:12px;margin-top:12px"><span class="ops-badge">{{ labels[item.status] }}</span><p class="ops-content">{{ item.note }}</p><p class="ops-muted">{{ item.actor }} · {{ dateTime(item.createdAt) }}</p></article><OpsPager v-bind="{ page: rows.number, totalPages: rows.totalPages, totalElements: rows.totalElements, busy: loading || saving }" @change="load" /></section></template>


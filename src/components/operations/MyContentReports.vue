<script setup lang="ts">
import { useLatestRequest } from '@/services/latestRequest'
import { onMounted, ref } from 'vue'
import { getOps, opsError, contentBase, issueLabels, categoryLabels, dateTime, type OpsPage, type Issue } from '@/services/operationsApi'
import OpsPager from './OpsPager.vue'
import './operations.css'
const rows = ref<OpsPage<Issue>>({ content: [], number: 0, totalElements: 0, totalPages: 0 }), loading = ref(false), error = ref('')
const request = useLatestRequest()
async function load(page = 0) {
 const pending = request.begin(); loading.value = true; error.value = ''
 try { const result = await getOps<OpsPage<Issue>>(contentBase + '/reports/mine', { page }, pending.signal); if (pending.isCurrent()) rows.value = result }
 catch (e) { if (pending.isCurrent()) error.value = opsError(e) } finally { if (pending.isCurrent()) loading.value = false }
}
onMounted(() => load())
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Báo lỗi của tôi</h1><p>Theo dõi phản hồi về nội dung học tập.</p></div><button class="ops-button secondary" :disabled="loading" @click="load(rows.number)">Tải lại</button></header><p v-if="error" role="alert" class="ops-error">{{ error }}</p><p v-if="loading" role="status">Đang tải...</p><template v-else><article v-for="item in rows.content" :key="item.id" class="ops-panel"><h2>Bài {{ item.lessonId }} · {{ categoryLabels[item.category] }}</h2><span class="ops-badge">{{ issueLabels[item.status] }}</span><p class="ops-content">{{ item.detail }}</p><p v-if="item.resolution"><strong>Phản hồi:</strong> {{ item.resolution }}</p><p class="ops-muted">{{ dateTime(item.createdAt) }}</p></article><p v-if="!rows.content.length" class="ops-empty">Bạn chưa gửi báo lỗi nào. Có thể báo lỗi ngay trong bài học hoặc bài tập.</p><OpsPager v-bind="{ page: rows.number, totalPages: rows.totalPages, totalElements: rows.totalElements, busy: loading }" @change="load" /></template></div></template>


<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { readFeature, featureError, type Page, type Refund } from '@/services/additionalFeatures'
import { money } from '@/services/operationsApi'
import OpsPager from '@/components/operations/OpsPager.vue'
import '@/components/operations/operations.css'
interface Completion { id:number;lessonId:number;name:string;completedAt:string } interface Recommendation { key:string;title:string;explanation:string;path:string }
const recommendations=ref<Recommendation[]>([]),completed=ref<Page<Completion>>({content:[],number:0,totalElements:0,totalPages:0}),refunds=ref<Page<Refund>>({content:[],number:0,totalElements:0,totalPages:0}),error=ref('')
async function completions(page=0){completed.value=await readFeature('/api/nihongo-user/study/completions',{page})}
async function refundPage(page=0){refunds.value=await readFeature('/api/nihongo-user/study/refunds',{page})}
onMounted(async()=>{try{await Promise.all([readFeature<Recommendation[]>('/api/nihongo-user/study/recommendations').then(data=>{recommendations.value=data}),completions(),refundPage()])}catch(cause){error.value=featureError(cause)}})
</script>
<template><div class="ops-page"><h1>Lộ trình của tôi</h1><p>Gợi ý dựa trên lịch ôn thẻ, kết quả bài gần nhất và các khóa còn quyền học.</p><p v-if="error" class="ops-error" role="alert">{{ error }}</p><div class="ops-grid"><RouterLink v-for="item in recommendations" :key="item.key" :to="item.path" class="ops-panel"><h2>{{ item.title }}</h2><p>{{ item.explanation }}</p></RouterLink></div><section class="ops-panel"><h2>Bài đã hoàn thành · {{ completed.totalElements }}</h2><p class="ops-muted">Đánh dấu tại màn hình bài học; đây là tiến độ tự đánh dấu, không thay đổi điểm làm bài.</p><article v-for="item in completed.content" :key="item.id"><strong>{{ item.name }}</strong><p>{{ new Date(item.completedAt).toLocaleString('vi-VN') }}</p></article><OpsPager :page="completed.number" :total-pages="completed.totalPages" :total-elements="completed.totalElements" :busy="false" @change="completions" /></section><section class="ops-panel"><h2>Hoàn tiền của tôi</h2><article v-for="item in refunds.content" :key="item.id"><strong>Giao dịch {{ item.purchaseId }} · {{ money(item.amount) }}</strong><p>{{ item.status }} · {{ item.reviewNote || item.reason }}</p></article><p v-if="!refunds.content.length" class="ops-empty">Chưa có yêu cầu hoàn tiền.</p><OpsPager :page="refunds.number" :total-pages="refunds.totalPages" :total-elements="refunds.totalElements" :busy="false" @change="refundPage" /></section></div></template>

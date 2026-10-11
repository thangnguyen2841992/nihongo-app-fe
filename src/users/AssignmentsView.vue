<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { readFeature, writeFeature, featureError, type Assignment, type Attempt, type Page } from '@/services/additionalFeatures'
import OpsPager from '@/components/operations/OpsPager.vue'
import '@/components/operations/operations.css'
const router=useRouter(),rows=ref<Page<Assignment>>({content:[],number:0,totalPages:0,totalElements:0}),busy=ref(false),error=ref('')
async function load(page=0){busy.value=true;error.value='';try{rows.value=await readFeature('/api/nihongo-user/study/assignments',{page})}catch(cause){error.value=featureError(cause)}finally{busy.value=false}}
async function start(id:number){if(busy.value)return;busy.value=true;error.value='';try{const attempt=await writeFeature<Attempt>(`/api/nihongo-user/study/assignments/${id}/start`);await router.push(`/user/attempts/${attempt.id}`)}catch(cause){error.value=featureError(cause)}finally{busy.value=false}}
onMounted(()=>load())
</script>
<template><div class="ops-page"><header class="ops-heading"><div><h1>Bài được giao & thi online</h1><p>Mỗi đề có một lượt làm. Bài đã bắt đầu có thể tiếp tục đến hạn, kể cả khi đổi lớp.</p></div><button class="ops-button secondary" :disabled="busy" @click="load(rows.number)">Tải lại</button></header><p v-if="error" class="ops-error" role="alert">{{ error }}</p><section class="ops-panel"><p v-if="!rows.content.length" class="ops-empty">Bạn chưa có bài được giao.</p><div class="ops-grid"><article v-for="item in rows.content" :key="item.id" class="ops-panel"><h2>{{ item.title }}</h2><p>{{ item.kind==='EXAM' ? `Thi có thời gian · ${item.minutes} phút` : 'Bài tập về nhà' }}</p><p>Mở: {{ new Date(item.startsAt).toLocaleString('vi-VN') }}<br>Hạn: {{ new Date(item.dueAt).toLocaleString('vi-VN') }}</p><button class="ops-button" :disabled="busy" @click="start(item.id)">Bắt đầu / Tiếp tục / Xem kết quả</button></article></div><OpsPager :page="rows.number" :total-pages="rows.totalPages" :total-elements="rows.totalElements" :busy="busy" @change="load" /></section></div></template>

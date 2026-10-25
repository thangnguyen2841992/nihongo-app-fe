<script setup lang="ts">
import { ref, watch } from 'vue'
import { gatewayUrl } from '@/api/authApi'
import { readFeature, featureError } from '@/services/additionalFeatures'
import { useLatestRequest } from '@/services/latestRequest'
const props=defineProps<{lessonId:number}>(),emit=defineEmits<{changed:[lessonId:number,completed:boolean]}>(),completed=ref(false),busy=ref(false),error=ref(''),request=useLatestRequest()
watch(()=>props.lessonId,async id=>{const pending=request.begin();error.value='';try{const state=await readFeature<{completed:boolean}>(`/api/nihongo-user/study/lessons/${id}/completion`,{},pending.signal);if(pending.isCurrent())completed.value=state.completed}catch(cause){if(pending.isCurrent())error.value=featureError(cause)}},{immediate:true})
async function toggle(){if(busy.value)return;const id=props.lessonId,next=!completed.value;busy.value=true;error.value='';try{await gatewayUrl.put(`/api/nihongo-user/study/lessons/${id}/completion`,{completed:next});if(id===props.lessonId)completed.value=next;emit('changed',id,next)}catch(cause){error.value=featureError(cause)}finally{busy.value=false}}
</script>
<template><div class="my-3"><button type="button" class="lesson-complete" :class="{ done: completed }" :aria-pressed="completed" :disabled="busy" @click="toggle"><i class="bi" :class="completed ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i> {{ completed?'Đã hoàn thành bài học':'Đánh dấu đã học xong' }}</button><small v-if="error" class="d-block text-danger" role="alert">{{ error }}</small></div></template>
<style scoped>
.lesson-complete { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px solid #b9dcc8; border-radius: 10px; background: #fff; color: var(--learn-success); font-size: var(--learn-text-sm); font-weight: 650; cursor: pointer; }
.lesson-complete.done { border-color: var(--learn-success); background: var(--learn-success-soft); }
.lesson-complete:disabled { opacity: .6; cursor: wait; }
</style>

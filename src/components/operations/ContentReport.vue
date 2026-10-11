<script setup lang="ts">
import { ref, watch } from 'vue'
import { sendOps, opsError, contentBase, categoryLabels } from '@/services/operationsApi'
const props = defineProps<{ lessonId: number; exerciseId?: number }>()
const open = ref(false), detail = ref(''), category = ref('OTHER'), busy = ref(false), error = ref(''), saved = ref('')
watch(() => props.lessonId, () => { open.value = false; detail.value = ''; error.value = ''; saved.value = '' })
async function submit() {
 if (busy.value) return
 busy.value = true; error.value = ''; saved.value = ''
 try { await sendOps('post', contentBase + '/reports', { lessonId: props.lessonId, exerciseId: props.exerciseId || null, category: category.value, detail: detail.value }); saved.value = 'Đã gửi báo lỗi. Bạn có thể theo dõi trong mục Báo lỗi của tôi.'; detail.value = ''; open.value = false }
 catch (e) { error.value = opsError(e, 'Chưa gửi được báo lỗi. Hãy thử lại.') } finally { busy.value = false }
}
</script>
<template><div class="content-report"><button type="button" class="btn btn-sm btn-outline-secondary" @click="open = !open">{{ open ? 'Đóng báo lỗi' : 'Báo lỗi nội dung' }}</button><p v-if="saved" role="status" class="text-success mt-2">{{ saved }}</p><p v-if="error" role="alert" class="text-danger">{{ error }}</p><form v-if="open" class="card p-3 mt-2" @submit.prevent="submit"><label>Loại lỗi<select v-model="category" class="form-select"><option v-for="(label,key) in categoryLabels" :key="key" :value="key">{{ label }}</option></select></label><label class="mt-2">Mô tả lỗi<textarea v-model="detail" required minlength="10" maxlength="2000" rows="3" class="form-control" placeholder="Ghi rõ câu hỏi, ngữ pháp hoặc đoạn âm thanh cần kiểm tra"></textarea></label><button class="btn btn-primary mt-2" :disabled="busy">{{ busy ? 'Đang gửi...' : 'Gửi báo lỗi' }}</button></form></div></template>


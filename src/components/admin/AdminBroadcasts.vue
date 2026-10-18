<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getBroadcasts, sendBroadcast, type BroadcastNotice } from '@/services/broadcastApi'
const title = ref(''), content = ref(''), audience = ref<BroadcastNotice['audience']>('ALL')
const busy = ref(false), message = ref(''), error = ref('')
const rows = ref<BroadcastNotice[]>([]), page = ref(0), totalPages = ref(0)
const audienceLabel = (value: string) => ({ ALL: 'Toàn bộ staff và user', STAFF: 'Toàn bộ staff', USER: 'Toàn bộ user' })[value]
async function load(next = 0) {
  try { const result = await getBroadcasts(next); rows.value = result.content; page.value = next; totalPages.value = result.totalPages }
  catch { error.value = 'Không tải được lịch sử thông báo.' }
}
async function send() {
  if (busy.value || !title.value.trim() || !content.value.trim()) return
  busy.value = true; error.value = ''; message.value = ''
  try {
    await sendBroadcast({ title: title.value.trim(), content: content.value.trim(), audience: audience.value })
    title.value = ''; content.value = ''; message.value = 'Đã gửi thông báo. Dòng chữ đỏ sẽ chạy từ trái sang phải trên giao diện người nhận và được lưu trong chuông.'
    window.dispatchEvent(new Event('broadcast:changed')); await load()
  } catch { error.value = 'Gửi thông báo thất bại. Vui lòng kiểm tra kết nối và thử lại.' }
  finally { busy.value = false }
}
onMounted(() => load())
</script>
<template>
  <main class="container py-4" style="max-width: 960px">
    <h1 class="h3">Gửi thông báo</h1>
    <p>Thông báo sẽ chạy từ trái sang phải trong 2 phút bằng dòng chữ đỏ dưới navbar và được lưu trong chuông.</p>
    <p v-if="message" role="status" class="alert alert-success">{{ message }}</p>
    <p v-if="error" role="alert" class="alert alert-danger">{{ error }}</p>
    <form class="card card-body gap-3 mb-4" @submit.prevent="send">
      <label>Người nhận<select v-model="audience" class="form-select" :disabled="busy"><option value="ALL">Toàn bộ staff và user</option><option value="STAFF">Toàn bộ staff</option><option value="USER">Toàn bộ user</option></select></label>
      <label>Tiêu đề<input v-model="title" class="form-control" required maxlength="160" :disabled="busy" /></label>
      <label>Nội dung<textarea v-model="content" class="form-control" rows="5" required maxlength="4000" :disabled="busy"></textarea></label>
      <small>{{ content.length }}/4000 ký tự · Gửi đến: {{ audienceLabel(audience) }}</small>
      <button class="btn btn-primary align-self-start" :disabled="busy || !title.trim() || !content.trim()">{{ busy ? 'Đang gửi…' : 'Gửi thông báo' }}</button>
    </form>
    <h2 class="h5">Lịch sử đã gửi</h2>
    <p v-if="!rows.length">Chưa có thông báo.</p>
    <article v-for="row in rows" :key="row.id" class="card card-body mb-3">
      <strong>{{ row.title }}</strong><small>{{ audienceLabel(row.audience) }} · {{ new Date(row.createdAt).toLocaleString('vi-VN') }}</small>
      <p class="mb-0 mt-2" style="white-space: pre-wrap; overflow-wrap: anywhere">{{ row.content }}</p>
    </article>
    <div class="d-flex gap-3 align-items-center" v-if="totalPages > 1"><button class="btn btn-outline-secondary" :disabled="page === 0" @click="load(page - 1)">Trước</button><span>{{ page + 1 }}/{{ totalPages }}</span><button class="btn btn-outline-secondary" :disabled="page + 1 >= totalPages" @click="load(page + 1)">Sau</button></div>
  </main>
</template>

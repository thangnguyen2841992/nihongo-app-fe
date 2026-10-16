<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getStaffBroadcasts, sendStaffBroadcast, type BroadcastNotice } from '@/services/broadcastApi'

const title = ref('')
const content = ref('')
const busy = ref(false)
const message = ref('')
const error = ref('')
const rows = ref<BroadcastNotice[]>([])
const page = ref(0)
const totalPages = ref(0)

async function load(next = 0) {
  error.value = ''
  try {
    const result = await getStaffBroadcasts(next)
    rows.value = result.content
    page.value = next
    totalPages.value = result.totalPages
  } catch {
    error.value = 'Không tải được lịch sử thông báo.'
  }
}

async function send() {
  if (busy.value || !title.value.trim() || !content.value.trim()) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await sendStaffBroadcast({ title: title.value.trim(), content: content.value.trim() })
    title.value = ''
    content.value = ''
    message.value = 'Đã gửi thông báo đến toàn bộ user.'
    await load()
  } catch {
    error.value = 'Gửi thông báo thất bại. Vui lòng thử lại.'
  } finally {
    busy.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <main class="container py-4" style="max-width: 960px">
    <h1 class="h3">Thông báo cho user</h1>
    <p>Thông báo sẽ được gửi đến toàn bộ user và được lưu trong chuông thông báo của họ.</p>
    <p v-if="message" role="status" class="alert alert-success">{{ message }}</p>
    <p v-if="error" role="alert" class="alert alert-danger">{{ error }}</p>
    <form class="card card-body gap-3 mb-4" @submit.prevent="send">
      <label>Người nhận<input class="form-control" value="Toàn bộ user" disabled /></label>
      <label>Tiêu đề<input v-model="title" class="form-control" required maxlength="160" :disabled="busy" /></label>
      <label>Nội dung<textarea v-model="content" class="form-control" rows="5" required maxlength="4000" :disabled="busy"></textarea></label>
      <small>{{ content.length }}/4000 ký tự</small>
      <button class="btn btn-primary align-self-start" :disabled="busy || !title.trim() || !content.trim()">{{ busy ? 'Đang gửi…' : 'Gửi đến toàn bộ user' }}</button>
    </form>
    <h2 class="h5">Lịch sử bạn đã gửi</h2>
    <p v-if="!rows.length">Chưa có thông báo.</p>
    <article v-for="row in rows" :key="row.id" class="card card-body mb-3">
      <strong>{{ row.title }}</strong>
      <small>Toàn bộ user · {{ new Date(row.createdAt).toLocaleString('vi-VN') }}</small>
      <p class="mb-0 mt-2 notice-content">{{ row.content }}</p>
    </article>
    <div v-if="totalPages > 1" class="d-flex gap-3 align-items-center">
      <button class="btn btn-outline-secondary" :disabled="page === 0" @click="load(page - 1)">Trước</button>
      <span>{{ page + 1 }}/{{ totalPages }}</span>
      <button class="btn btn-outline-secondary" :disabled="page + 1 >= totalPages" @click="load(page + 1)">Sau</button>
    </div>
  </main>
</template>

<style scoped>
.notice-content { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>

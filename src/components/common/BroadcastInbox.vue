<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import { getBroadcasts, type BroadcastNotice } from '@/services/broadcastApi'
import { broadcastUnread } from '@/services/notificationState'
const { isAuthenticated, userEmail, userRole } = useAuthState()
const rows = ref<BroadcastNotice[]>([]), read = ref<number[]>([]), error = ref('')
const page = ref(0), totalPages = ref(0)
let refresh: (() => void) | undefined
let loadMore: (() => void) | undefined
const unread = computed(() => rows.value.filter(row => !read.value.includes(row.id)).length)
watch(unread, value => { broadcastUnread.value = value }, { immediate: true })
watch(() => [isAuthenticated.value, userEmail.value, userRole.value] as const, ([active, email, role], _, cleanup) => {
  rows.value = []; read.value = []; page.value = 0; totalPages.value = 0; error.value = ''
  if (!active || !['ADMIN', 'STAFF', 'USER'].includes(role.replace(/^ROLE_/, ''))) return
  const storage = `broadcast-read:${email}:${role}`
  try { const saved: unknown = JSON.parse(localStorage.getItem(storage) || '[]'); if (Array.isArray(saved)) read.value = saved.filter((id): id is number => typeof id === 'number') } catch { /* Storage is optional. */ }
  let disposed = false, running = false
  const load = async (nextPage = 0, append = false) => {
    if (running) return
    running = true
    try {
      const result = await getBroadcasts(nextPage)
      if (disposed) return
      const combined = append ? [...rows.value, ...result.content] : [...result.content, ...rows.value]
      rows.value = [...new Map(combined.map(row => [row.id, row])).values()]
      page.value = Math.max(page.value, nextPage)
      totalPages.value = result.totalPages
      error.value = ''
    } catch { if (!disposed) error.value = 'Không tải được thông báo từ admin.' }
    finally { running = false }
  }
  refresh = () => { void load(0) }
  loadMore = () => { void load(page.value + 1, true) }
  void load()
  const timer = setInterval(() => { if (!document.hidden) void load() }, 30000)
  window.addEventListener('focus', refresh); window.addEventListener('broadcast:changed', refresh)
  cleanup(() => { disposed = true; clearInterval(timer); window.removeEventListener('focus', refresh!); window.removeEventListener('broadcast:changed', refresh!); refresh = undefined; loadMore = undefined; broadcastUnread.value = 0 })
}, { immediate: true })
function markRead(id: number) {
  read.value = [...new Set([...read.value, id])]
  try { localStorage.setItem(`broadcast-read:${userEmail.value}:${userRole.value}`, JSON.stringify(read.value)) } catch { /* Still works in memory. */ }
}
function more() { loadMore?.() }
</script>
<template>
  <section aria-label="Thông báo từ admin" class="broadcast-inbox">
    <h4>Thông báo từ admin</h4>
    <button v-if="error" class="btn btn-sm btn-outline-danger" @click="refresh?.()">{{ error }} Thử lại</button>
    <p v-else-if="!rows.length">Chưa có thông báo từ admin.</p>
    <article v-for="row in rows" :key="row.id" :class="{ unread: !read.includes(row.id) }">
      <strong>{{ row.title }}</strong><p class="content">{{ row.content }}</p>
      <small>{{ new Date(row.createdAt).toLocaleString('vi-VN') }}</small>
      <button v-if="!read.includes(row.id)" class="btn btn-sm btn-link" @click="markRead(row.id)">Đánh dấu đã đọc</button>
    </article>
    <button v-if="page + 1 < totalPages" class="btn btn-sm btn-link" @click="more">Xem thêm</button>
  </section>
</template>
<style scoped>
.broadcast-inbox { padding: 10px; font-size: 12px; } h4 { font-size: 14px; } article { padding: 12px; border-radius: 10px; margin: 8px 0; background: #f7f8fa; } article.unread { background: #edf2ff; } .content { white-space: pre-wrap; overflow-wrap: anywhere; margin: 8px 0; } small { color: #64748b; }
</style>

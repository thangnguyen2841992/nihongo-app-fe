<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import { getBroadcasts, type BroadcastNotice } from '@/services/broadcastApi'
import { connectBroadcastRealtime } from '@/services/broadcastRealtime'
import { BROADCAST_READ_EVENT, broadcastConnectionStatus, broadcastFeed, broadcastOwner, broadcastUnread } from '@/services/notificationState'
const { isAuthenticated, userEmail, userRole } = useAuthState()
const rows = ref<BroadcastNotice[]>([]), read = ref<number[]>([]), error = ref('')
const page = ref(0), totalPages = ref(0)
let refresh: (() => void) | undefined
let loadMore: (() => void) | undefined
const readIds = computed(() => new Set(read.value))
const unread = computed(() => rows.value.filter(row => !readIds.value.has(row.id)).length)
watch(unread, value => { broadcastUnread.value = value }, { immediate: true })
watch(() => [isAuthenticated.value, userEmail.value, userRole.value] as const, ([active, email, role], _, cleanup) => {
  rows.value = []; read.value = []; page.value = 0; totalPages.value = 0; error.value = ''; broadcastFeed.value = { owner: '', notices: [] }; broadcastConnectionStatus.value = 'offline'
  if (!active || !['ADMIN', 'STAFF', 'USER'].includes(role.replace(/^ROLE_/, ''))) return
  const owner = broadcastOwner(email, role)
  const storage = `broadcast-read:${email}:${role}`
  try { const saved: unknown = JSON.parse(localStorage.getItem(storage) || '[]'); if (Array.isArray(saved)) read.value = saved.filter((id): id is number => typeof id === 'number') } catch { /* Storage is optional. */ }
  let disposed = false, running = false
  let refreshQueued = false
  let pageQueued: number | undefined
  const requests = new AbortController()
  let stopRealtime: (() => void) | undefined
  const updateRows = (notices: BroadcastNotice[]) => {
    rows.value = [...new Map(notices.map(row => [row.id, row])).values()].sort((left, right) => {
      const byTime = Date.parse(right.createdAt) - Date.parse(left.createdAt)
      return Number.isFinite(byTime) && byTime !== 0 ? byTime : right.id - left.id
    })
    broadcastFeed.value = { owner, notices: rows.value }
  }
  const load = async (nextPage = 0, append = false) => {
    if (disposed) return
    if (running) {
      if (nextPage === 0) refreshQueued = true
      else pageQueued = nextPage
      return
    }
    running = true
    try {
      const result = await getBroadcasts(nextPage, requests.signal)
      if (disposed) return
      const combined = append ? [...rows.value, ...result.content] : [...result.content, ...rows.value]
      updateRows(combined)
      page.value = Math.max(page.value, nextPage)
      totalPages.value = result.totalPages
      error.value = ''
    } catch { if (!disposed) error.value = 'Không tải được thông báo từ admin.' }
    finally {
      running = false
      if (!disposed && pageQueued !== undefined) {
        const queued = pageQueued
        pageQueued = undefined
        void load(queued, true)
      } else if (!disposed && refreshQueued) {
        refreshQueued = false
        void load()
      }
    }
  }
  refresh = () => { void load(0) }
  loadMore = () => { void load(page.value + 1, true) }
  void load()
  stopRealtime = connectBroadcastRealtime(role, notice => {
    if (disposed) return
    if (notice) updateRows([notice, ...rows.value])
    else void load()
  }, status => { if (!disposed) broadcastConnectionStatus.value = status })
  const timer = setInterval(() => { if (!document.hidden && broadcastConnectionStatus.value !== 'live') void load() }, 30000)
  const refreshWhenVisible = () => { if (!document.hidden) void load() }
  const markFromSpotlight = (event: Event) => {
    const detail = (event as CustomEvent<{ id?: unknown; owner?: unknown }>).detail
    if (detail?.owner === owner && typeof detail.id === 'number') markRead(detail.id)
  }
  window.addEventListener('focus', refresh); window.addEventListener('broadcast:changed', refresh)
  document.addEventListener('visibilitychange', refreshWhenVisible)
  window.addEventListener(BROADCAST_READ_EVENT, markFromSpotlight)
  cleanup(() => { disposed = true; requests.abort(); stopRealtime?.(); clearInterval(timer); window.removeEventListener('focus', refresh!); window.removeEventListener('broadcast:changed', refresh!); document.removeEventListener('visibilitychange', refreshWhenVisible); window.removeEventListener(BROADCAST_READ_EVENT, markFromSpotlight); if (broadcastFeed.value.owner === owner) broadcastFeed.value = { owner: '', notices: [] }; refresh = undefined; loadMore = undefined; broadcastUnread.value = 0; broadcastConnectionStatus.value = 'offline' })
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
    <article v-for="row in rows" :key="row.id" :class="{ unread: !readIds.has(row.id) }">
      <strong>{{ row.title }}</strong><p class="content">{{ row.content }}</p>
      <small>{{ new Date(row.createdAt).toLocaleString('vi-VN') }}</small>
      <button v-if="!readIds.has(row.id)" class="btn btn-sm btn-link" @click="markRead(row.id)">Đánh dấu đã đọc</button>
    </article>
    <button v-if="page + 1 < totalPages" class="btn btn-sm btn-link" @click="more">Xem thêm</button>
  </section>
</template>
<style scoped>
.broadcast-inbox { padding: 10px; font-size: 12px; } h4 { font-size: 14px; } article { padding: 12px; border-radius: 10px; margin: 8px 0; background: #f7f8fa; } article.unread { background: #edf2ff; } .content { white-space: pre-wrap; overflow-wrap: anywhere; margin: 8px 0; } small { color: #64748b; }
</style>

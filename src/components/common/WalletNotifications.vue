<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import { notificationOpen as open, notificationUnread } from '@/services/notificationState'
import { connectWalletRealtime, type LiveStatus } from '@/services/walletRealtime'
import { getAdminDeposits, getDeposits, formatMoney, type WalletDeposit } from '@/services/walletApi'

const { isAuthenticated, userEmail, userRole } = useAuthState()
const admin = computed(() => userRole.value.replace(/^ROLE_/, '') === 'ADMIN')
const enabled = computed(() => isAuthenticated.value && !!userEmail.value && ['ADMIN', 'USER'].includes(userRole.value.replace(/^ROLE_/, '')))
const rows = ref<WalletDeposit[]>([])
const read = ref<string[]>([])
const dismissed = ref<string[]>([])
const undoKeys = ref<string[]>([])
const dismissedStorage = () => `wallet-notifications-dismissed:${userEmail.value}:${userRole.value}`
const toast = ref('')
const error = ref('')
const status = ref<LiveStatus>('connecting')
const key = (row: WalletDeposit) => `${row.id}:${row.status}`
const relevant = computed(() => rows.value.filter(row => !dismissed.value.includes(key(row)) && (admin.value ? row.status === 'PENDING' : row.status !== 'PENDING')))
const unread = computed(() => relevant.value.filter(row => !read.value.includes(key(row))).length)
watch(unread, value => { notificationUnread.value = value }, { immediate: true, flush: 'sync' })
const title = (row: WalletDeposit) => admin.value ? 'Có yêu cầu nạp tiền mới' : row.status === 'SUCCESS' ? 'Nạp tiền thành công' : 'Yêu cầu nạp tiền bị từ chối'
let stop: (() => void) | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let refresh: (() => void) | undefined
const focus = () => refresh?.()
window.addEventListener('focus', focus)

watch(() => [enabled.value, userEmail.value, userRole.value] as const, ([active, email], _, cleanup) => {
  stop?.()
  rows.value = []; read.value = []; dismissed.value = []; undoKeys.value = []; open.value = false; toast.value = ''; error.value = ''
  clearTimeout(timer)
  refresh = undefined
  if (!active) return
  const storage = `wallet-notifications:${email}:${userRole.value}`
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storage) || '[]')
    if (Array.isArray(saved)) read.value = saved.filter((item): item is string => typeof item === 'string')
  } catch { /* Storage may be unavailable. */ }
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(dismissedStorage()) || '[]')
    if (Array.isArray(saved)) dismissed.value = saved.filter((item): item is string => typeof item === 'string')
  } catch { /* Deletion still works for the current view. */ }
  let disposed = false
  let running = false
  let again = false
  let announce = false
  let initialized = false
  let known = new Set<string>()
  const load = async (live = false) => {
    announce ||= live
    if (running) { again = true; return }
    running = true
    do {
      again = false
      try {
        const result = await (admin.value ? getAdminDeposits() : getDeposits())
        if (disposed) return
        rows.value = result
        const fresh = relevant.value.filter(row => !known.has(key(row)) && !read.value.includes(key(row)))
        if ((initialized || announce) && fresh.length) {
          toast.value = `${title(fresh[0]!)} · NAP${fresh[0]!.id}`
          clearTimeout(timer)
          timer = setTimeout(() => { toast.value = '' }, 7000)
        }
        known = new Set(relevant.value.map(key))
        initialized = true; announce = false; error.value = ''
      } catch { if (!disposed) error.value = 'Không tải được thông báo. Bấm thử lại.' }
    } while (again && !disposed)
    running = false
  }
  refresh = () => { void load() }
  stop = connectWalletRealtime(admin.value, event => {
    if (disposed) return
    window.dispatchEvent(new Event('wallet:changed'))
    void load(!!event)
  }, value => { if (!disposed) status.value = value })
  void load()
  cleanup(() => { disposed = true; stop?.() })
}, { immediate: true })

function markRead(row?: WalletDeposit) {
  read.value = [...new Set([...read.value, ...(row ? [key(row)] : relevant.value.map(key))])].slice(-500)
  try { sessionStorage.setItem(`wallet-notifications:${userEmail.value}:${userRole.value}`, JSON.stringify(read.value)) } catch { /* Still works in memory. */ }
}
function saveDismissed() {
  try { localStorage.setItem(dismissedStorage(), JSON.stringify(dismissed.value)) } catch { /* Still works in memory. */ }
}
function dismiss(row?: WalletDeposit) {
  undoKeys.value = row ? [key(row)] : relevant.value.map(key)
  dismissed.value = [...new Set([...dismissed.value, ...undoKeys.value])]
  toast.value = ''
  saveDismissed()
}
function undo() {
  dismissed.value = dismissed.value.filter(value => !undoKeys.value.includes(value))
  undoKeys.value = []
  saveDismissed()
}
function displayTime(row: WalletDeposit) {
  const value = new Date(row.reviewedAt || row.createdAt)
  return Number.isNaN(value.getTime()) ? '' : value.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}
onUnmounted(() => { stop?.(); clearTimeout(timer); window.removeEventListener('focus', focus) })
</script>

<template>
  <aside v-if="enabled" class="wallet-notifications" aria-label="Thông báo nạp tiền" @keydown.esc="open = false">
    <Transition name="notice">
      <div v-if="toast" class="notice-toast" role="status">
        <i class="bi bi-bell-fill toast-icon" aria-hidden="true"></i>
        <span>{{ toast }}</span>
        <button class="icon-button" aria-label="Đóng thông báo" @click="toast = ''"><i class="bi bi-x-lg"></i></button>
      </div>
    </Transition>
    <Transition name="notice">
      <section v-if="open" id="wallet-notification-panel" class="notice-panel" aria-label="Danh sách thông báo">
        <header class="notice-header">
          <div class="header-title"><span class="header-icon"><i class="bi bi-bell" aria-hidden="true"></i></span>
            <div><h3>Thông báo</h3><p>{{ unread ? `${unread} thông báo chưa đọc` : 'Bạn đã xem hết thông báo' }}</p></div>
          </div>
          <button class="icon-button" aria-label="Đóng danh sách" @click="open = false"><i class="bi bi-x-lg"></i></button>
        </header>
        <div class="notice-toolbar">
          <span class="live-label"><span class="live-dot" :class="{ connected: status === 'live' }"></span>{{ status === 'live' ? 'Trực tiếp' : 'Đang kết nối…' }}</span>
          <div class="toolbar-actions">
            <button class="text-button btn-link" :disabled="!unread" @click="markRead()" title="Đánh dấu tất cả đã đọc"><i class="bi bi-check2-all" aria-hidden="true"></i> Đọc tất cả</button>
            <button class="text-button delete-all" :disabled="!relevant.length" @click="dismiss()"><i class="bi bi-trash3" aria-hidden="true"></i> Xóa tất cả</button>
          </div>
        </div>
        <div v-if="undoKeys.length" class="undo-bar">
          <span>Đã xóa {{ undoKeys.length }} thông báo</span><button class="text-button" @click="undo()">Hoàn tác</button>
        </div>
        <div class="notice-list">
          <button v-if="error" class="retry-button" @click="refresh?.()"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> {{ error }}</button>
          <div v-else-if="!relevant.length" class="empty-notices">
            <span class="empty-icon"><i class="bi bi-bell-slash" aria-hidden="true"></i></span>
            <strong>Chưa có thông báo</strong><p>Các cập nhật nạp tiền sẽ xuất hiện ở đây.</p>
          </div>
          <article v-for="row in relevant" :key="key(row)" class="notice-item" :class="{ unread: !read.includes(key(row)) }">
            <span class="item-icon" :class="row.status.toLowerCase()"><i :class="row.status === 'SUCCESS' ? 'bi bi-check-circle-fill' : row.status === 'CANCELLED' ? 'bi bi-x-circle-fill' : 'bi bi-wallet2'" aria-hidden="true"></i></span>
            <RouterLink :to="admin ? '/admin/wallet-deposits' : '/wallet'" class="notice-content" @click="markRead(row); open = false">
              <strong>{{ title(row) }}</strong>
              <span class="notice-amount">{{ formatMoney(row.amount) }} <span class="deposit-code">· NAP{{ row.id }}</span></span>
              <span v-if="row.status === 'CANCELLED' && row.reviewNote" class="review-note">{{ row.reviewNote }}</span>
              <time class="notice-time" :datetime="row.reviewedAt || row.createdAt">{{ displayTime(row) }}</time>
            </RouterLink>
            <div class="item-actions">
              <span v-if="!read.includes(key(row))" class="unread-dot" aria-label="Chưa đọc"></span>
              <button class="icon-button delete-one" :aria-label="`Xóa thông báo NAP${row.id}`" title="Xóa thông báo" @click="dismiss(row)"><i class="bi bi-trash3" aria-hidden="true"></i></button>
            </div>
          </article>
        </div>
        <footer class="notice-footer">Thông báo nạp tiền · Nihongo</footer>
      </section>
    </Transition>
  </aside>
</template>

<style scoped>
.wallet-notifications { position: fixed; right: 20px; top: 72px; z-index: 1040; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; color: #17243b; }
.notice-panel { width: min(410px, calc(100vw - 24px)); max-height: calc(100dvh - 100px); display: flex; flex-direction: column; background: #fff; border: 1px solid #e7ecf4; border-radius: 20px; overflow: hidden; box-shadow: 0 16px 60px #1c355322, 0 3px 12px #1c35530a; }
.notice-header { padding: 20px 18px 16px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(120deg, #f1f5ff, #fff); }
.header-title { display: flex; align-items: center; gap: 12px; }
.header-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 14px; color: #5264d6; background: #e7ecff; font-size: 21px; }
h3 { margin: 0; font-size: 18px; font-weight: 750; letter-spacing: -.3px; }
.header-title p { margin: 4px 0 0; font-size: 12px; color: #728096; }
.icon-button { display: inline-grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px; border: 0; border-radius: 9px; background: transparent; color: #7e8aa0; cursor: pointer; font-size: 13px; }
.icon-button:hover { color: #35466a; background: #eaf0f9; }
button:focus-visible, .notice-content:focus-visible { outline: 2px solid #5366dc; outline-offset: 2px; }
.notice-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 16px; border-bottom: 1px solid #eef1f6; }
.live-label { display: flex; gap: 6px; align-items: center; font-size: 11px; color: #728096; }
.live-dot, .unread-dot { width: 6px; height: 6px; border-radius: 50%; background: #bdc7d6; }
.live-dot.connected { background: #21a179; box-shadow: 0 0 0 3px #21a17912; }
.toolbar-actions { display: flex; gap: 12px; }
.text-button { border: 0; background: transparent; color: #5469c9; font-size: 11px; font-weight: 600; padding: 4px 0; cursor: pointer; text-decoration: none; }
.text-button:hover { text-decoration: underline; }
.text-button:disabled { opacity: .4; cursor: default; text-decoration: none; }
.delete-all { color: #8a6670; }
.notice-list { overflow-y: auto; min-height: 0; padding: 6px; overscroll-behavior: contain; }
.notice-item { display: flex; align-items: flex-start; gap: 11px; padding: 14px 10px; border-radius: 12px; margin: 3px 0; transition: background .15s; }
.notice-item.unread { background: #f1f5ff; }
.notice-item:hover { background: #edf2fb; }
.item-icon { flex-shrink: 0; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px; color: #556bd5; background: #e4ebff; font-size: 17px; }
.item-icon.success { color: #16876a; background: #ddf5eb; }
.item-icon.cancelled { color: #c75f67; background: #fce7ea; }
.notice-content { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 5px; color: inherit; text-decoration: none; overflow-wrap: anywhere; }
.notice-content strong { font-size: 12px; font-weight: 650; line-height: 1.5; }
.notice-amount { color: #324568; font-size: 13px; font-weight: 700; }
.deposit-code { font-size: 11px; color: #8592a8; font-weight: 400; }
.notice-time { font-size: 10px; color: #8b97aa; }
.review-note { font-size: 12px; color: #98616b; line-height: 1.5; }
.item-actions { display: flex; flex-direction: column; align-items: center; gap: 8px; padding-top: 4px; }
.unread-dot { background: #6576df; }
.delete-one:hover { background: #fbe5e8; color: #bd4b5c; }
.empty-notices { text-align: center; padding: 34px 16px; display: flex; align-items: center; flex-direction: column; gap: 12px; }
.empty-icon { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%; background: #f2f5fc; color: #a2afc9; font-size: 25px; }
.empty-notices strong { font-size: 14px; }
.empty-notices p { margin: 0; color: #8a97ab; font-size: 12px; }
.notice-footer { padding: 11px; border-top: 1px solid #eef1f6; text-align: center; color: #99a5b7; font-size: 10px; }
.undo-bar { padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; background: #edf8f3; font-size: 12px; color: #33745e; }
.notice-toast { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e7ecf4; padding: 14px; border-radius: 14px; box-shadow: 0 8px 30px #1c35531a; width: min(410px, calc(100vw - 24px)); font-size: 13px; }
.toast-icon { color: #6272d6; }
.notice-toast span { flex: 1; }
.retry-button { margin: 10px; padding: 10px; border: 1px solid #efd5d9; border-radius: 10px; background: #fff7f8; color: #a84d5d; font-size: 12px; }
.notice-enter-active, .notice-leave-active { transition: opacity .16s, transform .16s; }
.notice-enter-from, .notice-leave-to { opacity: 0; transform: translateY(-6px); }
@media (max-width: 480px) { .wallet-notifications { right: 12px; } }
@media (prefers-reduced-motion: reduce) { .notice-enter-active, .notice-leave-active, .notice-item { transition: none; } }
</style>
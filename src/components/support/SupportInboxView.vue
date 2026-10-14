<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { connectSupportRealtime } from '@/services/supportRealtime'
import {
  closeSupportConversation, getStaffSupportThread, getSupportConversations, sendStaffSupportMessage,
  type SupportConversation, type SupportMessage, type SupportPage, type SupportStatus,
} from '@/services/supportChat'
import type { RealtimeStatus } from '@/services/authenticatedRealtime'
import { refreshStaffSupportSummary } from '@/services/staffSupportNotifications'

const conversations = ref<SupportConversation[]>([])
const selected = ref<SupportConversation | null>(null)
const messages = ref<SupportMessage[]>([])
const filter = ref<'ALL' | SupportStatus>('ALL')
const page = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)
const loadingList = ref(false)
const loadingThread = ref(false)
const sending = ref(false)
const error = ref('')
const draft = ref('')
const live = ref<RealtimeStatus>('connecting')
const messageList = ref<HTMLElement>()
let listRequest = 0
let threadRequest = 0
let stopRealtime: (() => void) | undefined
let disposed = false
const listCache = new Map<string, SupportPage>()

const filters: Array<{ value: 'ALL' | SupportStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'WAITING_STAFF', label: 'Chờ hỗ trợ' },
  { value: 'WAITING_USER', label: 'Đã phản hồi' },
  { value: 'RESOLVED', label: 'Đã kết thúc' },
]
const pendingCount = computed(() => conversations.value.filter(row => row.status === 'WAITING_STAFF').length)

const cacheKey = (value: 'ALL' | SupportStatus, targetPage: number) => `${value}:${targetPage}`

function applyList(result: SupportPage, keepSelection: boolean, refreshSelection = true) {
  conversations.value = result.content
  totalPages.value = result.totalPages
  totalElements.value = result.totalElements
  if (!keepSelection) { selected.value = null; messages.value = [] }
  else if (refreshSelection && selected.value) selected.value = result.content.find(row => row.id === selected.value?.id) ?? selected.value
}

async function loadList(keepSelection = true) {
  const requestedFilter = filter.value
  const requestedPage = page.value
  const key = cacheKey(requestedFilter, requestedPage)
  const current = ++listRequest
  const cached = listCache.get(key)
  if (cached) {
    applyList(cached, keepSelection, false)
    loadingList.value = false
  } else {
    loadingList.value = true
    if (!keepSelection) { conversations.value = []; selected.value = null; messages.value = [] }
  }
  try {
    const result = await getSupportConversations(requestedFilter, requestedPage)
    listCache.set(key, result)
    if (current !== listRequest) return
    applyList(result, keepSelection)
    error.value = ''
  } catch { if (current === listRequest) error.value = 'Không tải được danh sách hỗ trợ.' }
  finally { if (current === listRequest) loadingList.value = false }
}

async function prefetchFilterTabs() {
  await Promise.all(filters.filter(item => item.value !== filter.value).map(async item => {
    const key = cacheKey(item.value, 0)
    try {
      const result = await getSupportConversations(item.value, 0)
      if (!disposed) listCache.set(key, result)
    } catch { /* The selected tab still performs its own retry. */ }
  }))
}

async function openConversation(conversation: SupportConversation) {
  selected.value = conversation
  const current = ++threadRequest
  loadingThread.value = true
  try {
    const result = await getStaffSupportThread(conversation.id)
    if (current !== threadRequest) return
    selected.value = result.conversation
    messages.value = result.messages
    const row = conversations.value.find(item => item.id === conversation.id)
    if (row) row.unreadForStaff = 0
    void refreshStaffSupportSummary()
    scrollToLatest()
  } catch { if (current === threadRequest) error.value = 'Không tải được nội dung hội thoại.' }
  finally { if (current === threadRequest) loadingThread.value = false }
}

function scrollToLatest() {
  void nextTick(() => { if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight })
}

async function send() {
  const content = draft.value.trim()
  if (!selected.value || !content || sending.value) return
  sending.value = true
  try {
    const result = await sendStaffSupportMessage(selected.value.id, content)
    selected.value = result.conversation
    messages.value = result.messages
    draft.value = ''
    scrollToLatest()
    await loadList()
    void prefetchFilterTabs()
    void refreshStaffSupportSummary()
  } catch { error.value = 'Chưa gửi được phản hồi. Vui lòng thử lại.' }
  finally { sending.value = false }
}

async function closeConversation() {
  if (!selected.value || selected.value.status === 'RESOLVED') return
  try {
    const result = await closeSupportConversation(selected.value.id)
    selected.value = result.conversation
    messages.value = result.messages
    await loadList()
    void prefetchFilterTabs()
    void refreshStaffSupportSummary()
  } catch { error.value = 'Chưa kết thúc được phiên hỗ trợ.' }
}

async function changeFilter() { page.value = 0; selected.value = null; messages.value = []; await loadList(false) }
async function changePage(next: number) { page.value = next; selected.value = null; messages.value = []; await loadList(false) }
function composerKey(event: KeyboardEvent) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }

function statusLabel(status: SupportStatus) {
  return status === 'WAITING_STAFF' ? 'Chờ hỗ trợ' : status === 'WAITING_USER' ? 'Đã phản hồi' : 'Đã kết thúc'
}
function relative(value: string) {
  const date = new Date(value), diff = Date.now() - date.getTime()
  if (diff < 60_000) return 'Vừa xong'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`
  return date.toLocaleDateString('vi-VN')
}
const time = (value: string) => new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

onMounted(() => {
  void loadList()
  void prefetchFilterTabs()
  stopRealtime = connectSupportRealtime(true, notice => {
    void loadList()
    if (notice) void prefetchFilterTabs()
    if (notice && notice.conversationId === selected.value?.id) void openConversation(selected.value)
  }, value => { live.value = value })
})
onUnmounted(() => { disposed = true; stopRealtime?.(); ++listRequest; ++threadRequest })
</script>

<template>
  <main class="support-workspace">
    <header class="workspace-header">
      <div><span class="eyebrow">CHĂM SÓC HỌC VIÊN</span><h1>Hỗ trợ trực tuyến</h1><p>Tiếp nhận và phản hồi câu hỏi của học viên theo thời gian thực.</p></div>
      <div class="header-status"><span class="live-dot" :class="{ active: live === 'live' }"></span>{{ live === 'live' ? 'Đang nhận tin trực tiếp' : 'Đang kết nối lại' }}</div>
    </header>

    <p v-if="error" class="workspace-error"><i class="bi bi-exclamation-triangle"></i> {{ error }} <button @click="error = ''; loadList()">Thử lại</button></p>
    <section class="inbox-card">
      <aside class="conversation-panel" :class="{ hidden: selected }">
        <div class="list-heading"><div><h2>Hộp thư hỗ trợ</h2><p>{{ totalElements }} hội thoại · {{ pendingCount }} đang chờ trong trang này</p></div><button type="button" title="Làm mới" aria-label="Làm mới danh sách" @click="loadList()"><i class="bi bi-arrow-clockwise"></i></button></div>
        <div class="filter-tabs" role="tablist" aria-label="Lọc hội thoại">
          <button v-for="item in filters" :key="item.value" type="button" :class="{ active: filter === item.value }" @click="filter = item.value; changeFilter()">{{ item.label }}</button>
        </div>
        <div class="conversation-list">
          <div v-if="loadingList && !conversations.length" class="panel-state"><span class="spinner-border spinner-border-sm"></span> Đang tải…</div>
          <div v-else-if="!conversations.length" class="panel-state empty"><i class="bi bi-inbox"></i><strong>Chưa có hội thoại</strong><span>Các câu hỏi mới của học viên sẽ xuất hiện tại đây.</span></div>
          <button v-for="conversation in conversations" :key="conversation.id" type="button" class="conversation-item" :class="{ selected: selected?.id === conversation.id, unread: conversation.unreadForStaff }" @click="openConversation(conversation)">
            <span class="learner-avatar">{{ (conversation.userName || conversation.userEmail || 'H').charAt(0).toUpperCase() }}</span>
            <span class="conversation-copy"><span class="conversation-title"><strong>{{ conversation.userName || 'Học viên' }}</strong><time>{{ relative(conversation.lastMessageAt) }}</time></span><span class="learner-email">{{ conversation.userEmail || `ID: ${conversation.userId}` }}</span><span class="preview">{{ conversation.lastMessagePreview }}</span><span class="status-chip" :class="conversation.status.toLowerCase()">{{ statusLabel(conversation.status) }}</span></span>
            <span v-if="conversation.unreadForStaff" class="count-badge">{{ conversation.unreadForStaff }}</span>
          </button>
        </div>
        <footer v-if="totalPages > 1" class="pagination-bar"><button :disabled="page === 0" @click="changePage(page - 1)"><i class="bi bi-chevron-left"></i></button><span>Trang {{ page + 1 }}/{{ totalPages }}</span><button :disabled="page + 1 >= totalPages" @click="changePage(page + 1)"><i class="bi bi-chevron-right"></i></button></footer>
      </aside>

      <section class="thread-panel" :class="{ visible: selected }">
        <div v-if="!selected" class="thread-empty"><span><i class="bi bi-chat-square-text"></i></span><h2>Chọn một hội thoại</h2><p>Nội dung trao đổi và thông tin học viên sẽ hiển thị tại đây.</p></div>
        <template v-else>
          <header class="thread-header"><button class="back-button" type="button" aria-label="Quay lại danh sách" @click="selected = null; messages = []"><i class="bi bi-arrow-left"></i></button><span class="learner-avatar">{{ (selected.userName || selected.userEmail || 'H').charAt(0).toUpperCase() }}</span><div><h2>{{ selected.userName || 'Học viên' }}</h2><p>{{ selected.userEmail || `ID: ${selected.userId}` }} · <span :class="`text-${selected.status.toLowerCase()}`">{{ statusLabel(selected.status) }}</span></p></div><button v-if="selected.status !== 'RESOLVED'" class="resolve-button" type="button" @click="closeConversation"><i class="bi bi-check2-circle"></i>Kết thúc hỗ trợ</button></header>
          <div ref="messageList" class="thread-messages">
            <div v-if="loadingThread" class="panel-state"><span class="spinner-border spinner-border-sm"></span> Đang tải tin nhắn…</div>
            <article v-for="message in messages" v-else :key="message.id" class="staff-message" :class="message.senderType.toLowerCase()"><div><strong v-if="message.senderType !== 'USER'">{{ message.senderName }}</strong><p>{{ message.content }}</p><time>{{ time(message.createdAt) }}</time></div></article>
          </div>
          <div v-if="selected.status === 'RESOLVED'" class="closed-thread"><i class="bi bi-lock-fill"></i><span><strong>Phiên hỗ trợ đã kết thúc</strong><small>Hội thoại được lưu trong mục Đã kết thúc và không thể nhắn thêm.</small></span></div>
          <form v-else class="reply-box" @submit.prevent="send"><textarea v-model="draft" maxlength="2000" rows="2" placeholder="Nhập phản hồi cho học viên…" aria-label="Nội dung phản hồi" @keydown="composerKey"></textarea><div><span>{{ draft.length }}/2000 · Enter để gửi</span><button type="submit" :disabled="sending || !draft.trim()"><span v-if="sending" class="spinner-border spinner-border-sm"></span><i v-else class="bi bi-send-fill"></i> Gửi phản hồi</button></div></form>
        </template>
      </section>
    </section>
  </main>
</template>

<style scoped>
.support-workspace { max-width: 1500px; margin: 0 auto; color: #18253d; }.workspace-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }.eyebrow { color: #6a62b1; font-size: 10px; font-weight: 800; letter-spacing: .12em; }.workspace-header h1 { margin: 5px 0 6px; font-size: clamp(23px,3vw,32px); font-weight: 780; letter-spacing: -.04em; }.workspace-header p { margin: 0; color: #738096; font-size: 12px; }.header-status { display: flex; align-items: center; gap: 7px; padding: 9px 12px; border: 1px solid #e0e5ee; border-radius: 999px; background: #fff; color: #748095; font-size: 10px; }.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #afb7c5; }.live-dot.active { background: #25a97f; box-shadow: 0 0 0 4px #25a97f16; }
.workspace-error { margin: 0 0 12px; padding: 10px 13px; border: 1px solid #f0cfd3; border-radius: 10px; background: #fff4f5; color: #a54857; font-size: 11px; }.workspace-error button { border: 0; background: transparent; color: inherit; font-weight: 700; text-decoration: underline; }.inbox-card { height: calc(100dvh - 195px); min-height: 520px; display: grid; grid-template-columns: minmax(300px,380px) 1fr; overflow: hidden; border: 1px solid #e1e6ef; border-radius: 18px; background: #fff; box-shadow: 0 8px 30px #23304b0b; }.conversation-panel { display: flex; min-width: 0; flex-direction: column; border-right: 1px solid #e7eaf1; }.list-heading { display: flex; justify-content: space-between; align-items: center; padding: 16px 17px 12px; }.list-heading h2 { margin: 0; font-size: 15px; }.list-heading p { margin: 4px 0 0; color: #8792a4; font-size: 9px; }.list-heading button,.pagination-bar button { display: grid; place-items: center; width: 31px; height: 31px; border: 1px solid #e0e5ee; border-radius: 9px; background: #fff; color: #6f7b91; }.filter-tabs { display: flex; gap: 5px; padding: 0 12px 11px; overflow-x: auto; }.filter-tabs button { white-space: nowrap; border: 0; border-radius: 8px; padding: 7px 9px; background: #f2f4f8; color: #748096; font-size: 9px; }.filter-tabs button.active { background: #e9e6f7; color: #6554a0; font-weight: 700; }.conversation-list { flex: 1; min-height: 0; overflow-y: auto; }.conversation-item { position: relative; width: 100%; display: flex; align-items: flex-start; gap: 10px; border: 0; border-top: 1px solid #eff1f5; padding: 13px 12px; background: #fff; color: inherit; text-align: left; cursor: pointer; }.conversation-item:hover,.conversation-item.selected { background: #f5f4fa; }.conversation-item.unread { background: #f2f4ff; }.learner-avatar { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: 13px; background: linear-gradient(145deg,#e8e4f5,#e2e9fb); color: #665da3; font-size: 14px; font-weight: 800; }.conversation-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }.conversation-title { display: flex; justify-content: space-between; gap: 6px; }.conversation-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }.conversation-title time { flex-shrink: 0; color: #9aa4b4; font-size: 8px; }.learner-email,.preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #8994a5; font-size: 9px; }.preview { color: #657187; font-size: 10px; }.status-chip { align-self: flex-start; margin-top: 3px; border-radius: 999px; padding: 3px 7px; background: #f0f1f5; color: #6f7989; font-size: 8px; }.status-chip.waiting_staff { background: #fff0e2; color: #9a611f; }.status-chip.waiting_user { background: #e8f3ff; color: #356da4; }.status-chip.resolved { background: #e7f7ef; color: #31805d; }.count-badge { display: grid; place-items: center; min-width: 19px; height: 19px; border-radius: 999px; padding: 0 4px; background: #6c65b6; color: #fff; font-size: 8px; }.pagination-bar { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 8px; border-top: 1px solid #e8ebf1; color: #7f8999; font-size: 9px; }.pagination-bar button { width: 27px; height: 27px; }.pagination-bar button:disabled { opacity: .4; }
.thread-panel { min-width: 0; display: flex; flex-direction: column; }.thread-empty,.panel-state { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: #8994a6; text-align: center; font-size: 10px; }.thread-empty > span { display: grid; place-items: center; width: 70px; height: 70px; border-radius: 23px; background: #f0eef8; color: #7567ac; font-size: 28px; }.thread-empty h2 { margin: 6px 0 0; color: #3a465e; font-size: 16px; }.thread-empty p { margin: 0; }.panel-state.empty i { font-size: 28px; }.panel-state.empty strong { color: #566176; }.thread-header { display: flex; align-items: center; gap: 11px; padding: 14px 16px; border-bottom: 1px solid #e7eaf1; }.thread-header > div { flex: 1; min-width: 0; }.thread-header h2 { margin: 0; font-size: 13px; }.thread-header p { margin: 4px 0 0; color: #8490a3; font-size: 9px; }.text-waiting_staff { color: #a2641f; }.text-waiting_user { color: #3973aa; }.text-resolved { color: #33815e; }.resolve-button { border: 1px solid #dfe4ed; border-radius: 9px; padding: 8px 10px; background: #fff; color: #5f6b80; font-size: 9px; }.resolve-button i { margin-right: 5px; color: #41906d; }.back-button { display: none; }.thread-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 18px; background: #f7f8fb; }.staff-message { display: flex; margin: 8px 0; }.staff-message.staff { justify-content: flex-end; }.staff-message > div { max-width: 75%; border: 1px solid #e0e4ec; border-radius: 5px 14px 14px; padding: 10px 12px 7px; background: #fff; box-shadow: 0 2px 8px #25325409; }.staff-message.staff > div { border-color: #6274c7; border-radius: 14px 14px 5px; background: #6575c9; color: #fff; }.staff-message.auto > div { background: #f1edf9; border-color: #ded5ee; }.staff-message strong { display: block; margin-bottom: 4px; color: #66539d; font-size: 9px; }.staff-message p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 11px; line-height: 1.55; }.staff-message time { display: block; margin-top: 5px; text-align: right; color: #909bac; font-size: 8px; }.staff-message.staff time { color: #e1e5fa; }.reply-box { padding: 12px 15px; border-top: 1px solid #e4e8ef; }.reply-box textarea { width: 100%; resize: none; border: 1px solid #dce1e9; border-radius: 11px; padding: 10px 11px; color: #25324a; font: inherit; font-size: 11px; }.reply-box textarea:focus { outline: 2px solid #bbc2ef; border-color: #7b83c7; }.reply-box > div { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; }.reply-box span { color: #9aa3b2; font-size: 8px; }.reply-box button { border: 0; border-radius: 9px; padding: 8px 12px; background: #5e6ec4; color: #fff; font-size: 9px; font-weight: 700; }.reply-box button:disabled { opacity: .45; }
.closed-thread { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-top: 1px solid #dfe8e4; background: #f1f8f5; color: #42705e; }.closed-thread > i { font-size: 17px; }.closed-thread span { display: flex; flex-direction: column; gap: 3px; }.closed-thread strong { font-size: 10px; }.closed-thread small { color: #71877f; font-size: 8px; }
button { cursor: pointer; }button:focus-visible,textarea:focus-visible { outline: 2px solid #6e78ca; outline-offset: 2px; }
@media(max-width:900px) { .workspace-header { align-items: flex-start; flex-direction: column; }.inbox-card { height: calc(100dvh - 235px); grid-template-columns: minmax(270px,340px) 1fr; } }
@media(max-width:680px) { .support-workspace { margin: -5px; }.workspace-header p { display: none; }.header-status { position: absolute; right: 12px; }.inbox-card { height: calc(100dvh - 170px); min-height: 480px; display: block; }.conversation-panel,.thread-panel { height: 100%; }.conversation-panel.hidden { display: none; }.thread-panel:not(.visible) { display: none; }.back-button { display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0; border: 1px solid #dfe4ed; border-radius: 9px; background: #fff; color: #5f6b80; }.resolve-button { padding: 8px; }.thread-header .learner-avatar { display: none; }.staff-message > div { max-width: 88%; } }
</style>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import { connectSupportRealtime } from '@/services/supportRealtime'
import { getSupportThread, markSupportRead, sendSupportMessage, type SupportThread } from '@/services/supportChat'
import type { RealtimeStatus } from '@/services/authenticatedRealtime'
import { supportChatOpen as open } from '@/services/supportChatState'

const { isAuthenticated, userRole } = useAuthState()
const enabled = computed(() => isAuthenticated.value && userRole.value.replace(/^ROLE_/, '') === 'USER')
const loading = ref(false)
const sending = ref(false)
const startingNew = ref(false)
const error = ref('')
const draft = ref('')
const thread = ref<SupportThread>({ conversation: null, messages: [] })
const status = ref<RealtimeStatus>('connecting')
const messageList = ref<HTMLElement>()
const unread = computed(() => thread.value.conversation?.unreadForUser ?? 0)
const ended = computed(() => thread.value.conversation?.status === 'RESOLVED' && !startingNew.value)
let stopRealtime: (() => void) | undefined
let request = 0

function scrollToLatest() {
  void nextTick(() => { if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight })
}

async function load(markRead = false) {
  const current = ++request
  loading.value = true
  try {
    const value = await getSupportThread()
    if (current !== request) return
    thread.value = value
    error.value = ''
    if (markRead && value.conversation?.unreadForUser) {
      await markSupportRead()
      if (current === request && thread.value.conversation) thread.value.conversation.unreadForUser = 0
    }
    if (open.value) scrollToLatest()
  } catch {
    if (current === request) error.value = 'Không tải được cuộc trò chuyện. Vui lòng thử lại.'
  } finally {
    if (current === request) loading.value = false
  }
}

async function toggle() {
  open.value = !open.value
  if (open.value && !startingNew.value) await load(true)
}

function beginNewConversation() {
  startingNew.value = true
  draft.value = ''
  error.value = ''
  thread.value = { conversation: null, messages: [] }
}

async function send() {
  const content = draft.value.trim()
  if (!content || sending.value) return
  sending.value = true
  error.value = ''
  try {
    thread.value = await sendSupportMessage(content, startingNew.value)
    startingNew.value = false
    draft.value = ''
    scrollToLatest()
  } catch {
    error.value = 'Chưa gửi được tin nhắn. Vui lòng thử lại.'
  } finally { sending.value = false }
}

function onComposerKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() }
}

watch(enabled, (active, _, cleanup) => {
  stopRealtime?.()
  stopRealtime = undefined
  ++request
  thread.value = { conversation: null, messages: [] }
  startingNew.value = false
  open.value = false
  if (!active) return
  let disposed = false
  stopRealtime = connectSupportRealtime(false, notice => {
    if (!disposed && !startingNew.value) void load(open.value && Boolean(notice))
  }, value => { if (!disposed) status.value = value })
  cleanup(() => { disposed = true; stopRealtime?.() })
}, { immediate: true })

onUnmounted(() => stopRealtime?.())

const time = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <aside v-if="enabled" class="support-chat" aria-label="Hỗ trợ trực tuyến" @keydown.esc="open = false">
    <Transition name="support-panel">
      <section v-if="open" id="support-chat-panel" class="chat-panel" role="dialog" aria-label="Trò chuyện với bộ phận hỗ trợ">
        <header class="chat-header">
          <span class="agent-avatar"><i class="bi bi-headset" aria-hidden="true"></i></span>
          <div><h2>Hỗ trợ Nihongo</h2><p><span class="status-dot" :class="{ live: status === 'live' }"></span>{{ status === 'live' ? 'Đang trực tuyến' : 'Đang kết nối' }}</p></div>
          <button type="button" aria-label="Thu nhỏ cửa sổ chat" @click="open = false"><i class="bi bi-dash-lg"></i></button>
        </header>

        <div ref="messageList" class="message-list" aria-live="polite">
          <div v-if="loading && !thread.messages.length" class="chat-state"><span class="spinner-border spinner-border-sm"></span> Đang tải hội thoại…</div>
          <div v-else-if="!thread.messages.length" class="welcome-state">
            <span><i class="bi bi-chat-heart" aria-hidden="true"></i></span>
            <strong>Nihongo có thể giúp gì cho bạn?</strong>
            <p>Hãy gửi câu hỏi đầu tiên. Hệ thống sẽ xác nhận ngay và nhân viên hỗ trợ sẽ phản hồi tại đây.</p>
          </div>
          <article v-for="message in thread.messages" :key="message.id" class="message-row" :class="message.senderType.toLowerCase()">
            <div class="message-bubble">
              <strong v-if="message.senderType !== 'USER'">{{ message.senderName }}</strong>
              <p>{{ message.content }}</p>
              <time :datetime="message.createdAt">{{ time(message.createdAt) }}</time>
            </div>
          </article>
        </div>

        <p v-if="error" class="chat-error"><i class="bi bi-exclamation-circle"></i> {{ error }}</p>
        <section v-if="ended" class="ended-state">
          <div><i class="bi bi-check2-circle" aria-hidden="true"></i><span><strong>Phiên hỗ trợ đã kết thúc</strong><small>Nếu cần hỗ trợ thêm, hãy tạo một cuộc trò chuyện mới.</small></span></div>
          <button type="button" @click="beginNewConversation"><i class="bi bi-plus-circle"></i> Bắt đầu cuộc trò chuyện mới</button>
        </section>
        <form v-else class="chat-composer" @submit.prevent="send">
          <textarea v-model="draft" maxlength="2000" rows="1" aria-label="Nội dung tin nhắn" placeholder="Nhập câu hỏi của bạn…" @keydown="onComposerKey"></textarea>
          <button type="submit" :disabled="sending || !draft.trim()" aria-label="Gửi tin nhắn"><span v-if="sending" class="spinner-border spinner-border-sm"></span><i v-else class="bi bi-send-fill"></i></button>
        </form>
        <footer>Enter để gửi · Shift + Enter để xuống dòng</footer>
      </section>
    </Transition>

    <button type="button" class="chat-launcher" :aria-expanded="open" aria-controls="support-chat-panel" aria-label="Mở hỗ trợ trực tuyến" @click="toggle">
      <i :class="open ? 'bi bi-x-lg' : 'bi bi-chat-dots-fill'" aria-hidden="true"></i>
      <span v-if="unread && !open" class="unread-badge">{{ unread > 9 ? '9+' : unread }}</span>
    </button>
  </aside>
</template>

<style scoped>
.support-chat { position: fixed; right: 22px; bottom: 22px; z-index: 1080; display: flex; flex-direction: column; align-items: flex-end; gap: 14px; color: #18243b; }
.chat-launcher { position: relative; display: grid; place-items: center; width: 58px; height: 58px; border: 0; border-radius: 19px; background: linear-gradient(145deg,#7355b6,#526cda); color: #fff; font-size: 23px; box-shadow: 0 12px 28px #4458a94d; cursor: pointer; }
.chat-launcher:hover { transform: translateY(-2px); box-shadow: 0 16px 34px #4458a95c; }.chat-launcher:focus-visible,.chat-header button:focus-visible,.chat-composer button:focus-visible,.chat-composer textarea:focus-visible { outline: 3px solid #a9b7ff; outline-offset: 2px; }
.unread-badge { position: absolute; top: -5px; right: -5px; display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 5px; border: 3px solid #fff; border-radius: 999px; background: #dc465d; color: #fff; font-size: 10px; font-weight: 800; }
.chat-panel { width: min(390px,calc(100vw - 24px)); height: min(590px,calc(100dvh - 110px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e4e8f1; border-radius: 22px; background: #fff; box-shadow: 0 24px 70px #1f2c472e; }
.chat-header { display: flex; align-items: center; gap: 11px; padding: 16px 17px; background: linear-gradient(130deg,#674da9,#4f6bd6); color: #fff; }.agent-avatar { display: grid; place-items: center; width: 42px; height: 42px; flex-shrink: 0; border-radius: 14px; background: #ffffff22; font-size: 20px; }.chat-header div { flex: 1; }.chat-header h2 { margin: 0; font-size: 15px; font-weight: 750; }.chat-header p { margin: 4px 0 0; display: flex; align-items: center; gap: 6px; font-size: 10px; color: #e7ebff; }.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #c8ceec; }.status-dot.live { background: #62e2ad; box-shadow: 0 0 0 3px #62e2ad22; }.chat-header button { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 9px; background: #ffffff13; color: #fff; cursor: pointer; }
.message-list { flex: 1; min-height: 0; overflow-y: auto; padding: 17px 14px; background: #f7f8fc; overscroll-behavior: contain; }.message-row { display: flex; margin: 9px 0; }.message-row.user { justify-content: flex-end; }.message-bubble { max-width: 82%; padding: 10px 12px 7px; border: 1px solid #e4e7ef; border-radius: 5px 15px 15px; background: #fff; box-shadow: 0 2px 8px #2532540b; overflow-wrap: anywhere; }.message-row.user .message-bubble { border-color: #6274ce; border-radius: 15px 15px 5px; background: #6374ce; color: #fff; }.message-row.auto .message-bubble { border-color: #dfd6f0; background: #f3effa; }.message-bubble strong { display: block; margin-bottom: 4px; color: #66509d; font-size: 10px; }.message-bubble p { margin: 0; white-space: pre-wrap; font-size: 12px; line-height: 1.55; }.message-bubble time { display: block; margin-top: 5px; text-align: right; color: #929daf; font-size: 9px; }.message-row.user time { color: #e2e5fa; }
.chat-state,.welcome-state { height: 100%; display: flex; align-items: center; justify-content: center; color: #7d879a; font-size: 12px; }.welcome-state { flex-direction: column; padding: 20px; text-align: center; }.welcome-state > span { display: grid; place-items: center; width: 62px; height: 62px; margin-bottom: 14px; border-radius: 20px; background: #ece8f7; color: #765db0; font-size: 27px; }.welcome-state strong { color: #2b3751; font-size: 14px; }.welcome-state p { max-width: 280px; margin: 8px 0 0; line-height: 1.6; }
.chat-error { margin: 0; padding: 8px 14px; background: #fff0f1; color: #b24757; font-size: 11px; }.chat-composer { display: flex; align-items: flex-end; gap: 9px; padding: 12px 13px 8px; border-top: 1px solid #e9ecf3; background: #fff; }.chat-composer textarea { flex: 1; max-height: 100px; resize: none; border: 1px solid #dce1eb; border-radius: 13px; padding: 10px 12px; color: #26334e; font: inherit; font-size: 12px; line-height: 1.45; }.chat-composer textarea:focus { border-color: #7a85d2; outline: none; }.chat-composer button { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 12px; background: #5f70ca; color: #fff; cursor: pointer; }.chat-composer button:disabled { opacity: .45; cursor: default; }.chat-panel footer { padding: 0 14px 9px; text-align: center; color: #a0a8b6; font-size: 8px; }
.ended-state { padding: 13px; border-top: 1px solid #e5e9f0; background: #fff; }.ended-state > div { display: flex; align-items: flex-start; gap: 9px; color: #526078; }.ended-state > div > i { margin-top: 1px; color: #2f9a72; font-size: 18px; }.ended-state span { display: flex; flex-direction: column; gap: 3px; }.ended-state strong { font-size: 11px; }.ended-state small { color: #8893a4; font-size: 9px; line-height: 1.45; }.ended-state button { width: 100%; margin-top: 11px; border: 0; border-radius: 11px; padding: 10px 12px; background: #5f70ca; color: #fff; font-size: 10px; font-weight: 750; cursor: pointer; }.ended-state button i { margin-right: 5px; }
.support-panel-enter-active,.support-panel-leave-active { transition: opacity .18s,transform .18s; }.support-panel-enter-from,.support-panel-leave-to { opacity: 0; transform: translateY(8px) scale(.98); }
@media(max-width:480px) { .support-chat { right: 12px; bottom: max(12px,env(safe-area-inset-bottom)); }.chat-panel { height: min(620px,calc(100dvh - 86px)); }.chat-launcher { width: 54px; height: 54px; border-radius: 17px; } }
@media(prefers-reduced-motion:reduce) { .support-panel-enter-active,.support-panel-leave-active,.chat-launcher { transition: none; } }
</style>

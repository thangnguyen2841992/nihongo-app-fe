<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import axios from 'axios'
import { getWallet, depositWallet, getDeposits, getBankInfo, walletError, formatMoney, depositStatus,
  type WalletResponse, type WalletDeposit, type BankInfo, type DepositWalletRequest } from '@/services/walletApi'

import { useWalletRealtime, type WalletNotice } from '@/services/walletRealtime'

const wallet = ref<WalletResponse | null>(null)
const deposits = ref<WalletDeposit[]>([])
const bank = ref<BankInfo | null>(null)
const bankReady = computed(() => Boolean(bank.value?.bankName && bank.value?.accountNumber && bank.value?.accountName))
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const amount = ref<number | null>(null)
const description = ref('')
const showHistory = ref(false)
const historyDialog = ref<HTMLDialogElement | null>(null)
let previousOverflow: string | undefined
function restoreScroll() {
  if (previousOverflow !== undefined) {
    document.body.style.overflow = previousOverflow
    previousOverflow = undefined
  }
}
watch(showHistory, async visible => {
  if (!visible) { restoreScroll(); return }
  await nextTick()
  if (!showHistory.value || !historyDialog.value) return
  historyDialog.value.showModal()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
})
onUnmounted(restoreScroll)
const quickAmounts = [50000, 100000, 200000, 500000]
function formatHistoryTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa có thời gian'
  const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} · ${time}`
}
const retryRequest = ref<DepositWalletRequest | null>(null)
const storageKey = () => `wallet-deposit-retry:${wallet.value?.userId}`

let reloadPending = false
const liveStatus = useWalletRealtime(false, (event?: WalletNotice) => {
  if (event?.type === 'APPROVED') {
    error.value = ''
    success.value = `Nạp tiền thành công – NAP${event.depositId}. Email xác nhận đang được gửi.`
  } else if (event?.type === 'REJECTED') {
    success.value = ''
    error.value = `Nạp tiền không thành công – NAP${event.depositId}. Xem lý do trong lịch sử nạp tiền; thông báo cũng sẽ được gửi qua email.`
  }
  void load(true)
})

async function load(background = false) {
  if (loading.value || submitting.value) { reloadPending = true; return }
  loading.value = true
  if (!background) error.value = ''
  try {
    wallet.value = await getWallet()
    const [history, info] = await Promise.all([getDeposits(), getBankInfo()])
    deposits.value = history
    bank.value = info
    const saved = sessionStorage.getItem(storageKey())
    if (saved) {
      try {
        const draft = JSON.parse(saved) as DepositWalletRequest
        if (typeof draft.requestKey === 'string' && Number.isInteger(draft.amount) && typeof draft.description === 'string') {
          retryRequest.value = draft
          amount.value = draft.amount
          description.value = draft.description
        }
      } catch { sessionStorage.removeItem(storageKey()) }
    }
  } catch (e) { error.value = walletError(e, 'Không thể tải ví. Vui lòng đăng nhập và thử lại.') }
  finally {
    loading.value = false
    if (reloadPending) { reloadPending = false; void load(true) }
  }
}

async function submit() {
  if (submitting.value || loading.value || !wallet.value || !bankReady.value) return
  error.value = ''; success.value = ''
  if (!retryRequest.value && (!Number.isInteger(amount.value) || !amount.value || amount.value < 1000 || amount.value > 100000000)) {
    error.value = 'Nhập số tiền nguyên từ 1.000 đến 100.000.000đ'; return
  }
  if (description.value.trim().length > 500) { error.value = 'Ghi chú tối đa 500 ký tự'; return }
  const request = retryRequest.value ?? { amount: amount.value!, description: description.value.trim(), requestKey: crypto.randomUUID() }
  retryRequest.value = request
  submitting.value = true
  try {
    // Keep the same key and payload after a timeout, refresh or retry.
    sessionStorage.setItem(storageKey(), JSON.stringify(request))
    const result = await depositWallet(request)
    deposits.value = [result, ...deposits.value.filter(item => item.id !== result.id)]
    sessionStorage.removeItem(storageKey())
    retryRequest.value = null
    amount.value = null; description.value = ''
    success.value = result.status === 'PENDING'
      ? `Yêu cầu NAP${result.id} đang chờ đối soát. Chuyển ${formatMoney(result.amount)} với nội dung NAP${result.id}. Số dư chỉ tăng sau khi quản trị viên xác nhận đã nhận tiền.`
      : `Yêu cầu NAP${result.id}: ${depositStatus(result.status)}.`
  } catch (e) {
    // A validation rejection is definitive; let the user correct the form.
    if (axios.isAxiosError(e) && e.response?.status === 400) {
      sessionStorage.removeItem(storageKey())
      retryRequest.value = null
    }
    error.value = walletError(e, 'Chưa xác định được kết quả. Bấm gửi lại để kiểm tra cùng yêu cầu, không chuyển khoản thêm.')
  } finally {
    submitting.value = false
    if (reloadPending) { reloadPending = false; void load(true) }
  }
}
onMounted(() => { void load() })
</script>

<template>
  <div class="wallet-page">
    <header class="page-heading">
      <div><p class="eyebrow">TÀI KHOẢN CỦA BẠN</p><h2>Ví của tôi</h2><p class="page-subtitle">Quản lý số dư, tiếp tục hành trình học tiếng Nhật.</p></div>
      <button class="soft-button" :disabled="loading || submitting" @click="load()"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i> {{ loading ? 'Đang tải…' : 'Cập nhật' }}</button>
    </header>

    <div v-if="error" role="alert" class="wallet-alert error-alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>{{ error }}</span></div>
    <div v-if="success" role="status" class="wallet-alert success-alert"><i class="bi bi-check-circle" aria-hidden="true"></i><span>{{ success }}</span></div>

    <section class="balance-card" aria-label="Số dư ví">
      <div class="balance-content">
        <span class="balance-label"><i class="bi bi-wallet2" aria-hidden="true"></i> Số dư khả dụng</span>
        <h3>{{ wallet ? formatMoney(wallet.balance) : loading ? 'Đang tải…' : 'Chưa tải được số dư' }}</h3>
        <p>Dùng số dư để đăng ký và gia hạn khóa học.</p>
        <span class="connection-state" role="status"><span class="connection-dot" :class="{ live: liveStatus === 'live' }"></span>{{ liveStatus === 'live' ? 'Đang cập nhật trực tiếp' : 'Đang kết nối lại · Bạn có thể bấm Cập nhật' }}</span>
      </div>
      <button class="history-toggle" aria-haspopup="dialog" :aria-expanded="showHistory" aria-controls="wallet-history" @click="showHistory = true">
        <i class="bi bi-clock-history" aria-hidden="true"></i> Lịch sử nạp tiền <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
      </button>
    </section>

    <div class="wallet-grid">
      <section class="wallet-card deposit-card">
        <div class="section-heading"><span class="section-icon"><i class="bi bi-plus-lg" aria-hidden="true"></i></span><div><h4>Nạp tiền vào ví</h4><p>Chọn số tiền bạn muốn nạp</p></div></div>
        <form @submit.prevent="submit">
          <fieldset :disabled="submitting || loading || !wallet || !!retryRequest">
            <label for="amount" class="field-label">Số tiền nạp</label>
            <div class="amount-input"><input id="amount" v-model.number="amount" type="number" min="1000" max="100000000" step="1" required placeholder="Nhập số tiền" aria-describedby="amount-hint" /><span>VNĐ</span></div>
            <p id="amount-hint" class="field-hint">Từ 1.000đ đến 100.000.000đ</p>
            <div class="quick-amounts"><button v-for="value in quickAmounts" :key="value" type="button" :class="{ selected: amount === value }" :aria-pressed="amount === value" @click="amount = value">{{ formatMoney(value) }}</button></div>
            <label for="description" class="field-label">Ghi chú <span class="optional">(không bắt buộc)</span></label>
            <input id="description" v-model="description" maxlength="500" class="note-input" placeholder="Thêm ghi chú cho yêu cầu của bạn" />
          </fieldset>
          <p v-if="retryRequest" class="retry-note">Đang giữ nguyên yêu cầu để gửi lại an toàn. Không chuyển khoản thêm khi chưa rõ kết quả.</p>
          <button class="submit-button" :disabled="submitting || loading || !wallet || !bankReady" type="submit">
            {{ submitting ? 'Đang gửi…' : retryRequest ? 'Gửi lại yêu cầu' : 'Tạo yêu cầu nạp' }} <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </button>
          <p class="form-footnote"><i class="bi bi-shield-check" aria-hidden="true"></i> Số dư được cộng sau khi đối soát thành công.</p>
        </form>
      </section>

      <section class="wallet-card transfer-card">
        <div class="section-heading"><span class="section-icon bank-icon"><i class="bi bi-bank" aria-hidden="true"></i></span><div><h4>Thông tin chuyển khoản</h4><p>Chuyển tiền sau khi tạo yêu cầu</p></div></div>
        <dl v-if="bankReady && bank" class="bank-details">
          <div><dt>Ngân hàng</dt><dd>{{ bank.bankName }}</dd></div>
          <div><dt>Số tài khoản</dt><dd class="account-number">{{ bank.accountNumber }}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>{{ bank.accountName }}</dd></div>
        </dl>
        <p v-else class="bank-warning">Chưa có thông tin tài khoản nhận tiền. Liên hệ quản trị viên trước khi chuyển khoản.</p>
        <div class="transfer-guide"><h5>Nạp tiền trong 3 bước</h5>
          <ol><li><span>1</span><div><strong>Tạo yêu cầu</strong><p>Nhập số tiền để nhận mã nạp.</p></div></li>
          <li><span>2</span><div><strong>Chuyển khoản</strong><p>Chuyển đúng số tiền, nội dung NAP kèm mã yêu cầu. Chỉ chuyển một lần.</p></div></li>
          <li><span>3</span><div><strong>Chờ xác nhận</strong><p>Quản trị viên đối soát và cập nhật số dư cho bạn.</p></div></li></ol>
        </div>
      </section>
    </div>

    <dialog v-if="showHistory" id="wallet-history" ref="historyDialog" class="history-dialog" aria-labelledby="history-title" @cancel.prevent="showHistory = false" @close="showHistory = false" @click.self="showHistory = false">
    <section class="wallet-card history-card">
      <header class="history-header">
        <div class="section-heading"><span class="section-icon"><i class="bi bi-clock-history" aria-hidden="true"></i></span><div><h4 id="history-title">Lịch sử nạp tiền</h4><p>Tối đa 100 yêu cầu gần nhất · Tự cập nhật trực tiếp</p></div></div>
        <button class="history-close" aria-label="Đóng lịch sử nạp tiền" autofocus @click="showHistory = false"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
      </header>
      <div class="history-body">
      <div v-if="!deposits.length" class="empty-history"><i class="bi bi-receipt" aria-hidden="true"></i><strong>Chưa có yêu cầu nạp tiền</strong><p>Yêu cầu của bạn sẽ được lưu lại ở đây.</p></div>
      <article v-for="item in deposits" :key="item.id" class="history-item">
        <div class="history-item-heading"><div><strong class="history-amount">{{ formatMoney(item.amount) }}</strong><span class="history-code">NAP{{ item.id }}</span></div><span class="status-badge" :class="item.status.toLowerCase()">{{ depositStatus(item.status) }}</span></div>
        <time class="history-time" :datetime="item.createdAt"><i class="bi bi-clock" aria-hidden="true"></i> {{ formatHistoryTime(item.createdAt) }}</time>
        <p v-if="item.status === 'PENDING'" class="transfer-reference">Nội dung chuyển khoản: <strong>NAP{{ item.id }}</strong>. Chỉ chuyển một lần cho yêu cầu này.</p>
        <p v-if="item.description" class="history-note">{{ item.description }}</p>
        <p v-if="item.reviewNote" class="history-note">Phản hồi: {{ item.reviewNote }}</p>
      </article>
      </div>
    </section>
    </dialog>
  </div>
</template>

<style scoped>
.wallet-page { max-width: 1080px; margin: 0 auto; padding: 24px 8px 48px; color: #21314e; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.eyebrow { margin: 0 0 7px; color: #8793aa; font-size: 10px; font-weight: 700; letter-spacing: 1.7px; }
h2 { font-size: 28px; font-weight: 750; letter-spacing: -.8px; margin: 0; }
.page-subtitle { margin: 8px 0 0; color: #8a96aa; font-size: 13px; }
.soft-button { background: #fff; border: 1px solid #e3e9f3; color: #61708e; border-radius: 11px; padding: 10px 15px; font-size: 12px; white-space: nowrap; }
button { transition: background .15s, box-shadow .15s; }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 3px solid #a7b5f7; outline-offset: 3px; }
.balance-card { position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 32px; margin-bottom: 24px; border-radius: 22px; color: #fff; background: linear-gradient(115deg, #253765, #5264a8); box-shadow: 0 12px 28px #34487920; }
.balance-card::after { content: ''; position: absolute; pointer-events: none; width: 270px; height: 270px; right: -85px; top: -135px; border: 40px solid #ffffff06; border-radius: 50%; }
.balance-content, .history-toggle { position: relative; z-index: 1; }
.balance-label { display: flex; align-items: center; gap: 9px; font-size: 13px; color: #e0e7fc; }
.balance-card h3 { margin: 14px 0 10px; font-size: clamp(26px, 4vw, 38px); font-weight: 750; letter-spacing: -1px; overflow-wrap: anywhere; }
.balance-content > p { font-size: 12px; color: #d1daf3; margin: 0 0 18px; }
.connection-state { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; color: #dce5fb; }
.connection-dot { width: 6px; height: 6px; border-radius: 50%; background: #dfc793; flex-shrink: 0; }
.connection-dot.live { background: #8ce1be; }
.history-toggle { display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding: 12px 16px; background: #ffffff12; border: 1px solid #ffffff30; border-radius: 12px; color: white; font-size: 12px; }
.history-toggle:hover { background: #ffffff24; }
.wallet-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 22px; align-items: start; }
.wallet-card { padding: 26px; background: #fff; border: 1px solid #e7ecf4; border-radius: 18px; box-shadow: 0 4px 18px #25376504; }
.section-heading { display: flex; gap: 12px; align-items: center; margin-bottom: 25px; }
.section-heading h4 { font-size: 16px; font-weight: 700; margin: 0 0 5px; }
.section-heading p { font-size: 11px; color: #8a96aa; margin: 0; line-height: 1.6; }
.section-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: #edf1ff; color: #6577c9; flex-shrink: 0; font-size: 18px; }
.bank-icon { background: #eaf6f1; color: #448f78; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
.field-label { display: block; font-size: 12px; font-weight: 650; margin-bottom: 9px; }
.amount-input { position: relative; }
.amount-input input { width: 100%; padding: 15px 60px 15px 15px; font-size: 21px; font-weight: 650; border: 1px solid #dfe6f2; border-radius: 12px; color: #34496c; background: #fbfcff; }
.amount-input input::placeholder { font-size: 16px; font-weight: 400; color: #a8b1c2; }
.amount-input > span { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 11px; color: #9ba7bd; pointer-events: none; }
.field-hint { font-size: 10px; color: #95a0b4; margin: 8px 0 14px; }
.quick-amounts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 25px; }
.quick-amounts button { border: 1px solid #e4eaf5; background: white; color: #71809d; border-radius: 9px; padding: 10px 3px; font-size: 11px; }
.quick-amounts button.selected, .quick-amounts button:hover:not(:disabled) { color: #5267bd; background: #edf1ff; border-color: #b3c0f0; }
.optional { font-size: 10px; font-weight: 400; color: #9aa5b8; }
.note-input { width: 100%; padding: 12px 13px; font-size: 12px; border: 1px solid #dfe6f2; border-radius: 10px; color: #405273; }
.note-input::placeholder { color: #a6afbf; }
.submit-button { width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; background: #5368b5; border: 0; color: white; padding: 14px; border-radius: 11px; font-size: 13px; font-weight: 600; margin-top: 24px; }
.submit-button:hover:not(:disabled) { background: #43599f; }
.form-footnote { text-align: center; margin: 12px 0 0; color: #98a3b6; font-size: 10px; }
.bank-details { padding: 17px; background: #f7f9fd; border: 1px solid #edf0f6; border-radius: 12px; margin: 0 0 24px; }
.bank-details > div + div { margin-top: 15px; }
.bank-details dt { color: #8b97ac; font-size: 10px; font-weight: 400; margin-bottom: 5px; }
.bank-details dd { color: #53647f; font-size: 12px; font-weight: 650; margin: 0; overflow-wrap: anywhere; }
.bank-details .account-number { color: #435a98; font-size: 19px; letter-spacing: .7px; }
.transfer-guide h5 { font-size: 12px; font-weight: 700; margin: 0 0 17px; }
.transfer-guide ol { padding: 0; margin: 0; list-style: none; display: grid; gap: 15px; }
.transfer-guide li { display: flex; gap: 12px; align-items: flex-start; }
.transfer-guide li > span { display: grid; place-items: center; width: 23px; height: 23px; flex-shrink: 0; font-size: 10px; color: #7384b0; background: #edf1f9; border-radius: 50%; }
.transfer-guide strong { font-size: 11px; font-weight: 650; }
.transfer-guide p { color: #95a0b3; font-size: 11px; line-height: 1.6; margin: 4px 0 0; }
.wallet-alert { display: flex; align-items: flex-start; gap: 10px; padding: 15px 18px; border-radius: 12px; margin-bottom: 18px; font-size: 13px; line-height: 1.7; }
.error-alert { color: #ac5764; background: #fff0f2; }
.success-alert { color: #37866a; background: #eaf8f1; }
.bank-warning, .retry-note { font-size: 12px; line-height: 1.7; padding: 12px; color: #9c7b49; background: #fffaef; border-radius: 10px; margin: 15px 0; }
.history-dialog { position: fixed; inset: 50% auto auto 50%; transform: translate(-50%, -50%); margin: 0; width: min(680px, calc(100vw - 32px)); max-width: none; max-height: calc(100dvh - 48px); padding: 0; border: 0; border-radius: 20px; color: #21314e; background: white; box-shadow: 0 24px 80px #15244240; overflow: hidden; }
.history-dialog::backdrop { background: #14203f80; backdrop-filter: blur(4px); }
.history-card { padding: 0; border: 0; display: flex; flex-direction: column; max-height: calc(100dvh - 48px); }
.history-header { display: flex; align-items: flex-start; gap: 12px; justify-content: space-between; padding: 24px; border-bottom: 1px solid #edf0f6; background: #f9faff; flex-shrink: 0; }
.history-header .section-heading { margin: 0; }
.history-close { display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0; border: 0; border-radius: 9px; background: #edf1fa; color: #7687a5; font-size: 13px; }
.history-close:hover { background: #e2e8f7; color: #435b8d; }
.history-body { padding: 0 24px 24px; overflow-y: auto; overscroll-behavior: contain; min-height: 0; }
.history-body .history-item:first-child { border-top: 0; }
.history-item { border-top: 1px solid #edf0f6; padding: 19px 0; overflow-wrap: anywhere; }
.history-item:last-child { padding-bottom: 0; }
.history-item-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.history-amount { font-size: 16px; color: #415476; }
.history-code { font-size: 11px; color: #99a5b8; margin-left: 12px; }
.status-badge { font-size: 10px; border-radius: 20px; padding: 5px 10px; background: #fff7e5; color: #b0873b; }
.status-badge.success { color: #428a72; background: #e7f6ee; }
.status-badge.cancelled { color: #b6626e; background: #fcecef; }
.history-time { display: block; color: #a0aabc; font-size: 10px; margin-top: 8px; }
.transfer-reference { font-size: 12px; color: #7f8bab; margin: 10px 0 0; }
.history-note { font-size: 12px; color: #7d8ba5; margin: 8px 0 0; }
.empty-history { display: flex; align-items: center; flex-direction: column; gap: 12px; padding: 28px; text-align: center; }
.empty-history > i { font-size: 30px; color: #b9c5de; }
.empty-history strong { font-size: 13px; color: #7685a0; }
.empty-history p { font-size: 12px; color: #a0aabc; margin: 0; }
@media (max-width: 760px) { .wallet-grid { grid-template-columns: 1fr; } .balance-card { align-items: flex-start; flex-direction: column; padding: 24px; } .wallet-card { padding: 21px; } .wallet-page { padding-top: 16px; } }
@media (max-width: 400px) { .quick-amounts { grid-template-columns: repeat(2, 1fr); } .page-heading { align-items: flex-start; } .page-subtitle { font-size: 11px; } h2 { font-size: 24px; } }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>

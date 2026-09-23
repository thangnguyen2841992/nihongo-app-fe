<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { getWallet, depositWallet, getDeposits, getBankInfo, walletError, formatMoney, depositStatus,
  type WalletResponse, type WalletDeposit, type BankInfo, type DepositWalletRequest } from '@/services/walletApi'

import { useWalletRealtime, type WalletNotice } from '@/services/walletRealtime'

const wallet = ref<WalletResponse | null>(null)
const deposits = ref<WalletDeposit[]>([])
const bank = ref<BankInfo | null>(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const amount = ref<number | null>(null)
const description = ref('')
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
  if (submitting.value || loading.value || !wallet.value) return
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
      ? `Yêu cầu NAP${result.id} đang chờ đối soát. Số dư chỉ tăng sau khi quản trị viên xác nhận đã nhận tiền.`
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
  <div class="container py-4" style="max-width: 900px">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2>Ví của tôi</h2>
      <button class="btn btn-outline-primary" :disabled="loading || submitting" @click="load()">{{ loading ? 'Đang tải...' : 'Cập nhật' }}</button>
    </div>
    <p role="status" class="small text-muted">{{ liveStatus === 'live' ? 'Đang cập nhật theo thời gian thực' : liveStatus === 'connecting' ? 'Đang kết nối cập nhật trực tiếp...' : 'Mất kết nối trực tiếp. Đang kết nối lại; bạn có thể bấm Cập nhật.' }}</p>
    <div v-if="error" role="alert" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" role="status" class="alert alert-success">{{ success }}</div>
    <div class="card p-4 mb-4">
      <span>Số dư hiện tại</span>
      <h3 class="mt-2">{{ wallet ? formatMoney(wallet.balance) : 'Chưa tải được số dư' }}</h3>
    </div>
    <div class="card p-4 mb-4">
      <h4>Nạp tiền bằng chuyển khoản</h4>
      <p>Tạo yêu cầu trước, sau đó chuyển đúng số tiền và nội dung NAP kèm mã yêu cầu. Quản trị viên sẽ kiểm tra tiền nhận được trước khi cộng ví.</p>
      <div v-if="bank?.bankName && bank?.accountNumber && bank?.accountName" class="alert alert-info">
        <div>Ngân hàng: <strong>{{ bank.bankName }}</strong></div>
        <div>Số tài khoản: <strong>{{ bank.accountNumber }}</strong></div>
        <div>Chủ tài khoản: <strong>{{ bank.accountName }}</strong></div>
      </div>
      <p v-else class="alert alert-warning">Chưa có thông tin tài khoản nhận tiền. Liên hệ quản trị viên để được hướng dẫn trước khi chuyển khoản.</p>
      <form @submit.prevent="submit">
        <fieldset :disabled="submitting || loading || !wallet || !!retryRequest">
          <label for="amount" class="form-label">Số tiền (VNĐ)</label>
          <input id="amount" v-model.number="amount" type="number" min="1000" max="100000000" step="1" required class="form-control mb-3" />
          <label for="description" class="form-label">Ghi chú</label>
          <input id="description" v-model="description" maxlength="500" class="form-control mb-3" />
        </fieldset>
        <p v-if="retryRequest" class="text-muted">Đang giữ nguyên yêu cầu để gửi lại an toàn. Hệ thống sẽ trả về yêu cầu cũ nếu đã nhận được.</p>
        <button class="btn btn-primary" :disabled="submitting || loading || !wallet" type="submit">
          {{ submitting ? 'Đang gửi...' : retryRequest ? 'Gửi lại yêu cầu' : 'Tạo yêu cầu nạp' }}
        </button>
      </form>
    </div>
    <div class="card p-4">
      <h4>Lịch sử yêu cầu nạp</h4>
      <p class="text-muted">Tối đa 100 yêu cầu gần nhất. Kết quả đối soát và số dư tự động cập nhật khi có kết nối trực tiếp.</p>
      <p v-if="!deposits.length">Chưa có yêu cầu nạp tiền.</p>
      <div v-for="item in deposits" :key="item.id" class="border-top py-3">
        <div class="d-flex justify-content-between flex-wrap gap-2">
          <strong>NAP{{ item.id }} · {{ formatMoney(item.amount) }}</strong>
          <span :class="item.status === 'SUCCESS' ? 'text-success' : item.status === 'CANCELLED' ? 'text-danger' : 'text-warning'">{{ depositStatus(item.status) }}</span>
        </div>
        <div v-if="item.status === 'PENDING'">Nội dung chuyển khoản: <strong>NAP{{ item.id }}</strong>. Chỉ chuyển một lần cho yêu cầu này.</div>
        <small class="text-muted">{{ item.createdAt.replace('T', ' ') }}</small>
        <div v-if="item.description">{{ item.description }}</div>
        <div v-if="item.reviewNote">Phản hồi: {{ item.reviewNote }}</div>
      </div>
    </div>
  </div>
</template>

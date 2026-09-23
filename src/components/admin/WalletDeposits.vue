<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAdminDeposits, reviewDeposit, walletError, formatMoney, depositStatus, type WalletDeposit } from '@/services/walletApi'
import { useWalletRealtime } from '@/services/walletRealtime'
const liveStatus = useWalletRealtime(true, () => { void load() })
let reloadPending = false
const items = ref<WalletDeposit[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
const selected = ref<WalletDeposit | null>(null)
const reference = ref('')
const note = ref('')
const checked = ref(false)
async function load() {
  if (loading.value || busy.value) { reloadPending = true; return }
  loading.value = true; error.value = ''
  try {
    items.value = await getAdminDeposits()
    if (selected.value && items.value.some(item => item.id === selected.value?.id && item.status !== 'PENDING')) selected.value = null
  }
  catch (e) { error.value = walletError(e, 'Không thể tải yêu cầu. Chỉ ADMIN có quyền đối soát.') }
  finally {
    loading.value = false
    if (reloadPending) { reloadPending = false; void load() }
  }
}
function select(item: WalletDeposit) { selected.value = item; reference.value = ''; note.value = ''; checked.value = false; error.value = ''; success.value = '' }
async function review(approve: boolean) {
  if (!selected.value || busy.value) return
  if (approve && (!checked.value || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}$/.test(reference.value.trim()))) {
    error.value = 'Kiểm tra đã nhận đúng tiền và nhập mã giao dịch ngân hàng (3–100 ký tự, không có khoảng trắng).'; return
  }
  if (!approve && !note.value.trim()) { error.value = 'Nhập lý do từ chối.'; return }
  busy.value = true; error.value = ''; success.value = ''
  try {
    const result = await reviewDeposit(selected.value.id, { approve, bankReference: reference.value.trim(), note: note.value.trim() })
    items.value = items.value.map(item => item.id === result.id ? result : item)
    selected.value = null
    success.value = `NAP${result.id}: ${depositStatus(result.status)}.`
  } catch (e) { error.value = walletError(e, 'Chưa xác định được kết quả. Gửi lại cùng mã giao dịch để kiểm tra; không tạo mã mới.') }
  finally {
    busy.value = false
    if (reloadPending) { reloadPending = false; void load() }
  }
}
onMounted(load)
</script>
<template>
  <div>
    <div class="d-flex justify-content-between mb-3"><h2>Đối soát nạp tiền</h2><button class="btn btn-outline-primary" :disabled="loading || busy" @click="load">Tải lại</button></div>
    <p>Chỉ xác nhận sau khi đã đối chiếu sao kê: tài khoản nhận, số tiền và nội dung NAP. Mỗi mã giao dịch ngân hàng chỉ được dùng một lần.</p>
    <p role="status" class="small text-muted">{{ liveStatus === 'live' ? 'Đang cập nhật theo thời gian thực' : liveStatus === 'connecting' ? 'Đang kết nối cập nhật trực tiếp...' : 'Mất kết nối trực tiếp. Đang kết nối lại; bạn có thể bấm Tải lại.' }}</p>
    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-if="success" class="alert alert-success" role="status">{{ success }}</div>
    <div v-if="selected" class="card p-4 mb-4">
      <h4>NAP{{ selected.id }} · {{ formatMoney(selected.amount) }}</h4>
      <p>Tài khoản: {{ selected.userId }}</p>
      <label for="bank-reference" class="form-label">Mã giao dịch trên sao kê ngân hàng</label>
      <input id="bank-reference" v-model="reference" :disabled="busy" maxlength="100" class="form-control mb-3" />
      <label for="review-note" class="form-label">Ghi chú / lý do từ chối</label>
      <textarea id="review-note" v-model="note" :disabled="busy" maxlength="500" class="form-control mb-3"></textarea>
      <label class="mb-3"><input v-model="checked" type="checkbox" :disabled="busy" /> Tôi đã kiểm tra và nhận đủ {{ formatMoney(selected.amount) }} với nội dung NAP{{ selected.id }}.</label>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-success" :disabled="busy || !checked" @click="review(true)">Xác nhận và cộng tiền</button>
        <button class="btn btn-danger" :disabled="busy" @click="review(false)">Từ chối</button>
        <button class="btn btn-outline-secondary" :disabled="busy" @click="selected = null">Đóng</button>
      </div>
    </div>
    <p v-if="loading">Đang tải...</p>
    <p v-else-if="!items.length">Chưa có yêu cầu nạp tiền.</p>
    <div class="table-responsive">
      <table class="table align-middle"><thead><tr><th>Mã</th><th>Tài khoản</th><th>Số tiền</th><th>Trạng thái</th><th>Đối soát</th></tr></thead>
        <tbody><tr v-for="item in items" :key="item.id">
          <td>NAP{{ item.id }}<br /><small>{{ item.createdAt.replace('T', ' ') }}</small></td>
          <td style="overflow-wrap:anywhere">{{ item.userId }}<br /><small>{{ item.description }}</small></td>
          <td>{{ formatMoney(item.amount) }}</td><td>{{ depositStatus(item.status) }}</td>
          <td><button v-if="item.status === 'PENDING'" class="btn btn-sm btn-primary" :disabled="busy" @click="select(item)">Đối soát</button><span v-else>{{ item.bankReference || item.reviewNote }}</span></td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>

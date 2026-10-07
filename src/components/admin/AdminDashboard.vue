<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listAccounts, type AdminAccount } from '@/services/adminAccounts'
import { getAdminDeposits, type WalletDeposit } from '@/services/walletApi'
import { gatewayUrl } from '@/api/authApi'

const accounts = ref<AdminAccount[]>([])
const deposits = ref<WalletDeposit[]>([])
const booksInReview = ref(0)
const loading = ref(true)
const warning = ref('')
const users = computed(() => accounts.value.filter(a => a.active && a.role === 'USER').length)
const staff = computed(() => accounts.value.filter(a => a.active && a.role === 'STAFF').length)
const pending = computed(() => deposits.value.filter(d => d.status === 'PENDING').length)
async function load() {
  loading.value = true; warning.value = ''
  const [accountResult, depositResult, bookResult] = await Promise.allSettled([
    listAccounts(), getAdminDeposits(), gatewayUrl.get<Array<{ publicationStatus: string }>>('/api/staff/books'),
  ])
  if (accountResult.status === 'fulfilled') accounts.value = accountResult.value
  if (depositResult.status === 'fulfilled') deposits.value = depositResult.value
  if (bookResult.status === 'fulfilled') booksInReview.value = bookResult.value.data.filter(book => book.publicationStatus === 'IN_REVIEW').length
  if (accountResult.status === 'rejected' || depositResult.status === 'rejected' || bookResult.status === 'rejected') warning.value = 'Một số số liệu chưa tải được. Hãy thử tải lại.'
  loading.value = false
}
onMounted(load)
</script>

<template>
  <section><header class="d-flex justify-content-between align-items-center mb-4"><div><h1 class="h3">Tổng quan quản trị</h1><p class="text-muted">Các việc cần xử lý và tài khoản đang hoạt động.</p></div><button class="btn btn-outline-primary" @click="load">Tải lại</button></header>
    <p v-if="warning" class="alert alert-warning" role="alert">{{ warning }}</p><p v-if="loading" role="status">Đang tải tổng quan...</p>
    <div v-else class="row g-3"><div class="col-md-3"><RouterLink to="/admin/users" class="card p-4 text-decoration-none h-100"><h2 class="h6 text-muted">Học viên</h2><strong class="fs-2">{{ users }}</strong><span>Xem tài khoản →</span></RouterLink></div><div class="col-md-3"><RouterLink to="/admin/users" class="card p-4 text-decoration-none h-100"><h2 class="h6 text-muted">Nhân viên</h2><strong class="fs-2">{{ staff }}</strong><span>Quản lý quyền →</span></RouterLink></div><div class="col-md-3"><RouterLink to="/staff" class="card p-4 text-decoration-none h-100"><h2 class="h6 text-muted">Sách chờ duyệt</h2><strong class="fs-2">{{ booksInReview }}</strong><span>Duyệt sách →</span></RouterLink></div><div class="col-md-3"><RouterLink to="/admin/wallet-deposits" class="card p-4 text-decoration-none h-100"><h2 class="h6 text-muted">Nạp tiền chờ đối soát</h2><strong class="fs-2">{{ pending }}</strong><span>Mở đối soát →</span></RouterLink></div></div>
  </section>
</template>

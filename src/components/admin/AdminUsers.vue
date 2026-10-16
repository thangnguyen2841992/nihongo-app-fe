<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { accountHistory, inviteAccount, listAccounts, updateAccountRole, updateAccountStatus, type AdminAccount, type AccountAudit } from '@/services/adminAccounts'

const accounts = ref<AdminAccount[]>([])
const history = ref<AccountAudit[]>([])
const search = ref('')
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const showInvite = ref(false)
const selected = ref<AdminAccount | null>(null)
const page = ref(0)
const totalPages = ref(0)
const totalElements = ref(0)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0
const invite = ref<{ email: string; firstName: string; lastName: string; role: AdminAccount['role'] }>({ email: '', firstName: '', lastName: '', role: 'USER' })
async function load(nextPage = 0) {
  const current = ++requestId
  loading.value = true; error.value = ''
  try {
    const result = await listAccounts(nextPage, search.value.trim())
    if (current !== requestId) return
    accounts.value = result.content; page.value = result.number; totalPages.value = result.totalPages; totalElements.value = result.totalElements
  } catch { if (current === requestId) error.value = 'Không tải được danh sách tài khoản.' }
  finally { if (current === requestId) loading.value = false }
}
async function submitInvite() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await inviteAccount(invite.value)
    showInvite.value = false
    invite.value = { email: '', firstName: '', lastName: '', role: 'USER' }
    notice.value = 'Đã tạo lời mời. Người dùng cần mở email kích hoạt và đặt mật khẩu.'
    await load(0)
  } catch { error.value = 'Không tạo được lời mời. Kiểm tra email hoặc trạng thái dịch vụ gửi thư.' }
  finally { busy.value = false }
}
async function changeRole(account: AdminAccount, event: Event) {
  const role = (event.target as HTMLSelectElement).value as AdminAccount['role']
  if (role === account.role) return
  if (!confirm(`Đổi quyền ${account.email} từ ${account.role} sang ${role}? Phiên hiện tại của tài khoản này sẽ bị thu hồi.`)) {
    (event.target as HTMLSelectElement).value = account.role; return
  }
  busy.value = true; error.value = ''
  try { const updated = await updateAccountRole(account.userId, role); accounts.value = accounts.value.map(item => item.userId === updated.userId ? updated : item); notice.value = 'Đã đổi quyền tài khoản.' }
  catch { (event.target as HTMLSelectElement).value = account.role; error.value = 'Không đổi được quyền. Kiểm tra quyền Admin còn lại.' }
  finally { busy.value = false }
}
async function toggleStatus(account: AdminAccount) {
  if (!confirm(`${account.active ? 'Khóa' : 'Mở'} tài khoản ${account.email}?`)) return
  busy.value = true; error.value = ''
  try { const updated = await updateAccountStatus(account.userId, !account.active); accounts.value = accounts.value.map(item => item.userId === updated.userId ? updated : item); notice.value = 'Đã cập nhật trạng thái tài khoản.' }
  catch { error.value = 'Không đổi được trạng thái. Kiểm tra quyền Admin còn lại.' }
  finally { busy.value = false }
}
async function showHistory(account: AdminAccount) {
  selected.value = account; history.value = []; error.value = ''
  try { history.value = await accountHistory(account.userId) }
  catch { error.value = 'Không tải được lịch sử thao tác.' }
}
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { void load(0) }, 300)
})
onMounted(() => load())
onUnmounted(() => { clearTimeout(searchTimer); ++requestId })
</script>

<template>
  <section class="admin-users">
    <header class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><div><h1 class="h3 mb-1">Quản lý tài khoản</h1><p class="text-muted mb-0">Tạo lời mời, đổi quyền và khóa/mở tài khoản.</p></div><button class="btn btn-primary" @click="showInvite = true">Mời tài khoản</button></header>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p><p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>
    <label class="form-label" for="account-search">Tìm tài khoản</label><input id="account-search" v-model="search" class="form-control mb-3" placeholder="Email, tên hoặc quyền" />
    <p v-if="loading" role="status">Đang tải tài khoản...</p>
    <div v-else class="table-responsive bg-white rounded-3 border"><table class="table align-middle mb-0"><thead><tr><th>Tài khoản</th><th>Quyền</th><th>Trạng thái</th><th>Lần đăng nhập cuối</th><th>Thao tác</th></tr></thead><tbody><tr v-for="account in accounts" :key="account.userId"><td><strong>{{ account.fullName }}</strong><br><small>{{ account.email }}</small></td><td><select class="form-select form-select-sm" :value="account.role" :disabled="busy" :aria-label="`Quyền của ${account.email}`" @change="changeRole(account, $event)"><option value="USER">USER</option><option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option></select></td><td><span class="badge" :class="account.active ? 'bg-success' : 'bg-secondary'">{{ account.active ? 'Hoạt động' : account.activationPending ? 'Chờ kích hoạt email' : 'Đang khóa' }}</span></td><td>{{ account.lastLogin ? new Date(account.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập' }}</td><td><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="showHistory(account)">Lịch sử</button><button class="btn btn-sm" :class="account.active ? 'btn-outline-danger' : 'btn-outline-success'" :disabled="busy || account.activationPending" @click="toggleStatus(account)">{{ account.active ? 'Khóa' : 'Mở' }}</button></div></td></tr></tbody></table><p v-if="!accounts.length" class="p-3 mb-0">Không có tài khoản phù hợp.</p></div>
    <div v-if="!loading && totalPages > 1" class="d-flex justify-content-between align-items-center mt-3"><small>{{ totalElements }} tài khoản</small><div class="d-flex align-items-center gap-2"><button class="btn btn-sm btn-outline-secondary" :disabled="page === 0" @click="load(page - 1)">Trước</button><span>{{ page + 1 }}/{{ totalPages }}</span><button class="btn btn-sm btn-outline-secondary" :disabled="page + 1 >= totalPages" @click="load(page + 1)">Sau</button></div></div>
    <div v-if="showInvite" class="admin-modal"><form class="admin-dialog" @submit.prevent="submitInvite"><h2 class="h5">Mời tài khoản mới</h2><p>Người nhận sẽ kích hoạt qua email và tự đặt mật khẩu.</p><label class="form-label">Email<input v-model="invite.email" type="email" class="form-control" required></label><label class="form-label">Họ<input v-model="invite.lastName" class="form-control" required></label><label class="form-label">Tên<input v-model="invite.firstName" class="form-control" required></label><label class="form-label">Quyền<select v-model="invite.role" class="form-select"><option value="USER">USER</option><option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option></select></label><div class="d-flex gap-2 justify-content-end mt-3"><button type="button" class="btn btn-outline-secondary" @click="showInvite = false">Hủy</button><button class="btn btn-primary" :disabled="busy">{{ busy ? 'Đang gửi...' : 'Gửi lời mời' }}</button></div></form></div>
    <div v-if="selected" class="admin-modal"><div class="admin-dialog"><h2 class="h5">Lịch sử · {{ selected.email }}</h2><p v-if="!history.length">Chưa có thao tác quản trị.</p><ul v-else class="list-group mb-3"><li v-for="entry in history" :key="entry.id" class="list-group-item"><strong>{{ entry.action }}</strong> · {{ entry.oldValue || '—' }} → {{ entry.newValue || '—' }}<br><small>{{ new Date(entry.createdAt).toLocaleString('vi-VN') }} · {{ entry.actorUserId }}</small></li></ul><button class="btn btn-outline-secondary" @click="selected = null">Đóng</button></div></div>
  </section>
</template>

<style scoped>
.admin-modal { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 16px; background: #1b203b88; }
.admin-dialog { width: min(540px, 100%); max-height: 85vh; overflow: auto; padding: 24px; border-radius: 16px; background: #fff; box-shadow: 0 18px 55px #11182755; }
.admin-dialog label { display: block; margin-top: 10px; }
</style>

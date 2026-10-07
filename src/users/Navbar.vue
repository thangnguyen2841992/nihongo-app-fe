<script setup lang="ts">

import {ref, watch, onMounted, onUnmounted} from "vue"
import { getWallet, formatMoney } from '@/services/walletApi'
import { getUserProfile, type UserProfile } from '@/services/userProfile'
import NotificationBell from '@/components/common/NotificationBell.vue'
import BrandLogo from '@/components/common/BrandLogo.vue'
import {useRouter} from "vue-router"
import {logout} from "@/services/authState.ts"


const props = defineProps<{
  isLoggedIn: boolean
  name?: string
  email?: string
  role?: string
}>()

const emit = defineEmits(["toggle"])

const router = useRouter()
const balance = ref<number | null>(null)
const balanceLoading = ref(false)
const accountOpen = ref(false)
const accountDropdown = ref<HTMLElement | null>(null)
const profile = ref<UserProfile | null>(null)
const profileLoading = ref(false)
const profileError = ref('')
let profileRequest: AbortController | null = null
let balanceRequest = 0
let disposed = false
const closeAccountOnOutsideClick = (event: PointerEvent) => {
  if (!accountDropdown.value?.contains(event.target as Node)) accountOpen.value = false
}
async function loadProfile() {
  const email = props.email?.trim()
  if (!email) return
  profileRequest?.abort()
  const controller = new AbortController()
  profileRequest = controller
  profileLoading.value = true
  profileError.value = ''
  try {
    const result = await getUserProfile(email, controller.signal)
    if (!controller.signal.aborted && !disposed) profile.value = result
  } catch {
    if (!controller.signal.aborted && !disposed) profileError.value = 'Không tải được thông tin bổ sung.'
  } finally {
    if (profileRequest === controller) {
      profileRequest = null
      if (!disposed) profileLoading.value = false
    }
  }
}
function toggleAccount() {
  accountOpen.value = !accountOpen.value
  if (accountOpen.value && !profile.value && !profileLoading.value) void loadProfile()
}
async function refreshBalance() {
  const request = ++balanceRequest
  if (!props.isLoggedIn || !props.email || disposed) return
  balanceLoading.value = true
  try {
    const wallet = await getWallet()
    if (request === balanceRequest && !disposed) balance.value = wallet.balance
  } catch {
    if (request === balanceRequest && !disposed) balance.value = null
  } finally {
    if (request === balanceRequest && !disposed) balanceLoading.value = false
  }
}
watch(() => [props.isLoggedIn, props.email], () => {
  profileRequest?.abort()
  profile.value = null
  profileError.value = ''
  profileLoading.value = false
  accountOpen.value = false
  balance.value = null
  balanceLoading.value = false
  void refreshBalance()
}, { immediate: true })
onMounted(() => {
  document.addEventListener('pointerdown', closeAccountOnOutsideClick)
  window.addEventListener('wallet:changed', refreshBalance)
  window.addEventListener('focus', refreshBalance)
})
onUnmounted(() => {
  disposed = true
  profileRequest?.abort()
  document.removeEventListener('pointerdown', closeAccountOnOutsideClick)
  ++balanceRequest
  window.removeEventListener('wallet:changed', refreshBalance)
  window.removeEventListener('focus', refreshBalance)
})

/* =========================
   LOGOUT
========================= */

const handleLogout = async () => {
  accountOpen.value = false
  profileRequest?.abort()

  try {

    await logout()

    await router.replace("/login")

  } catch (e) {

    console.error(
      "Logout error",
      e
    )

  }
}


/* =========================
   AI SEARCH
========================= */

const searchKeyword = ref("")

const searchLoading = ref(false)

const handleSearch = async () => {

  const keyword =
    searchKeyword.value.trim()

  if (
    !keyword ||
    searchLoading.value
  ) {
    return
  }

  try {

    searchLoading.value = true

    await router.push({ path: '/japanese-ai', query: { q: keyword } })

  } catch (e) {

    console.error(
      "Japanese AI search error:",
      e
    )

  } finally {

    searchLoading.value = false

  }
}


/* =========================
   WALLET
========================= */

const goToWallet = () => {

  router.push("/wallet")

}

</script>


<template>

  <nav class="navbar-custom">

    <!-- MOBILE SIDEBAR -->

    <button
      class="btn btn-light me-2 d-md-none"
      @click="emit('toggle')"
    >
      ☰
    </button>


    <!-- BRAND -->

    <RouterLink
      class="brand"
      to="/"
      aria-label="NihongoApp — Trang chủ"
    >
      <BrandLogo />
    </RouterLink>


    <!-- AI SEARCH -->

    <form
      class="ai-search"
      @submit.prevent="handleSearch"
    >

      <span class="search-icon">
        🔍
      </span>

      <input
        v-model="searchKeyword"
        type="text"
        placeholder="Tra cứu tiếng Nhật / tiếng Việt..."
        maxlength="2000"
        aria-label="Tìm kiếm AI"
        :disabled="searchLoading"
      />

      <button
        v-if="searchKeyword"
        type="button"
        class="search-clear"
        @click="searchKeyword = ''"
      >
        ×
      </button>

      <button
        type="submit"
        class="search-ai-btn"
        :disabled="
          searchLoading ||
          !searchKeyword.trim()
        "
      >

        <span
          v-if="searchLoading"
        >
          ...
        </span>

        <span v-else>
          AI
        </span>

      </button>

    </form>


    <!-- RIGHT -->

    <div class="ms-auto">

      <!-- LOGGED IN -->

      <div
        v-if="isLoggedIn"
        class="navbar-right"
      >

        <RouterLink v-if="role === 'ADMIN'" to="/admin/dashboard" class="workspace-switch" aria-label="Về giao diện Admin">
          <i class="bi bi-shield-check" aria-hidden="true"></i><span>Admin</span>
        </RouterLink>
        <RouterLink v-if="role === 'ADMIN'" to="/staff" class="workspace-switch" aria-label="Về giao diện Staff">
          <i class="bi bi-person-workspace" aria-hidden="true"></i><span>Staff</span>
        </RouterLink>


        <NotificationBell />

        <!-- WALLET -->

        <button
          class="wallet-btn"
          @click="goToWallet"
        >

          <span class="wallet-icon">
            💰
          </span>

          <div class="wallet-info">

            <span class="wallet-label">
              Ví của tôi
            </span>

            <span class="wallet-balance" aria-live="polite">
              {{ balance !== null ? formatMoney(balance) : balanceLoading ? 'Đang tải…' : 'Chưa tải được số dư' }}
            </span>

          </div>

        </button>


        <!-- USER -->

        <div ref="accountDropdown" class="account-dropdown" @keydown.esc="accountOpen = false">
          <button
            type="button"
            class="account-trigger"
            aria-controls="user-account-panel"
            :aria-expanded="accountOpen"
            @click="toggleAccount"
          >
            <span class="avatar" aria-hidden="true">{{ (name || email || 'U').charAt(0).toUpperCase() }}</span>
            <span class="user-detail">
              <span class="user-name">{{ name || 'Người dùng' }}</span>
              <span class="user-email">{{ email }}</span>
            </span>
            <i class="bi bi-chevron-down account-chevron" aria-hidden="true"></i>
          </button>

          <section v-if="accountOpen" id="user-account-panel" class="account-panel" aria-label="Thông tin tài khoản">
            <div class="account-panel-header">
              <span class="account-panel-avatar" aria-hidden="true">{{ (name || email || 'U').charAt(0).toUpperCase() }}</span>
              <div>
                <strong>{{ profile?.fullName || name || 'Người dùng' }}</strong>
                <span>{{ email }}</span>
              </div>
            </div>
            <dl class="account-details">
              <div><dt>Họ và tên</dt><dd>{{ profile?.fullName || name || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Email</dt><dd>{{ profile?.email || email || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{{ profile?.phoneNumber || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Địa chỉ</dt><dd>{{ profile?.address || 'Chưa cập nhật' }}</dd></div>
            </dl>
            <p v-if="profileLoading" class="account-status" role="status">Đang tải thông tin bổ sung...</p>
            <p v-if="profileError" class="account-status account-error" role="alert">
              {{ profileError }} <button type="button" @click="loadProfile">Thử lại</button>
            </p>
            <div class="account-actions">
              <button type="button" class="account-logout" @click="handleLogout">
                <i class="bi bi-box-arrow-right" aria-hidden="true"></i> Đăng xuất
              </button>
            </div>
          </section>
        </div>

      </div>


      <!-- NOT LOGGED IN -->

      <div v-else>

        <button
          @click="
            router.push('/login')
          "
          class="
            btn
            btn-outline-primary
            btn-sm
            me-2
          "
        >
          Đăng nhập
        </button>

        <button
          @click="
            router.push('/register')
          "
          class="
            btn
            btn-primary
            btn-sm
          "
        >
          Đăng ký
        </button>

      </div>

    </div>

  </nav>

</template>


<style scoped>

.navbar-custom {

  position: fixed;

  top: 0;
  left: 0;

  width: 100%;
  height: 64px;

  display: flex;
  align-items: center;

  padding: 0 24px;

  background: white;

  border-bottom: 1px solid #e5e7eb;

  z-index: 1000;

  box-shadow: 0 2px 12px rgba(0, 0, 0, .04);
}


.brand {
  text-decoration: none;
  flex-shrink: 0;

  font-size: 22px;

  font-weight: 700;

  color: #2563eb;

  cursor: pointer;

  white-space: nowrap;
}


.navbar-right {

  display: flex;

  align-items: center;

  gap: 18px;
}

.workspace-switch { display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border: 1px solid #dfd5e4; border-radius: 10px; background: #f9f5fa; color: #685778; font-size: 13px; font-weight: 700; text-decoration: none; white-space: nowrap; }
.workspace-switch:hover, .workspace-switch.router-link-active { background: #eee5f0; color: #4d3b5d; }
@media (max-width: 1000px) { .workspace-switch span { display: none; } .workspace-switch { padding: 8px 10px; } }


/* =========================
   NOTIFICATION
========================= */

.notification-wrapper {

  position: relative;
}


.notification-btn {

  position: relative;

  width: 42px;
  height: 42px;

  border: none;

  border-radius: 50%;

  background: #f1f5f9;

  font-size: 20px;

  cursor: pointer;

  transition: .2s;
}


.notification-btn:hover {

  background: #e2e8f0;

}


.notification-badge {

  position: absolute;

  top: -4px;
  right: -4px;

  min-width: 20px;
  height: 20px;

  border-radius: 999px;

  background: #ef4444;

  color: white;

  font-size: 11px;

  font-weight: 700;

  display: flex;

  align-items: center;

  justify-content: center;
}


.notification-dropdown {

  position: absolute;

  top: 52px;
  right: 0;

  width: 320px;

  background: white;

  border-radius: 16px;

  overflow: hidden;

  box-shadow: 0 10px 30px rgba(0, 0, 0, .15);
}


.notification-title {

  padding: 14px 16px;

  font-weight: 700;

  border-bottom: 1px solid #eee;
}


.notification-item {

  padding: 14px 16px;

  cursor: pointer;
}


.notification-item:hover {

  background: #f8fafc;

}


/* =========================
   WALLET
========================= */

.wallet-btn {

  display: flex;

  align-items: center;

  gap: 9px;

  border: 1px solid #e2e8f0;

  background: #f8fafc;

  border-radius: 12px;

  padding: 6px 12px;

  cursor: pointer;

  transition: .2s;

  text-align: left;
}


.wallet-btn:hover {

  background: #eff6ff;

  border-color: #bfdbfe;

}


.wallet-icon {

  width: 34px;
  height: 34px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 9px;

  background: #dbeafe;

  font-size: 18px;
}


.wallet-info {

  display: flex;

  flex-direction: column;

  line-height: 1.15;
}


.wallet-label {

  font-size: 13px;

  font-weight: 700;

  color: #1e293b;
}


.wallet-balance {

  font-size: 11px;

  color: #64748b;

}


/* =========================
   USER
========================= */

.account-dropdown { position: relative; }

.account-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 9px 4px 5px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: #53495f;
  cursor: pointer;
  text-align: left;
}
.account-trigger:hover, .account-trigger[aria-expanded="true"] { background: #ffffffa8; border-color: #e2d7df; }
.account-trigger:focus-visible, .account-panel button:focus-visible { outline: 2px solid #8e7999; outline-offset: 2px; }
.account-chevron { font-size: 12px; color: #786c82; transition: transform .18s; }
.account-trigger[aria-expanded="true"] .account-chevron { transform: rotate(180deg); }


.avatar {

  width: 42px;
  height: 42px;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-weight: 700;

  display: flex;

  align-items: center;

  justify-content: center;
}


.user-detail {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}


.user-name {

  font-weight: 700;

}


.user-email {

  font-size: 12px;

  color: #64748b;
}


.account-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: min(340px, calc(100vw - 24px));
  max-height: calc(100dvh - 80px);
  overflow-y: auto;
  padding: 16px;
  border: 1px solid #e8dce5;
  border-radius: 18px;
  background: #fffdfd;
  box-shadow: 0 18px 48px #53495f2b;
  color: #403648;
  z-index: 1010;
}
.account-panel-header { display: flex; align-items: center; gap: 12px; padding-bottom: 15px; border-bottom: 1px solid #eee7ed; }
.account-panel-header > div { display: flex; flex-direction: column; min-width: 0; gap: 3px; overflow-wrap: anywhere; }
.account-panel-header strong { font-size: 15px; }
.account-panel-header span { font-size: 12px; color: #786c82; }
.account-panel-avatar { display: grid; place-items: center; flex: 0 0 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #c59aaa, #9d87ae); color: white; font-weight: 700; }
.account-details { margin: 15px 0 0; }
.account-details > div { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 10px; margin: 0 0 12px; font-size: 13px; }
.account-details dt { color: #786c82; font-weight: 500; }
.account-details dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.account-status { margin: 8px 0; color: #786c82; font-size: 12px; }
.account-error { color: #a34a5f; }
.account-error button { padding: 0; border: 0; background: none; color: #7d5f94; font-weight: 700; cursor: pointer; }
.account-actions { padding-top: 12px; border-top: 1px solid #eee7ed; }
.account-logout { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 9px 12px; border: 1px solid #e8d4dd; border-radius: 10px; background: #f2e5e9; color: #8c586d; font-weight: 700; cursor: pointer; }
.account-logout:hover { background: #e8d4dd; color: #71445b; }


/* =========================
   AI SEARCH
========================= */

.ai-search {

  position: relative;

  display: flex;

  align-items: center;

  width: 360px;

  margin-left: 40px;
}


.ai-search input {

  width: 100%;

  height: 42px;

  padding: 0 75px 0 40px;

  border: 1px solid #e5e7eb;

  border-radius: 12px;

  background: #f8fafc;

  outline: none;

  font-size: 14px;

  transition: .2s;
}


.ai-search input:focus {

  background: white;

  border-color: #86b7fe;

  box-shadow: 0 0 0 3px rgba(13, 110, 253, .1);
}


.search-icon {

  position: absolute;

  left: 14px;

  z-index: 2;

  font-size: 15px;
}


.search-clear {

  position: absolute;

  right: 48px;

  width: 25px;
  height: 25px;

  border: none;

  border-radius: 50%;

  background: transparent;

  color: #64748b;

  cursor: pointer;
}


.search-ai-btn {

  position: absolute;

  right: 5px;

  height: 32px;

  padding: 0 10px;

  border: none;

  border-radius: 8px;

  background: #2563eb;

  color: white;

  font-size: 12px;

  font-weight: 700;

  cursor: pointer;
}


.search-ai-btn:disabled {

  opacity: .5;

  cursor: not-allowed;

}


/* =========================
   MOBILE
========================= */

@media (max-width: 1000px) {

  .ai-search {

    width: 280px;

    margin-left: 20px;
  }

  .user-detail {

    display: none;
  }

}


@media (max-width: 768px) {

  .ai-search {

    display: none;
  }

  .wallet-info {

    display: none;
  }

  .wallet-btn {

    width: 42px;
    height: 42px;

    padding: 0;

    justify-content: center;

    border-radius: 50%;
  }

  .user-email {

    display: none;
  }

  .account-trigger { gap: 5px; padding: 4px; }
  .account-chevron { display: none; }

}

</style>
<style scoped src="./userNavbarTheme.css"></style>

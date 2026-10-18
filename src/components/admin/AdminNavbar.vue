<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import NotificationBell from '@/components/common/NotificationBell.vue'
import { logout } from '@/services/authState.ts'
import { gatewayUrl } from '@/api/authApi.ts'
import router from '@/router'

const emit = defineEmits<{ toggleMenu: [] }>()
withDefaults(defineProps<{ sidebarOpen?: boolean }>(), { sidebarOpen: false })
const isLoggedIn = ref(false)
const userName = ref('')
const userEmail = ref('')
const accountMenuOpen = ref(false)
const accountDropdown = ref<HTMLElement | null>(null)
const closeOutside = (event: PointerEvent) => { if (!accountDropdown.value?.contains(event.target as Node)) accountMenuOpen.value = false }

onMounted(async () => {
  document.addEventListener('pointerdown', closeOutside)
  try {
    const { data } = await gatewayUrl.get('/api/auth/checkLogin')
    isLoggedIn.value = Boolean(data.isLoggedIn)
    userName.value = data.name || ''
    userEmail.value = data.email || ''
  } catch (error) { console.error('Không thể lấy thông tin người dùng', error) }
})
onUnmounted(() => document.removeEventListener('pointerdown', closeOutside))
const handleLogout = async () => { accountMenuOpen.value = false; await logout(); await router.replace('/login') }
</script>

<template>
  <nav class="admin-navbar" aria-label="Thanh công cụ quản trị">
    <button type="button" class="mobile-menu" :aria-label="sidebarOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'" :aria-expanded="sidebarOpen" aria-controls="admin-sidebar" @click="emit('toggleMenu')"><i class="bi bi-list" aria-hidden="true"></i></button>
    <div class="page-identity"><strong>Quản trị hệ thống</strong><span>Điều hành và theo dõi Nihongo</span></div>
    <div class="navbar-actions">
      <div class="workspace-switcher">
        <RouterLink to="/staff" class="workspace-link" aria-label="Về giao diện Staff"><i class="bi bi-person-workspace"></i><span>Staff</span></RouterLink>
        <RouterLink to="/" class="workspace-link" aria-label="Về giao diện người dùng"><i class="bi bi-house"></i><span>Người dùng</span></RouterLink>
      </div>
      <NotificationBell class="notification" />
      <div v-if="isLoggedIn" ref="accountDropdown" class="account" @keydown.esc="accountMenuOpen = false">
        <button type="button" class="account-trigger" aria-haspopup="menu" aria-controls="admin-account-menu" :aria-expanded="accountMenuOpen" @click="accountMenuOpen = !accountMenuOpen">
          <span class="avatar">{{ (userName || userEmail || 'A').charAt(0).toUpperCase() }}</span>
          <span class="user-info"><strong>{{ userName || 'Quản trị viên' }}</strong><small>{{ userEmail }}</small></span>
          <i class="bi bi-chevron-down"></i>
        </button>
        <ul v-if="accountMenuOpen" id="admin-account-menu" class="account-menu" role="menu"><li><button type="button" role="menuitem" @click="handleLogout"><i class="bi bi-box-arrow-right"></i>Đăng xuất</button></li></ul>
      </div>
      <button v-else type="button" class="login-button" @click="router.push('/login')">Đăng nhập</button>
    </div>
  </nav>
</template>

<style scoped>
.admin-navbar { position: fixed; top: 0; right: 0; left: var(--workspace-sidebar); z-index: 1020; display: flex; align-items: center; min-height: var(--workspace-navbar); padding: 8px 22px; border-bottom: 1px solid #e2e8f0; background: rgba(255,255,255,.94); box-shadow: 0 3px 18px rgba(15,23,42,.04); backdrop-filter: blur(14px); }
.mobile-menu { display: none; }.page-identity { display: flex; flex-direction: column; line-height: 1.25; }.page-identity strong { color: #26364a; font-size: 14px; }.page-identity span { color: #77869a; font-size: 10px; }
.navbar-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }.workspace-switcher { display: flex; gap: 6px; padding: 3px; border-radius: 11px; background: #f2f5f8; }.workspace-link { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 6px 9px; border-radius: 8px; color: #53657a; font-size: 11px; font-weight: 700; text-decoration: none; }.workspace-link:hover { background: #fff; color: #294f79; box-shadow: 0 2px 8px rgba(15,23,42,.06); }
.notification { color: #53657a; }.account { position: relative; }.account-trigger { display: flex; align-items: center; gap: 9px; min-height: 44px; padding: 4px 8px 4px 4px; border: 1px solid #e1e7ee; border-radius: 12px; background: #fff; color: #334155; }.account-trigger:hover,.account-trigger[aria-expanded="true"] { background: #f7f9fc; }.avatar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg,#e5aa3c,#f3c86f); color: #26364a; font-size: 13px; font-weight: 800; }.user-info { display: flex; flex-direction: column; max-width: 160px; text-align: left; line-height: 1.2; }.user-info strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.user-info small { overflow: hidden; color: #7b8795; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.account-trigger > i { color: #8a98a8; font-size: 9px; }
.account-menu { position: absolute; top: calc(100% + 9px); right: 0; min-width: 190px; margin: 0; padding: 6px; list-style: none; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; box-shadow: 0 14px 35px rgba(15,23,42,.14); }.account-menu button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: #b44545; font-size: 12px; }.account-menu button:hover { background: #fff1f1; }.login-button { border: 0; border-radius: 10px; padding: 8px 13px; background: #315b8a; color: #fff; font-weight: 700; }
@media (max-width:768px) { .admin-navbar { left: 0; padding: 8px 12px; }.mobile-menu { display: grid; place-items: center; width: 40px; height: 40px; margin-right: 10px; border: 1px solid #dce4ed; border-radius: 10px; background: #f7f9fc; color: #3d526b; font-size: 21px; }.page-identity span,.workspace-link span,.user-info { display: none; }.workspace-link { width: 34px; justify-content: center; padding: 5px; }.account-trigger { gap: 0; padding: 4px; }.account-trigger > i { display: none; } }
@media (max-width:480px) { .page-identity { display: none; }.workspace-switcher { margin-left: auto; }.navbar-actions { margin-left: 0; gap: 6px; } }
</style>

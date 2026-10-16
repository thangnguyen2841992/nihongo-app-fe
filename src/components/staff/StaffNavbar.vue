<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { logout, useAuthState } from '@/services/authState.ts'
import { staffSupportUnread } from '@/services/staffSupportNotifications'
import NotificationBell from '@/components/common/NotificationBell.vue'
import router from '@/router'
import { openJapaneseAiPopup } from '@/services/japaneseAiPopup'

const emit = defineEmits<{ toggleMenu: [] }>()
const { userName, userEmail, userRole } = useAuthState()
const searchKeyword = ref('')
const searchLoading = ref(false)
const accountMenuOpen = ref(false)
const accountDropdown = ref<HTMLElement | null>(null)
const closeOutside = (event: PointerEvent) => { if (!accountDropdown.value?.contains(event.target as Node)) accountMenuOpen.value = false }
onMounted(() => document.addEventListener('pointerdown', closeOutside))
onUnmounted(() => document.removeEventListener('pointerdown', closeOutside))
const handleSearch = async () => {
  const q = searchKeyword.value.trim()
  if (!q || searchLoading.value) return
  searchLoading.value = true
  try { openJapaneseAiPopup(q); searchKeyword.value = '' }
  finally { searchLoading.value = false }
}
const handleLogout = async () => { accountMenuOpen.value = false; await logout(); await router.replace('/login') }
</script>

<template>
  <nav class="staff-navbar" aria-label="Thanh công cụ nhân viên">
    <button type="button" class="mobile-menu" aria-label="Mở menu nhân viên" aria-controls="staff-sidebar" @click="emit('toggleMenu')"><i class="bi bi-list"></i></button>
    <div class="page-identity"><strong>Không gian nhân viên</strong><span>Quản lý nội dung và hỗ trợ học viên</span></div>
    <form class="navbar-search" @submit.prevent="handleSearch"><i class="bi bi-search"></i><input v-model="searchKeyword" type="search" placeholder="Tra cứu tiếng Nhật / tiếng Việt..." maxlength="2000" aria-label="Tìm kiếm AI"><button v-if="searchKeyword" type="button" aria-label="Xóa tìm kiếm" @click="searchKeyword = ''"><i class="bi bi-x"></i></button></form>
    <div class="navbar-actions"><NotificationBell />
      <div class="workspace-switcher">
        <RouterLink to="/staff" class="workspace-link" aria-label="Về giao diện Staff"><i class="bi bi-person-workspace"></i><span>Staff</span></RouterLink>
        <RouterLink v-if="userRole === 'ADMIN'" to="/admin/dashboard" class="workspace-link" aria-label="Về giao diện Admin"><i class="bi bi-shield-check"></i><span>Admin</span></RouterLink>
      </div>
      <RouterLink to="/staff/support" class="notification-btn" :aria-label="staffSupportUnread ? `Tin nhắn hỗ trợ, ${staffSupportUnread} chưa đọc` : 'Tin nhắn hỗ trợ'" title="Tin nhắn hỗ trợ"><i class="bi bi-bell"></i><span v-if="staffSupportUnread" class="notification-count">{{ staffSupportUnread > 99 ? '99+' : staffSupportUnread }}</span></RouterLink>
      <div ref="accountDropdown" class="account" @keydown.esc="accountMenuOpen = false">
        <button type="button" class="account-trigger" :aria-label="`Tài khoản ${userName || 'nhân viên'}`" aria-haspopup="menu" aria-controls="staff-account-menu" :aria-expanded="accountMenuOpen" @click="accountMenuOpen = !accountMenuOpen"><span class="avatar">{{ (userName || userEmail || 'S').charAt(0).toUpperCase() }}</span><span class="user-info"><strong>{{ userName || 'Nhân viên' }}</strong><small>{{ userEmail }}</small></span><i class="bi bi-chevron-down"></i></button>
        <ul v-if="accountMenuOpen" id="staff-account-menu" class="account-menu" role="menu"><li><button type="button" role="menuitem" @click="handleLogout"><i class="bi bi-box-arrow-right"></i>Đăng xuất</button></li></ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.staff-navbar{position:fixed;top:0;right:0;left:var(--workspace-sidebar);z-index:1020;display:flex;align-items:center;gap:18px;min-height:var(--workspace-navbar);padding:8px 22px;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.94);box-shadow:0 3px 18px rgba(15,23,42,.04);backdrop-filter:blur(14px)}.mobile-menu{display:none}.page-identity{display:flex;flex:0 0 auto;flex-direction:column;line-height:1.25}.page-identity strong{color:#26364a;font-size:14px}.page-identity span{color:#77869a;font-size:10px}
.navbar-search{position:relative;display:flex;align-items:center;width:min(360px,32vw);margin-right:auto}.navbar-search>i{position:absolute;left:13px;color:#78879a;font-size:13px}.navbar-search input{width:100%;height:40px;padding:0 38px;border:1px solid #dfe6ee;border-radius:11px;background:#f6f8fb;color:#334155;font-size:12px;outline:0}.navbar-search input:focus{border-color:#789fc8;background:#fff;box-shadow:0 0 0 3px rgba(49,91,138,.1)}.navbar-search button{position:absolute;right:6px;display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:#78879a}.navbar-search button:hover{background:#e9eef4}
.navbar-actions{display:flex;align-items:center;gap:9px}.workspace-switcher{display:flex;gap:5px;padding:3px;border-radius:11px;background:#f2f5f8}.workspace-link{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:6px 9px;border-radius:8px;color:#53657a;font-size:11px;font-weight:700;text-decoration:none}.workspace-link:hover,.workspace-link.router-link-active{background:#fff;color:#294f79;box-shadow:0 2px 8px rgba(15,23,42,.06)}.notification-btn{position:relative;display:grid;place-items:center;width:40px;height:40px;border:1px solid #e1e7ee;border-radius:11px;background:#fff;color:#53657a;font-size:16px}.notification-btn:hover{background:#f5f8fb;color:#315b8a}.notification-count{position:absolute;top:-5px;right:-6px;display:grid;place-items:center;min-width:19px;height:19px;padding:0 4px;border:2px solid #fff;border-radius:20px;background:#dc3545;color:#fff;font-size:8px;font-weight:800}
.account{position:relative}.account-trigger{display:flex;align-items:center;gap:9px;min-height:44px;padding:4px 8px 4px 4px;border:1px solid #e1e7ee;border-radius:12px;background:#fff;color:#334155}.account-trigger:hover,.account-trigger[aria-expanded="true"]{background:#f7f9fc}.avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#4f91cf,#315f8f);color:#fff;font-size:13px;font-weight:800}.user-info{display:flex;flex-direction:column;max-width:150px;text-align:left;line-height:1.2}.user-info strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.user-info small{overflow:hidden;color:#7b8795;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.account-trigger>i{color:#8a98a8;font-size:9px}.account-menu{position:absolute;top:calc(100% + 9px);right:0;min-width:190px;margin:0;padding:6px;list-style:none;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 14px 35px rgba(15,23,42,.14)}.account-menu button{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#b44545;font-size:12px}.account-menu button:hover{background:#fff1f1}
@media(max-width:1000px){.page-identity span,.workspace-link span{display:none}.workspace-link{width:34px;justify-content:center;padding:5px}.navbar-search{width:min(280px,30vw)}}
@media(max-width:768px){.staff-navbar{left:0;gap:8px;padding:8px 12px}.mobile-menu{display:grid;place-items:center;width:40px;height:40px;border:1px solid #dce4ed;border-radius:10px;background:#f7f9fc;color:#3d526b;font-size:21px}.page-identity{display:none}.navbar-search{width:min(220px,35vw);margin-left:0}.user-info,.account-trigger>i{display:none}.account-trigger{gap:0;padding:4px}}
@media(max-width:560px){.navbar-search{display:none}.navbar-actions{margin-left:auto;gap:6px}}
</style>

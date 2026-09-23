<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <header class="guest-navbar">
    <nav class="guest-navbar-inner" aria-label="Điều hướng chính">
      <RouterLink to="/courses" class="guest-brand" aria-label="NihongoApp — Trang chủ">
        <span class="brand-mark" aria-hidden="true">日<span></span></span>
        <span class="brand-name">Nihongo<span>App</span></span>
      </RouterLink>
      <span class="nav-caption">Mỗi ngày một bước, gần hơn với Nhật Bản.</span>
      <div class="guest-actions">
        <RouterLink to="/login" class="login-link">Đăng nhập</RouterLink>
        <RouterLink to="/register" class="register-link">Bắt đầu miễn phí <i class="bi bi-arrow-up-right" aria-hidden="true"></i></RouterLink>
      </div>
      <button class="menu-toggle" type="button" aria-label="Mở hoặc đóng menu"
        aria-controls="guest-sidebar" :aria-expanded="isOpen" @click="emit('toggle')">
        <i class="bi" :class="isOpen ? 'bi-x-lg' : 'bi-list'" aria-hidden="true"></i>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.guest-navbar { position: sticky; top: 0; z-index: 1000; background: #fff; border-bottom: 1px solid #e8edf4; }
.guest-navbar-inner { height: 76px; padding: 0 32px 0 24px; display: flex; align-items: center; gap: 32px; }
.guest-brand { width: 204px; flex-shrink: 0; display: flex; align-items: center; gap: 11px; text-decoration: none; }
.brand-mark { position: relative; display: grid; place-items: center; width: 36px; height: 38px; border-radius: 11px; background: #243e86; color: white; font-size: 25px; font-weight: 600; }
.brand-mark span { position: absolute; width: 8px; height: 8px; border: 2px solid #fff; background: #f08080; border-radius: 50%; right: -3px; top: -2px; }
.brand-name { font-size: 20px; font-weight: 750; letter-spacing: -.7px; color: #1e293b; }
.brand-name > span { color: #64748b; font-weight: 450; }
.nav-caption { color: #7a879b; font-size: 13px; }
.guest-actions { margin-left: auto; display: flex; align-items: center; gap: 24px; white-space: nowrap; }
.login-link { font-size: 13px; color: #475569; font-weight: 600; text-decoration: none; }
.login-link:hover { color: #2457c5; }
.register-link { display: flex; align-items: center; gap: 16px; padding: 11px 17px; border-radius: 9px; background: #243e86; color: #fff; font-size: 13px; font-weight: 600; text-decoration: none; transition: background .2s; }
.register-link:hover { background: #1e326b; }
.menu-toggle { display: none; align-items: center; justify-content: center; width: 40px; height: 40px; background: #f3f6fa; color: #334155; border: 1px solid #e8edf4; border-radius: 9px; font-size: 24px; }
a:focus-visible, button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 4px; }
@media (max-width: 1100px) { .nav-caption { display: none; } }
@media (max-width: 768px) {
  .guest-navbar-inner { height: 68px; padding: 0 20px; gap: 12px; }
  .guest-brand { width: auto; margin-right: auto; }
  .brand-name { font-size: 19px; }
  .guest-actions { display: none; }
  .menu-toggle { display: flex; }
}
</style>

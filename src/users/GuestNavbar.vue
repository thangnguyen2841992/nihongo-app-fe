<script setup lang="ts">
import BrandLogo from '@/components/common/BrandLogo.vue'

defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <nav class="guest-navbar" aria-label="Điều hướng chính">
    <button class="menu-toggle" type="button" aria-label="Mở hoặc đóng menu"
      aria-controls="guest-sidebar" :aria-expanded="isOpen" @click="emit('toggle')">
      <i class="bi" :class="isOpen ? 'bi-x-lg' : 'bi-list'" aria-hidden="true"></i>
    </button>
    <RouterLink to="/courses" class="brand" aria-label="NihongoApp — Trang chủ">
      <BrandLogo />
    </RouterLink>
    <div class="guest-actions">
      <RouterLink to="/login" class="login-link">Đăng nhập</RouterLink>
      <RouterLink to="/register" class="register-link">Đăng ký</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.guest-navbar { position: fixed; top: 0; left: 0; width: 100%; height: 64px; display: flex; align-items: center; padding: 0 24px; background: white; border-bottom: 1px solid #e5e7eb; z-index: 1000; box-shadow: 0 2px 12px rgb(0 0 0 / 4%); }
.brand { display: flex; align-items: center; flex-shrink: 0; text-decoration: none; white-space: nowrap; }
.guest-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.guest-actions a { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 7px 14px; border: 1px solid #2563eb; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; transition: background .15s, color .15s; }
.login-link { color: #2563eb; background: white; }
.login-link:hover { background: #eff6ff; }
.register-link { background: #2563eb; color: white; }
.register-link:hover { background: #1d4ed8; }
.menu-toggle { display: none; align-items: center; justify-content: center; flex-shrink: 0; width: 36px; height: 36px; margin-right: 8px; border: 1px solid #f8f9fa; border-radius: 6px; background: #f8f9fa; color: #253b68; font-size: 22px; }
a:focus-visible, button:focus-visible { outline: 2px solid #e99484; outline-offset: 3px; }
@media (max-width: 768px) { .menu-toggle { display: flex; } }
@media (max-width: 480px) { .guest-navbar { padding: 0 12px; } .guest-actions { gap: 6px; } .guest-actions a { padding: 7px 9px; font-size: 11px; } }
@media (max-width: 360px) { .guest-navbar { padding: 0 8px; } .guest-actions .login-link { display: none; } }
@media (prefers-reduced-motion: reduce) { .guest-actions a { transition: none; } }
</style>
<style scoped src="./userNavbarTheme.css"></style>

<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
const links = [
  { to: '/courses', icon: 'bi-compass', label: 'Khám phá khóa học' },
  { to: '/user/my-courses', icon: 'bi-book', label: 'Khóa học của tôi' },
  { to: '/wallet', icon: 'bi-wallet2', label: 'Ví của tôi' },
]
</script>

<template>
  <aside id="user-sidebar" class="learning-sidebar" :class="{ open: isOpen }" aria-label="Menu học tập" @keydown.esc="emit('close')">
    <div class="sidebar-heading"><span>Học tập</span><button class="close-menu" aria-label="Đóng menu" @click="emit('close')"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>
    <nav aria-label="Điều hướng học tập">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="learning-link" @click="emit('close')">
        <i class="bi" :class="link.icon" aria-hidden="true"></i><span>{{ link.label }}</span>
      </RouterLink>
    </nav>
  </aside>
  <button v-if="isOpen" class="sidebar-overlay" aria-label="Đóng menu" @click="emit('close')"></button>
</template>

<style scoped>
.learning-sidebar { position: fixed; top: 60px; bottom: 0; left: 0; width: 220px; z-index: 999; padding: 28px 14px; overflow-y: auto; background: #fcfcfa; border-right: 1px solid #eceeeF; color: #253b68; }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 12px; margin-bottom: 16px; color: #9299a5; font-size: 11px; font-weight: 600; }
.learning-link { position: relative; display: flex; align-items: center; gap: 12px; padding: 13px 12px; margin: 5px 0; border-radius: 9px; color: #727d90; text-decoration: none; font-size: 12px; font-weight: 500; transition: background .15s; }
.learning-link > i { font-size: 17px; }
.learning-link:hover { background: #f1f3f6; color: #253b68; }
.learning-link.router-link-active { background: #edf1f8; color: #253b68; font-weight: 650; }
.learning-link.router-link-active::before { content: ''; position: absolute; left: 0; top: 13px; bottom: 13px; width: 3px; border-radius: 3px; background: #e99484; }
.close-menu, .sidebar-overlay { display: none; }
a:focus-visible, button:focus-visible { outline: 2px solid #e99484; outline-offset: 3px; }
@media (max-width: 768px) {
  .learning-sidebar { width: min(260px, 85vw); visibility: hidden; transform: translateX(-100%); transition: transform .2s, visibility .2s; }
  .learning-sidebar.open { visibility: visible; transform: translateX(0); box-shadow: 12px 0 40px #253b6815; }
  .close-menu { display: grid; place-items: center; margin-left: auto; border: 0; background: transparent; color: #8892a2; width: 28px; height: 28px; border-radius: 6px; }
  .sidebar-overlay { display: block; position: fixed; inset: 60px 0 0; z-index: 998; border: 0; background: #18294344; }
}
@media (prefers-reduced-motion: reduce) { .learning-sidebar, .learning-link { transition: none; } }
</style>

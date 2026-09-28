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

<style scoped src="./learningSidebar.css"></style>

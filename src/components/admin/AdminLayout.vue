<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminNavbar from './AdminNavbar.vue'
import AdminSidebar from './AdminSidebar.vue'

const route = useRoute()
const menuOpen = ref(false)
watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<template>
  <div class="admin-shell workspace-shell" :class="{ 'menu-open': menuOpen }">
    <AdminSidebar :is-open="menuOpen" @close="menuOpen = false" />
    <AdminNavbar @toggle-menu="menuOpen = !menuOpen" />
    <main class="admin-content workspace-content">
      <div class="workspace-page"><RouterView /></div>
    </main>
  </div>
</template>

<style scoped>
.admin-content { min-height: 100vh; margin-left: var(--workspace-sidebar); padding: calc(var(--workspace-navbar) + 22px) 24px 28px; }
@media (max-width: 768px) { .admin-content { margin-left: 0; padding: calc(var(--workspace-navbar) + 14px) 12px 20px; } }
</style>

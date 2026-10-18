<script setup lang="ts">
import { useWorkspaceSidebar } from '@/composables/useWorkspaceSidebar'
import AdminNavbar from './AdminNavbar.vue'
import AdminSidebar from './AdminSidebar.vue'

const { sidebarOpen, toggleSidebar, closeSidebar, closeOnNavigate } = useWorkspaceSidebar()
</script>

<template>
  <div class="admin-shell workspace-shell" :class="{ 'menu-open': sidebarOpen, 'sidebar-collapsed': !sidebarOpen }">
    <AdminSidebar :is-open="sidebarOpen" @close="closeSidebar" @navigate="closeOnNavigate" />
    <AdminNavbar :sidebar-open="sidebarOpen" @toggle-menu="toggleSidebar" />
    <main class="admin-content workspace-content">
      <div class="workspace-page"><RouterView /></div>
    </main>
  </div>
</template>

<style scoped>
.admin-content { min-height: 100vh; margin-left: var(--workspace-sidebar); padding: calc(var(--workspace-navbar) + 22px) 24px 28px; }
@media (max-width: 768px) { .admin-content { margin-left: 0; padding: calc(var(--workspace-navbar) + 14px) 12px 20px; } }
</style>

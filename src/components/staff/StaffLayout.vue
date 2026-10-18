<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useWorkspaceSidebar } from '@/composables/useWorkspaceSidebar'
import StaffSidebar from './StaffSidebar.vue'
import StaffNavbar from './StaffNavbar.vue'
import StaffSupportLauncher from './StaffSupportLauncher.vue'
import { startStaffSupportNotifications } from '@/services/staffSupportNotifications'

const { sidebarOpen, toggleSidebar, closeSidebar, closeOnNavigate } = useWorkspaceSidebar()
let stopNotifications: (() => void) | undefined
onMounted(() => { stopNotifications = startStaffSupportNotifications() })
onUnmounted(() => stopNotifications?.())
</script>

<template>
  <div class="staff-shell workspace-shell" :class="{ 'menu-open': sidebarOpen, 'sidebar-collapsed': !sidebarOpen }">
    <StaffSidebar :is-open="sidebarOpen" @close="closeSidebar" @navigate="closeOnNavigate" />
    <StaffNavbar :sidebar-open="sidebarOpen" @toggle-menu="toggleSidebar" />
    <main class="staff-content workspace-content"><div class="workspace-page"><RouterView /></div></main>
    <StaffSupportLauncher />
  </div>
</template>

<style scoped>
.staff-content { min-height: 100vh; margin-left: var(--workspace-sidebar); padding: calc(var(--workspace-navbar) + 22px) 24px 28px; }
@media(max-width:768px){.staff-content{margin-left:0;padding:calc(var(--workspace-navbar) + 14px) 12px 20px}}
</style>

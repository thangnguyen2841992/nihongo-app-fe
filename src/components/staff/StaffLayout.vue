<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import StaffSidebar from "@/components/staff/StaffSidebar.vue";
import StaffNavbar from "@/components/staff/StaffNavbar.vue";
import StaffSupportLauncher from '@/components/staff/StaffSupportLauncher.vue'
import { startStaffSupportNotifications } from '@/services/staffSupportNotifications'
const route = useRoute()
const importing = computed(() => ['/staff/imports/books','/staff/insights','/staff/editorial','/staff/question-bank','/staff/revisions','/staff/support'].includes(route.path))
const menuOpen = ref(false)
watch(() => route.fullPath, () => { menuOpen.value = false })
let stopSupportNotifications: (() => void) | undefined
onMounted(() => { stopSupportNotifications = startStaffSupportNotifications() })
onUnmounted(() => { stopSupportNotifications?.() })
</script>

<template>
  <div class="layout" :class="{ importing, 'menu-open': menuOpen }">
    <button v-if="importing" class="import-mobile-menu" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">{{ menuOpen ? 'Đóng menu' : 'Menu quản lý' }}</button>

    <!-- SIDEBAR -->
    <StaffSidebar />

    <!-- MAIN -->
    <div class="main d-flex flex-column">

      <StaffNavbar />

      <div class="content flex-grow-1">
        <router-view />
      </div>

    </div>

    <StaffSupportLauncher />

  </div>
</template>

<style scoped>
.layout {
  display: flex;
}

.main {
  margin-left: 300px;
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  background: #f1f5f9;
}

.content {
  padding: 20px;
  margin-top: 72px;
}
.import-mobile-menu { display: none; }
@media (max-width: 768px) {
  .importing .main { margin-left: 0; }
  .importing .content { padding: 10px; }
  .importing :deep(.sidebar) { display: none; z-index: 1050; padding-top: 64px; }
  .importing.menu-open :deep(.sidebar) { display: block; }
  .importing :deep(.navbar) { left: 0; }
  .importing :deep(.navbar-brand) { display: none; }
  .importing :deep(.navbar-search) { margin-left: 135px; }
  .import-mobile-menu { display: block; position: fixed; top: 18px; left: 14px; z-index: 1100; border: 1px solid #cad5e6; border-radius: 8px; padding: 8px 10px; background: white; color: #31547c; }
}
@media (max-width: 576px) {
  .importing :deep(.user-info) { display: none; }
  .importing :deep(.user-dropdown-btn) { padding: 4px; gap: 0; }
  .importing :deep(.avatar-circle) { width: 34px; height: 34px; }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '@/users/Navbar.vue'
import GuestNavbar from '@/users/GuestNavbar.vue'
import GuestSidebar from '@/users/GuestSidebar.vue'
import Sidebar from '@/users/Sidebar.vue'
import StaffSidebar from '@/components/staff/StaffSidebar.vue'
import StaffNavbar from '@/components/staff/StaffNavbar.vue'
import { useAuthState } from '@/services/authState'

const { isAuthenticated, isAuthReady, userName, userEmail, userRole } = useAuthState()
const route = useRoute()
const router = useRouter()
const isOpen = ref(false)
const isStaff = computed(() => isAuthenticated.value && userRole.value === 'STAFF')
const isUser = computed(() => isAuthenticated.value && userRole.value === 'USER')
const hasSidebar = computed(() => !isAuthenticated.value || isStaff.value || isUser.value)
const toggleSidebar = () => { isOpen.value = !isOpen.value }

watch([isAuthReady, isAuthenticated, () => route.path], ([ready, authenticated, path]) => {
  isOpen.value = false
  if (ready && !authenticated && path === '/') void router.replace('/courses')
}, { immediate: true })
</script>

<template>
  <StaffNavbar v-if="isStaff" :isLoggedIn="isAuthenticated" :name="userName" :email="userEmail" @toggle="toggleSidebar" />
  <Navbar v-else-if="isAuthenticated" :isLoggedIn="isAuthenticated" :name="userName" :email="userEmail" :role="userRole" @toggle="toggleSidebar" />
  <GuestNavbar v-else :isOpen="isOpen" @toggle="toggleSidebar" />

  <div class="layout" :class="{ 'user-background': !isAuthenticated || isUser }">
    <StaffSidebar v-if="isStaff" :isOpen="isOpen" @close="isOpen = false" />
    <Sidebar v-else-if="isUser" :isOpen="isOpen" @close="isOpen = false" />
    <GuestSidebar v-else-if="!isAuthenticated" :isOpen="isOpen" @close="isOpen = false" />
    <main class="main-content" :class="{ 'with-sidebar': hasSidebar, 'signed-in': isAuthenticated }">
      <router-view v-if="isAuthReady && (isAuthenticated || route.path !== '/')" />
      <p v-else class="text-center py-5" role="status">Đang tải...</p>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; }
.layout.user-background { position: relative; isolation: isolate; }
.layout.user-background::before {
  content: '';
  position: fixed;
  inset: 64px 0 0 220px;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(rgb(255 255 255 / 72%), rgb(255 255 255 / 72%)), url('../assets/user-background.jpg') center / cover no-repeat;
}
.user-background .main-content { min-height: calc(100vh - 64px); }
.user-background .main-content.with-sidebar:not(.signed-in) { background: transparent; }
.user-background .main-content > :deep(.page) { background: transparent; }
.main-content { flex: 1; min-width: 0; }
.main-content.signed-in { margin-top: 15px; padding: 40px 20px 20px; }
.main-content.with-sidebar { margin-left: 220px; }
.main-content.with-sidebar:not(.signed-in) { margin-top: 64px; background: #f6f7fb; }
@media (max-width: 768px) {
  .layout.user-background::before { left: 0; }
  .main-content.with-sidebar, .main-content.with-sidebar:not(.signed-in) { margin-left: 0; }
}
</style>

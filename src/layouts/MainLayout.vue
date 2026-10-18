<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GuestNavbar from '@/users/GuestNavbar.vue'
import GuestSidebar from '@/users/GuestSidebar.vue'
import { useAuthState } from '@/services/authState'
import { useWorkspaceSidebar } from '@/composables/useWorkspaceSidebar'

const Navbar = defineAsyncComponent(() => import('@/users/Navbar.vue').then(module => module.default))
const Sidebar = defineAsyncComponent(() => import('@/users/Sidebar.vue').then(module => module.default))
const StaffSidebar = defineAsyncComponent(() => import('@/components/staff/StaffSidebar.vue').then(module => module.default))
const StaffNavbar = defineAsyncComponent(() => import('@/components/staff/StaffNavbar.vue').then(module => module.default))
const { isAuthenticated, isAuthReady, userName, userEmail, userRole } = useAuthState()
const route = useRoute()
const { sidebarOpen, toggleSidebar: toggleMemberSidebar, closeSidebar: closeMemberSidebar, closeOnNavigate } = useWorkspaceSidebar()
const router = useRouter()
const isOpen = ref(false)
const isStaff = computed(() => isAuthenticated.value && userRole.value === 'STAFF')
const isUser = computed(() => isAuthenticated.value && userRole.value === 'USER')
const hasSidebar = computed(() => !isAuthenticated.value || isStaff.value || isUser.value)
// A different course/book needs fresh page state; lesson query changes stay in the same book.
const courseViewKey = computed(() => route.name === 'CourseBookDetail'
  ? `book:${route.params.bookId}:course:${route.query.courseId}`
  : route.name === 'CourseBooks' ? `course:${route.params.courseId}` : undefined)
const toggleSidebar = () => { isOpen.value = !isOpen.value }

watch([isAuthReady, isAuthenticated, () => route.path], ([ready, authenticated, path]) => {
  isOpen.value = false
  if (ready && !authenticated && path === '/') void router.replace('/courses')
}, { immediate: true })
</script>

<template>
  <StaffNavbar v-if="isStaff" :sidebar-open="sidebarOpen" :class="{ 'sidebar-collapsed': !sidebarOpen }" @toggleMenu="toggleMemberSidebar" />
  <Navbar v-else-if="isAuthenticated" :isLoggedIn="isAuthenticated" :name="userName" :email="userEmail" :role="userRole" :has-sidebar="isUser" :sidebar-open="sidebarOpen" @toggle="toggleMemberSidebar" />
  <GuestNavbar v-else :isOpen="isOpen" @toggle="toggleSidebar" />

  <div class="layout workspace-shell" :class="{ 'user-background': !isAuthenticated || isUser, 'staff-workspace': isStaff, 'learner-workspace': isUser, 'sidebar-collapsed': (isStaff || isUser) && !sidebarOpen }">
    <StaffSidebar v-if="isStaff" :isOpen="sidebarOpen" @close="closeMemberSidebar" @navigate="closeOnNavigate" />
    <Sidebar v-else-if="isUser" :isOpen="sidebarOpen" @close="closeMemberSidebar" @navigate="closeOnNavigate" />
    <GuestSidebar v-else-if="!isAuthenticated" :isOpen="isOpen" @close="isOpen = false" />
    <main class="main-content workspace-content" :class="{ 'with-sidebar': hasSidebar, 'signed-in': isAuthenticated }">
      <router-view v-if="isAuthReady && (isAuthenticated || route.path !== '/')" :key="courseViewKey" />
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
  inset: 64px 0 0 236px;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(110deg, rgb(250 248 245 / 88%) 0%, rgb(250 248 245 / 68%) 44%, rgb(240 246 249 / 54%) 100%),
    url('../assets/user-background-v2.jpg') center / cover no-repeat;
}
.layout.user-background::after {
  content: '';
  position: fixed;
  inset: 64px 0 0 236px;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 14%, rgb(255 244 224 / 52%), transparent 34%),
    radial-gradient(circle at 82% 78%, rgb(208 225 235 / 34%), transparent 36%);
}
.user-background .main-content { min-height: calc(100vh - 64px); background: linear-gradient(180deg, transparent, rgb(248 250 251 / 26%)); }
.user-background .main-content.with-sidebar:not(.signed-in) { background: transparent; }
.user-background .main-content > :deep(.page) { background: transparent; }
.main-content { flex: 1; min-width: 0; }
.main-content.signed-in { margin-top: 64px; padding: 0 20px 20px; }
.main-content.with-sidebar { margin-left: 236px; }
.staff-workspace .main-content.with-sidebar { margin-left: var(--workspace-sidebar); padding-top: 20px; }
.main-content.with-sidebar:not(.signed-in) { margin-top: 64px; background: #f6f7fb; }
@media(min-width:769px){.layout.user-background.sidebar-collapsed::before,.layout.user-background.sidebar-collapsed::after{left:0}}
@media (max-width: 768px) {
  .main-content.signed-in { padding: 0 12px 16px; }
  .layout.user-background::before { left: 0; }
  .layout.user-background::after { left: 0; }
  .main-content.with-sidebar, .main-content.with-sidebar:not(.signed-in) { margin-left: 0; }
  .staff-workspace .main-content.with-sidebar { margin-left: 0; }
}
</style>

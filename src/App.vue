<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import WalletNotifications from '@/components/common/WalletNotifications.vue'
import { initAuth } from '@/services/authState.ts'
import { useAuthState } from '@/services/authState'
import { gatewayUrl } from '@/api/authApi'
import { trackAdminActivity } from '@/services/adminActivity'
import FloatingScrollButtons from "@/components/common/FloatingScrollButtons.vue";

const { isAuthenticated, userRole } = useAuthState()
let stopActivity: (() => void) | undefined
onMounted(() => {
  initAuth()
  stopActivity = trackAdminActivity(
    () => isAuthenticated.value && userRole.value.replace(/^ROLE_/, '') === 'ADMIN',
    () => gatewayUrl.post('/api/auth/activity'),
  )
})
onUnmounted(() => stopActivity?.())
</script>

<template>
  <RouterView />
  <WalletNotifications />
  <FloatingScrollButtons />
</template>

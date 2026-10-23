<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted } from 'vue'
import { initAuth } from '@/services/authState.ts'
import { useAuthState } from '@/services/authState'
import { gatewayUrl } from '@/api/authApi'
import { trackAdminActivity } from '@/services/adminActivity'
import FloatingScrollButtons from "@/components/common/FloatingScrollButtons.vue";
import BroadcastTicker from '@/components/common/BroadcastTicker.vue'

const WalletNotifications = defineAsyncComponent(() => import('@/components/common/WalletNotifications.vue').then(module => module.default))
const SupportChatWidget = defineAsyncComponent(() => import('@/components/common/SupportChatWidget.vue').then(module => module.default))
const JapaneseAiPopup = defineAsyncComponent(() => import('@/components/common/JapaneseAiPopup.vue').then(module => module.default))
const { isAuthenticated, isAuthReady, userRole } = useAuthState()
const signedIn = computed(() => isAuthReady.value && isAuthenticated.value)
const isLearner = computed(() => signedIn.value && userRole.value.replace(/^ROLE_/, '') === 'USER')
let stopActivity: (() => void) | undefined
onMounted(() => {
  initAuth()
  // ADMIN (30 min) and STAFF (2 h) sessions have an idle limit that only real interactions extend.
  stopActivity = trackAdminActivity(
    () => isAuthenticated.value && ['ADMIN', 'STAFF'].includes(userRole.value.replace(/^ROLE_/, '')),
    () => gatewayUrl.post('/api/auth/activity'),
  )
})
onUnmounted(() => stopActivity?.())
</script>

<template>
  <RouterView />
  <WalletNotifications v-if="signedIn" />
  <BroadcastTicker />
  <FloatingScrollButtons />
  <SupportChatWidget v-if="isLearner" />
  <JapaneseAiPopup v-if="signedIn" />
</template>

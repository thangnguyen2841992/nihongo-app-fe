<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { staffSupportUnread } from '@/services/staffSupportNotifications'

const route = useRoute()
const visible = computed(() => route.path !== '/staff/support')
</script>

<template>
  <RouterLink
    v-if="visible"
    class="staff-chat-launcher"
    to="/staff/support"
    :aria-label="staffSupportUnread ? `Hộp thư hỗ trợ, ${staffSupportUnread} tin nhắn chưa đọc` : 'Mở hộp thư hỗ trợ'"
    title="Hỗ trợ trực tuyến"
  >
    <i class="bi bi-chat-dots-fill" aria-hidden="true"></i>
    <span v-if="staffSupportUnread" class="staff-chat-count">{{ staffSupportUnread > 99 ? '99+' : staffSupportUnread }}</span>
  </RouterLink>
</template>

<style scoped>
.staff-chat-launcher { position: fixed; right: 24px; bottom: 24px; z-index: 1040; display: grid; place-items: center; width: 58px; height: 58px; border-radius: 19px; background: linear-gradient(145deg,#7355b6,#526cda); color: #fff; font-size: 23px; text-decoration: none; box-shadow: 0 12px 28px #4458a94d; transition: transform .18s,box-shadow .18s; }
.staff-chat-launcher:hover { color: #fff; transform: translateY(-2px); box-shadow: 0 16px 34px #4458a95c; }
.staff-chat-launcher:focus-visible { outline: 3px solid #a9b7ff; outline-offset: 3px; }
.staff-chat-count { position: absolute; top: -6px; right: -7px; display: grid; place-items: center; min-width: 23px; height: 23px; padding: 0 5px; border: 2px solid #fff; border-radius: 999px; background: #dc3545; color: #fff; font-size: 10px; font-weight: 800; line-height: 1; }
@media(max-width:480px) { .staff-chat-launcher { right: 12px; bottom: max(12px,env(safe-area-inset-bottom)); width: 54px; height: 54px; border-radius: 17px; } }
@media(prefers-reduced-motion:reduce) { .staff-chat-launcher { transition: none; } }
</style>

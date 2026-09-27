<script setup lang="ts">
import { notificationOpen, notificationUnread } from '@/services/notificationState'
</script>

<template>
  <button class="notification-bell" :aria-label="`Thông báo, ${notificationUnread} chưa đọc`"
    :aria-expanded="notificationOpen" aria-controls="wallet-notification-panel"
    @click="notificationOpen = !notificationOpen" @keydown.esc="notificationOpen = false">
    <i class="bi bi-bell" aria-hidden="true"></i>
    <span v-if="notificationUnread" class="bell-count">{{ notificationUnread > 99 ? '99+' : notificationUnread }}</span>
  </button>
</template>

<style scoped>
.notification-bell { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 21px; cursor: pointer; }
.notification-bell:hover { background: rgba(128,128,128,.15); }
.bell-count { position: absolute; top: 0; right: -4px; min-width: 18px; padding: 2px 4px; border-radius: 12px; background: #dc3545; color: white; font-size: 11px; line-height: 14px; }
</style>

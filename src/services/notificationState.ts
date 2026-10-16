import { ref } from 'vue'

// The global notification listener and navbar bells share one UI state.
export const notificationOpen = ref(false)
export const notificationUnread = ref(0)
export const broadcastUnread = ref(0)

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import { supportChatOpen } from '@/services/supportChatState'
import { useRoute } from 'vue-router'
import { japaneseAiPopupOpen } from '@/services/japaneseAiPopup'

const { isAuthenticated, isAuthReady, userRole } = useAuthState()
const route = useRoute()
const hasSupportChat = computed(() => isAuthenticated.value && userRole.value.replace(/^ROLE_/, '') === 'USER')
const hasAiPopup = computed(() => isAuthReady.value && isAuthenticated.value && route.path !== '/japanese-ai')
const showTopButton = ref(false)
const showBottomButton = ref(false)
let frame: number | undefined
let observer: ResizeObserver | undefined

function updateScrollButtons() {
  frame = undefined
  const scrollTop = window.scrollY
  const atBottom = scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 100
  showTopButton.value = scrollTop >= 100
  showBottomButton.value = !atBottom
}

function scheduleUpdate() {
  if (frame === undefined) frame = requestAnimationFrame(updateScrollButtons)
}

const scrollBehavior = (): ScrollBehavior => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
const scrollToTop = () => window.scrollTo({ top: 0, behavior: scrollBehavior() })
const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: scrollBehavior() })

watch(() => route.fullPath, scheduleUpdate, { flush: 'post' })
onMounted(() => {
  updateScrollButtons()
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate)
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(scheduleUpdate)
    observer.observe(document.body)
    observer.observe(document.documentElement)
  }
})
onUnmounted(() => {
  window.removeEventListener('scroll', scheduleUpdate)
  window.removeEventListener('resize', scheduleUpdate)
  observer?.disconnect()
  if (frame !== undefined) cancelAnimationFrame(frame)
})
</script>

<template>
  <div v-show="!(hasSupportChat && supportChatOpen) && !(hasAiPopup && japaneseAiPopupOpen)" class="floating-actions" :class="{ 'with-support-chat': hasSupportChat, 'with-ai-popup': hasAiPopup }">

    <button
      v-if="showTopButton"
      class="scroll-btn"
      title="Lên đầu trang"
      @click="scrollToTop"
    >
      ⬆
    </button>

    <button
      v-if="showBottomButton"
      class="scroll-btn"
      title="Xuống cuối trang"
      @click="scrollToBottom"
    >
      ⬇
    </button>

  </div>
</template>

<style scoped>
.floating-actions {
  position: fixed;
  right: 24px;
  bottom: 24px;

  display: flex;
  flex-direction: column;
  gap: 12px;

  z-index: 1035;
}

.floating-actions.with-support-chat {
  bottom: 94px;
}

.floating-actions.with-ai-popup {
  bottom: 156px;
}

.scroll-btn {
  width: 56px;
  height: 56px;

  border: none;
  border-radius: 50%;

  cursor: pointer;

  font-size: 22px;

  color: white;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  box-shadow:
    0 8px 20px
    rgba(
      79,
      140,
      255,
      .35
    );

  transition: .2s;
}

.scroll-btn:hover {
  transform: translateY(-3px);
}

@media (max-width: 640px) {
  .floating-actions.with-ai-popup {
    right: 12px;
    bottom: max(138px, calc(env(safe-area-inset-bottom) + 132px));
  }
}
</style>

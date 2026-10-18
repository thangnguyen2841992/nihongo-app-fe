<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import type { BroadcastNotice } from '@/services/broadcastApi'
import { broadcastFeed, broadcastOwner } from '@/services/notificationState'

const { isAuthenticated, userEmail, userRole } = useAuthState()
const activeNotice = ref<BroadcastNotice | null>(null)
const tickerLane = ref<HTMLElement | null>(null)
const tickerLine = ref<HTMLElement | null>(null)
const motionStyle = ref<Record<string, string>>({})
const normalizedRole = computed(() => userRole.value.replace(/^ROLE_/, ''))
const enabled = computed(() => isAuthenticated.value && ['STAFF', 'USER'].includes(normalizedRole.value))
const tickerClass = computed(() => ({ 'staff-ticker': normalizedRole.value === 'STAFF' }))
let currentOwner = ''
let handledNoticeId: number | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => [enabled.value, broadcastOwner(userEmail.value, userRole.value), broadcastFeed.value] as const,
  ([active, owner, feed]) => {
    if (owner !== currentOwner) {
      currentOwner = owner
      handledNoticeId = undefined
      activeNotice.value = null
      clearTimeout(hideTimer)
    }
    if (!active || feed.owner !== owner) return
    const newest = feed.notices[0]
    if (!newest || newest.id === handledNoticeId) return
    handledNoticeId = newest.id
    const createdAt = Date.parse(newest.createdAt)
    const age = Number.isFinite(createdAt) ? Math.max(0, Date.now() - createdAt) : 0
    const remaining = Math.max(0, 120_000 - age)
    if (!remaining) return
    activeNotice.value = newest
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => { activeNotice.value = null }, remaining)
  },
  { immediate: true },
)

onUnmounted(() => clearTimeout(hideTimer))

watch(() => activeNotice.value?.id, async (_, __, cleanup) => {
  let disposed = false
  let observer: ResizeObserver | undefined
  cleanup(() => { disposed = true; observer?.disconnect() })
  await nextTick()
  if (disposed || !tickerLane.value || !tickerLine.value) return
  const measure = () => {
    const laneWidth = tickerLane.value?.clientWidth ?? 0
    const textWidth = tickerLine.value?.scrollWidth ?? 0
    if (!laneWidth || !textWidth) return
    // Keep reading speed independent of the viewport and message length.
    const pixelsPerSecond = 20
    const start = Math.max(0, (laneWidth - textWidth) / 2)
    motionStyle.value = {
      '--ticker-lane-width': `${laneWidth}px`,
      '--ticker-duration': `${(laneWidth + textWidth) / pixelsPerSecond}s`,
      '--ticker-delay': `${-(laneWidth - start) / pixelsPerSecond}s`,
    }
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(tickerLane.value)
    observer.observe(tickerLine.value)
  }
}, { immediate: true })
</script>

<template>
  <aside v-if="activeNotice" ref="tickerLane" class="broadcast-ticker" :class="tickerClass" role="status" aria-live="polite">
    <p :key="activeNotice.id" ref="tickerLine" class="ticker-line" :style="motionStyle"><strong>{{ activeNotice.title }}</strong> — {{ activeNotice.content }}</p>
  </aside>
</template>

<style scoped>
.broadcast-ticker {
  position: fixed;
  top: 72px;
  right: 0;
  left: 236px;
  z-index: 990;
  height: 34px;
  overflow: hidden;
  pointer-events: none;
  contain: layout paint;
}

.broadcast-ticker.staff-ticker { left: var(--workspace-sidebar); }

.ticker-line {
  position: absolute;
  top: 50%;
  left: 0;
  width: max-content;
  max-width: none;
  margin: 0;
  color: #d4142d;
  font-size: 17px;
  font-weight: 700;
  line-height: 34px;
  white-space: nowrap;
  text-align: center;
  text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff,
    1px 1px 0 #fff, 0 2px 5px rgba(0, 0, 0, .24);
  animation: ticker-readable-right-to-left var(--ticker-duration, 120s) linear infinite;
  /* This explicitly requested ticker stays slow under the global .01ms motion rule. */
  animation-duration: var(--ticker-duration, 120s) !important;
  animation-delay: var(--ticker-delay, 0s);
  backface-visibility: hidden;
  will-change: transform;
}

.ticker-line strong { font-weight: 900; }

@keyframes ticker-readable-right-to-left {
  from { transform: translate3d(var(--ticker-lane-width, 100vw), -50%, 0); }
  to { transform: translate3d(-100%, -50%, 0); }
}

@media (max-width: 768px) {
  .broadcast-ticker, .broadcast-ticker.staff-ticker { left: 0; }
  .ticker-line { font-size: 15px; }
}
</style>

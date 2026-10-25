<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthState } from '@/services/authState'
import {
  closeJapaneseAiPopup,
  japaneseAiPopupMounted,
  japaneseAiPopupOpen,
  japaneseAiPopupQuery,
  openJapaneseAiPopup,
} from '@/services/japaneseAiPopup'

const JapaneseAiResult = defineAsyncComponent(() => import('@/components/staff/JapaneseAiResult.vue'))

const route = useRoute()
const { isAuthenticated, isAuthReady } = useAuthState()
const enabled = computed(() => isAuthReady.value && isAuthenticated.value && route.path !== '/japanese-ai')
</script>

<template>
  <aside v-if="enabled" class="ai-popup-host" aria-label="Trợ lý tiếng Nhật" @keydown.esc="closeJapaneseAiPopup">
    <Transition name="ai-popup">
      <section
        v-show="japaneseAiPopupOpen"
        id="japanese-ai-popup"
        class="ai-popup-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="japanese-ai-popup-title"
      >
        <header class="ai-popup-header">
          <span class="ai-popup-mark" aria-hidden="true"><i class="bi bi-stars"></i></span>
          <div>
            <h2 id="japanese-ai-popup-title">Trợ lý tiếng Nhật</h2>
            <p>Kết quả được giữ khi bạn chuyển màn hình</p>
          </div>
          <button type="button" title="Thu nhỏ" aria-label="Thu nhỏ trợ lý AI" @click="closeJapaneseAiPopup">
            <i class="bi bi-dash-lg" aria-hidden="true"></i>
          </button>
        </header>
        <div class="ai-popup-body">
          <JapaneseAiResult
            v-if="japaneseAiPopupMounted"
            embedded
            :query="japaneseAiPopupQuery"
            @update:query="japaneseAiPopupQuery = $event"
          />
        </div>
      </section>
    </Transition>

    <button
      v-show="!japaneseAiPopupOpen"
      type="button"
      class="ai-popup-launcher"
      aria-controls="japanese-ai-popup"
      :aria-expanded="japaneseAiPopupOpen"
      aria-label="Mở trợ lý tiếng Nhật"
      title="Trợ lý tiếng Nhật"
      @click="openJapaneseAiPopup()"
    >
      <i class="bi bi-stars" aria-hidden="true"></i>
      <span>AI</span>
    </button>
  </aside>
</template>

<style scoped>
.ai-popup-host { position: fixed; right: 22px; bottom: 92px; z-index: 1090; color: #263248; }
.ai-popup-panel { display: flex; flex-direction: column; width: min(580px, calc(100vw - 32px)); height: min(760px, calc(100dvh - 118px)); overflow: hidden; border: 1px solid #dfe4ec; border-radius: 20px; background: #f7f8fb; box-shadow: 0 22px 65px rgb(25 35 55 / 24%); }
.ai-popup-header { display: flex; align-items: center; gap: 11px; min-height: 66px; padding: 10px 12px 10px 16px; border-bottom: 1px solid #e3e7ee; background: #fff; }
.ai-popup-mark { display: grid; place-items: center; flex: 0 0 38px; height: 38px; border-radius: 12px; background: linear-gradient(145deg, #6558c9, #8c63c8); color: #fff; font-size: 17px; box-shadow: 0 7px 18px rgb(99 83 197 / 24%); }
.ai-popup-header div { flex: 1; min-width: 0; }
.ai-popup-header h2 { margin: 0; color: #28334a; font-size: 15px; font-weight: 800; }
.ai-popup-header p { margin: 2px 0 0; color: #7b8799; font-size: var(--learn-text-xs); }
.ai-popup-header button { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 10px; background: #f2f4f8; color: #68758a; cursor: pointer; }
.ai-popup-header button:hover { background: #e8ebf2; color: #38445a; }
.ai-popup-body { flex: 1; min-width: 0; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }
.ai-popup-launcher { display: flex; align-items: center; gap: 7px; min-width: 64px; height: 48px; padding: 0 15px; border: 0; border-radius: 16px; background: linear-gradient(145deg, #6558c9, #8c63c8); color: #fff; box-shadow: 0 10px 28px rgb(66 55 146 / 32%); font-size: 13px; font-weight: 800; cursor: pointer; }
.ai-popup-launcher i { font-size: 17px; }
.ai-popup-launcher:hover { transform: translateY(-1px); box-shadow: 0 13px 32px rgb(66 55 146 / 38%); }
.ai-popup-enter-active,.ai-popup-leave-active { transition: opacity .18s ease, transform .18s ease; }
.ai-popup-enter-from,.ai-popup-leave-to { opacity: 0; transform: translateY(12px) scale(.98); }
@media(max-width: 640px) {
  .ai-popup-host { right: 10px; bottom: max(78px, calc(env(safe-area-inset-bottom) + 72px)); }
  .ai-popup-panel { width: calc(100vw - 20px); height: min(720px, calc(100dvh - 92px)); border-radius: 18px; }
  .ai-popup-header { min-height: 60px; }
  .ai-popup-header p { display: none; }
}
@media(prefers-reduced-motion: reduce) { .ai-popup-enter-active,.ai-popup-leave-active,.ai-popup-launcher { transition: none; } }
</style>

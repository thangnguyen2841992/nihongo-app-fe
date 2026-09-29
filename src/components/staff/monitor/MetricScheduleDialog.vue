<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import VpsMetricSchedules from './VpsMetricSchedules.vue'

defineProps<{ vpsId: number | null; metricCode: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const editor = ref<InstanceType<typeof VpsMetricSchedules> | null>(null)
let previousOverflow: string | undefined
function close() {
  if (editor.value?.saving) return
  dialog.value?.close()
  emit('close')
}
function backdrop(event: MouseEvent) {
  if (event.target !== dialog.value || !dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    close()
}
onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow
})
</script>

<template>
  <dialog
    ref="dialog"
    class="schedule-dialog"
    aria-labelledby="schedule-dialog-title"
    @cancel.prevent="close"
    @click="backdrop"
  >
    <header class="dialog-heading">
      <div>
        <span class="eyebrow">GIÁM SÁT VPS</span>
        <h2 id="schedule-dialog-title">Lịch thu thập metric</h2>
        <p>Sửa chu kỳ và bật/tắt thu thập ngay tại đây.</p>
      </div>
      <button
        type="button"
        class="dialog-close"
        aria-label="Đóng lịch thu thập"
        :disabled="editor?.saving"
        @click="close"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i> Đóng
      </button>
    </header>
    <div class="dialog-body">
      <VpsMetricSchedules
        ref="editor"
        embedded
        :initial-vps="vpsId"
        :initial-metric="metricCode"
        @saved="emit('saved')"
      />
    </div>
    <footer>Cấu hình được áp dụng cho lần thu thập tiếp theo.</footer>
  </dialog>
</template>

<style scoped>
.schedule-dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  height: fit-content;
  box-sizing: border-box;
  width: min(1040px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  padding: 0;
  border: 1px solid #dce4ef;
  border-radius: 18px;
  color: #283951;
  background: #f6f8fc;
  box-shadow: 0 24px 80px #172d5140;
  overflow: auto;
  overscroll-behavior: contain;
}
.schedule-dialog::backdrop {
  background: #14243d70;
  backdrop-filter: blur(3px);
}
.dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 26px;
  background: #fff;
  border-bottom: 1px solid #e1e7ef;
  position: sticky;
  top: 0;
  z-index: 1;
}
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #6382a1;
}
h2 {
  font-size: 23px;
  margin: 8px 0;
}
p {
  font-size: 13px;
  color: #708198;
  margin: 0;
  line-height: 1.5;
}
.dialog-close {
  border: 1px solid #dce4ef;
  background: #f7f9fc;
  color: #526c8b;
  padding: 9px 12px;
  border-radius: 9px;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.dialog-close:disabled {
  opacity: 0.5;
  cursor: wait;
}
.dialog-body {
  padding: 22px 26px;
}
footer {
  padding: 14px 26px;
  border-top: 1px solid #e1e7ef;
  background: #fff;
  font-size: 12px;
  color: #708198;
}
@media (max-width: 600px) {
  .schedule-dialog {
    width: calc(100vw - 20px);
    max-height: calc(100dvh - 24px);
    border-radius: 14px;
  }
  .dialog-heading {
    padding: 18px 16px;
    gap: 10px;
  }
  .dialog-body {
    padding: 16px;
  }
  h2 {
    font-size: 20px;
  }
  footer {
    padding: 14px 16px;
  }
}
</style>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MonitoringRegistration from './MonitoringRegistration.vue'

const emit = defineEmits<{ close: []; registered: [target: { vpsId: number }] }>()
const dialog = ref<HTMLDialogElement>()
let previousOverflow = ''
onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="target-create-dialog"
      aria-labelledby="target-create-title"
      @cancel.prevent="emit('close')"
      @close="emit('close')"
      @click.self="emit('close')"
    >
      <header class="create-heading">
        <div>
          <h2 id="target-create-title">Tạo target</h2>
          <p>Đăng ký target mới ngay trên bản đồ Topology.</p>
        </div>
        <button type="button" autofocus aria-label="Đóng tạo target" @click="emit('close')">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div class="create-body">
        <MonitoringRegistration embedded @registered="emit('registered', $event)" />
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.target-create-dialog {
  width: min(1080px, calc(100vw - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 0;
  overflow: auto;
  border: 1px solid #dce6ee;
  border-radius: 16px;
  background: #fff;
  color: #21364e;
  box-shadow: 0 20px 80px #10243c40;
  overscroll-behavior: contain;
}
.target-create-dialog::backdrop {
  background: #10243c80;
  backdrop-filter: blur(3px);
}
.create-heading {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border-bottom: 1px solid #e3eaf0;
}
.create-heading h2 {
  font-size: 21px;
  margin: 0 0 6px;
}
.create-heading p {
  font-size: 12px;
  color: #7b8d9f;
  margin: 0;
}
.create-heading button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 9px;
  background: #edf4f9;
  color: #456780;
}
.create-body {
  padding: 24px;
  min-width: 0;
}
.create-heading button:focus-visible {
  outline: 3px solid #7eb8dc;
  outline-offset: 2px;
}
@media (max-width: 600px) {
  .target-create-dialog {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
    border-radius: 12px;
  }
  .create-heading {
    padding: 16px;
  }
  .create-body {
    padding: 16px;
  }
}
</style>

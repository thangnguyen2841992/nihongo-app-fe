<script setup lang="ts">
defineProps<{ source: string; title: string }>()
const emit = defineEmits<{ enlarge: [] }>()
</script>

<template>
  <figure class="structure">
    <figcaption class="structure-heading">
      <span class="structure-label"><i class="bi bi-diagram-3" aria-hidden="true"></i>Sơ đồ cấu trúc</span>
      <button type="button" class="enlarge" :aria-label="`Phóng to cấu trúc ${title}`" @click="emit('enlarge')"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>Phóng to</button>
    </figcaption>
    <button type="button" class="structure-image-button" :aria-label="`Xem ảnh cấu trúc ${title}`" @click="emit('enlarge')">
      <img :src="source" :alt="title" loading="lazy" decoding="async">
    </button>
  </figure>
</template>

<style scoped>
.structure { margin: 20px 0; padding: 16px; border: 1px solid #e4e0eb; border-radius: 16px; background: #faf9fc; min-width: 0; }
.structure-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.structure-label { display: inline-flex; align-items: center; gap: 8px; color: #625270; font-size: 12px; font-weight: 700; }
.structure-label i { font-size: 16px; }
.enlarge { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 8px 12px; border: 1px solid #ded8e8; border-radius: 10px; background: #fff; color: #685481; font-size: 12px; font-weight: 650; flex-shrink: 0; }
.enlarge:hover { background: #f2edf8; }
.structure-image-button { display: block; width: 100%; padding: 16px; border: 1px solid #eeeaf2; border-radius: 12px; background: #fff; cursor: zoom-in; }
.structure-image-button img { display: block; width: 100%; max-width: 720px; height: auto; margin: 0 auto; }
button:focus-visible { outline: 3px solid #b6a1d1; outline-offset: 3px; }
@media (max-width: 600px) { .structure { padding: 12px; border-radius: 14px; }.structure-heading { gap: 8px; }.structure-image-button { padding: 8px; }.enlarge { padding: 8px 10px; } }
</style>

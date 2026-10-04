<script setup lang="ts">
import { computed } from 'vue'
import { grammarDescriptionHtml } from '@/services/grammarDescription'

const props = defineProps<{ description?: string | null }>()
const notes = computed(() => {
  const html = grammarDescriptionHtml(props.description)
  const document = new DOMParser().parseFromString(html, 'text/html')
  const first = document.body.firstElementChild
  const formula = first?.tagName === 'P' && first.textContent?.startsWith('Cấu trúc: ')
    ? first.textContent.slice('Cấu trúc: '.length) : ''
  if (formula) first?.remove()
  return { formula, html: formula ? document.body.innerHTML : html }
})
</script>

<template>
  <section class="grammar-notes" aria-label="Giải thích ngữ pháp">
    <div v-if="notes.formula" class="formula">
      <span class="note-label">Cấu trúc</span>
      <p>{{ notes.formula }}</p>
    </div>
    <div class="meaning">
      <span class="note-label">Cách dùng</span>
      <div class="note-body" v-html="notes.html"></div>
    </div>
  </section>
</template>

<style scoped>
.grammar-notes { margin-top: 20px; min-width: 0; color: #334155; }
.formula { padding: 16px 20px; background: #eef4ff; border: 1px solid #dce6fa; border-radius: 12px; margin-bottom: 18px; }
.note-label { display: block; font-size: 12px; font-weight: 700; letter-spacing: .04em; color: #49658b; margin-bottom: 8px; }
.formula p { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.8; color: #214c91; overflow-wrap: anywhere; }
.meaning { padding: 0 2px; }
.note-body { font-size: 16px; line-height: 1.9; white-space: pre-line; overflow-wrap: anywhere; }
.note-body :deep(p) { margin: 0 0 12px; }
.note-body :deep(h4) { font-size: 15px; color: #256c61; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 18px; margin: 20px 0 10px; }
.note-body :deep(ul), .note-body :deep(ol) { padding: 14px 20px 14px 38px; margin: 12px 0 0; background: #f3f9f7; border-radius: 10px; }
.note-body :deep(li) { margin-bottom: 12px; }
.note-body :deep(li:last-child) { margin-bottom: 0; }
.note-body :deep(em) { display: inline-block; color: #64748b; font-size: 14px; font-style: normal; }
@media (max-width: 600px) { .formula { padding: 14px 16px; }.formula p { font-size: 16px; } }
</style>

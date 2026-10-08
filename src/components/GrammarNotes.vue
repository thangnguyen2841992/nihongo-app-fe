<script setup lang="ts">
import { computed } from 'vue'
import { grammarDescriptionHtml } from '@/services/grammarDescription'
import { grammarConnections } from '@/services/grammarConnections'

const props = defineProps<{ description?: string | null; examples?: { nihongo: string; vietnamese?: string }[] }>()
const notes = computed(() => {
  const html = grammarDescriptionHtml(props.description)
  const document = new DOMParser().parseFromString(html, 'text/html')
  const first = document.body.firstElementChild
  const formula = first?.tagName === 'P' && first.textContent?.startsWith('Cấu trúc: ')
    ? first.textContent.slice('Cấu trúc: '.length) : ''
  if (formula) first?.remove()
  return { formula, html: formula ? document.body.innerHTML : html }
})
const displayFormula = computed(() => notes.value.formula.replace(
  /\bV\s*(?:bỏ\s+(?:ます|masu)|ます\s*[（(]\s*bỏ\s+(?:ます|masu)\s*[）)])/giu,
  'Vます形（−ます）'
))
const formulaParts = computed(() => displayFormula.value.split(/\s+\+\s+/))
const hasMasuStem = computed(() => displayFormula.value.includes('Vます形（−ます）'))
const connections = computed(() => grammarConnections(displayFormula.value))
const sentenceExample = computed(() => props.examples?.find(example => example.nihongo?.trim()))
</script>

<template>
  <section class="grammar-notes" aria-label="Giải thích ngữ pháp">
    <div v-if="notes.formula" class="formula">
      <span class="note-label"><i class="bi bi-braces" aria-hidden="true"></i>Cấu trúc</span>
      <p class="formula-expression">
        <template v-for="(part, index) in formulaParts" :key="index">
          <span v-if="index" class="formula-join">{{ ' + ' }}</span>
          <span class="formula-part" :class="{ ending: formulaParts.length > 1 && index === formulaParts.length - 1 }">{{ part }}</span>
        </template>
      </p>
      <p v-if="hasMasuStem" class="formula-help"><span lang="ja">ます形から「ます」を除いた形</span><span class="stem-example" lang="ja">読みます → 読み</span></p>
    </div>
    <section v-if="connections.length || sentenceExample" class="connections" aria-label="Ví dụ dạng từ và cách ghép">
      <div class="connection-heading"><span class="note-label"><i class="bi bi-puzzle" aria-hidden="true"></i>{{ connections.length ? 'Ví dụ dạng từ & cách ghép' : 'Ví dụ minh họa' }}</span><p>{{ connections.length ? 'Các dạng từ xuất hiện trong công thức, minh họa bằng từ cụ thể.' : 'Câu ví dụ của cấu trúc này, kèm bản dịch.' }}</p></div>
      <div class="connection-grid">
        <article v-for="(item, index) in connections" :key="index" class="connection-card">
          <div class="connection-meta"><span>{{ item.category }}</span><small lang="ja">{{ item.notation }}</small></div>
          <p class="word-transformation" lang="ja"><span>{{ item.original }}</span><span v-if="item.original !== item.transformed" class="connection-arrow" aria-label="chuyển thành"> → </span><strong v-if="item.original !== item.transformed">{{ item.transformed }}</strong></p>
          <p class="word-meaning">{{ item.meaning }}</p>
          <p v-if="item.combined" class="combined-example" lang="ja">{{ item.combined }}</p>
        </article>
      </div>
      <div v-if="sentenceExample" class="sentence-example">
        <span class="note-label">Ví dụ trong bài</span>
        <div class="sentence-jp" lang="ja" v-html="grammarDescriptionHtml(sentenceExample.nihongo)"></div>
        <div v-if="sentenceExample.vietnamese" class="sentence-vn" v-html="grammarDescriptionHtml(sentenceExample.vietnamese)"></div>
      </div>
    </section>
    <div class="meaning">
      <span class="note-label"><i class="bi bi-journal-text" aria-hidden="true"></i>Cách dùng</span>
      <div class="note-body" v-html="notes.html"></div>
    </div>
  </section>
</template>

<style scoped>
.grammar-notes { margin-top: 20px; min-width: 0; color: #374151; }
.formula { padding: 20px; background: linear-gradient(120deg, #faf8fd, #f5f2fa); border: 1px solid #e3dcee; border-radius: 16px; margin-bottom: 24px; }
.note-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #766489; margin-bottom: 12px; }
.note-label i { font-size: 16px; }
.formula-expression { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: 0; font-size: 18px; font-weight: 650; line-height: 1.8; }
.formula-part { min-width: 0; max-width: 100%; padding: 8px 14px; border: 1px solid #e3dfeb; border-radius: 10px; background: #fff; color: #4e4660; overflow-wrap: anywhere; white-space: pre-line; }
.formula-part.ending { border-color: #d5c7e6; background: #eee7f6; color: #634580; }
.formula-join { color: #92849f; font-size: 20px; font-weight: 500; white-space: pre; }
.formula-help { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; margin: 14px 0 0; font-size: 12px; line-height: 1.8; color: #80738e; }
.stem-example { color: #655775; }
.connections { margin-bottom: 24px; }
.connection-heading .note-label { margin-bottom: 6px; }
.connection-heading > p { margin: 0 0 12px; color: #7b7285; font-size: 13px; line-height: 1.7; }
.connection-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 10px; }
.connection-card { min-width: 0; padding: 14px; border: 1px solid #e8e3ee; border-radius: 12px; background: #fdfcfe; }
.connection-meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; margin-bottom: 10px; }
.connection-meta > span { color: #665274; font-size: 12px; font-weight: 700; }
.connection-meta small { font-size: 11px; color: #8b8095; }
.word-transformation { font-size: 16px; line-height: 1.9; margin: 0; overflow-wrap: anywhere; }
.word-transformation strong { color: #6b4e88; font-weight: 650; }
.connection-arrow { color: #a294af; }
.word-meaning { font-size: 12px; color: #82768e; margin: 4px 0 0; }
.combined-example { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid #eae4f0; color: #514163; font-size: 14px; line-height: 1.9; overflow-wrap: anywhere; }
.sentence-example { margin-top: 12px; padding: 16px; border-left: 3px solid #baa6cf; border-radius: 0 10px 10px 0; background: #f7f4fb; }
.sentence-example .note-label { margin-bottom: 6px; }
.sentence-jp { font-size: 16px; line-height: 2; color: #514163; overflow-wrap: anywhere; }
.sentence-vn { margin-top: 6px; font-size: 14px; line-height: 1.8; color: #7b7087; overflow-wrap: anywhere; }
.sentence-jp :deep(p), .sentence-vn :deep(p) { margin: 0; }
.meaning { padding: 0 2px; }
.note-body { font-size: 16px; line-height: 1.95; white-space: pre-line; overflow-wrap: anywhere; }
.note-body :deep(p) { margin: 0 0 14px; }
.note-body :deep(strong), .note-body :deep(b) { color: #514460; font-weight: 700; }
.note-body :deep(h4) { font-size: 14px; color: #4f7069; font-weight: 700; padding: 12px 16px; margin: 22px 0 12px; background: #f0f7f4; border: 1px solid #e0ece6; border-radius: 10px; line-height: 1.7; }
.note-body :deep(ul), .note-body :deep(ol) { padding: 4px 0 4px 24px; margin: 12px 0; }
.note-body :deep(li) { padding: 4px 0 12px 6px; margin-bottom: 8px; border-bottom: 1px solid #f0edf3; }
.note-body :deep(li)::marker { color: #a597b6; }
.note-body :deep(li:last-child) { margin-bottom: 0; border-bottom: 0; }
.note-body :deep(em) { display: inline-block; color: #78818e; font-size: 14px; font-style: normal; }
.note-body :deep(ruby) { line-height: 2.4; }.note-body :deep(rt) { font-size: .6em; color: #78818e; }
@media (max-width: 600px) { .formula { padding: 14px; border-radius: 14px; margin-bottom: 20px; }.formula-expression { font-size: 16px; gap: 6px; }.formula-part { padding: 7px 10px; }.formula-join { font-size: 18px; }.note-body :deep(h4) { padding: 10px 12px; } }
</style>

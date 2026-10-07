<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { deleteCard, getCards, saveCard, type StudyCard } from '@/api/study'
import './studyPages.css'

const cards = ref<StudyCard[]>([])
const filter = ref<'ALL' | StudyCard['kind']>('ALL')
const notes = ref<Record<number, string>>({})
const loading = ref(true)
const busyId = ref<number | null>(null)
const error = ref('')
const newWord = ref('')
const newMeaning = ref('')
const adding = ref(false)
const visible = computed(() => filter.value === 'ALL' ? cards.value : cards.value.filter(c => c.kind === filter.value))
async function load() {
  loading.value = true; error.value = ''
  try { cards.value = await getCards(); notes.value = Object.fromEntries(cards.value.map(c => [c.id, c.note || ''])) }
  catch { error.value = 'Không tải được sổ tay.' }
  finally { loading.value = false }
}
async function saveNote(card: StudyCard) {
  busyId.value = card.id; error.value = ''
  try {
    const updated = await saveCard({ sourceKey: card.sourceKey, kind: card.kind, courseId: card.courseId, bookId: card.bookId, lessonId: card.lessonId, grammarId: card.grammarId, exampleId: card.exampleId, front: card.front, back: card.back, note: notes.value[card.id] || '' })
    cards.value = cards.value.map(c => c.id === card.id ? updated : c)
  } catch { error.value = 'Chưa lưu được ghi chú.' }
  finally { busyId.value = null }
}
async function remove(card: StudyCard) {
  if (!confirm('Xóa thẻ này khỏi sổ tay?')) return
  busyId.value = card.id; error.value = ''
  try { await deleteCard(card.id); cards.value = cards.value.filter(c => c.id !== card.id) }
  catch { error.value = 'Chưa xóa được thẻ.' }
  finally { busyId.value = null }
}
async function addWord() {
  if (!newWord.value.trim() || !newMeaning.value.trim()) { error.value = 'Nhập từ vựng và nghĩa trước khi lưu.'; return }
  adding.value = true; error.value = ''
  try {
    const card = await saveCard({ sourceKey: `vocab:${crypto.randomUUID()}`, kind: 'VOCAB', courseId: null,
      bookId: null, lessonId: null, grammarId: null, exampleId: null, front: newWord.value.trim(), back: newMeaning.value.trim(), note: null })
    cards.value.unshift(card); notes.value[card.id] = ''; newWord.value = ''; newMeaning.value = ''
  } catch { error.value = 'Chưa lưu được từ vựng.' }
  finally { adding.value = false }
}
function source(card: StudyCard) {
  if (!card.bookId || !card.lessonId) return null
  return { name: 'CourseBookDetail', params: { bookId: card.bookId }, query: { ...(card.courseId ? { courseId: String(card.courseId) } : {}), lessonId: String(card.lessonId), ...(card.grammarId ? { grammarId: String(card.grammarId) } : {}) } }
}
onMounted(load)
</script>

<template>
  <div class="study-page">
    <header class="study-hero"><h1>Sổ tay của tôi</h1><p>Lưu câu ví dụ và ngữ pháp để ghi nhớ và ôn theo lịch.</p></header>
    <form class="study-panel" style="margin-top:20px" @submit.prevent="addWord"><h2>Thêm từ vựng</h2><div class="study-grid" style="margin-top:0"><label>Từ tiếng Nhật<input v-model="newWord" class="form-control" maxlength="2000" required lang="ja"></label><label>Nghĩa<input v-model="newMeaning" class="form-control" maxlength="2000" required></label></div><button class="study-button" style="margin-top:12px" :disabled="adding">{{ adding ? 'Đang lưu...' : 'Lưu vào sổ tay' }}</button></form>
    <div class="study-actions"><button v-for="item in [{ key:'ALL', label:'Tất cả' }, { key:'EXAMPLE', label:'Câu ví dụ' }, { key:'GRAMMAR', label:'Ngữ pháp' }, { key:'VOCAB', label:'Từ vựng' }]" :key="item.key" class="study-button" :class="{ secondary: filter !== item.key }" @click="filter = item.key as typeof filter">{{ item.label }}</button></div>
    <p v-if="error" class="study-error" role="alert">{{ error }} <button type="button" @click="load">Tải lại</button></p>
    <p v-if="loading" role="status">Đang tải sổ tay...</p>
    <div v-else-if="visible.length" class="study-list"><article v-for="card in visible" :key="card.id" class="study-panel"><p class="study-meta">{{ card.kind === 'EXAMPLE' ? 'Câu ví dụ' : card.kind === 'GRAMMAR' ? 'Ngữ pháp' : 'Từ vựng' }} · Ôn tiếp {{ new Date(card.dueAt).toLocaleString('vi-VN') }}</p><h2 lang="ja">{{ card.front }}</h2><p>{{ card.back }}</p><label :for="`note-${card.id}`" class="study-meta">Ghi chú cá nhân</label><textarea :id="`note-${card.id}`" v-model="notes[card.id]" maxlength="2000" rows="2" class="form-control" style="margin-top:5px"></textarea><div class="study-actions"><button class="study-button" :disabled="busyId === card.id" @click="saveNote(card)">Lưu ghi chú</button><RouterLink v-if="source(card)" class="study-button secondary" :to="source(card)!">Về bài học</RouterLink><button class="study-button secondary" :disabled="busyId === card.id" @click="remove(card)">Bỏ lưu</button></div></article></div>
    <p v-else class="study-empty" style="margin-top:20px">Chưa có nội dung nào. Hãy mở bài học và bấm “Lưu vào sổ tay”.</p>
  </div>
</template>

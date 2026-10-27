<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import './studyPages.css'

interface VocabularyCard {
  number: number
  unit: number
  word: string
  reading: string
  meaning: string
  sinoVietnamese: string
  exampleJapanese: string
  exampleVietnamese: string
}
interface VocabularyDeck { id: string; title: string; level: string; totalCards: number; cards: VocabularyCard[] }

const route = useRoute()
const deck = ref<VocabularyDeck | null>(null)
const unit = ref(1)
const index = ref(0)
const flipped = ref(false)
const loading = ref(true)
const error = ref('')
const cards = computed(() => deck.value?.cards.filter(card => card.unit === unit.value) ?? [])
const current = computed(() => cards.value[index.value])
const units = computed(() => [...new Set(deck.value?.cards.map(card => card.unit) ?? [])])
// Mimi Kara N3 is split into units; Minna no Nihongo into its lessons (第26課 … 第50課).
const unitLabel = (value: number) => (deck.value?.level === 'N3' ? `Unit ${value}` : `Bài ${value}`)

function resetCard() { index.value = 0; flipped.value = false }
function previous() {
  if (!cards.value.length) return
  index.value = (index.value - 1 + cards.value.length) % cards.value.length
  flipped.value = false
}
function next() {
  if (!cards.value.length) return
  index.value = (index.value + 1) % cards.value.length
  flipped.value = false
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') previous()
  else if (event.key === 'ArrowRight') next()
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    flipped.value = !flipped.value
  }
}
async function load() {
  loading.value = true; error.value = ''
  try {
    const response = await gatewayUrl.get<VocabularyDeck>(`/api/nihongo-user/courses/${route.params.courseId}/vocabulary-deck`)
    deck.value = response.data
    unit.value = response.data.cards[0]?.unit ?? 1
    resetCard()
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status
    error.value = status === 403
      ? 'Bạn cần khóa học còn hạn để học bộ flashcard này.'
      : status === 404 ? 'Khóa học này chưa có bộ flashcard từ vựng.' : 'Không thể tải bộ flashcard. Vui lòng thử lại.'
  } finally { loading.value = false }
}
watch(unit, resetCard)
onMounted(() => { load(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="study-page flashcard-page">
    <header class="study-hero">
      <p class="eyebrow">{{ deck ? `Khóa học ${deck.level} · Từ vựng` : 'Từ vựng' }}</p>
      <h1>{{ deck?.title || 'Flashcard từ vựng' }}</h1>
      <p>Chạm vào thẻ để lật đáp án. Dùng phím ← → để chuyển thẻ và phím cách để lật.</p>
    </header>

    <section v-if="loading" class="study-panel" role="status">Đang tải bộ flashcard...</section>
    <section v-else-if="error" class="study-panel">
      <p class="study-error" role="alert">{{ error }}</p>
      <div class="study-actions">
        <button class="study-button" type="button" @click="load">Thử lại</button>
        <RouterLink class="study-button secondary" to="/courses">Xem khóa học</RouterLink>
      </div>
    </section>

    <template v-else-if="deck && current">
      <section class="deck-toolbar" aria-label="Chọn phần học">
        <label for="flashcard-unit">Phần học</label>
        <select id="flashcard-unit" v-model.number="unit">
          <option v-for="value in units" :key="value" :value="value">{{ unitLabel(value) }}</option>
        </select>
        <span>{{ cards.length }} từ · {{ deck.totalCards }} từ toàn bộ sách</span>
      </section>

      <section class="card-stage" aria-live="polite">
        <button class="flip-card" :class="{ flipped }" type="button" :aria-label="flipped ? 'Ẩn đáp án' : 'Lật thẻ để xem đáp án'" @click="flipped = !flipped">
          <span class="flip-card-inner">
            <span class="card-face card-front">
              <span class="card-number">{{ current.number }} · {{ unitLabel(current.unit) }}</span>
              <strong lang="ja">{{ current.word }}</strong>
              <span class="flip-hint">Chạm để xem đáp án</span>
            </span>
            <span class="card-face card-back">
              <span class="card-number">{{ current.number }} · Đáp án</span>
              <strong class="answer-reading" lang="ja">{{ current.reading || current.word }}</strong>
              <span v-if="current.sinoVietnamese" class="sino-vietnamese">
                <span>Hán Việt</span>
                {{ current.sinoVietnamese }}
              </span>
              <span class="meaning">{{ current.meaning }}</span>
              <span v-if="current.exampleJapanese" class="example-block">
                <span class="example-label">Ví dụ</span>
                <span class="example-japanese" lang="ja">{{ current.exampleJapanese }}</span>
                <span class="example-vietnamese">{{ current.exampleVietnamese }}</span>
              </span>
              <span class="flip-hint">Chạm để quay lại từ vựng</span>
            </span>
          </span>
        </button>
      </section>

      <nav class="card-controls" aria-label="Điều khiển flashcard">
        <button class="study-button secondary" type="button" @click="previous">← Thẻ trước</button>
        <span>{{ index + 1 }} / {{ cards.length }}</span>
        <button class="study-button" type="button" @click="next">Thẻ tiếp →</button>
      </nav>
      <div class="progress-track" role="progressbar" :aria-valuenow="index + 1" aria-valuemin="1" :aria-valuemax="cards.length">
        <span :style="{ width: `${((index + 1) / cards.length) * 100}%` }"></span>
      </div>
      <RouterLink class="back-link" :to="`/course/${route.params.courseId}/books`">← Quay lại khóa học</RouterLink>
    </template>
  </main>
</template>

<style scoped>
.flashcard-page { max-width: 900px; margin: 0 auto; }
.eyebrow { margin: 0 0 6px; color: #7557b7; font-size: 13px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.deck-toolbar { display: flex; align-items: center; gap: 12px; margin: 22px 0 16px; padding: 14px 16px; border: 1px solid #e8e1f3; border-radius: 16px; background: #fff; }
.deck-toolbar label { font-weight: 700; color: #50435e; }
.deck-toolbar select { min-width: 120px; padding: 9px 12px; border: 1px solid #d9cfea; border-radius: 10px; background: #fff; color: #342b40; }
.deck-toolbar span { margin-left: auto; color: #71667c; font-size: 14px; }
.card-stage { perspective: 1200px; }
.flip-card { display: block; width: 100%; height: 500px; padding: 0; border: 0; border-radius: 26px; background: transparent; cursor: pointer; text-align: inherit; }
.flip-card:focus-visible { outline: 4px solid #cbb8f2; outline-offset: 5px; }
.flip-card-inner { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .45s cubic-bezier(.2,.7,.2,1); }
.flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
.card-face { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 36px; border: 1px solid #e5dcf0; border-radius: 26px; box-shadow: 0 18px 55px rgba(70,48,92,.13); backface-visibility: hidden; }
.card-front { background: radial-gradient(circle at top right, #f4eaff 0, transparent 36%), linear-gradient(145deg,#fff,#fbf8ff); }
.card-back { overflow-y: auto; transform: rotateY(180deg); background: radial-gradient(circle at bottom left, #e4f8ef 0, transparent 38%), linear-gradient(145deg,#fff,#f7fffb); }
.card-face strong { color: #30243f; font-family: 'Noto Sans JP', sans-serif; font-size: clamp(42px, 8vw, 72px); font-weight: 750; line-height: 1.25; text-align: center; overflow-wrap: anywhere; }
.card-back .answer-reading { font-size: clamp(28px, 5vw, 42px); }
.card-number { position: absolute; top: 24px; left: 26px; color: #7a6a88; font-size: 14px; font-weight: 650; }
.sino-vietnamese { margin-top: 12px; color: #6a4d91; font-size: 17px; font-weight: 750; letter-spacing: .035em; text-align: center; }
.sino-vietnamese > span { margin-right: 8px; color: #8c7a9b; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
.meaning { margin-top: 12px; color: #386454; font-size: clamp(20px, 4vw, 27px); font-weight: 650; text-align: center; }
.example-block { width: min(100%, 650px); margin-top: 24px; padding-top: 20px; border-top: 1px solid #dbe9e2; text-align: center; }
.example-label { display: block; margin-bottom: 8px; color: #7b7083; font-size: 12px; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
.example-japanese { display: block; color: #322b39; font-family: 'Noto Sans JP', sans-serif; font-size: clamp(18px, 3vw, 23px); font-weight: 650; line-height: 1.55; }
.example-vietnamese { display: block; margin-top: 7px; color: #59636a; font-size: 16px; line-height: 1.5; }
.flip-hint { position: absolute; bottom: 24px; color: #85788f; font-size: 13px; }
.card-controls { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 18px; margin-top: 22px; }
.card-controls button:last-child { justify-self: end; }
.card-controls span { color: #62576d; font-weight: 700; }
.progress-track { height: 7px; margin: 18px 0; overflow: hidden; border-radius: 999px; background: #ebe7ef; }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#8064bf,#45ae83); transition: width .2s ease; }
.back-link { display: inline-block; margin-top: 4px; color: #675297; font-weight: 650; text-decoration: none; }
@media (max-width: 600px) {
  .deck-toolbar { align-items: flex-start; flex-wrap: wrap; }
  .deck-toolbar span { width: 100%; margin-left: 0; }
  .flip-card { height: 500px; }
  .card-face { padding: 54px 20px 52px; }
  .card-controls { grid-template-columns: 1fr 1fr; gap: 10px; }
  .card-controls span { grid-column: 1 / -1; grid-row: 1; text-align: center; }
  .card-controls button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) { .flip-card-inner { transition: none; } }
</style>

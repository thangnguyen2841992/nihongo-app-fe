<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { filterGrammarUnits, type EnglishGrammarGuide } from '@/services/englishGrammarPack'
import {
  englishAccent,
  setEnglishAccent,
  speakEnglish,
  stopEnglishSpeech,
  type SpeechSource,
} from '@/services/englishSpeech'

const props = withDefaults(
  defineProps<{
    pack: EnglishGrammarGuide
    initialUnit?: number
    sourceAvailable?: boolean
    doneUnits?: number[]
    quiz?: Record<string, boolean>
  }>(),
  { sourceAvailable: true, doneUnits: () => [], quiz: () => ({}) },
)
const emit = defineEmits<{
  source: [page: number, unitLabel: string]
  requestPdf: []
  unitChange: [unitLabel: string, page: number]
  toggleDone: [unitId: number]
  quizResult: [unitId: number, correct: boolean]
}>()
const done = computed(() => new Set(props.doneUnits))
const currentDone = computed(() => done.value.has(currentId.value))
const lastQuiz = computed(() => props.quiz[String(currentId.value)])
function check() {
  checked.value = true
  emit('quizResult', current.value.id, correct.value)
}
const query = ref('')
const currentId = ref(
  props.pack.units.some((unit) => unit.id === props.initialUnit) ? props.initialUnit! : 1,
)
const answer = ref<number | null>(null)
const checked = ref(false)
const current = computed(() => props.pack.units.find((unit) => unit.id === currentId.value)!)
const matches = computed(() => filterGrammarUnits(props.pack.units, query.value))
const correct = computed(() => answer.value === current.value.exercise.answer)
const speechMessage = ref('')
watch(currentId, () => {
  answer.value = null
  checked.value = false
  stopSpeech()
  emit('unitChange', `Unit ${current.value.id} — ${current.value.title}`, current.value.theoryPage)
})
function source(page: number) {
  emit('source', page, `Unit ${current.value.id} — ${current.value.title}`)
}
function resetPractice() {
  answer.value = null
  checked.value = false
}
function stopSpeech() {
  speechRequest++
  stopEnglishSpeech()
  speechMessage.value = ''
  speaking.value = false
}
let speechRequest = 0
const speaking = ref(false)
const speechSource = ref<SpeechSource | ''>('')
async function speak(rate = 1) {
  stopSpeech()
  const request = speechRequest
  speaking.value = true
  try {
    const source = await speakEnglish(current.value.example.en, { rate })
    if (request === speechRequest) speechSource.value = source
  } catch (error: unknown) {
    if (request === speechRequest)
      speechMessage.value = error instanceof Error ? error.message : 'Chưa đọc được câu ví dụ.'
  } finally {
    if (request === speechRequest) speaking.value = false
  }
}
onBeforeUnmount(stopSpeech)
</script>

<template>
  <section class="grammar-companion" aria-labelledby="grammar-companion-title">
    <header class="companion-heading">
      <div>
        <p class="eyebrow">ESSENTIAL GRAMMAR IN USE · FOURTH EDITION</p>
        <h2 id="grammar-companion-title">Hiểu bằng tiếng Việt. Luyện bằng tiếng Anh.</h2>
        <p>
          115 bài theo mục lục sách · phần diễn giải, ví dụ và câu tự kiểm tra được biên soạn bổ
          sung.
        </p>
      </div>
      <span class="companion-count">{{ pack.units.length }} Units</span>
    </header>
    <div class="companion-layout">
      <nav class="unit-index" aria-label="Mục lục ngữ pháp">
        <label for="grammar-search">Tìm bài học</label
        ><input
          id="grammar-search"
          v-model="query"
          type="search"
          placeholder="Số bài, hiện tại, questions…"
        />
        <p class="unit-count">{{ matches.length }} bài phù hợp · đã học {{ done.size }}/{{ pack.units.length }}</p>
        <div class="unit-list">
          <button
            v-for="unit in matches"
            :key="unit.id"
            type="button"
            :aria-current="currentId === unit.id ? 'true' : undefined"
            :class="{ done: done.has(unit.id) }"
            @click="currentId = unit.id"
          >
            <span
              ><i v-if="done.has(unit.id)" class="bi bi-check-circle-fill" aria-hidden="true"></i
              ><template v-else>{{ String(unit.id).padStart(2, '0') }}</template
              ><span v-if="done.has(unit.id)" class="visually-hidden">Bài {{ unit.id }}, đã học xong</span></span
            ><span
              ><strong>{{ unit.titleVi }}</strong
              ><small>{{ unit.title }}</small></span
            >
          </button>
          <p v-if="!matches.length" class="no-units">
            Chưa tìm thấy bài. Thử từ khóa khác hoặc xóa ô tìm kiếm.
          </p>
        </div>
      </nav>
      <article class="bilingual-lesson" aria-labelledby="bilingual-lesson-title">
        <div class="lesson-overline">
          <span>UNIT {{ current.id }} / 115</span><span>{{ current.category }}</span>
        </div>
        <h3 id="bilingual-lesson-title">{{ current.title }}</h3>
        <p class="lesson-title-vi">{{ current.titleVi }}</p>
        <button
          type="button"
          class="desk-button subtle unit-done-toggle"
          :class="{ done: currentDone }"
          :aria-pressed="currentDone"
          @click="emit('toggleDone', current.id)"
        >
          <i class="bi" :class="currentDone ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i
          >{{ currentDone ? 'Đã học xong bài này' : 'Đánh dấu đã học xong' }}
        </button>
        <section class="lesson-explanation">
          <h4><span>01</span>Hiểu cách dùng</h4>
          <p>{{ current.explanation }}</p>
          <div class="grammar-pattern">
            <span>CÔNG THỨC</span><code>{{ current.pattern }}</code>
          </div>
        </section>
        <section class="bilingual-example">
          <h4><span>02</span>Ví dụ Anh–Việt</h4>
          <p class="example-en" lang="en">{{ current.example.en }}</p>
          <p class="example-vi">{{ current.example.vi }}</p>
          <div class="speech-controls">
            <button type="button" class="text-action" :disabled="speaking" @click="speak(1)">
              <i class="bi bi-volume-up" aria-hidden="true"></i>Nghe câu ví dụ
            </button>
            <button type="button" class="text-action" :disabled="speaking" @click="speak(0.75)">
              <i class="bi bi-speedometer" aria-hidden="true"></i>Nghe chậm
            </button>
            <div class="accent-switch" role="group" aria-label="Giọng đọc">
              <button
                type="button"
                :aria-pressed="englishAccent === 'uk'"
                @click="setEnglishAccent('uk')"
              >
                Anh–Anh
              </button>
              <button
                type="button"
                :aria-pressed="englishAccent === 'us'"
                @click="setEnglishAccent('us')"
              >
                Anh–Mỹ
              </button>
            </div>
          </div>
          <p class="speech-hint">
            {{
              speechSource === 'browser'
                ? 'Đang dùng giọng của trình duyệt vì máy đọc Kokoro chưa chạy.'
                : 'Giọng đọc AI Kokoro, không phải audio gốc của sách.'
            }}
          </p>
          <p v-if="speechMessage" role="status">{{ speechMessage }}</p>
        </section>
        <div class="grammar-caution">
          <i class="bi bi-lightbulb" aria-hidden="true"></i>
          <p><strong>Dễ nhầm</strong>{{ current.caution }}</p>
        </div>
        <form class="grammar-practice" @submit.prevent="check">
          <h4><span>03</span>Tự kiểm tra</h4>
          <p v-if="lastQuiz !== undefined && !checked" class="quiz-history" :class="{ correct: lastQuiz }">
            Lần trước: {{ lastQuiz ? 'trả lời đúng' : 'chưa đúng — nên làm lại' }}
          </p>
          <fieldset :disabled="checked">
            <legend lang="en">{{ current.exercise.prompt }}</legend>
            <label
              v-for="(option, index) in current.exercise.options"
              :key="index"
              :class="{
                chosen: answer === index,
                right: checked && current.exercise.answer === index,
                wrong: checked && answer === index && !correct,
              }"
              ><input
                v-model="answer"
                type="radio"
                :value="index"
                :name="`grammar-unit-${current.id}`"
              /><span lang="en">{{ option }}</span></label
            >
          </fieldset>
          <button v-if="!checked" class="desk-button" type="submit" :disabled="answer === null">
            Kiểm tra đáp án
          </button>
          <div v-else class="practice-result" :class="{ correct }" role="status">
            <strong
              >{{ correct ? 'Chính xác!' : 'Cùng xem lại nhé.' }} Đáp án:
              {{ current.exercise.options[current.exercise.answer] }}</strong
            >
            <p>{{ current.exercise.explanation }}</p>
            <button type="button" class="text-action" @click="resetPractice">
              Làm lại câu này
            </button>
          </div>
        </form>
        <footer class="original-links">
          <p>Đối chiếu với bản sách bạn đã gửi</p>
          <div v-if="sourceAvailable">
            <button type="button" class="desk-button subtle" @click="source(current.theoryPage)">
              Lý thuyết gốc · PDF {{ current.theoryPage }}</button
            ><button type="button" class="desk-button subtle" @click="source(current.exercisePage)">
              Bài tập gốc · PDF {{ current.exercisePage }}</button
            ><button
              type="button"
              class="desk-button subtle"
              @click="source(current.keyPages[0] ?? 281)"
            >
              {{ current.keyPages.length ? 'Trang đáp án gốc' : 'Mở mục đáp án gốc' }}
            </button>
          </div>
          <div v-else>
            <button type="button" class="desk-button subtle" @click="emit('requestPdf')">
              Mở PDF gốc để đối chiếu
            </button>
          </div>
          <small
            >Số trang PDF có thể khác số in trên sách. Câu tự kiểm tra phía trên là bài bổ sung, có
            giải thích tiếng Việt.</small
          >
        </footer>
        <div class="unit-pagination">
          <button
            type="button"
            :disabled="currentId === 1"
            class="desk-button subtle"
            @click="currentId--"
          >
            ← Bài trước</button
          ><span>{{ current.id }} / 115</span
          ><button
            type="button"
            :disabled="currentId === 115"
            class="desk-button subtle"
            @click="currentId++"
          >
            Bài tiếp →
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped src="./englishGrammarCompanion.css"></style>

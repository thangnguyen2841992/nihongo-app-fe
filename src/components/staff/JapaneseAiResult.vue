<template>
  <div class="japanese-ai-page">

    <!-- =====================================================
         HEADER
    ====================================================== -->

    <div class="page-header">

      <h1>
        🇯🇵 Phân tích tiếng Nhật
      </h1>

      <p>
        Nhập tiếng Nhật để phân tích, hoặc tiếng Việt để dịch và học cách diễn đạt.
      </p>

    </div>


    <!-- =====================================================
         SEARCH
    ====================================================== -->

    <div class="search-card"><p id="ai-input-limit" class="input-limit">Tối đa 2.000 ký tự · {{ searchText.length }}/{{ maxInputLength }}</p>

      <div class="search-box">

        <input
          v-model="searchText"
          type="text"
          class="form-control"
          placeholder="Nhập từ hoặc câu tiếng Nhật / tiếng Việt..." aria-label="Nội dung phân tích" :maxlength="maxInputLength" aria-describedby="ai-input-limit"

          @keydown.enter="onSearchEnter"
        />

        <button
          type="button"
          class="btn btn-primary"
          :disabled="!searchText.trim()"
          @click="search"
        >
          <span v-if="loading">
            Phân tích từ khóa mới
          </span>

          <span v-else>
            🔍 Phân tích
          </span>
        </button>

      </div>

    </div>


    <section v-if="loading" class="loading-panel" role="status" aria-live="polite">
      <div class="loading-box">
        <div class="loading-icon" aria-hidden="true">🇯🇵</div>
        <div class="loading-text">AI đang phân tích...</div>
        <p class="loading-subtext">Bạn có thể nhập từ khóa khác hoặc hủy tìm kiếm.</p>
        <div class="loading-bar" aria-hidden="true"><div class="loading-bar-progress"></div></div>
        <button type="button" class="btn btn-outline-secondary btn-sm mt-3" @click="cancelSearch">Hủy tìm kiếm</button>
      </div>
    </section>

    <!-- =====================================================
         ERROR
    ====================================================== -->

    <div
      v-if="error"
      class="alert alert-danger mt-3" role="alert"
    >
      {{ error }}
    </div>


    <!-- =====================================================
         RESULT
    ====================================================== -->

    <div
      v-if="result"
      class="result-container"
    >

      <!-- =================================================
           ORIGINAL TEXT
      ================================================== -->

      <section class="result-card">

        <div class="section-title">

          <span class="icon">
            🇯🇵
          </span>

          <h2>
            Câu gốc
          </h2>

        </div>

        <div class="original-text">

          <span class="original-text-content">
            {{ result.originalText }}
          </span>

          <button
            type="button"
            class="speak-button"
            title="Phát âm"
            aria-label="Phát âm câu tiếng Nhật"
            @click="speakJapanese(result.originalText)"
          >
            🔊
          </button>

        </div>

      </section>


      <!-- =================================================
           TRANSLATION
      ================================================== -->

      <section class="result-card main-result">

        <div class="section-title">

          <span class="icon">
            🇻🇳
          </span>

          <h2>
            Kết quả
          </h2>

        </div>

        <div class="translation">
          {{ result.translation }}
        </div>

        <div class="reading-row">

          <span class="reading">
            {{ result.reading }}
          </span>

          <button
            type="button"
            class="speak-button"
            title="Phát âm"
            aria-label="Phát âm câu tiếng Nhật"
            @click="speakJapanese(result.originalText)"
          >
            🔊
          </button>

        </div>

      </section>


      <!-- =================================================
           VOCABULARY
      ================================================== -->

      <section class="result-card">

        <div class="section-title">

          <span class="icon">
            📚
          </span>

          <h2>
            Từ vựng
          </h2>

        </div>


        <div
          v-if="!result.vocabulary?.length"
          class="empty"
        >
          Không tìm thấy từ vựng.
        </div>


        <div
          v-else
          class="vocabulary-list"
        >

          <div
            v-for="(item, index) in result.vocabulary"
            :key="`${item.word}-${index}`"
            class="vocabulary-item"
          >

            <!-- Word -->

            <div class="vocabulary-word">

              <span>
                {{ item.word }}
              </span>

              <button
                type="button"
                class="speak-button-small"
                title="Phát âm"
                :aria-label="`Phát âm ${item.word}`"
                @click="speakJapanese(item.word)"
              >
                🔊
              </button>

            </div>


            <!-- Reading -->

            <div class="vocabulary-reading">

              <span class="label">
                Cách đọc:
              </span>

              {{ item.reading }}

            </div>


            <!-- Kanji reading -->

            <div
              v-if="item.kanjiReading"
              class="vocabulary-kanji-reading"
            >

              <span class="label">
                Âm Hán:
              </span>

              {{ item.kanjiReading }}

            </div>


            <!-- Meaning -->

            <div class="vocabulary-meaning">
              {{ item.meaning }}
            </div>

          </div>

        </div>

      </section>


      <!-- =================================================
           GRAMMAR
      ================================================== -->

      <section class="result-card">

        <div class="section-title">

          <span class="icon">
            📖
          </span>

          <h2>
            Ngữ pháp
          </h2>

        </div>


        <div
          v-if="!result.grammar?.length"
          class="empty"
        >
          Không tìm thấy điểm ngữ pháp đặc biệt.
        </div>


        <div
          v-else
          class="grammar-list"
        >

          <div
            v-for="(item, index) in result.grammar"
            :key="`${item.pattern}-${index}`"
            class="grammar-item"
          >

            <div class="grammar-pattern">
              {{ item.pattern }}
            </div>

            <div class="grammar-explanation">
              {{ item.explanation }}
            </div>

          </div>

        </div>

      </section>


      <!-- =================================================
           SENTENCE STRUCTURE
      ================================================== -->

      <section class="result-card">

        <div class="section-title">

          <span class="icon">
            🧩
          </span>

          <h2>
            Cấu trúc câu
          </h2>

        </div>

        <div class="sentence-structure">
          {{ result.sentenceStructure }}
        </div>

      </section>


      <!-- =================================================
           EXAMPLES
      ================================================== -->

      <section class="result-card">

        <div class="section-title">

          <span class="icon">
            💡
          </span>

          <h2>
            Ví dụ
          </h2>

        </div>


        <div
          v-if="!result.examples?.length"
          class="empty"
        >
          Không có ví dụ.
        </div>


        <div
          v-else
          class="examples-list"
        >

          <div
            v-for="(example, index) in result.examples"
            :key="index"
            class="example-item"
          >

            <span class="example-number">
              {{ index + 1 }}
            </span>

            <span class="example-text">
              {{ example }}
            </span>

          </div>

        </div>

      </section>

    </div>

  </div>
</template>


<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { analyzeJapanese, type JapaneseAiResponse } from '@/services/japaneseAiService'

const route = useRoute()
const router = useRouter()
const maxInputLength = 2000
const searchText = ref('')
const result = ref<JapaneseAiResponse | null>(null)
const loading = ref(false)
const error = ref('')
let activeRequest: AbortController | undefined
let requestId = 0

function cancelSearch() {
  ++requestId
  activeRequest?.abort()
  activeRequest = undefined
  loading.value = false
}

function validInput(text: string) {
  if (!text.trim()) {
    error.value = 'Hãy nhập từ hoặc câu tiếng Nhật / tiếng Việt.'
    return false
  }
  if (text.length > maxInputLength) {
    error.value = 'Nội dung phân tích không được vượt quá 2.000 ký tự.'
    return false
  }
  return true
}

async function runSearch(text: string) {
  cancelSearch()
  result.value = null
  error.value = ''
  if (!validInput(text)) return
  const id = requestId
  const controller = new AbortController()
  activeRequest = controller
  loading.value = true
  try {
    const response = await analyzeJapanese(text, controller.signal)
    if (id === requestId) result.value = response
  } catch (cause: unknown) {
    if (id !== requestId || axios.isCancel(cause)) return
    const data = axios.isAxiosError(cause) ? cause.response?.data : undefined
    const message = data?.message
    const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
    error.value = typeof message === 'string' ? message
      : status === 429 ? 'Bạn đã đạt giới hạn tìm kiếm AI. Vui lòng thử lại sau.'
      : status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      : status === 403 ? 'Bạn chưa có quyền sử dụng chức năng này.'
      : axios.isAxiosError(cause) && cause.code === 'ECONNABORTED' ? 'AI phản hồi quá lâu. Vui lòng thử lại.'
      : 'Không thể phân tích lúc này. Kiểm tra kết nối hoặc thử lại sau.'
  } finally {
    if (id === requestId) {
      loading.value = false
      activeRequest = undefined
    }
  }
}

async function search() {
  if (!validInput(searchText.value)) return
  const keyword = searchText.value.trim()
  if (loading.value && route.query.q === keyword) return
  if (route.query.q === keyword) {
    await runSearch(keyword)
  } else {
    await router.push({ path: route.path, query: { ...route.query, q: keyword } })
  }
}

function onSearchEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  void search()
}

watch(() => route.query.q, keyword => {
  searchText.value = typeof keyword === 'string' ? keyword : ''
  if (searchText.value.trim()) {
    void runSearch(searchText.value)
  } else {
    cancelSearch()
    result.value = null
    error.value = ''
  }
}, { immediate: true })

onBeforeUnmount(() => {
  cancelSearch()
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
})
const speakJapanese = (text: string) => {

  if (!text) {
    return
  }


  // Browser không hỗ trợ Speech Synthesis
  if (!('speechSynthesis' in window)) {
    console.warn(
      'Speech Synthesis API is not supported by this browser.'
    )

    return
  }


  // Dừng câu đang đọc
  window.speechSynthesis.cancel()


  const utterance =
    new SpeechSynthesisUtterance(text)


  utterance.lang = 'ja-JP'

  utterance.rate = 0.9

  utterance.pitch = 1


  window.speechSynthesis.speak(
    utterance
  )

}

</script>


<style scoped>
.input-limit { color: #786c82; font-size: 12px; margin-bottom: 12px; }
@media (prefers-reduced-motion: reduce) { .loading-icon, .loading-bar-progress { animation: none !important; } }

/* =========================================================
   PAGE
========================================================= */

.japanese-ai-page {

  width: 100%;

  max-width: 1000px;

  margin: 0 auto;

  padding: 30px 20px 60px;

}


/* =========================================================
   HEADER
========================================================= */

.page-header {

  margin-bottom: 25px;

}


.page-header h1 {

  margin: 0;

  font-size: 30px;

  font-weight: 700;

}


.page-header p {

  margin: 8px 0 0;

  color: #777;

  font-size: 15px;

}


/* =========================================================
   SEARCH
========================================================= */

.search-card {

  background: white;

  border-radius: 14px;

  padding: 20px;

  box-shadow:
    0 4px 18px rgba(0, 0, 0, 0.08);

}


.search-box {

  display: flex;

  gap: 12px;

}


.search-box input {

  flex: 1;

  height: 48px;

  font-size: 16px;

}


.search-box button {

  min-width: 130px;

  height: 48px;

}


/* =========================================================
   RESULT
========================================================= */

.result-container {

  margin-top: 25px;

  display: flex;

  flex-direction: column;

  gap: 20px;

}


.result-card {

  background: white;

  border-radius: 14px;

  padding: 25px;

  box-shadow:
    0 4px 18px rgba(0, 0, 0, 0.07);

}


/* =========================================================
   SECTION TITLE
========================================================= */

.section-title {

  display: flex;

  align-items: center;

  gap: 10px;

  margin-bottom: 20px;

}


.section-title .icon {

  font-size: 24px;

}


.section-title h2 {

  margin: 0;

  font-size: 21px;

  font-weight: 700;

}


/* =========================================================
   ORIGINAL TEXT
========================================================= */

.original-text {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 15px;

  padding: 16px 18px;

  border-radius: 10px;

  background: #f7f7f7;

  font-size: 22px;

  line-height: 1.8;

  font-weight: 500;

}


.original-text-content {

  flex: 1;

  min-width: 0;

  word-break: break-word;

}


/* =========================================================
   MAIN RESULT
========================================================= */

.main-result {

  text-align: center;

}


.translation {

  font-size: 24px;

  font-weight: 600;

  margin-bottom: 10px;

  line-height: 1.7;

}


.reading-row {

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 10px;

}


.reading {

  color: #777;

  font-size: 18px;

  line-height: 1.7;

  word-break: break-word;

}


/* =========================================================
   SPEAK BUTTON
========================================================= */

.speak-button,
.speak-button-small {

  border: none;

  background: #f1f3f5;

  border-radius: 50%;

  cursor: pointer;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  transition:
    background 0.2s ease,
    transform 0.2s ease;

  flex-shrink: 0;

}


.speak-button {

  width: 40px;

  height: 40px;

  font-size: 18px;

}


.speak-button-small {

  width: 32px;

  height: 32px;

  font-size: 15px;

}


.speak-button:hover,
.speak-button-small:hover {

  background: #e2e6ea;

  transform: scale(1.05);

}


.speak-button:active,
.speak-button-small:active {

  transform: scale(0.95);

}


/* =========================================================
   VOCABULARY
========================================================= */

.vocabulary-list {

  display: flex;

  flex-direction: column;

  gap: 12px;

}


.vocabulary-item {

  display: grid;

  grid-template-columns:
    180px
    180px
    180px
    minmax(0, 1fr);

  align-items: center;

  gap: 15px;

  padding: 15px 18px;

  border-radius: 10px;

  background: #f8f9fa;

}


.vocabulary-word {

  display: flex;

  align-items: center;

  gap: 8px;

  min-width: 0;

  font-size: 23px;

  font-weight: 600;

}


.vocabulary-reading {

  color: #777;

  font-size: 16px;

}


.vocabulary-kanji-reading {

  color: #555;

  font-size: 15px;

}


.vocabulary-meaning {

  font-size: 16px;

  word-break: break-word;

}


.label {

  color: #999;

  font-size: 12px;

  margin-right: 4px;

}


/* =========================================================
   GRAMMAR
========================================================= */

.grammar-list {

  display: flex;

  flex-direction: column;

  gap: 15px;

}


.grammar-item {

  padding: 18px;

  border-left: 4px solid #0d6efd;

  background: #f8f9fa;

  border-radius: 8px;

}


.grammar-pattern {

  font-size: 19px;

  font-weight: 600;

  margin-bottom: 8px;

}


.grammar-explanation {

  line-height: 1.7;

  color: #555;

}


/* =========================================================
   SENTENCE
========================================================= */

.sentence-structure {

  line-height: 1.8;

  font-size: 16px;

  white-space: pre-wrap;

  word-break: break-word;

}


/* =========================================================
   EXAMPLES
========================================================= */

.examples-list {

  display: flex;

  flex-direction: column;

  gap: 12px;

}


.example-item {

  display: flex;

  align-items: flex-start;

  gap: 12px;

  padding: 15px;

  background: #f8f9fa;

  border-radius: 10px;

  line-height: 1.7;

}


.example-number {

  flex-shrink: 0;

  width: 28px;

  height: 28px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background: #0d6efd;

  color: white;

  font-size: 13px;

  font-weight: 600;

}


.example-text {

  flex: 1;

  min-width: 0;

  word-break: break-word;

}


/* =========================================================
   EMPTY
========================================================= */

.empty {

  color: #999;

  padding: 15px 0;

}


/* =========================================================
   ERROR
========================================================= */

.alert {

  margin-top: 15px;

}


/* =========================================================
   LOADING OVERLAY
========================================================= */

.loading-panel {

  position: relative;

  margin-top: 24px;

  min-height: 250px; border-radius: 16px;

  background: rgba(255, 255, 255, 0.75);



  display: flex;

  align-items: center;

  justify-content: center;



}


/* =========================================================
   LOADING BOX
========================================================= */

.loading-box {

  width: 320px;

  padding: 30px;

  background: #fff;

  border-radius: 16px;

  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.15);

  text-align: center;

}


/* =========================================================
   LOADING ICON
========================================================= */

.loading-icon {

  font-size: 42px;

  margin-bottom: 15px;

  animation:
    loading-bounce 1.2s ease-in-out infinite;

}


/* =========================================================
   LOADING TEXT
========================================================= */

.loading-text {

  font-size: 17px;

  font-weight: 600;

  color: #333;

}


/* =========================================================
   LOADING SUBTEXT
========================================================= */

.loading-subtext {

  margin-top: 7px;

  font-size: 13px;

  color: #888;

}


/* =========================================================
   LOADING BAR
========================================================= */

.loading-bar {

  width: 100%;

  height: 5px;

  margin-top: 22px;

  overflow: hidden;

  border-radius: 10px;

  background: #e9ecef;

}


.loading-bar-progress {

  width: 35%;

  height: 100%;

  border-radius: 10px;

  background: #0d6efd;

  animation:
    loading-progress 1.2s ease-in-out infinite;

}


/* =========================================================
   ANIMATION
========================================================= */

@keyframes loading-progress {

  0% {

    transform: translateX(-120%);

  }

  50% {

    transform: translateX(100%);

  }

  100% {

    transform: translateX(300%);

  }

}


@keyframes loading-bounce {

  0%,
  100% {

    transform: translateY(0);

  }

  50% {

    transform: translateY(-5px);

  }

}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 900px) {

  .vocabulary-item {

    grid-template-columns:
      1fr
      1fr;

  }

}


@media (max-width: 768px) {

  .japanese-ai-page {

    padding: 20px 15px 40px;

  }


  .page-header h1 {

    font-size: 25px;

  }


  .search-box {

    flex-direction: column;

  }


  .search-box button {

    width: 100%;

  }


  .result-card {

    padding: 20px;

  }


  .vocabulary-item {

    grid-template-columns: 1fr;

    gap: 8px;

  }


  .vocabulary-word {

    font-size: 22px;

  }


  .translation {

    font-size: 21px;

  }


  .original-text {

    font-size: 19px;

  }


  .loading-box {

    width: calc(100% - 40px);

    max-width: 320px;

  }

}

</style>

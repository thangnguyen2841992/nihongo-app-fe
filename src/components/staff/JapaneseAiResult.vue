<template>
  <div class="japanese-ai-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>🇯🇵 Phân tích tiếng Nhật</h1>
        <p>Tra cứu và phân tích từ vựng, ngữ pháp tiếng Nhật</p>
      </div>
    </div>

    <!-- Search -->
    <div class="search-card">
      <div class="search-box">
        <input
          v-model="searchText"
          type="text"
          class="form-control"
          placeholder="Nhập từ hoặc câu tiếng Nhật..."
          @keyup.enter="search"
        />

        <button
          class="btn btn-primary"
          :disabled="loading || !searchText.trim()"
          @click="search"
        >
          <span v-if="loading">
            Đang phân tích...
          </span>

          <span v-else>
            🔍 Phân tích
          </span>
        </button>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="alert alert-danger mt-3"
    >
      {{ error }}
    </div>

    <!-- Result -->
    <div
      v-if="result"
      class="result-container"
    >

      <!-- Translation -->
      <section class="result-card main-result">

        <div class="section-title">
          <span class="icon">🇯🇵</span>
          <h2>Kết quả</h2>
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
            @click="speakJapanese(searchText)"
            title="Phát âm"
          >
            🔊
          </button>

        </div>
      </section>


      <!-- Vocabulary -->
      <section class="result-card">

        <div class="section-title">
          <span class="icon">📚</span>
          <h2>Từ vựng</h2>
        </div>

        <div
          v-if="result.vocabulary.length === 0"
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
            :key="index"
            class="vocabulary-item"
          >

            <div class="vocabulary-word">

  <span>
    {{ item.word }}
  </span>

              <button
                type="button"
                class="speak-button-small"
                @click="speakJapanese(item.word)"
              >
                🔊
              </button>

            </div>

            <div class="vocabulary-reading">
              {{ item.reading }}
            </div>

            <div class="vocabulary-meaning">
              {{ item.meaning }}
            </div>

          </div>

        </div>
      </section>


      <!-- Grammar -->
      <section class="result-card">

        <div class="section-title">
          <span class="icon">📖</span>
          <h2>Ngữ pháp</h2>
        </div>

        <div
          v-if="result.grammar.length === 0"
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
            :key="index"
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


      <!-- Sentence structure -->
      <section class="result-card">

        <div class="section-title">
          <span class="icon">🧩</span>
          <h2>Cấu trúc câu</h2>
        </div>

        <div class="sentence-structure">
          {{ result.sentenceStructure }}
        </div>

      </section>


      <!-- Examples -->
      <section class="result-card">

        <div class="section-title">
          <span class="icon">💡</span>
          <h2>Ví dụ</h2>
        </div>

        <div class="examples-list">

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

import {onMounted, ref} from 'vue'
import {analyzeJapanese} from "@/services/japaneseAiService.ts";


interface Vocabulary {
  word: string
  reading: string
  meaning: string
}

interface Grammar {
  pattern: string
  explanation: string
}

interface JapaneseAiResponse {
  translation: string
  reading: string
  vocabulary: Vocabulary[]
  grammar: Grammar[]
  sentenceStructure: string
  examples: string[]
}


const searchText = ref('')

const result = ref<JapaneseAiResponse | null>(null)

const loading = ref(false)

const error = ref('')


const search = async () => {

  if (!searchText.value.trim()) {
    return
  }

  loading.value = true
  error.value = ''

  try {

    result.value = await analyzeJapanese(
      searchText.value
    )

  } catch (e: any) {

    console.error(
      'Japanese AI search error:',
      e
    )

    error.value =
      e?.response?.data?.message ||
      'Không thể phân tích tiếng Nhật. Vui lòng thử lại.'

  } finally {

    loading.value = false

  }
}
onMounted(() => {
  const data = sessionStorage.getItem('japaneseAiResult')

  if (data) {
    result.value = JSON.parse(data)
  }
})
const speakJapanese = (text: string) => {
  if (!text) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)

  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  utterance.pitch = 1

  window.speechSynthesis.speak(utterance)
}
</script>


<style scoped>

.japanese-ai-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px 20px 60px;
}


/* Header */

.page-header {
  margin-bottom: 25px;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
}

.page-header p {
  margin-top: 8px;
  color: #777;
}


/* Search */

.search-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
}

.search-box {
  display: flex;
  gap: 12px;
}

.search-box input {
  height: 48px;
  font-size: 16px;
}

.search-box button {
  min-width: 130px;
  height: 48px;
}


/* Result */

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
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.07);
}


/* Section */

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
}


/* Main result */

.main-result {
  text-align: center;
}

.translation {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 10px;
}

.reading {
  color: #777;
  font-size: 18px;
}


/* Vocabulary */

.vocabulary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vocabulary-item {
  display: grid;
  grid-template-columns: 180px 180px 1fr;
  align-items: center;
  gap: 15px;

  padding: 15px 18px;

  border-radius: 10px;
  background: #f8f9fa;
}

.vocabulary-word {
  font-size: 23px;
  font-weight: 600;
}

.vocabulary-reading {
  color: #777;
  font-size: 16px;
}

.vocabulary-meaning {
  font-size: 16px;
}


/* Grammar */

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


/* Sentence */

.sentence-structure {
  line-height: 1.8;
  font-size: 16px;
}


/* Examples */

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
}


/* Empty */

.empty {
  color: #999;
  padding: 15px 0;
}


/* Responsive */

@media (max-width: 768px) {

  .search-box {
    flex-direction: column;
  }

  .search-box button {
    width: 100%;
  }

  .vocabulary-item {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .vocabulary-word {
    font-size: 22px;
  }

  .translation {
    font-size: 21px;
  }

}
.reading-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.speak-button,
.speak-button-small {
  border: none;
  background: #f1f3f5;
  border-radius: 50%;
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  transition: 0.2s;
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

.vocabulary-word {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

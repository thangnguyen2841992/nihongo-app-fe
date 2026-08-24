<script setup lang="ts">

import { ref } from 'vue'
import { analyzeJapanese as analyzeJapaneseApi } from '@/services/japaneseAiService'

/* =========================================================
   Types
========================================================= */

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


/* =========================================================
   State
========================================================= */

const text = ref('')

const result = ref<JapaneseAiResponse | null>(null)

const loading = ref(false)

const error = ref('')


/* =========================================================
   Analyze Japanese
========================================================= */

const analyzeJapanese = async () => {

  if (!text.value.trim()) {
    return
  }

  loading.value = true
  error.value = ''
  result.value = null

  try {

    result.value = await analyzeJapaneseApi(text.value)

  } catch (e: any) {

    console.error('Japanese AI error:', e)

    error.value =
      e.response?.data?.message ||
      e.response?.data?.error ||
      'AIの処理中にエラーが発生しました。'

  } finally {

    loading.value = false

  }
}


/* =========================================================
   Clear
========================================================= */

const clear = () => {

  text.value = ''

  result.value = null

  error.value = ''

}


/* =========================================================
   Ctrl + Enter
========================================================= */

const handleKeydown = (event: KeyboardEvent) => {

  if (event.ctrlKey && event.key === 'Enter') {

    event.preventDefault()

    analyzeJapanese()

  }

}

</script>


<template>

  <div class="ai-search">

    <!-- =====================================================
         Search Box
    ====================================================== -->

    <div class="search-box">

      <textarea
        v-model="text"
        rows="3"
        placeholder="日本語を入力してください..."
        :disabled="loading"
        @keydown="handleKeydown"
      />

      <div class="search-hint">
        Ctrl + Enter で検索
      </div>

      <div class="actions">

        <button
          type="button"
          class="btn-clear"
          @click="clear"
          :disabled="loading && !text"
        >
          クリア
        </button>

        <button
          type="button"
          class="btn-search"
          @click="analyzeJapanese"
          :disabled="loading || !text.trim()"
        >
          <span v-if="loading">
            解析中...
          </span>

          <span v-else>
            🔍 AIで調べる
          </span>
        </button>

      </div>

    </div>


    <!-- =====================================================
         Error
    ====================================================== -->

    <div
      v-if="error"
      class="error"
    >
      {{ error }}
    </div>


    <!-- =====================================================
         Loading
    ====================================================== -->

    <div
      v-if="loading"
      class="loading"
    >

      <div class="loading-spinner"></div>

      <span>
        日本語を解析しています...
      </span>

    </div>


    <!-- =====================================================
         Result
    ====================================================== -->

    <div
      v-if="result"
      class="result"
    >

      <!-- Header -->

      <div class="result-title">

        <span class="result-icon">
          🇯🇵
        </span>

        <span>
          日本語 AI Assistant
        </span>

      </div>


      <!-- =================================================
           Translation
      ================================================== -->

      <section class="result-section">

        <h3>
          🇻🇳 Dịch nghĩa
        </h3>

        <div class="translation">

          {{ result.translation }}

        </div>

      </section>


      <!-- =================================================
           Reading
      ================================================== -->

      <section class="result-section">

        <h3>
          🔤 Cách đọc
        </h3>

        <div class="reading">

          {{ result.reading }}

        </div>

      </section>


      <!-- =================================================
           Vocabulary
      ================================================== -->

      <section
        v-if="result.vocabulary?.length"
        class="result-section"
      >

        <h3>
          📚 Từ vựng
        </h3>

        <div class="vocabulary-list">

          <div
            v-for="(item, index) in result.vocabulary"
            :key="`${item.word}-${index}`"
            class="vocabulary-item"
          >

            <div class="vocabulary-word">

              {{ item.word }}

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


      <!-- =================================================
           Grammar
      ================================================== -->

      <section
        v-if="result.grammar?.length"
        class="result-section"
      >

        <h3>
          📖 Ngữ pháp
        </h3>

        <div class="grammar-list">

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
           Sentence Structure
      ================================================== -->

      <section class="result-section">

        <h3>
          🔎 Cấu trúc câu
        </h3>

        <div class="sentence-structure">

          {{ result.sentenceStructure }}

        </div>

      </section>


      <!-- =================================================
           Examples
      ================================================== -->

      <section
        v-if="result.examples?.length"
        class="result-section"
      >

        <h3>
          📝 Ví dụ
        </h3>

        <div class="examples-list">

          <div
            v-for="(example, index) in result.examples"
            :key="index"
            class="example-item"
          >

            <span class="example-number">
              {{ index + 1 }}.
            </span>

            <span>
              {{ example }}
            </span>

          </div>

        </div>

      </section>

    </div>

  </div>

</template>


<style scoped>

/* =========================================================
   Main
========================================================= */

.ai-search {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}


/* =========================================================
   Search Box
========================================================= */

.search-box {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
  transition: border-color 0.2s ease;
}

.search-box:focus-within {
  border-color: #999;
}


/* =========================================================
   Textarea
========================================================= */

textarea {
  display: block;

  width: 100%;

  box-sizing: border-box;

  border: none;

  outline: none;

  resize: vertical;

  font-size: 16px;

  line-height: 1.6;

  font-family: inherit;

  color: #222;

  background: transparent;
}

textarea::placeholder {
  color: #aaa;
}

textarea:disabled {
  opacity: 0.6;
}


/* =========================================================
   Search Hint
========================================================= */

.search-hint {
  margin-top: 6px;

  font-size: 12px;

  color: #999;

  text-align: right;
}


/* =========================================================
   Actions
========================================================= */

.actions {
  display: flex;

  justify-content: flex-end;

  gap: 10px;

  margin-top: 10px;
}


button {
  border: none;

  border-radius: 8px;

  padding: 9px 16px;

  cursor: pointer;

  font-size: 14px;

  transition:
    opacity 0.2s ease,
    transform 0.1s ease;
}

button:active:not(:disabled) {
  transform: scale(0.98);
}

button:disabled {
  opacity: 0.5;

  cursor: not-allowed;
}


/* =========================================================
   Clear Button
========================================================= */

.btn-clear {
  background: #eee;

  color: #333;
}

.btn-clear:hover:not(:disabled) {
  background: #e3e3e3;
}


/* =========================================================
   Search Button
========================================================= */

.btn-search {
  background: #222;

  color: white;
}

.btn-search:hover:not(:disabled) {
  background: #333;
}


/* =========================================================
   Error
========================================================= */

.error {
  margin-top: 15px;

  padding: 12px 15px;

  border-radius: 8px;

  background: #fff1f1;

  color: #d00;

  font-size: 14px;
}


/* =========================================================
   Loading
========================================================= */

.loading {
  display: flex;

  align-items: center;

  gap: 10px;

  margin-top: 15px;

  color: #666;

  font-size: 14px;
}


.loading-spinner {
  width: 16px;

  height: 16px;

  border: 2px solid #ddd;

  border-top-color: #333;

  border-radius: 50%;

  animation: spin 0.8s linear infinite;
}


@keyframes spin {

  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }

}


/* =========================================================
   Result
========================================================= */

.result {
  margin-top: 20px;

  padding: 20px;

  border-radius: 12px;

  background: #fff;

  border: 1px solid #ddd;
}


/* =========================================================
   Result Header
========================================================= */

.result-title {
  display: flex;

  align-items: center;

  gap: 8px;

  font-size: 18px;

  font-weight: 700;

  margin-bottom: 20px;

  padding-bottom: 15px;

  border-bottom: 1px solid #eee;
}

.result-icon {
  font-size: 20px;
}


/* =========================================================
   Result Section
========================================================= */

.result-section {
  margin-top: 24px;
}

.result-section:first-of-type {
  margin-top: 0;
}


.result-section h3 {
  margin: 0 0 10px;

  font-size: 16px;

  font-weight: 700;

  color: #333;
}


/* =========================================================
   Translation
========================================================= */

.translation {
  padding: 14px 16px;

  border-radius: 8px;

  background: #f7f7f7;

  font-size: 16px;

  line-height: 1.7;
}


/* =========================================================
   Reading
========================================================= */

.reading {
  padding: 12px 16px;

  border-radius: 8px;

  background: #fafafa;

  font-size: 18px;

  line-height: 1.7;

  letter-spacing: 0.5px;
}


/* =========================================================
   Vocabulary
========================================================= */

.vocabulary-list {
  display: flex;

  flex-direction: column;

  gap: 8px;
}


.vocabulary-item {
  display: grid;

  grid-template-columns:
    minmax(100px, 1fr)
    minmax(120px, 1fr)
    minmax(200px, 2fr);

  align-items: center;

  gap: 15px;

  padding: 12px 14px;

  border: 1px solid #eee;

  border-radius: 8px;

  background: #fafafa;
}


.vocabulary-word {
  font-size: 17px;

  font-weight: 700;

  color: #222;
}


.vocabulary-reading {
  font-size: 14px;

  color: #666;
}


.vocabulary-meaning {
  font-size: 14px;

  color: #444;
}


/* =========================================================
   Grammar
========================================================= */

.grammar-list {
  display: flex;

  flex-direction: column;

  gap: 10px;
}


.grammar-item {
  padding: 14px;

  border-left: 4px solid #333;

  border-radius: 6px;

  background: #f8f8f8;
}


.grammar-pattern {
  font-size: 16px;

  font-weight: 700;

  margin-bottom: 6px;

  color: #222;
}


.grammar-explanation {
  font-size: 14px;

  line-height: 1.7;

  color: #555;
}


/* =========================================================
   Sentence Structure
========================================================= */

.sentence-structure {
  padding: 14px 16px;

  border-radius: 8px;

  background: #f8f8f8;

  font-size: 15px;

  line-height: 1.7;

  font-family: monospace;

  white-space: pre-wrap;
}


/* =========================================================
   Examples
========================================================= */

.examples-list {
  display: flex;

  flex-direction: column;

  gap: 8px;
}


.example-item {
  display: flex;

  gap: 8px;

  padding: 10px 12px;

  border-radius: 8px;

  background: #fafafa;

  font-size: 15px;

  line-height: 1.7;
}


.example-number {
  font-weight: 700;

  color: #666;
}


/* =========================================================
   Responsive
========================================================= */

@media (max-width: 700px) {

  .ai-search {
    max-width: 100%;
  }

  .result {
    padding: 15px;
  }

  .vocabulary-item {
    grid-template-columns: 1fr;

    gap: 4px;
  }

  .actions {
    flex-direction: column;
  }

  button {
    width: 100%;
  }

}

</style>

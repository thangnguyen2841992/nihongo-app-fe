<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref} from "vue"

import {useRoute, useRouter} from "vue-router"

import CreateLessonModal from "@/components/staff/CreateLessonModal.vue"

import {gatewayUrl} from "@/api/authApi.ts"
import ExampleModal from "@/components/staff/ExampleModal.vue"
import GrammarModal from "@/components/staff/GrammarModal.vue";

/* =========================
   ROUTER
========================= */

const route = useRoute()

const router = useRouter()

/* =========================
   TYPES
========================= */

interface Lesson {
  lessonId: number
  name: string
  description: string
  reading: string
  bookId: number
}

interface Grammar {
  grammarId: number
  title: string
  imageUrl?: string
  description: string
}

interface Book {
  bookId: number
  bookName: string
}

interface Example {
  exampleId: number
  nihongo: string
  vietnamese: string
  grammarId: number
}

/* =========================
   STATE
========================= */
const showExampleModal = ref(false)

const activeGrammarId =
  ref<number | null>(null)

const selectedGrammarId =
  ref<number | null>(null)

const editingExample =
  ref<Example | null>(null)

const book =
  ref<Book | null>(null)

const lessons =
  ref<Lesson[]>([])

const grammars =
  ref<Grammar[]>([])

const selectedLesson =
  ref<Lesson | null>(null)

const showLessonModal =
  ref(false)

const editingLesson =
  ref<Lesson | null>(null)


const examples =
  ref<Record<number, Example[]>>({})

const expandedGrammar =
  ref<Record<number, boolean>>({})

const showGrammarModal =
  ref(false)

const editingGrammar =
  ref<Grammar | null>(null)

/* =========================
   TOOLBAR ACTIVE
========================= */
const handleScroll = () => {

  let currentId = null

  for (const grammar of grammars.value) {

    const el =
      document.getElementById(
        `grammar-${grammar.grammarId}`
      )

    if (!el) {
      continue
    }

    const rect =
      el.getBoundingClientRect()

    if (rect.top <= 220) {
      currentId =
        grammar.grammarId
    }
  }

  activeGrammarId.value =
    currentId
}
const scrollToGrammar =
  (grammarId: number) => {

    activeGrammarId.value =
      grammarId

    const element =
      document.getElementById(
        `grammar-${grammarId}`
      )

    if (!element) {
      return
    }

    const y =
      element.getBoundingClientRect().top +
      window.scrollY -
      180

    window.scrollTo({
      top: y,
      behavior: "smooth"
    })
  }

const openImage = (
  imageUrl?: string
) => {

  if (!imageUrl) {
    return
  }

  window.open(
    imageUrl,
    "_blank"
  )
}

const openCreateGrammarModal =
  () => {

    editingGrammar.value =
      null

    showGrammarModal.value =
      true
  }

const openEditGrammarModal =
  (grammar: Grammar) => {

    editingGrammar.value =
      grammar

    showGrammarModal.value =
      true
  }

const onGrammarSaved = async (
  grammarId: number
) => {

  showGrammarModal.value = false

  if (!selectedLesson.value) {
    return
  }

  await fetchGrammars(
    selectedLesson.value.lessonId
  )

  await nextTick()

  document
    .getElementById(
      `grammar-${grammarId}`
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    })
}

const deleteGrammar =
  async (grammarId: number) => {
    const confirmDelete =
      confirm(
        "Bạn có chắc muốn xóa grammar này?"
      )
    if (!confirmDelete) {
      return
    }
    try {
      await gatewayUrl.delete(
        "/api/staff/grammars",
        {
          data: {
            grammarId
          }
        }
      )
      if (
        selectedLesson.value
      ) {
        await fetchGrammars(
          selectedLesson.value.lessonId
        )
      }
    } catch (e) {
      console.error(e)
      alert(
        "Xóa grammar thất bại"
      )
    }
  }

const openCreateExampleModal = (
  grammarId: number
) => {

  selectedGrammarId.value =
    grammarId

  editingExample.value =
    null

  showExampleModal.value =
    true
}

const openEditExampleModal = (
  example: Example
) => {

  selectedGrammarId.value =
    example.grammarId

  editingExample.value =
    example

  showExampleModal.value =
    true
}

const onExampleSaved = async (
  exampleId: number
) => {

  showExampleModal.value = false

  if (!selectedGrammarId.value) {
    return
  }

  // đảm bảo đang expand
  expandedGrammar.value[
    selectedGrammarId.value
    ] = true

  await fetchExamples(
    selectedGrammarId.value
  )

  await nextTick()

  document
    .getElementById(
      `example-${exampleId}`
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    })
}
/* =========================
   BOOK ID
========================= */

const bookId =
  Number(route.params.bookId)

/* =========================
   FETCH BOOK
========================= */

const fetchBook =
  async () => {

    try {

      const res =
        await gatewayUrl.get(
          `/api/staff/books/${bookId}`
        )

      book.value = res.data

    } catch (e) {

      console.error(e)

      alert(
        "Không thể tải thông tin sách"
      )
    }
  }

/* =========================
   FETCH LESSONS
========================= */

const fetchLessons =
  async () => {

    try {

      const res =
        await gatewayUrl.get(
          "/api/staff/getLessonsByBook",
          {
            params: {
              bookId
            }
          }
        )

      lessons.value =
        res.data

    } catch (e) {

      console.error(e)

      alert(
        "Không thể tải bài học"
      )
    }
  }

/* =========================
   FETCH GRAMMARS
========================= */

const fetchGrammars =
  async (lessonId: number) => {

    try {

      const res =
        await gatewayUrl.get(
          "/api/staff/getAllGrammarByLesson",
          {
            params: {
              lessonId
            }
          }
        )

      grammars.value = res.data

    } catch (e) {

      console.error(e)

      alert(
        "Không thể tải grammar"
      )
    }
  }


/* =========================
   LESSON MODAL
========================= */

const openLessonModal =
  () => {
    editingLesson.value =
      null

    showLessonModal.value =
      true
  }

const openEditLessonModal =
  (lesson: Lesson) => {

    editingLesson.value =
      lesson

    showLessonModal.value =
      true
  }

const closeLessonModal =
  async () => {

    showLessonModal.value =
      false
    editingLesson.value =
      null
    await fetchLessons()
    selectedLesson.value = lessons.value.find(l => l.lessonId === selectedLesson.value?.lessonId) || null
  }

/* =========================
   OPEN LESSON
========================= */

const openLesson = async (
  lesson: Lesson
) => {

  selectedLesson.value = lesson

  await fetchGrammars(
    lesson.lessonId
  )

  expandedGrammar.value = {}

  grammars.value.forEach(
    grammar => {
      expandedGrammar.value[
        grammar.grammarId
        ] = true
    }
  )

  await Promise.all(
    grammars.value.map(
      grammar =>
        fetchExamples(
          grammar.grammarId
        )
    )
  )
}


/* =========================
   FETCH EXAMPLE
========================= */
const fetchExamples = async (
  grammarId: number
) => {

  try {

    const res =
      await gatewayUrl.get(
        "/api/staff/getAllExampleByGrammar",
        {
          params: {
            grammarId
          }
        }
      )

    examples.value[grammarId] =
      res.data

  } catch (e) {

    console.error(e)
  }
}

const toggleExamples =
  async (grammarId: number) => {

    expandedGrammar.value[grammarId] =
      !expandedGrammar.value[grammarId]

    if (
      expandedGrammar.value[grammarId] &&
      !examples.value[grammarId]
    ) {

      await fetchExamples(
        grammarId
      )
    }
  }

/* =========================
   BACK
========================= */

const goBack = () => {

  router.push("/staff")
}

const getStructureImage = (
  imageUrl: string
) => {

  return imageUrl.replace(
    "/upload/",
    "/upload/w_1200,h_300,c_pad,b_white/"
  )
}

/* =========================
   MOUNT
========================= */
onUnmounted(() => {
  window.removeEventListener(
    "scroll",
    handleScroll
  )
})

onMounted(async () => {
  window.addEventListener(
    "scroll",
    handleScroll
  )
  await fetchBook()

  await fetchLessons()

  /* AUTO OPEN FIRST LESSON */

  if (
    lessons.value.length > 0
  ) {

    await openLesson(
      lessons.value[0]!
    )
  }

})

const goToExercisePage =
  () => {
    if (!selectedLesson.value) {
      return
    }
    router.push({
      name: "course-lesson-exercises",
      params: {
        lessonId:
        selectedLesson.value.lessonId
      }
    })
  }
</script>

<template>

  <div class="grammar-page">

    <!-- HEADER -->

    <div class="mb-4">

      <div
        class="
          page-header
          d-flex
          justify-content-between
          align-items-start
        "
      >

        <div>

          <h2 class="book-title mb-1">
            📚 {{ book?.bookName }}
          </h2>

          <div class="sub-title">
            Quản lý grammar & bài học
          </div>

        </div>

        <button
          class="back-btn"
          @click="goBack"
        >
          ← Quay lại
        </button>

      </div>

    </div>


    <!-- LESSON TABS -->

    <div class="lesson-tabs">

      <button
        v-for="(lesson,index) in lessons"
        :key="lesson.lessonId"
        class="lesson-tab"
        :class="{
          active:
            selectedLesson?.lessonId ===
            lesson.lessonId
        }"
        @click="openLesson(lesson)"
      >
        Bài {{ index + 1 }}
      </button>

    </div>


    <!-- CONTENT -->

    <div class="grammar-panel">

      <div
        v-if="!selectedLesson"
        class="empty-state"
      >

        <div class="empty-icon">
          📘
        </div>

        <div class="empty-title">
          Chọn bài học
        </div>

        <div class="empty-desc">
          Hãy chọn lesson để xem grammar.
        </div>

      </div>


      <template v-else>

        <!-- TOP ACTION -->

        <div class="top-actions">

          <div class="selected-lesson-wrapper">

            <div class="selected-lesson">
              {{ selectedLesson.name }}
            </div>

          </div>

          <div class="action-buttons">

            <button
              class="exercise-btn"
              @click="goToExercisePage()"
            >
              🎯 Bài tập
            </button>

          </div>

        </div>


        <!-- GRAMMAR TABS -->

        <div
          v-if="grammars.length"
          class="grammar-tabs"
        >

          <button
            v-for="(grammar,index) in grammars"
            :key="grammar.grammarId"
            class="grammar-tab"
            :class="{
    active:
      activeGrammarId === grammar.grammarId
  }"
            :data-tooltip="`${index + 1}. ${grammar.title}`"
            @click="
    scrollToGrammar(
      grammar.grammarId
    )
  "
          >
  <span class="grammar-tab-text">
    {{ index + 1 }}. {{ grammar.title }}
  </span>
          </button>

        </div>


        <!-- READING -->

        <div
          v-if="selectedLesson.reading"
          class="lesson-reading-card"
        >

          <div class="lesson-reading-header">

            <div class="lesson-reading-icon">
              📖
            </div>

            <div>

              <div class="lesson-reading-title">
                Bài đọc
              </div>

              <div class="lesson-reading-subtitle">
                Nội dung luyện đọc của bài học
              </div>

            </div>

          </div>

          <div
            class="lesson-reading-content"
            v-html="selectedLesson.reading"
          />

        </div>


        <!-- GRAMMAR LIST -->

        <div class="grammar-scroll">

          <div
            v-for="(grammar,index) in grammars"
            :key="grammar.grammarId"
            :id="`grammar-${grammar.grammarId}`"
            class="grammar-card"
          >

            <!-- TITLE -->

            <div class="grammar-title">

              <div class="grammar-number">
                {{ index + 1 }}
              </div>

              <div class="grammar-title-text">
                {{ grammar.title }}
              </div>

            </div>


            <!-- IMAGE -->

            <div
              v-if="grammar.imageUrl"
              class="grammar-structure"
            >

              <img
                :src="
                  getStructureImage(
                    grammar.imageUrl
                  )
                "
                :alt="grammar.title"
                class="grammar-structure-image"
                @click="
                  openImage(
                    grammar.imageUrl
                  )
                "
              >

            </div>


            <!-- DESCRIPTION -->

            <div class="grammar-description">

              {{ grammar.description }}

            </div>


            <!-- EXAMPLES -->

            <div class="example-section">

              <button
                class="expand-btn"
                @click="
                  toggleExamples(
                    grammar.grammarId
                  )
                "
              >

                {{
                  expandedGrammar[
                    grammar.grammarId
                    ]
                    ? '▼ Ẩn ví dụ'
                    : '▶ Xem ví dụ'
                }}

              </button>


              <div
                v-if="
                  expandedGrammar[
                    grammar.grammarId
                  ]
                "
                class="example-expand"
              >

                <div class="example-topbar">

                  <div class="example-count">

                    {{
                      examples[
                        grammar.grammarId
                        ]?.length || 0
                    }}

                    ví dụ

                  </div>

                </div>


                <!-- EXAMPLE LIST -->

                <template
                  v-if="
                    examples[
                      grammar.grammarId
                    ]?.length
                  "
                >

                  <div
                    v-for="
                      (example, exampleIndex)
                      in examples[
                        grammar.grammarId
                      ]
                    "
                    :key="example.exampleId"
                    class="example-card"
                  >

                    <div class="example-row">

                      <div class="example-number">
                        {{ exampleIndex + 1 }}
                      </div>

                      <div class="example-content">

                        <div
                          class="jp-text"
                          v-html="
                            example.nihongo
                          "
                        />

                        <div
                          class="vn-text"
                          v-html="
                            example.vietnamese
                          "
                        />

                      </div>

                    </div>

                  </div>

                </template>


                <div
                  v-else
                  class="empty-example"
                >
                  Chưa có ví dụ
                </div>

              </div>

            </div>

          </div>

        </div>

      </template>

    </div>

  </div>

</template>

<style scoped>

.back-btn {

  display: inline-flex;

  align-items: center;

  gap: 10px;

  padding: 12px 18px;

  border-radius: 16px;

  background: white;

  color: #334155;

  font-weight: 600;

  font-size: 14px;

  border: 1px solid #e7edf6;

  box-shadow: 0 4px 12px rgba(
    0,
    0,
    0,
    0.05
  );

  transition: all .25s ease;
}

.back-btn:hover {

  transform: translateY(-2px);

  border-color: #c9d7f5;

  box-shadow: 0 10px 24px rgba(
    79,
    140,
    255,
    0.12
  );
}

.back-btn:active {

  transform: translateY(0);
}

.sub-title {
  color: #64748b;
  font-size: 14px;
}

.grammar-panel {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  overflow: hidden;
}

.top-actions {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 16px;

  box-sizing: border-box;
}

.selected-lesson {
  font-size: 22px;
  font-weight: 700;

  color: #1e293b;

  overflow-wrap: anywhere;
}

.grammar-scroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  overflow-x: hidden;
}

.grammar-card {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  margin-bottom: 24px;

  padding: 24px;

  background: #ffffff;

  border: 1px solid #e2e8f0;

  border-radius: 18px;

  overflow: hidden;
}
.empty-state {
  padding: 70px 20px;

  text-align: center;

  color: #64748b;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}
.empty-desc {
  margin-top: 6px;
}

/* =========================
   EXAMPLES
========================= */

.example-section {

  width: 100%;
  max-width: 100%;
  min-width: 0;
}

/* TOGGLE BUTTON */

.expand-btn {

  border: none;

  padding: 9px 14px;

  border-radius: 10px;

  background: #eef4ff;

  color: #2563eb;

  font-weight: 600;

  cursor: pointer;
}

.expand-btn:hover {

  transform: translateY(-1px);

  box-shadow: 0 8px 24px rgba(
    79,
    140,
    255,
    0.18
  );

  background: linear-gradient(
    135deg,
    #eef4ff,
    #e6edff
  );
}

/* EXPAND AREA */

.example-expand {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  margin-top: 14px;

  padding: 16px;

  box-sizing: border-box;

  border-radius: 14px;

  background: #f8fafc;

  overflow: hidden;
}

/* CARD */

.example-card {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  padding: 14px;

  margin-bottom: 10px;

  background: white;

  border: 1px solid #e2e8f0;

  border-radius: 12px;
}

.example-card:hover {

  transform: translateY(-2px);

  box-shadow: 0 14px 32px rgba(
    0,
    0,
    0,
    0.06
  );
}

.example-row {

  display: flex;

  align-items: flex-start;

  gap: 12px;

  width: 100%;

  min-width: 0;
}

.jp-text :deep(*) {

  font-size: inherit !important;

  line-height: inherit !important;
}

.jp-text :deep(i) {

  font-style: italic;
}


.vn-text :deep(b) {

  font-weight: 700;
}

.vn-text :deep(i) {

  font-style: italic;
}

/* LEFT ACCENT */

.example-card::before {

  content: "";

  position: absolute;

  top: 0;

  left: 0;

  width: 4px;

  height: 100%;

  background: linear-gradient(
    180deg,
    #4f8cff,
    #7b61ff
  );
}

/* JAPANESE */

.jp-text {

  font-family:
    "Noto Sans JP",
    sans-serif;

  font-size: 18px;

  line-height: 1.8;

  overflow-wrap: anywhere;
}

/* VIETNAMESE */

.vn-text {

  margin-top: 6px;

  color: #64748b;

  line-height: 1.7;

  overflow-wrap: anywhere;
}

.vn-text::before {

  content: "";

  position: absolute;

  left: 0;

  top: 10px;

  width: 8px;

  height: 8px;

  border-radius: 50%;

  background: #7b61ff;
}

/* EMPTY */

.empty-example {

  text-align: center;

  padding: 40px 20px;

  border-radius: 18px;

  background: white;

  border: 1px dashed #d7dfeb;

  color: #8a95a8;

  font-weight: 500;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 768px) {

  .grammar-page {
    padding: 16px 12px;
  }

  .grammar-panel {
    padding: 14px;
    border-radius: 16px;
  }

  .page-header {
    flex-direction: column;

    gap: 12px;
  }

  .top-actions {
    align-items: flex-start;

    flex-direction: column;
  }

  .action-buttons {
    width: 100%;
  }

  .exercise-btn {
    width: 100%;
  }

  .grammar-card {
    padding: 14px;
  }

  .grammar-title {
    position: relative;

    display: flex;
    align-items: center;
    gap: 16px;

    margin-bottom: 24px;
    padding: 18px 22px;

    background: #f8faff;

    border: 1px solid #dbe7ff;
    border-left: 7px solid #4f8cff;

    border-radius: 14px;

    box-shadow:
      0 6px 20px
      rgba(37, 99, 235, .08);

    font-size: 26px;
    font-weight: 800;
    line-height: 1.5;

    color: #172554;
  }

  .lesson-reading-card {
    width: 100%;
    max-width: 100%;
    min-width: 0;

    box-sizing: border-box;

    margin-bottom: 24px;

    padding: 24px;

    background: #ffffff;

    border: 1px solid #e2e8f0;

    border-radius: 18px;

    overflow: hidden;
  }

  .example-expand {
    padding: 10px;
  }

}

/* =========================
   EXAMPLE TOPBAR
========================= */

.example-topbar {

  margin-bottom: 12px;
}

.example-count {

  font-weight: 700;
  color: #475569;
}

/* ADD BUTTON */

.add-example-btn {

  border: none;

  padding: 12px 18px;

  border-radius: 14px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-weight: 700;

  transition: all 0.25s ease;

  box-shadow: 0 10px 24px rgba(
    79,
    140,
    255,
    0.22
  );
}

.add-example-btn:hover {

  transform: translateY(-2px);

  box-shadow: 0 16px 32px rgba(
    79,
    140,
    255,
    0.35
  );
}

/* =========================
   EXAMPLE EDITOR
========================= */
.edit-example-btn {

  border: none;

  background: #f8faff;

  color: #4f8cff;

  padding: 8px 14px;

  border-radius: 12px;

  font-size: 14px;

  font-weight: 600;

  transition: all 0.2s ease;
}

.edit-example-btn:hover {

  background: #eef4ff;

  transform: translateY(-1px);
}


.example-number {

  width: 30px;
  height: 30px;

  min-width: 30px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: #eef4ff;

  color: #2563eb;

  font-weight: 700;
}

.example-content {

  flex: 1;

  min-width: 0;

  overflow-wrap: anywhere;

  word-break: break-word;
}

.lesson-tabs {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  display: flex;
  gap: 10px;

  margin-bottom: 20px;

  overflow-x: auto;
  overflow-y: hidden;

  padding: 4px;

  scrollbar-width: thin;
}

.lesson-tabs::-webkit-scrollbar {

  height: 6px;
}

.lesson-tabs::-webkit-scrollbar-thumb {

  background: #d7dfeb;

  border-radius: 999px;
}

.lesson-tab {

  flex-shrink: 0;

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: #f1f5f9;

  color: #475569;

  font-weight: 600;

  cursor: pointer;

  white-space: nowrap;

  transition: all .2s ease;

}

.lesson-tab:hover {

  background: #e0e7ff;
  color: #4f46e5;
}

.lesson-tab.active {

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;
}


.lesson-add-tab {

  border-radius: 16px;

  padding: 12px 20px;

  white-space: nowrap;

  flex-shrink: 0;

  background: #eef4ff;

  color: #3158d8;

  font-weight: 700;

  border: 1px dashed #9db7ff;

  transition: all .25s ease;
}

.lesson-add-tab:hover {

  background: #e5eeff;
}


.book-title {

  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  overflow-wrap: anywhere;
}

.grammar-structure {
  width: 100%;
  max-width: 100%;

  display: flex;
  justify-content: center;
  align-items: center;

  margin: 20px 0;

  overflow: hidden;
}

.grammar-structure-image {
  display: block;

  width: auto;
  max-width: min(650px, 100%);

  height: auto;

  object-fit: contain;

  border-radius: 12px;

  cursor: pointer;
}

.grammar-structure-image:hover {
  transform: scale(1.02);
}

.grammar-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-width: 0;
  margin-bottom: 18px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b
}
.grammar-number {
  flex-shrink: 0;

  flex-shrink: 0;

  width: 48px;
  height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    #2563eb,
    #7c3aed
  );

  color: white;

  font-size: 20px;
  font-weight: 800;

  box-shadow:
    0 6px 16px
    rgba(37, 99, 235, .3);
}
.grammar-title-text {
  flex: 1;
  min-width: 0;

  color: #172554;

  font-size: 26px;
  font-weight: 800;

  line-height: 1.5;

  overflow-wrap: anywhere;
  word-break: break-word;
}

.grammar-description {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  margin-top: 18px;

  font-size: 17px;
  line-height: 1.9;

  white-space: normal;

  word-break: break-word;

  overflow-wrap: anywhere;
}

.grammar-description::before {

  content: "📝 Giải thích";

  display: block;

  margin-bottom: 12px;

  font-size: 13px;

  font-weight: 700;

  color: #4f46e5;

  text-transform: uppercase;

  letter-spacing: .5px;
}

.selected-lesson-wrapper {

  min-width: 0;
  flex: 1;
}

/* =========================
   LESSON READING
========================= */

.lesson-reading-card {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  margin-bottom: 24px;
  padding: 24px;

  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;

  overflow: hidden;
}

.lesson-reading-header {

  width: 100%;
  max-width: 100%;
  min-width: 0;

  display: flex;
  align-items: center;

  gap: 14px;

  margin-bottom: 20px;

  box-sizing: border-box;
}

.lesson-reading-icon {
  width: 42px;
  height: 42px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 12px;

  background: #e0e7ff;

  font-size: 22px;

  flex-shrink: 0;
}

.lesson-reading-title {

  font-weight: 700;
  color: #1e293b;
}

.lesson-reading-subtitle {

  font-size: 13px;
  color: #64748b;
}

.lesson-reading-content {

  display: block;

  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  font-size: 17px;
  line-height: 1.9;
  color: #334155;

  overflow-x: hidden;
  overflow-y: visible;

  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.lesson-reading-content :deep(*) {
  max-width: 100%;
  box-sizing: border-box;
}
.lesson-reading-content :deep(p),
.lesson-reading-content :deep(div),
.lesson-reading-content :deep(span) {
  max-width: 100%;

  white-space: normal;

  word-break: break-word;

  overflow-wrap: anywhere;
}
.lesson-reading-content :deep(table) {
  width: 100%;
  max-width: 100%;

  table-layout: fixed;

  border-collapse: collapse;

  overflow-wrap: anywhere;
}
.lesson-reading-content :deep(img) {
  display: block;

  max-width: 100%;
  height: auto;

  object-fit: contain;
}


/* Nếu có iframe */

.lesson-reading-content :deep(iframe) {
  max-width: 100%;
}


/* Nếu có pre/code */

.lesson-reading-content :deep(pre) {
  max-width: 100%;

  overflow-x: auto;

  white-space: pre-wrap;

  word-break: break-word;
}

.lesson-reading-content :deep(code) {
  max-width: 100%;

  word-break: break-word;
}
/* Scroll đẹp */

.lesson-reading-content::-webkit-scrollbar {

  width: 8px;
}

.lesson-reading-content::-webkit-scrollbar-thumb {

  background: #d5ddec;

  border-radius: 999px;
}

@media (max-width: 768px) {

  .lesson-reading-content {

    font-size: 16px;

    line-height: 2;

    padding: 18px;
  }

  .lesson-reading-header {

    padding: 16px 18px;
  }

  .lesson-reading-icon {

    width: 44px;

    height: 44px;

    font-size: 20px;
  }
}
.action-buttons {

  flex-shrink: 0;
}

.exercise-btn {

  border: none;

  padding: 10px 18px;

  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #22c55e,
    #16a34a
  );

  color: white;

  font-weight: 700;

  cursor: pointer;

  white-space: nowrap;
}

.exercise-btn:hover {

  transform: translateY(-2px);

  box-shadow: 0 8px 20px rgba(
    245,
    158,
    11,
    0.25
  );
}
.grammar-tabs {

  display: flex;
  gap: 10px;

  width: 100%;
  max-width: 100%;

  overflow-x: auto;
  overflow-y: visible;

  padding: 10px 4px 14px;

  scrollbar-width: thin;

  /* Quan trọng */
  min-width: 0;
}

.grammar-tab {

  position: relative;

  flex: 0 1 220px;
  min-width: 0;
  max-width: 220px;

  height: 46px;

  padding: 0 16px;

  border: 1px solid #e2e8f0;
  border-radius: 12px;

  background: #f8fafc;

  color: #334155;

  font-weight: 600;

  cursor: pointer;

  white-space: nowrap;

  overflow: hidden;
  text-overflow: ellipsis;

  transition:
    background .2s,
    color .2s,
    border-color .2s,
    transform .2s;

  flex-shrink: 1;
}
.grammar-tab-text {
  display: block;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grammar-tab:hover {

  background: #eef4ff;
  border-color: #4f8cff;
  color: #2563eb;

  z-index: 1000;
}
/* Tooltip full text */
.grammar-tab:hover::after {
  content: attr(data-tooltip);

  position: absolute;

  left: 0;
  top: calc(100% + 8px);

  width: max-content;
  max-width: 420px;

  padding: 10px 14px;

  border-radius: 10px;

  background: #1e293b;
  color: white;

  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;

  white-space: normal;
  word-break: break-word;

  box-shadow:
    0 8px 24px rgba(0, 0, 0, .18);

  pointer-events: none;
}
.grammar-tab.active {

  background: #4f8cff;
  color: white;
}
.grammar-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  box-sizing: border-box;

  padding: 20px 24px;
}

</style>

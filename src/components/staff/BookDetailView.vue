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
      name: "lesson-exercises",
      params: {
        lessonId:
        selectedLesson.value.lessonId
      }
    })
  }
</script>

<template>

  <div class="container-fluid py-4">

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
  <span class="back-icon">
    ←
  </span>

          <span>
    Quay lại
  </span>
        </button>

      </div>

    </div>
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

      <button
        class="lesson-add-tab"
        @click="openLessonModal()"
      >
        + Lesson
      </button>

    </div>
    <div class="row g-4">

      <!-- RIGHT -->

      <div class="col-lg-12">

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
              Hãy chọn lesson bên trái
              để xem grammar.
            </div>

          </div>

          <template v-else>

            <div class="top-actions">

              <div class="selected-lesson-wrapper">

                <div class="selected-lesson">
                  {{ selectedLesson.name }}
                </div>

                <button
                  class="lesson-edit-btn"
                  @click="
        openEditLessonModal(
          selectedLesson!
        )
      "
                >
                  ✏️ Sửa lesson
                </button>

              </div>

              <div class="action-buttons">

                <button
                  class="exercise-btn"
                  @click="
        goToExercisePage()
      "
                >
                  🎯 Bài tập
                </button>

                <button
                  class="add-btn"
                  @click="
        openCreateGrammarModal()
      "
                >
                  + Grammar
                </button>

              </div>

            </div>
            <div
              v-if="grammars.length"
              class="grammar-tabs"
            >

              <button
                v-for="
      (grammar,index)
      in grammars
    "
                :key="
      grammar.grammarId
    "
                class="grammar-tab"
                :class="{
      active:
        activeGrammarId ===
        grammar.grammarId
    }"
                @click="
      scrollToGrammar(
        grammar.grammarId
      )
    "
              >
                {{ index + 1 }}.
                {{ grammar.title }}
              </button>

            </div>
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

              <div class="lesson-reading-content"  v-html="selectedLesson.reading">

              </div>

            </div>

            <!-- LIST -->

            <div class="grammar-scroll">

              <div
                v-for="
    (
      grammar,
      index
    ) in grammars
  "
                :key="
    grammar.grammarId
  "
                :id="
    `grammar-${grammar.grammarId}`
  "
                class="
    grammar-card
  "
              >

              <div
                class="
                    grammar-header
                  "
              >

                <div
                  class="
                      grammar-title
                    "
                >

                  <div
                    class="
                        grammar-number
                      "
                  >
                    {{
                      index + 1
                    }}
                  </div>

                  {{
                    grammar.title
                  }}

                </div>

                <div class="grammar-actions">

                  <button
                    class="edit-btn"
                    @click="openEditGrammarModal(grammar)">
                    ✏️
                  </button>

                  <button
                    class="
      delete-btn
    "
                    @click="
      deleteGrammar(
        grammar.grammarId
      )
    "
                  >
                    🗑️
                  </button>

                </div>

              </div>

              <div
                v-if="grammar.imageUrl"
                class="grammar-structure"
              >
                <img
                  :src="getStructureImage(grammar.imageUrl)"
                  :alt="grammar.title"
                  class="grammar-structure-image"
                  @click="openImage(grammar.imageUrl)">
              </div>
              <div
                class="grammar-description">
                {{
                  grammar.description
                }}
              </div>
              <!-- EXAMPLE ACTION -->

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

                <!-- EXPAND CONTENT -->

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

                    <button
                      class="add-example-btn"
                      @click="openCreateExampleModal(grammar.grammarId)">
                      + Thêm ví dụ
                    </button>

                  </div>

                  <!-- LIST -->

                  <template
                    v-if="
    examples[
      grammar.grammarId
    ]?.length
  "
                  >

                    <div
                      v-for="(example, exampleIndex) in examples[grammar.grammarId]"
                      :key="example.exampleId"
                      class="example-card">
                      <div class="example-row">
                        <div class="example-number">
                          {{ exampleIndex + 1 }}
                        </div>

                        <div class="example-content">

                          <div
                            class="jp-text"
                            v-html="example.nihongo"
                          ></div>

                          <div
                            class="vn-text"
                            v-html="example.vietnamese"
                          ></div>

                        </div>

                        <button
                          class="edit-example-btn"
                          @click="
      openEditExampleModal(
        example
      )
    "
                        >
                          ✏️
                        </button>

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

</div>

<CreateLessonModal
  v-if="showLessonModal"
  :book-id="bookId"
  :book-name="book?.bookName || ''"
  :lesson="editingLesson"
  @close="showLessonModal = false"
  @created="closeLessonModal"
/>

<ExampleModal
  v-if="showExampleModal"
  :grammar-id="selectedGrammarId!"
  :example="editingExample"
  @close="showExampleModal = false"
  @saved="onExampleSaved"
/>

<GrammarModal
  v-if="showGrammarModal"
  :lesson-id="
    selectedLesson?.lessonId || 0
  "
  :grammar="editingGrammar"
  @close="
    showGrammarModal = false
  "
  @saved="
    onGrammarSaved
  "
/>

</div>

</template>

<style scoped>

.container-fluid {
  background: #f4f7fb;
}

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

.back-icon {

  display: flex;

  align-items: center;

  justify-content: center;

  width: 28px;

  height: 28px;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  font-size: 14px;

  font-weight: 700;

  flex-shrink: 0;
}

.sub-title {
  color: #7c8595;
}

.grammar-panel {
  background: white;
  border-radius: 24px;
  padding: 24px;
}


.add-btn {
  border: none;
  border-radius: 12px;
}

.add-btn {
  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;
  padding: 10px 18px;
}

.top-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.selected-lesson {
  font-size: 22px;
  font-weight: 700;
}

.grammar-scroll {
  display: flex;
  flex-direction: column;
  gap: 18px;
}


.empty-state {
  text-align: center;
  padding: 90px 20px;
}

.grammar-actions {

  display: flex;

  gap: 10px;
}

/* =========================
   EXAMPLES
========================= */

.example-section {

  margin-top: 28px;
}

/* TOGGLE BUTTON */

.expand-btn {

  background: linear-gradient(
    135deg,
    #f4f8ff,
    #eef2ff
  );

  color: #3158d8;

  padding: 12px 18px;

  border-radius: 16px;

  font-weight: 700;

  font-size: 14px;

  transition: all 0.25s ease;

  display: flex;

  align-items: center;

  gap: 10px;

  border: 1px solid #dce6ff;
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

  margin-top: 20px;

  background: linear-gradient(
    180deg,
    #fcfdff,
    #f7f9ff
  );

  border-radius: 24px;

  border: 1px solid #e6ecf7;

  padding: 24px;
}

/* CARD */

.example-card {

  background: white;

  border: 1px solid #e9eef7;

  border-radius: 18px;

  padding: 18px 20px;

  transition: all 0.2s ease;
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

  gap: 16px;
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

  font-family: "Noto Sans JP",
  sans-serif;

  font-size: 24px;

  line-height: 1.8;

  color: #1a2c73;
}

/* VIETNAMESE */

.vn-text {

  position: relative;

  padding-left: 18px;

  color: #647084;

  line-height: 1.8;

  font-size: 16px;
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

/* MOBILE */

@media (max-width: 768px) {

  .example-expand {

    padding: 18px;
  }

  .jp-text {

    font-size: 22px;
  }

  .vn-text {

    font-size: 15px;
  }

}

/* =========================
   EXAMPLE TOPBAR
========================= */

.example-topbar {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 22px;
}

.example-count {

  font-size: 14px;

  font-weight: 700;

  color: #647084;

  background: #eef3ff;

  padding: 10px 16px;

  border-radius: 999px;
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

  flex-shrink: 0;

  width: 34px;

  height: 34px;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 14px;

  font-weight: 700;

  margin-top: 2px;
}

.example-content {

  flex: 1;

  min-width: 0;
}

.lesson-tabs {

  display: flex;

  align-items: center;

  gap: 12px;

  overflow-x: auto;

  padding-bottom: 8px;

  margin-bottom: 24px;
}

.lesson-tabs::-webkit-scrollbar {

  height: 6px;
}

.lesson-tabs::-webkit-scrollbar-thumb {

  background: #d7dfeb;

  border-radius: 999px;
}

.lesson-tab {

  background: white;

  border-radius: 16px;

  padding: 12px 20px;

  white-space: nowrap;

  font-weight: 600;

  color: #556070;

  transition: all 0.25s ease;

  flex-shrink: 0;
  border: none

}

.lesson-tab:hover {

  transform: translateY(-1px);

  box-shadow: 0 8px 20px rgba(
    0,
    0,
    0,
    0.06
  );
}

.lesson-tab.active {

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;

  border-color: transparent;

  box-shadow: 0 10px 24px rgba(
    79,
    140,
    255,
    0.25
  );
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

  margin: 0;

  font-size: 32px;

  font-weight: 700;
}

.grammar-structure {

  height: 140px;

  border-radius: 16px;

  background: #f8fafc;

  border: 1px solid #e2e8f0;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 12px;

  overflow: hidden;
}

.grammar-structure-image {

  width: auto;

  max-width: 500px;

  max-height: 120px;

  margin: 0 auto;

  display: block;
}

.grammar-structure-image:hover {

  transform: scale(1.02);
}

.grammar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  margin-bottom: 16px;
}

.grammar-title {
  display: flex;
  align-items: center;
  gap: 12px;

  flex: 1;

  font-size: 22px;
  font-weight: 700;

  color: #1e293b;
}

.grammar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.edit-btn,
.delete-btn {

  width: 40px;
  height: 40px;

  border: none;
  border-radius: 12px;

  display: flex;
  align-items: center;
  justify-content: center;

  transition: all .2s ease;
}

.edit-btn {
  background: #eef4ff;
}

.edit-btn:hover {
  background: #dbeafe;
}

.delete-btn {
  background: #fff1f2;
}

.delete-btn:hover {
  background: #ffe4e6;
}

.grammar-description {

  position: relative;

  margin-top: 18px;

  padding: 20px 24px;

  border-radius: 20px;

  background: #f8fafc;

  border: 1px solid #e2e8f0;

  color: #334155;

  font-family: "Noto Sans JP",
  "Noto Sans",
  sans-serif;

  font-size: 17px;

  white-space: pre-wrap;
  font-weight: 500;

  line-height: 2.1;
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

.lesson-edit-btn {

  border: none;

  background: #eef4ff;

  color: #3158d8;

  padding: 8px 14px;

  border-radius: 12px;

  font-size: 14px;

  font-weight: 600;

  transition: all .2s ease;
}

.lesson-edit-btn:hover {

  background: #dbeafe;

  transform: translateY(-1px);
}

.selected-lesson-wrapper {

  display: flex;

  align-items: center;

  gap: 12px;
}

/* =========================
   LESSON READING
========================= */

.lesson-reading-card {

  margin-bottom: 24px;

  background: linear-gradient(
    180deg,
    #ffffff,
    #fafcff
  );

  border: 1px solid #e6ecf7;

  border-radius: 24px;

  overflow: hidden;

  box-shadow: 0 10px 30px rgba(
    0,
    0,
    0,
    0.04
  );
}

.lesson-reading-header {

  display: flex;

  align-items: center;

  gap: 14px;

  padding: 20px 24px;

  border-bottom: 1px solid #eef2f7;
}

.lesson-reading-icon {

  width: 52px;

  height: 52px;

  border-radius: 16px;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 24px;

  color: white;
}

.lesson-reading-title {

  font-size: 18px;

  font-weight: 700;

  color: #1e293b;
}

.lesson-reading-subtitle {

  font-size: 13px;

  color: #64748b;
}

.lesson-reading-content {

  padding: 24px 28px;

  white-space: pre-wrap;

  line-height: 2.2;

  font-size: 18px;

  color: #334155;

  font-family: "Noto Sans JP",
  "Noto Sans",
  sans-serif;

  max-height: 500px;

  overflow-y: auto;
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

  display: flex;

  gap: 12px;

  align-items: center;
}

.exercise-btn {

  border: none;

  border-radius: 12px;

  padding: 10px 18px;

  background: #f59e0b;

  color: white;

  font-weight: 600;

  transition: all .25s ease;
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

  position: sticky;

  top: 80px;

  z-index: 90;

  display: flex;

  gap: 10px;

  overflow-x: auto;

  padding: 12px;

  margin-bottom: 20px;

  background: white;

  border-radius: 16px;

  box-shadow:
    0 4px 16px
    rgba(0,0,0,.06);
}

.grammar-tab {

  border: none;

  flex-shrink: 0;

  padding: 10px 16px;

  border-radius: 12px;

  background: #f8fafc;

  color: #475569;

  font-weight: 600;

  white-space: nowrap;

  transition: .2s;
}

.grammar-tab:hover {

  background: #eef4ff;

  color: #2563eb;
}

.grammar-tab.active {

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  color: white;
}
</style>

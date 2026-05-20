<script setup lang="ts">
import {
  ref,
  watch,
  onMounted
} from "vue"

import gatewayUrl from "@/api/authApi.ts"
import BookImageEditor from "@/components/staff/BookImageEditor.vue"

/* =========================
   INTERFACES
========================= */

interface ImageDTO {
  imageId: number
  imgUrl: string
}

interface Book {
  bookId: number
  bookName: string
  typeName: string
  levelName: string
  typeId?: number
  levelId?: number
  imageUrls: ImageDTO[]
}

interface Type {
  typeId: number
  typeName: string
}

interface Level {
  levelId: number
  levelName: string
}

interface Lesson {
  lessonId: number
  bookId: number
  name: string
  description: string
}

interface Grammar {
  grammarId: number
  title: string
  structure: string
  lessonId: number
  description: string
}

/* =========================
   PROPS
========================= */

const props = defineProps<{
  book: Book
}>()

const emit = defineEmits([
  "close",
  "preview-images",
  "updated"
])

/* =========================
   STATE
========================= */

const isEditing = ref(false)
const loading = ref(false)

const types = ref<Type[]>([])
const levels = ref<Level[]>([])

const lessons = ref<Lesson[]>([])
const loadingLessons = ref(false)

const selectedLesson =
  ref<Lesson | null>(null)

const grammars = ref<Grammar[]>([])

const loadingGrammars =
  ref(false)

const grammarLoading =
  ref(false)

const showCreateGrammar =
  ref(false)

const editingGrammarId =
  ref<number | null>(null)

const structureRef =
  ref<HTMLTextAreaElement | null>(
    null
  )

const grammarForm = ref({
  title: "",
  structure: "",
  description: ""
})

const form = ref({
  bookName: "",
  typeId: null as number | null,
  levelId: null as number | null
})

/* =========================
   FORMAT GRAMMAR
========================= */

const formatGrammar = (
  text: string
) => {

  return text.replace(
    /~~(.*?)~~/g,
    "<del>$1</del>"
  )
}

/* =========================
   STRIKE TOOL
========================= */

const wrapWithStrike = () => {

  const textarea =
    structureRef.value

  if (!textarea) return

  const start =
    textarea.selectionStart

  const end =
    textarea.selectionEnd

  // phải bôi đen mới chạy
  if (start === end) return

  const text =
    grammarForm.value.structure

  const selectedText =
    text.substring(start, end)

  // thêm ký tự gạch ngang sau MỖI ký tự
  const strikeText =
    Array.from(selectedText)
      .map(char => char + "̶")
      .join("")

  // thay đoạn được chọn
  grammarForm.value.structure =
    text.substring(0, start) +
    strikeText +
    text.substring(end)

  textarea.focus()

  // đưa con trỏ về cuối đoạn vừa sửa
  requestAnimationFrame(() => {

    const pos =
      start + strikeText.length

    textarea.setSelectionRange(
      pos,
      pos
    )
  })
}
/* =========================
   INIT
========================= */

onMounted(async () => {

  try {

    const [t, l] = await Promise.all([
      gatewayUrl.get("/api/staff/types"),
      gatewayUrl.get("/api/staff/levels")
    ])

    types.value = t.data
    levels.value = l.data

  } catch (e) {

    console.error(e)
  }
})

/* =========================
   FETCH LESSONS
========================= */

const fetchLessons = async () => {

  if (!props.book?.bookId) return

  loadingLessons.value = true

  try {

    const res = await gatewayUrl.get(
      "/api/staff/getLessonsByBook",
      {
        params: {
          bookId: props.book.bookId
        }
      }
    )

    lessons.value = res.data

  } catch (e) {

    console.error(e)

  } finally {

    loadingLessons.value = false
  }
}

/* =========================
   FETCH GRAMMARS
========================= */

const fetchGrammars = async (
  lessonId: number
) => {

  loadingGrammars.value = true

  try {

    const res = await gatewayUrl.get(
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

  } finally {

    loadingGrammars.value = false
  }
}

/* =========================
   WATCH BOOK
========================= */

watch(
  () => props.book,
  async (newBook) => {

    form.value.bookName =
      newBook.bookName

    const foundType =
      types.value.find(
        t =>
          t.typeName ===
          newBook.typeName
      )

    const foundLevel =
      levels.value.find(
        l =>
          l.levelName ===
          newBook.levelName
      )

    form.value.typeId =
      foundType?.typeId ?? null

    form.value.levelId =
      foundLevel?.levelId ?? null

    await fetchLessons()
  },
  {
    immediate: true,
    deep: true
  }
)

/* =========================
   WATCH TYPES + LEVELS
========================= */

watch(
  [types, levels],
  () => {

    const foundType =
      types.value.find(
        t =>
          t.typeName ===
          props.book.typeName
      )

    const foundLevel =
      levels.value.find(
        l =>
          l.levelName ===
          props.book.levelName
      )

    form.value.typeId =
      foundType?.typeId ?? null

    form.value.levelId =
      foundLevel?.levelId ?? null
  },
  {
    immediate: true
  }
)

/* =========================
   UPDATE BOOK
========================= */

const handleUpdate = async () => {

  loading.value = true

  try {

    await gatewayUrl.put(
      "/api/staff/books",
      {
        bookId:
        props.book.bookId,

        bookName:
        form.value.bookName,

        typeId:
        form.value.typeId,

        levelId:
        form.value.levelId
      }
    )

    emit("updated")

    isEditing.value = false

  } catch (e) {

    console.error(e)

  } finally {

    loading.value = false
  }
}

/* =========================
   OPEN LESSON DETAIL
========================= */

const openLessonDetail =
  async (lesson: Lesson) => {

    if (
      selectedLesson.value?.lessonId ===
      lesson.lessonId
    ) {

      selectedLesson.value = null
      grammars.value = []

      return
    }

    selectedLesson.value =
      lesson

    showCreateGrammar.value =
      false

    editingGrammarId.value =
      null

    await fetchGrammars(
      lesson.lessonId
    )
  }

/* =========================
   CREATE GRAMMAR
========================= */

const createGrammar = async () => {

  if (!selectedLesson.value) {
    return
  }

  grammarLoading.value = true

  try {

    await gatewayUrl.post(
      "/api/staff/grammars",
      {
        title:
        grammarForm.value.title,

        structure:
        grammarForm.value.structure,

        description:
        grammarForm.value.description,

        lessonId:
        selectedLesson.value.lessonId
      }
    )

    resetGrammarForm()

    await fetchGrammars(
      selectedLesson.value.lessonId
    )

  } catch (e) {

    console.error(e)

  } finally {

    grammarLoading.value = false
  }
}

/* =========================
   UPDATE GRAMMAR
========================= */

const updateGrammar = async (
  grammarId: number
) => {

  if (!selectedLesson.value) {
    return
  }

  grammarLoading.value = true

  try {

    await gatewayUrl.put(
      "/api/staff/grammars",
      {
        grammarId,

        title:
        grammarForm.value.title,

        structure:
        grammarForm.value.structure,

        description:
        grammarForm.value.description,

        lessonId:
        selectedLesson.value.lessonId
      }
    )

    resetGrammarForm()

    await fetchGrammars(
      selectedLesson.value.lessonId
    )

  } catch (e) {

    console.error(e)

  } finally {

    grammarLoading.value = false
  }
}

/* =========================
   EDIT GRAMMAR
========================= */

const startEditGrammar = (
  grammar: Grammar
) => {

  editingGrammarId.value =
    grammar.grammarId

  showCreateGrammar.value = true

  grammarForm.value = {
    title: grammar.title,
    structure: grammar.structure,
    description:
    grammar.description
  }
}

/* =========================
   RESET FORM
========================= */

const resetGrammarForm = () => {

  editingGrammarId.value = null

  showCreateGrammar.value = false

  grammarForm.value = {
    title: "",
    structure: "",
    description: ""
  }
}
</script>

<template>

  <!-- MODAL -->
  <div class="modal fade show d-block">

    <div
      class="
        modal-dialog
        modal-xl
        modal-dialog-centered
      "
    >

      <div
        class="
          modal-content
          custom-modal
          shadow
        "
      >

        <!-- HEADER -->
        <div class="modal-header custom-header">

          <div>

            <h5
              class="
                modal-title
                fw-bold
                mb-1
              "
            >

              <template v-if="isEditing">
                ✏️ Chỉnh sửa sách
              </template>

              <template v-else>
                📚 Chi tiết sách
              </template>

            </h5>

            <div class="sub-title">

              <template v-if="isEditing">
                Cập nhật thông tin sách
              </template>

              <template v-else>
                Xem thông tin sách
              </template>

            </div>

          </div>

          <div class="header-actions">

            <template v-if="!isEditing">

              <button
                class="edit-btn"
                @click="isEditing = true"
              >
                Chỉnh sửa
              </button>

            </template>

            <template v-else>

              <button
                class="cancel-btn"
                @click="isEditing = false"
              >
                Hủy
              </button>

              <button
                class="save-btn"
                @click="handleUpdate"
                :disabled="loading"
              >

                <span
                  v-if="loading"
                  class="
                    spinner-border
                    spinner-border-sm
                    me-2
                  "
                ></span>

                Lưu

              </button>

            </template>

            <button
              class="btn-close"
              @click="$emit('close')"
            ></button>

          </div>

        </div>

        <!-- BODY -->
        <div class="modal-body">

          <!-- NORMAL -->
          <template v-if="!isEditing">

            <div class="row g-4">

              <!-- IMAGE -->
              <div class="col-lg-4">

                <div class="image-card">

                  <img
                    v-if="book.imageUrls?.length"
                    :src="book.imageUrls[0]!.imgUrl"
                    class="main-image"
                    alt="book"
                  />

                </div>

              </div>

              <!-- INFO -->
              <div class="col-lg-8">

                <div class="info-container">

                  <div class="info-card">

                    <div class="info-label">
                      Tên sách
                    </div>

                    <div class="info-value">
                      {{ book.bookName }}
                    </div>

                  </div>

                  <!-- LESSON TREE -->
                  <div class="info-card">

                    <div
                      class="
                        d-flex
                        justify-content-between
                        align-items-center
                        mb-3
                      "
                    >

                      <div
                        class="
                          info-label
                          mb-0
                        "
                      >
                        Danh sách bài học
                      </div>

                      <span class="lesson-count">
                        {{ lessons.length }} bài
                      </span>

                    </div>

                    <div
                      v-if="loadingLessons"
                      class="text-center py-3"
                    >

                      <div
                        class="
                          spinner-border
                          spinner-border-sm
                        "
                      ></div>

                    </div>

                    <!-- TREE -->
                    <div
                      v-else
                      class="lesson-tree"
                    >

                      <div
                        v-for="lesson in lessons"
                        :key="lesson.lessonId"
                        class="lesson-node"
                      >

                        <!-- HEADER -->
                        <div
                          class="lesson-header"
                          @click="
                            openLessonDetail(
                              lesson
                            )
                          "
                        >

                          <div class="lesson-left">

                            <i
                              class="
                                bi
                                bi-chevron-right
                                lesson-arrow
                              "
                              :class="{
                                expanded:
                                selectedLesson?.lessonId ===
                                lesson.lessonId
                              }"
                            ></i>

                            <div>

                              <div class="lesson-title">
                                {{ lesson.name }}
                              </div>

                              <div class="lesson-sub">
                                {{
                                  lesson.description ||
                                  'Không có mô tả'
                                }}
                              </div>

                            </div>

                          </div>

                          <span class="lesson-badge">
                            Grammar
                          </span>

                        </div>

                        <!-- EXPAND -->
                        <div
                          v-if="
                            selectedLesson?.lessonId ===
                            lesson.lessonId
                          "
                          class="lesson-expand"
                        >

                          <div class="expand-top">

                            <button
                              class="add-grammar-btn"
                              @click="
                                showCreateGrammar =
                                !showCreateGrammar
                              "
                            >
                              + Thêm grammar
                            </button>

                          </div>

                          <!-- CREATE -->
                          <div
                            v-if="showCreateGrammar"
                            class="create-grammar-card"
                          >

                            <div class="grammar-form-title">

                              <template
                                v-if="editingGrammarId"
                              >
                                ✏️ Chỉnh sửa grammar
                              </template>

                              <template v-else>
                                ➕ Tạo grammar mới
                              </template>

                            </div>

                            <input
                              v-model="grammarForm.title"
                              class="
                                form-control
                                custom-input
                                mb-3
                              "
                              placeholder="Tiêu đề"
                            />

                            <!-- TOOLBAR -->
                            <div class="structure-toolbar">

                              <button
                                type="button"
                                class="tool-btn"
                                @click="wrapWithStrike"
                              >
                                S̶
                              </button>

                            </div>

                            <!-- STRUCTURE -->
                            <textarea
                              ref="structureRef"
                              v-model="
                                grammarForm.structure
                              "
                              rows="3"
                              class="
                                form-control
                                custom-input
                                mb-3
                                grammar-textarea
                              "
                              placeholder="Cấu trúc"
                            ></textarea>

                            <textarea
                              v-model="
                                grammarForm.description
                              "
                              rows="4"
                              class="
                                form-control
                                custom-input
                                mb-3
                              "
                              placeholder="Mô tả"
                            ></textarea>

                            <div class="grammar-form-actions">

                              <button
                                class="cancel-btn"
                                @click="resetGrammarForm"
                              >
                                Hủy
                              </button>

                              <button
                                class="save-btn"
                                :disabled="grammarLoading"
                                @click="
                                  editingGrammarId
                                    ? updateGrammar(
                                        editingGrammarId
                                      )
                                    : createGrammar()
                                "
                              >

                                <span
                                  v-if="grammarLoading"
                                  class="
                                    spinner-border
                                    spinner-border-sm
                                    me-2
                                  "
                                ></span>

                                <template
                                  v-if="editingGrammarId"
                                >
                                  Cập nhật
                                </template>

                                <template v-else>
                                  Lưu grammar
                                </template>

                              </button>

                            </div>

                          </div>

                          <!-- EMPTY -->
                          <div
                            v-if="
                              !loadingGrammars &&
                              !grammars.length
                            "
                            class="empty-grammar"
                          >
                            Chưa có grammar
                          </div>

                          <!-- LIST -->
                          <div
                            v-for="grammar in grammars"
                            :key="grammar.grammarId"
                            class="grammar-item"
                          >

                            <div class="grammar-header">

                              <div class="grammar-title">
                                {{ grammar.title }}
                              </div>

                              <button
                                class="edit-grammar-btn"
                                @click="
                                  startEditGrammar(
                                    grammar
                                  )
                                "
                              >
                                ✏️
                              </button>

                            </div>

                            <div
                              class="grammar-structure"
                              v-html="
                                formatGrammar(
                                  grammar.structure
                                )
                              "
                            ></div>

                            <div
                              class="
                                grammar-description
                              "
                            >
                              {{ grammar.description }}
                            </div>

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </template>

          <!-- EDIT -->
          <template v-else>

            <div class="edit-layout">

              <div class="edit-info-section">

                <div class="edit-card">

                  <label class="form-label">
                    Tên sách
                  </label>

                  <input
                    v-model="form.bookName"
                    class="
                      form-control
                      custom-input
                    "
                  />

                </div>

              </div>

              <div class="edit-image-section">

                <BookImageEditor
                  :book-id="book.bookId"
                  :images="book.imageUrls"
                  @update:images="
                    book.imageUrls = $event
                  "
                />

              </div>

            </div>

          </template>

        </div>

      </div>

    </div>

  </div>

  <!-- BACKDROP -->
  <div
    class="
      modal-backdrop
      fade
      show
    "
  ></div>

</template>

<style scoped>

.custom-modal {
  border: none;
  border-radius: 24px;
  overflow: hidden;
}

.custom-header {
  padding: 22px 26px;
  border-bottom: 1px solid #f1f3f5;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;

  margin-left: auto;
}

.sub-title {
  font-size: 13px;
  color: #6b7280;
}

.edit-btn,
.save-btn,
.cancel-btn {
  border: none;
  border-radius: 14px;

  padding: 10px 16px;

  font-weight: 600;
}

.edit-btn {
  background: #0d6efd;
  color: white;
}

.save-btn {
  background: #16a34a;
  color: white;
}

.cancel-btn {
  background: #eef1f4;
}

.image-card {
  background: #f8fafc;
  border-radius: 18px;
  padding: 14px;
}

.main-image {
  width: 100%;
  height: 420px;
  object-fit: cover;
  border-radius: 16px;
}

.info-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.info-card {
  background: #f8fafc;
  border-radius: 18px;
  padding: 18px;
}

.info-label {
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 10px;
}

.info-value {
  font-size: 17px;
  font-weight: 600;
}

.lesson-count {
  background: #dbeafe;
  color: #1d4ed8;

  padding: 6px 12px;

  border-radius: 999px;

  font-size: 12px;
  font-weight: 700;
}

/* TREE */

.lesson-tree {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lesson-node {
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  overflow: hidden;

  background: white;
}

.lesson-header {
  padding: 18px 20px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  cursor: pointer;

  transition: 0.2s;
}

.lesson-header:hover {
  background: #f8fafc;
}

.lesson-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lesson-arrow {
  transition: 0.2s;
  font-size: 14px;
}

.lesson-arrow.expanded {
  transform: rotate(90deg);
}

.lesson-title {
  font-size: 16px;
  font-weight: 700;
}

.lesson-sub {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

.lesson-badge {
  background: #dbeafe;
  color: #1d4ed8;

  padding: 6px 12px;

  border-radius: 999px;

  font-size: 12px;
  font-weight: 700;
}

.lesson-expand {
  border-top: 1px solid #edf1f5;

  padding: 20px;

  background: #f8fafc;
}

.expand-top {
  display: flex;
  justify-content: flex-end;

  margin-bottom: 18px;
}

.add-grammar-btn {
  border: none;

  background: #dbeafe;
  color: #1d4ed8;

  border-radius: 12px;

  padding: 8px 14px;

  font-size: 13px;
  font-weight: 700;
}

/* FORM */

.create-grammar-card {
  background: white;

  border-radius: 18px;

  padding: 18px;

  margin-bottom: 20px;
}

.structure-toolbar {
  display: flex;
  gap: 8px;

  margin-bottom: 10px;
}

.tool-btn {
  width: 40px;
  height: 40px;

  border: none;
  border-radius: 12px;

  background: #eef2ff;
  color: #4338ca;

  font-size: 18px;
  font-weight: 700;

  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background: #dbeafe;
}

.grammar-textarea {
  min-height: 90px !important;
}

.custom-input {
  min-height: 48px;
  border-radius: 12px;
}

.grammar-form-title {
  font-size: 16px;
  font-weight: 700;

  margin-bottom: 16px;
}

.grammar-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* GRAMMAR */

.grammar-item {
  background: white;

  border-radius: 18px;

  padding: 18px;

  border: 1px solid #edf1f5;

  margin-bottom: 16px;
}

.grammar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 12px;
}

.grammar-title {
  font-size: 16px;
  font-weight: 700;
}

.edit-grammar-btn {
  border: none;

  width: 36px;
  height: 36px;

  border-radius: 10px;

  background: #dbeafe;
}

.grammar-structure {
  background: #f8fafc;

  border: 1px dashed #c7d2fe;

  color: #4338ca;

  border-radius: 14px;

  padding: 14px;

  font-weight: 700;

  margin-bottom: 12px;

  line-height: 1.8;
}

.grammar-structure del {
  color: #9ca3af;
}

.grammar-description {
  color: #4b5563;
  line-height: 1.7;
}

.empty-grammar {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
}

/* EDIT */

.edit-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
}

.edit-info-section,
.edit-image-section {
  background: #f8fafc;
  border-radius: 20px;
  padding: 20px;
}

.edit-card {
  background: white;
  border-radius: 16px;
  padding: 18px;
}

@media (max-width: 992px) {

  .edit-layout {
    grid-template-columns: 1fr;
  }
}

</style>

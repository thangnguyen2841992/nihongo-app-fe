<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthState } from '@/services/authState'
import {
  grammarPackPdf,
  loadEnglishGrammarCurriculum,
  parseEnglishGrammarPack,
  type EnglishGrammarCurriculum,
  type EnglishGrammarPack,
} from '@/services/englishGrammarPack'
import {
  checkLocalPdf,
  createLocalAudio,
  emptyEnglishStudy,
  englishBooks,
  loadEnglishStudy,
  saveEnglishStudy,
  validateEnglishStudy,
  type EnglishBookId,
  type LocalStudyMedia,
} from '@/services/englishSelfStudy'

const { isAuthenticated, userEmail } = useAuthState()
const owner = computed(() => (isAuthenticated.value ? userEmail.value.trim().toLowerCase() : ''))
const selectedId = ref<EnglishBookId>('essential-grammar')
const book = computed(() => englishBooks.find((item) => item.id === selectedId.value)!)
const state = ref(emptyEnglishStudy())
const savedState = ref(JSON.stringify(state.value))
const entry = computed(() => state.value[selectedId.value])
const dirty = computed(() => JSON.stringify(state.value) !== savedState.value)
const message = ref('')
const error = ref('')
const storageError = ref('')
const pdfBusy = ref(false)
const readerPage = ref(1)
const audioIndex = ref(0)
const speed = ref(1)
const repeat = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)
const media = ref(emptyMedia())
const grammarPack = ref<EnglishGrammarPack | null>(null)
const builtInGuide = ref<EnglishGrammarCurriculum | null>(null)
const currentGuide = computed(() => grammarPack.value ?? builtInGuide.value)
const curriculumLoading = ref(false)
const curriculumError = ref('')
const pdfInput = ref<HTMLInputElement | null>(null)
let curriculumRequest = 0
const initialGrammarUnit = computed(
  () => Number(state.value['essential-grammar'].currentUnit.match(/^Unit\s+(\d+)/i)?.[1]) || 1,
)
const packBusy = ref(false)
let packRequest = 0
const GrammarCompanion = defineAsyncComponent(() => import('./EnglishGrammarCompanion.vue'))
const currentMedia = computed(() => media.value[selectedId.value])
const currentTrack = computed(() => currentMedia.value.tracks[audioIndex.value])
const percentage = computed(() =>
  entry.value.totalUnits > 0
    ? Math.round((entry.value.completedUnits / entry.value.totalUnits) * 100)
    : 0,
)
const pdfUrl = computed(() =>
  currentMedia.value.pdf ? `${currentMedia.value.pdf.url}#page=${readerPage.value}&view=FitH` : '',
)
const pdfRequests: Record<EnglishBookId, number> = {
  'essential-grammar': 0,
  'elementary-vocabulary': 0,
  'tree-or-three': 0,
}

function emptyMedia() {
  const empty = (): { pdf: LocalStudyMedia | null; tracks: LocalStudyMedia[] } => ({
    pdf: null,
    tracks: [],
  })
  return {
    'essential-grammar': empty(),
    'elementary-vocabulary': empty(),
    'tree-or-three': empty(),
  }
}
function releaseMedia() {
  ++curriculumRequest
  builtInGuide.value = null
  curriculumLoading.value = false
  curriculumError.value = ''
  ++packRequest
  grammarPack.value = null
  packBusy.value = false
  audioElement.value?.pause()
  for (const item of englishBooks) {
    ++pdfRequests[item.id]
    const files = media.value[item.id]
    if (files.pdf) URL.revokeObjectURL(files.pdf.url)
    files.tracks.forEach((track) => URL.revokeObjectURL(track.url))
  }
  media.value = emptyMedia()
}
watch(
  owner,
  (identity) => {
    releaseMedia()
    state.value = emptyEnglishStudy()
    error.value = ''
    message.value = ''
    storageError.value = ''
    pdfBusy.value = false
    if (identity) {
      try {
        state.value = loadEnglishStudy(identity)
      } catch (cause) {
        storageError.value =
          cause instanceof Error ? cause.message : 'Trình duyệt không cho phép đọc dữ liệu đã lưu.'
      }
    }
    savedState.value = JSON.stringify(state.value)
    readerPage.value = state.value[selectedId.value].page
    audioIndex.value = 0
    if (identity) void loadCurriculum()
  },
  { immediate: true },
)
watch(selectedId, () => {
  audioElement.value?.pause()
  readerPage.value = entry.value.page
  audioIndex.value = 0
  error.value = ''
  message.value = ''
  pdfBusy.value = false
})
watch(speed, () => {
  if (audioElement.value) audioElement.value.playbackRate = speed.value
})
onBeforeUnmount(releaseMedia)

async function loadCurriculum() {
  if (!owner.value) return
  const identity = owner.value,
    request = ++curriculumRequest
  curriculumLoading.value = true
  curriculumError.value = ''
  try {
    const guide = await loadEnglishGrammarCurriculum()
    if (identity !== owner.value || request !== curriculumRequest) return
    builtInGuide.value = guide
    if (state.value['essential-grammar'].totalUnits === 0) {
      const wasClean = !dirty.value
      state.value['essential-grammar'].totalUnits = guide.units.length
      if (wasClean) savedState.value = JSON.stringify(state.value)
    }
  } catch {
    if (identity === owner.value && request === curriculumRequest)
      curriculumError.value = 'Chưa tải được bài học Anh–Việt. Hãy kiểm tra kết nối và thử lại.'
  } finally {
    if (identity === owner.value && request === curriculumRequest) curriculumLoading.value = false
  }
}
function setGrammarUnit(unitLabel: string, page: number) {
  state.value['essential-grammar'].currentUnit = unitLabel
  state.value['essential-grammar'].page = page
}

function save() {
  error.value = ''
  message.value = ''
  if (!owner.value) return
  try {
    saveEnglishStudy(owner.value, state.value)
    savedState.value = JSON.stringify(state.value)
    storageError.value = ''
    message.value = 'Đã lưu tiến độ và ghi chú trên trình duyệt này.'
  } catch (cause) {
    error.value =
      cause instanceof Error &&
      cause.name !== 'QuotaExceededError' &&
      cause.name !== 'SecurityError'
        ? cause.message
        : 'Không lưu được trên trình duyệt này. Hãy sao chép ghi chú ra ngoài trước khi đóng trang.'
  }
}
function goToPage() {
  const validation = validateEnglishStudy({
    ...entry.value,
    completedUnits: 0,
    totalUnits: 0,
    notes: '',
    currentUnit: '',
  })
  if (validation) {
    error.value = validation
    return
  }
  error.value = ''
  readerPage.value = entry.value.page
}
async function openPdf(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !owner.value) return
  const id = selectedId.value,
    identity = owner.value,
    request = ++pdfRequests[id]
  if (id === 'essential-grammar') {
    ++packRequest
    packBusy.value = false
  }
  pdfBusy.value = true
  error.value = ''
  message.value = ''
  try {
    await checkLocalPdf(file)
    if (owner.value !== identity || request !== pdfRequests[id]) return
    const url = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }))
    const previous = media.value[id].pdf
    media.value[id].pdf = { name: file.name, url }
    if (id === 'essential-grammar') grammarPack.value = null
    if (previous) URL.revokeObjectURL(previous.url)
    if (selectedId.value === id) readerPage.value = state.value[id].page
  } catch (cause) {
    if (owner.value === identity && request === pdfRequests[id] && selectedId.value === id)
      error.value = cause instanceof Error ? cause.message : 'Không mở được PDF này.'
  } finally {
    if (owner.value === identity && request === pdfRequests[id] && selectedId.value === id)
      pdfBusy.value = false
  }
}
async function openStudyPack(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !owner.value) return
  const identity = owner.value,
    request = ++packRequest
  ++pdfRequests['essential-grammar']
  if (selectedId.value === 'essential-grammar') pdfBusy.value = false
  packBusy.value = true
  error.value = ''
  message.value = ''
  try {
    if (file.size > 64 * 1024 * 1024)
      throw new Error('Bản học tối đa 64 MB. Hãy chọn đúng gói Anh–Việt của sách.')
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Không đọc được gói học. Hãy chọn lại file.'))
      reader.readAsText(file)
    })
    if (owner.value !== identity || request !== packRequest) return
    const pack = parseEnglishGrammarPack(raw)
    const pdf = grammarPackPdf(pack)
    const url = URL.createObjectURL(pdf)
    ++pdfRequests['essential-grammar']
    const previous = media.value['essential-grammar'].pdf
    media.value['essential-grammar'].pdf = { name: pack.source.filename, url }
    if (previous) URL.revokeObjectURL(previous.url)
    grammarPack.value = pack
    selectedId.value = 'essential-grammar'
    state.value['essential-grammar'].totalUnits = 115
    state.value['essential-grammar'].completedUnits = Math.min(
      state.value['essential-grammar'].completedUnits,
      115,
    )
    const resume = pack.units.find((unit) => unit.id === initialGrammarUnit.value) ?? pack.units[0]!
    state.value['essential-grammar'].page = resume.theoryPage
    readerPage.value = resume.theoryPage
    message.value = 'Đã mở 115 bài Anh–Việt và bản PDF gốc trên trình duyệt này.'
  } catch (cause) {
    if (owner.value === identity && request === packRequest)
      error.value = cause instanceof Error ? cause.message : 'Không mở được gói học này.'
  } finally {
    if (owner.value === identity && request === packRequest) packBusy.value = false
  }
}
function openSourcePage(page: number, unitLabel: string) {
  entry.value.page = page
  entry.value.currentUnit = unitLabel
  readerPage.value = page
  document.getElementById('english-reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function openAudio(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length || !owner.value) return
  error.value = ''
  message.value = ''
  try {
    const tracks = createLocalAudio(files)
    audioElement.value?.pause()
    currentMedia.value.tracks.forEach((track) => URL.revokeObjectURL(track.url))
    currentMedia.value.tracks = tracks
    audioIndex.value = 0
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Không mở được audio này.'
  }
}
</script>

<template>
  <div v-if="owner" class="english-desk">
    <header class="desk-hero">
      <div>
        <p class="eyebrow">GÓC TỰ HỌC · ENGLISH</p>
        <h1>Mỗi ngày, một chút tiếng Anh.</h1>
        <p>Ba cuốn sách, một góc học riêng. Đọc, nghe và ghi lại những điều bạn muốn nhớ.</p>
      </div>
      <span class="device-badge"
        ><i class="bi bi-laptop" aria-hidden="true"></i>Lưu trên thiết bị này</span
      >
    </header>

    <section aria-labelledby="english-books-heading" class="book-shelf">
      <div class="section-heading">
        <h2 id="english-books-heading">Tủ sách của bạn</h2>
        <span>Chọn sách để bắt đầu</span>
      </div>
      <div class="book-grid">
        <button
          v-for="(item, index) in englishBooks"
          :key="item.id"
          type="button"
          class="book-card"
          :class="[item.color, { selected: selectedId === item.id }]"
          :aria-pressed="selectedId === item.id"
          aria-controls="english-workspace"
          @click="selectedId = item.id"
        >
          <span class="book-top"
            ><span>{{ String(index + 1).padStart(2, '0') }} / {{ item.skill }}</span
            ><i class="bi" :class="item.icon" aria-hidden="true"></i
          ></span>
          <strong>{{ item.title }}</strong
          ><span class="book-author">{{ item.author }}</span>
          <span class="book-footer"
            ><span>{{ state[item.id].currentUnit || 'Chưa chọn bài học' }}</span
            ><i
              class="bi"
              :class="selectedId === item.id ? 'bi-check-circle-fill' : 'bi-arrow-up-right'"
              aria-hidden="true"
            ></i
          ></span>
        </button>
      </div>
    </section>

    <div class="local-notice">
      <i class="bi bi-info-circle" aria-hidden="true"></i>
      <p>
        Chọn PDF/audio bạn có quyền sử dụng từ máy để học tại đây. File được mở trong trình duyệt,
        không tải lên server. Khi mở lại trang, bạn cần chọn lại file. Ghi chú và tiến độ được lưu
        theo tài khoản trên trình duyệt này, chưa đồng bộ sang thiết bị khác.
      </p>
    </div>
    <p v-if="storageError" class="feedback warning" role="alert">{{ storageError }}</p>
    <p v-if="error" class="feedback failure" role="alert">{{ error }}</p>
    <p v-if="message" class="feedback success" role="status">{{ message }}</p>

    <section v-if="selectedId === 'essential-grammar'" class="study-pack-entry">
      <div>
        <strong>Bản học Anh–Việt đã có sẵn</strong>
        <p>
          Học ngay 115 Unit với giải thích tiếng Việt, ví dụ song ngữ và câu tự kiểm tra. Nếu muốn
          đối chiếu trang sách, bạn có thể mở thêm PDF gốc từ máy.
        </p>
      </div>
      <details>
        <summary>Tuỳ chọn: nhập gói cá nhân kèm PDF</summary>
        <label class="desk-button upload-button"
          ><i class="bi bi-translate" aria-hidden="true"></i
          >{{
            packBusy
              ? 'Đang mở bản học…'
              : grammarPack
                ? 'Đổi bản học Anh–Việt'
                : 'Mở bản học Anh–Việt'
          }}<input
            type="file"
            accept=".json,application/json"
            aria-label="Chọn bản học Anh–Việt"
            :disabled="packBusy"
            @change="openStudyPack"
        /></label>
      </details>
    </section>
    <p
      v-if="selectedId === 'essential-grammar' && curriculumLoading && !currentGuide"
      role="status"
    >
      Đang tải bài học Anh–Việt…
    </p>
    <div
      v-if="selectedId === 'essential-grammar' && curriculumError && !currentGuide"
      class="feedback failure"
      role="alert"
    >
      {{ curriculumError }}
      <button type="button" class="desk-button subtle" @click="loadCurriculum">Thử lại</button>
    </div>
    <GrammarCompanion
      v-if="selectedId === 'essential-grammar' && currentGuide"
      :key="currentGuide.source.sha256"
      :pack="currentGuide"
      :initial-unit="initialGrammarUnit"
      :source-available="Boolean(currentMedia.pdf)"
      @source="openSourcePage"
      @unit-change="setGrammarUnit"
      @request-pdf="pdfInput?.click()"
    />

    <section id="english-workspace" class="workspace" aria-labelledby="active-book-heading">
      <div class="reading-column">
        <article id="english-reader" class="desk-panel reader-panel">
          <header class="panel-heading">
            <div>
              <p class="eyebrow">{{ book.skill }}</p>
              <h2 id="active-book-heading">{{ book.title }}</h2>
              <p>{{ book.description }}</p>
            </div>
          </header>
          <div class="resource-box">
            <div>
              <strong>Đọc trên nền tảng của nhà xuất bản</strong>
              <p>{{ book.resourceNote }}</p>
            </div>
            <a
              :href="book.resourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="desk-button subtle"
              >{{ book.resourceLabel }}<i class="bi bi-box-arrow-up-right" aria-hidden="true"></i
            ></a>
            <a
              v-if="'sampleUrl' in book"
              :href="book.sampleUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="sample-link"
              >Xem thử phần giới thiệu (không phải sách đầy đủ)</a
            >
          </div>
          <div class="reader-toolbar">
            <label class="desk-button upload-button"
              ><i class="bi bi-file-earmark-pdf" aria-hidden="true"></i
              >{{ pdfBusy ? 'Đang mở PDF…' : currentMedia.pdf ? 'Đổi PDF' : 'Mở PDF từ máy'
              }}<input
                :key="`pdf-${selectedId}`"
                ref="pdfInput"
                type="file"
                accept=".pdf,application/pdf"
                :disabled="pdfBusy"
                aria-label="Chọn sách PDF từ máy"
                @change="openPdf"
            /></label>
            <form class="page-jump" @submit.prevent="goToPage">
              <label for="english-page">Trang</label
              ><input
                id="english-page"
                v-model.number="entry.page"
                type="number"
                min="1"
                max="100000"
                required
              /><button type="submit" class="desk-button subtle">Đến trang</button>
            </form>
          </div>
          <template v-if="currentMedia.pdf">
            <p class="file-name">
              <i class="bi bi-file-earmark-check" aria-hidden="true"></i>{{ currentMedia.pdf.name }}
            </p>
            <object
              :key="currentMedia.pdf.url"
              :data="pdfUrl"
              type="application/pdf"
              :aria-label="`Đọc ${book.title}`"
              class="pdf-reader"
            >
              <p>
                Trình duyệt chưa hiển thị được PDF.
                <a :href="pdfUrl" target="_blank" rel="noopener noreferrer">Mở PDF ở tab mới</a>.
              </p>
            </object>
            <a
              :href="pdfUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="sample-link reader-fallback"
              >Mở PDF ở tab mới nếu không xem được tại đây
              <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i
            ></a>
          </template>
          <div v-else class="reader-empty">
            <span class="empty-icon"><i class="bi bi-book" aria-hidden="true"></i></span>
            <h3>Góc đọc sách đang chờ bạn</h3>
            <p>
              Chưa có PDF trong phiên học này. Bạn có thể mở eBook chính thức ở trên và ghi chú ngay
              bên cạnh.
            </p>
          </div>
        </article>

        <article class="desk-panel audio-panel" aria-labelledby="english-audio-heading">
          <div class="section-heading">
            <h2 id="english-audio-heading">
              <i class="bi bi-headphones" aria-hidden="true"></i>Góc luyện nghe
            </h2>
            <label class="desk-button subtle upload-button"
              >Chọn audio<input
                :key="`audio-${selectedId}`"
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,.opus"
                multiple
                aria-label="Chọn các file audio từ máy"
                @change="openAudio"
            /></label>
          </div>
          <template v-if="currentTrack">
            <label class="field-label" for="english-track"
              >Bản ghi ({{ currentMedia.tracks.length }})</label
            >
            <select id="english-track" v-model.number="audioIndex">
              <option v-for="(track, index) in currentMedia.tracks" :key="track.url" :value="index">
                {{ track.name }}
              </option>
            </select>
            <audio
              :key="currentTrack.url"
              ref="audioElement"
              :src="currentTrack.url"
              controls
              preload="metadata"
              :loop="repeat"
              :aria-label="currentTrack.name"
              @loadedmetadata="audioElement && (audioElement.playbackRate = speed)"
              @error="error = 'Trình duyệt không đọc được bản ghi này. Hãy thử file MP3 hoặc WAV.'"
            ></audio>
            <div class="audio-options">
              <label
                >Tốc độ
                <select v-model.number="speed" aria-label="Tốc độ nghe">
                  <option :value="0.75">0.75×</option>
                  <option :value="1">1×</option>
                  <option :value="1.25">1.25×</option>
                  <option :value="1.5">1.5×</option>
                </select></label
              ><label><input v-model="repeat" type="checkbox" /> Lặp lại bản ghi</label>
            </div>
          </template>
          <p v-else class="audio-empty">
            Chọn một hoặc nhiều file audio đi kèm sách. Nghe từng đoạn và đọc theo ở tốc độ bạn thấy
            thoải mái.
          </p>
        </article>
      </div>

      <aside class="notes-column">
        <form class="desk-panel notebook-panel" @submit.prevent="save">
          <div class="section-heading">
            <h2><i class="bi bi-journal-bookmark" aria-hidden="true"></i>Sổ tay học tập</h2>
            <span v-if="dirty" class="unsaved">Chưa lưu</span>
          </div>
          <p class="notebook-subtitle">Ghi chú cho {{ book.title }}</p>
          <label class="field-label" for="english-unit">Bài đang học</label
          ><input
            id="english-unit"
            v-model="entry.currentUnit"
            type="text"
            maxlength="200"
            placeholder="Ví dụ: Unit 1 — bài mở đầu"
          />
          <div class="progress-inputs">
            <div>
              <label class="field-label" for="english-completed">Số bài đã học</label
              ><input
                id="english-completed"
                v-model.number="entry.completedUnits"
                type="number"
                min="0"
                max="100000"
                required
              />
            </div>
            <div>
              <label class="field-label" for="english-total">Tổng số bài</label
              ><input
                id="english-total"
                v-model.number="entry.totalUnits"
                type="number"
                min="0"
                max="100000"
                required
              />
            </div>
          </div>
          <p class="field-hint">Đặt tổng số bài theo phiên bản sách bạn dùng. Để 0 nếu chưa rõ.</p>
          <template v-if="entry.totalUnits > 0"
            ><div class="progress-caption">
              <span>{{ entry.completedUnits }} / {{ entry.totalUnits }} bài</span
              ><strong>{{ percentage }}%</strong>
            </div>
            <progress
              :value="entry.completedUnits"
              :max="entry.totalUnits"
              aria-label="Tiến độ học sách"
            ></progress
          ></template>
          <label class="field-label notes-label" for="english-notes">Điều mình muốn nhớ</label
          ><textarea
            id="english-notes"
            v-model="entry.notes"
            rows="10"
            maxlength="20000"
            :placeholder="book.notePrompt"
          ></textarea>
          <div class="notes-footer">
            <span>{{ entry.notes.length.toLocaleString('vi-VN') }} / 20.000 ký tự</span
            ><span>Trang {{ entry.page || '—' }}</span>
          </div>
          <button type="submit" class="desk-button save-button">
            <i class="bi bi-bookmark-check" aria-hidden="true"></i>Lưu tiến độ và ghi chú
          </button>
          <p class="save-hint">
            Lưu cho cả ba cuốn trên trình duyệt này. Sao chép ghi chú quan trọng trước khi xóa dữ
            liệu trình duyệt.
          </p>
        </form>
        <section class="study-tip" aria-labelledby="english-tip-heading">
          <p class="eyebrow">MỘT BUỔI HỌC NHỎ</p>
          <h2 id="english-tip-heading">15 phút, tập trung một việc.</h2>
          <ol>
            <li v-for="step in book.studySteps" :key="step">{{ step }}</li>
          </ol>
        </section>
      </aside>
    </section>
  </div>
  <div v-else class="signed-out">
    <h1>Tiếng Anh cá nhân</h1>
    <p>Đăng nhập để mở góc học và ghi chú của bạn.</p>
    <RouterLink to="/login?redirect=/user/english">Đăng nhập</RouterLink>
  </div>
</template>

<style scoped src="./englishSelfStudy.css"></style>

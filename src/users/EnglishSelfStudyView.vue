<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useAuthState } from '@/services/authState'
import { EnglishStudyConflict, fetchRemoteStudy, pushRemoteStudy } from '@/services/englishStudySync'
import { forgetFiles, localFilesSupported, recallFiles, rememberFiles } from '@/services/localFileStore'
import {
  withoutEmbeddedPdf,
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
  isEmptyStudy,
  loadEnglishStudy,
  loadSyncMeta,
  mergeStudy,
  normalizeRecord,
  saveEnglishStudy,
  saveSyncMeta,
  type EnglishStudyRecord,
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
// One area at a time (lesson, reading/listening, notebook). On wide screens the notebook stays beside the active area,
// so the "notes" pane only matters on narrow screens.
type Pane = 'lesson' | 'read' | 'notes'
const hasLesson = computed(() => selectedId.value === 'essential-grammar')
const pane = ref<Pane>('lesson')
let curriculumRequest = 0
const initialGrammarUnit = computed(
  () => Number(state.value['essential-grammar'].currentUnit.match(/^Unit\s+(\d+)/i)?.[1]) || 1,
)
const packBusy = ref(false)
let packRequest = 0
const GrammarCompanion = defineAsyncComponent(() => import('./EnglishGrammarCompanion.vue'))
const EnglishPronunciationPanel = defineAsyncComponent(() => import('./EnglishPronunciationPanel.vue'))
// Starter items for the pronunciation panel; learners can type any word or sentence instead.
const PRACTICE_WORDS: Record<EnglishBookId, string[]> = {
  'essential-grammar': ['My sister is a nurse.', "I've been living here since 2020.", "She doesn't like coffee."],
  'elementary-vocabulary': ['vegetable', 'comfortable', 'Wednesday', 'clothes', 'breakfast'],
  'tree-or-three': ['tree / three', 'ship / sheep', 'live / leave', 'thin / sin', 'very / berry', 'light / right'],
}
const practiceWords = computed(() => PRACTICE_WORDS[selectedId.value])
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

// ---------------------------------------------------------------------------------------------------------------
// Autosave and sync. Edits are written to this browser one second after typing stops (and immediately when leaving
// the page); the server copy follows shortly after so the notebook is available on other devices. Two devices that
// edited at the same time are merged (notes from both are kept) instead of one overwriting the other.
type SyncState = 'idle' | 'syncing' | 'synced' | 'pending' | 'offline'
const syncState = ref<SyncState>('idle')
const AUTOSAVE_MS = 1000
const PUSH_MS = 1500
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let pushing: Promise<void> | null = null
const syncIcon = computed(() => ({
  idle: '',
  syncing: 'bi-arrow-repeat',
  synced: 'bi-cloud-check',
  pending: 'bi-hdd',
  offline: 'bi-cloud-slash',
})[syncState.value])
function bookProgress(id: EnglishBookId): string {
  const item = state.value[id]
  if (id === 'essential-grammar' && item.doneUnits.length) return `Đã học ${item.doneUnits.length}/115 Unit`
  if (item.totalUnits > 0) return `${item.completedUnits}/${item.totalUnits} bài`
  return item.currentUnit || 'Chưa bắt đầu'
}
const syncLabel = computed(() => ({
  idle: '',
  syncing: 'Đang đồng bộ…',
  synced: 'Đã lưu và đồng bộ',
  pending: 'Đã lưu trên máy, chờ đồng bộ',
  offline: 'Đã lưu trên máy · chưa đồng bộ được, sẽ thử lại',
})[syncState.value])

function persistLocal(identity: string): boolean {
  if (!identity) return false
  try {
    saveEnglishStudy(identity, state.value)
    savedState.value = JSON.stringify(state.value)
    storageError.value = ''
    saveSyncMeta(identity, { ...loadSyncMeta(identity), pending: true })
    if (syncState.value !== 'syncing') syncState.value = 'pending'
    schedulePush()
    return true
  } catch (cause) {
    error.value =
      cause instanceof Error && cause.name !== 'QuotaExceededError' && cause.name !== 'SecurityError'
        ? cause.message
        : 'Không lưu được trên trình duyệt này. Hãy sao chép ghi chú ra ngoài trước khi đóng trang.'
    return false
  }
}
function flushLocal(identity = owner.value) {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = null
  if (identity && dirty.value) {
    try { persistLocal(identity) } catch { /* reported by persistLocal */ }
  }
}
function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null
    if (owner.value && dirty.value && !validateAll()) persistLocal(owner.value)
  }, AUTOSAVE_MS)
}
function validateAll() {
  for (const item of englishBooks) {
    if (validateEnglishStudy(state.value[item.id])) return true
  }
  return false
}
function schedulePush(delay = PUSH_MS) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { pushTimer = null; void push() }, delay)
}
function applyRecord(identity: string, record: EnglishStudyRecord, version: number, pending: boolean) {
  if (identity !== owner.value) return
  state.value = record
  try {
    saveEnglishStudy(identity, record)
    savedState.value = JSON.stringify(state.value)
  } catch { /* keep the merged copy in memory; the next autosave retries */ }
  saveSyncMeta(identity, { version, pending })
}
async function push(attempt = 0): Promise<void> {
  const identity = owner.value
  if (!identity) return
  if (pushing && attempt === 0) { await pushing; return }
  const meta = loadSyncMeta(identity)
  if (!meta.pending) return
  syncState.value = 'syncing'
  const snapshot = normalizeRecord(JSON.parse(JSON.stringify(state.value)))
  const run = (async () => {
    try {
      const saved = await pushRemoteStudy(meta.version, snapshot)
      if (identity !== owner.value) return
      const changedMeanwhile = JSON.stringify(normalizeRecord(state.value)) !== JSON.stringify(snapshot)
      saveSyncMeta(identity, { version: saved.version, pending: changedMeanwhile })
      syncState.value = changedMeanwhile ? 'pending' : 'synced'
      if (changedMeanwhile) schedulePush()
    } catch (cause) {
      if (identity !== owner.value) return
      if (cause instanceof EnglishStudyConflict && attempt < 2) {
        const remote = cause.current
        if (remote) applyRecord(identity, mergeStudy(normalizeRecord(state.value), remote.data), remote.version, true)
        else saveSyncMeta(identity, { version: 0, pending: true })
        pushing = null
        await push(attempt + 1)
        return
      }
      syncState.value = 'offline'
    }
  })()
  if (attempt === 0) pushing = run.finally(() => { pushing = null })
  await run
}
async function syncFromServer(identity: string) {
  syncState.value = 'syncing'
  try {
    const remote = await fetchRemoteStudy()
    if (identity !== owner.value) return
    const meta = loadSyncMeta(identity)
    const local = normalizeRecord(state.value)
    if (!remote) {
      if (meta.pending || !isEmptyStudy(local)) {
        saveSyncMeta(identity, { version: 0, pending: true })
        await push()
      } else syncState.value = 'synced'
      return
    }
    if (remote.version === meta.version) {
      if (meta.pending || dirty.value) await push()
      else syncState.value = 'synced'
      return
    }
    if (!meta.pending && !dirty.value) {
      applyRecord(identity, remote.data, remote.version, false)
      syncState.value = 'synced'
      return
    }
    applyRecord(identity, mergeStudy(local, remote.data), remote.version, true)
    message.value = 'Đã gộp ghi chú với bản trên thiết bị khác.'
    await push()
  } catch {
    if (identity === owner.value) syncState.value = 'offline'
  }
}
function retrySync() {
  if (owner.value && loadSyncMeta(owner.value).pending) void push()
}
function leavePage() {
  flushLocal()
  void push()
}
function onVisibility() {
  if (document.visibilityState === 'hidden') leavePage()
  else retrySync()
}
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', leavePage)
  window.addEventListener('online', retrySync)
})
onBeforeRouteLeave(() => { leavePage() })

// ---------------------------------------------------------------------------------------------------------------
// Remembering PDF/audio on this device (IndexedDB), only when the learner turns it on.
const canRememberFiles = localFilesSupported()
const rememberFilesOn = ref(false)
const rememberKey = (identity: string) => `english-remember-files:${identity}`
const fileKey = (identity: string, id: EnglishBookId, kind: 'pdf' | 'audio') => `${identity}|${id}|${kind}`
function readRememberPreference(identity: string) {
  try { return localStorage.getItem(rememberKey(identity)) === '1' } catch { return false }
}
async function storeFiles(identity: string, id: EnglishBookId, kind: 'pdf' | 'audio', files: LocalStudyMedia[]) {
  if (!canRememberFiles || !rememberFilesOn.value || identity !== owner.value) return
  const stored = files.filter((file) => file.blob).map((file) => ({ name: file.name, blob: file.blob! }))
  try {
    await rememberFiles(fileKey(identity, id, kind), stored)
  } catch {
    if (identity === owner.value) error.value = 'Không ghi nhớ được file trên máy này (bộ nhớ trình duyệt có thể đã đầy).'
  }
}
async function restoreFiles(identity: string) {
  if (!canRememberFiles || !rememberFilesOn.value) return
  for (const item of englishBooks) {
    const request = pdfRequests[item.id]
    try {
      const [pdf] = await recallFiles(fileKey(identity, item.id, 'pdf'))
      const tracks = await recallFiles(fileKey(identity, item.id, 'audio'))
      if (identity !== owner.value || request !== pdfRequests[item.id]) continue
      const files = media.value[item.id]
      if (pdf && !files.pdf) files.pdf = { name: pdf.name, url: URL.createObjectURL(pdf.blob), blob: pdf.blob }
      if (tracks.length && !files.tracks.length)
        files.tracks = tracks.map((track) => ({ name: track.name, url: URL.createObjectURL(track.blob), blob: track.blob }))
    } catch { /* nothing remembered for this book */ }
  }
  if (identity === owner.value) readerPage.value = entry.value.page
}
async function toggleRememberFiles() {
  const identity = owner.value
  if (!identity || !canRememberFiles) return
  const next = !rememberFilesOn.value
  rememberFilesOn.value = next
  try { localStorage.setItem(rememberKey(identity), next ? '1' : '0') } catch { /* preference only */ }
  if (next) {
    for (const item of englishBooks) {
      const files = media.value[item.id]
      if (files.pdf) await storeFiles(identity, item.id, 'pdf', [files.pdf])
      if (files.tracks.length) await storeFiles(identity, item.id, 'audio', files.tracks)
    }
    message.value = 'Sẽ ghi nhớ PDF và audio trên máy này, lần sau không cần chọn lại.'
  } else {
    try { await forgetFiles(`${identity}|`) } catch { /* already gone */ }
    message.value = 'Đã xóa các file đã ghi nhớ trên máy này.'
  }
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
  (identity, previous) => {
    if (previous) flushLocal(previous)
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = null
    pushing = null
    syncState.value = 'idle'
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
    rememberFilesOn.value = identity ? canRememberFiles && readRememberPreference(identity) : false
    if (identity) {
      void syncFromServer(identity)
      void restoreFiles(identity)
    }
  },
  { immediate: true },
)
watch(state, () => { if (owner.value && dirty.value) scheduleAutosave() }, { deep: true })
watch(selectedId, () => {
  pane.value = hasLesson.value ? 'lesson' : pane.value === 'notes' ? 'notes' : 'read'
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
onBeforeUnmount(() => {
  flushLocal()
  void push()
  if (pushTimer) clearTimeout(pushTimer)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', leavePage)
  window.removeEventListener('online', retrySync)
  releaseMedia()
})

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
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = null
  if (persistLocal(owner.value)) {
    message.value = 'Đã lưu tiến độ và ghi chú.'
    schedulePush(0)
  }
}
function toggleDone(unitId: number) {
  const grammar = state.value['essential-grammar']
  const done = new Set(grammar.doneUnits)
  if (done.has(unitId)) done.delete(unitId)
  else done.add(unitId)
  grammar.doneUnits = [...done].sort((a, b) => a - b)
  grammar.completedUnits = grammar.totalUnits ? Math.min(done.size, grammar.totalUnits) : done.size
}
function recordQuiz(unitId: number, correct: boolean) {
  state.value['essential-grammar'].quiz = { ...state.value['essential-grammar'].quiz, [String(unitId)]: correct }
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
    media.value[id].pdf = { name: file.name, url, blob: file }
    void storeFiles(identity, id, 'pdf', [media.value[id].pdf!])
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
    const parsed = parseEnglishGrammarPack(raw)
    const pdf = grammarPackPdf(parsed)
    // Keep only the lessons in memory: the embedded PDF text (tens of MB) is no longer needed once decoded.
    const pack = withoutEmbeddedPdf(parsed)
    const url = URL.createObjectURL(pdf)
    ++pdfRequests['essential-grammar']
    const previous = media.value['essential-grammar'].pdf
    media.value['essential-grammar'].pdf = { name: pack.source.filename, url, blob: pdf }
    void storeFiles(identity, 'essential-grammar', 'pdf', [media.value['essential-grammar'].pdf!])
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
  pane.value = 'read'
  void nextTick(() =>
    document.getElementById('english-reader')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
  )
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
    void storeFiles(owner.value, selectedId.value, 'audio', tracks)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Không mở được audio này.'
  }
}
</script>

<template>
  <div v-if="owner" class="english-desk">
    <header class="desk-head">
      <div>
        <p class="eyebrow">Góc tự học · English</p>
        <h1>Tiếng Anh cá nhân</h1>
      </div>
      <span v-if="dirty" class="unsaved head-state">Chưa lưu</span>
      <span v-else-if="syncLabel" class="sync-state head-state" :class="syncState" aria-live="polite"
        ><i class="bi" :class="syncIcon" aria-hidden="true"></i>{{ syncLabel }}</span
      >
    </header>

    <nav aria-label="Chọn sách" class="book-grid">
      <button
        v-for="item in englishBooks"
        :key="item.id"
        type="button"
        class="book-card"
        :class="[item.color, { selected: selectedId === item.id }]"
        :aria-pressed="selectedId === item.id"
        aria-controls="english-workspace"
        @click="selectedId = item.id"
      >
        <span class="book-icon"><i class="bi" :class="item.icon" aria-hidden="true"></i></span>
        <span class="book-text">
          <span class="book-skill">{{ item.skill }}</span>
          <strong>{{ item.title }}</strong>
          <span class="book-progress">{{ bookProgress(item.id) }}</span>
        </span>
      </button>
    </nav>

    <p v-if="storageError" class="feedback warning" role="alert">{{ storageError }}</p>
    <p v-if="error" class="feedback failure" role="alert">{{ error }}</p>
    <p v-if="message" class="feedback success" role="status">{{ message }}</p>

    <div class="pane-tabs" role="group" aria-label="Khu vực học">
      <button
        v-if="hasLesson"
        type="button"
        class="pane-tab"
        :aria-pressed="pane === 'lesson'"
        @click="pane = 'lesson'"
      >
        <i class="bi bi-mortarboard" aria-hidden="true"></i>Bài học
      </button>
      <button type="button" class="pane-tab" :aria-pressed="pane === 'read'" @click="pane = 'read'">
        <i class="bi bi-book" aria-hidden="true"></i>Đọc &amp; nghe
      </button>
      <button
        type="button"
        class="pane-tab notes-tab"
        :aria-pressed="pane === 'notes'"
        @click="pane = 'notes'"
      >
        <i class="bi bi-journal-bookmark" aria-hidden="true"></i>Sổ tay<span v-if="dirty" class="tab-dot"
          ><span class="visually-hidden"> (chưa lưu)</span></span
        >
      </button>
    </div>

    <section
      id="english-workspace"
      class="workspace"
      :class="`pane-${pane}`"
      aria-labelledby="active-book-heading"
    >
      <h2 id="active-book-heading" class="visually-hidden">{{ book.title }}</h2>
      <div class="main-column">
        <div v-if="hasLesson" class="pane lesson-pane" :class="{ hidden: pane !== 'lesson' }">
          <p v-if="curriculumLoading && !currentGuide" class="pane-loading" role="status">
            Đang tải bài học Anh–Việt…
          </p>
          <div v-if="curriculumError && !currentGuide" class="feedback failure" role="alert">
            {{ curriculumError }}
            <button type="button" class="desk-button subtle" @click="loadCurriculum">Thử lại</button>
          </div>
          <GrammarCompanion
            v-if="currentGuide"
            :key="currentGuide.source.sha256"
            :pack="currentGuide"
            :initial-unit="initialGrammarUnit"
            :source-available="Boolean(currentMedia.pdf)"
            :done-units="state['essential-grammar'].doneUnits"
            :quiz="state['essential-grammar'].quiz"
            @toggle-done="toggleDone"
            @quiz-result="recordQuiz"
            @source="openSourcePage"
            @unit-change="setGrammarUnit"
            @request-pdf="pdfInput?.click()"
          />
          <details class="study-pack-entry">
            <summary>Tuỳ chọn nâng cao: nhập gói học cá nhân (JSON kèm PDF)</summary>
            <p>
              Bản Anh–Việt 115 Unit ở trên đã có sẵn. Chỉ cần dùng mục này nếu bạn có gói học riêng.
            </p>
            <label class="desk-button subtle upload-button"
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
        </div>

        <div class="pane read-pane" :class="{ hidden: pane !== 'read' }">
          <article id="english-reader" class="desk-panel reader-panel">
            <header class="panel-heading">
              <div>
                <p class="eyebrow">{{ book.skill }} · {{ book.author }}</p>
                <h3>{{ book.title }}</h3>
                <p>{{ book.description }}</p>
                <p class="resource-note">{{ book.resourceNote }}</p>
              </div>
              <a
                :href="book.resourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="desk-button subtle"
                >{{ book.resourceLabel }}<i class="bi bi-box-arrow-up-right" aria-hidden="true"></i
              ></a>
            </header>
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
                /><button type="submit" class="desk-button subtle">Đến</button>
              </form>
              <a
                v-if="'sampleUrl' in book"
                :href="book.sampleUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="sample-link"
                >Xem thử phần giới thiệu (không phải sách đầy đủ)</a
              >
            </div>
            <p class="local-notice">
              <i class="bi bi-shield-lock" aria-hidden="true"></i>
              <span
                >Chọn PDF/audio bạn có quyền sử dụng. File mở ngay trong trình duyệt, không tải lên
                server; chỉ ghi chú và tiến độ được đồng bộ theo tài khoản.</span
              >
              <label v-if="canRememberFiles" class="remember-files"
                ><input type="checkbox" :checked="rememberFilesOn" @change="toggleRememberFiles" />
                Ghi nhớ file trên máy này (đừng bật trên máy dùng chung)</label
              >
            </p>
            <template v-if="currentMedia.pdf">
              <p class="file-name">
                <i class="bi bi-file-earmark-check" aria-hidden="true"></i
                ><span>{{ currentMedia.pdf.name }}</span>
                <a :href="pdfUrl" target="_blank" rel="noopener noreferrer" class="sample-link"
                  >Mở ở tab mới <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i
                ></a>
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
            </template>
            <div v-else class="reader-empty">
              <i class="bi bi-book" aria-hidden="true"></i>
              <p>
                Chưa mở PDF. Bạn có thể đọc eBook chính thức qua nút ở trên và ghi chú trong sổ tay.
              </p>
            </div>
          </article>

          <article class="desk-panel audio-panel" aria-labelledby="english-audio-heading">
            <div class="section-heading">
              <h3 id="english-audio-heading">
                <i class="bi bi-headphones" aria-hidden="true"></i>Luyện nghe
              </h3>
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
                ><label><input v-model="repeat" type="checkbox" /> Lặp lại</label>
              </div>
            </template>
            <p v-else class="audio-empty">
              Chọn một hoặc nhiều file audio đi kèm sách, nghe từng đoạn và đọc theo.
            </p>
          </article>

          <EnglishPronunciationPanel :key="`pronounce-${selectedId}`" :suggestions="practiceWords" />

          <section class="study-tip" aria-labelledby="english-tip-heading">
            <h3 id="english-tip-heading">
              <i class="bi bi-stopwatch" aria-hidden="true"></i>Một buổi học 15 phút
            </h3>
            <ol>
              <li v-for="step in book.studySteps" :key="step">{{ step }}</li>
            </ol>
          </section>
        </div>
      </div>

      <aside class="notes-column" :class="{ 'hidden-narrow': pane !== 'notes' }">
        <form class="desk-panel notebook-panel" @submit.prevent="save">
          <div class="section-heading">
            <h3><i class="bi bi-journal-bookmark" aria-hidden="true"></i>Sổ tay</h3>
            <span class="notebook-subtitle">{{ book.title }}</span>
          </div>
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
              <label class="field-label" for="english-completed">Đã học</label
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
                title="Theo phiên bản sách bạn dùng. Để 0 nếu chưa rõ."
              />
            </div>
          </div>
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
            <span>{{ entry.notes.length.toLocaleString('vi-VN') }} / 20.000</span
            ><span>Trang {{ entry.page || '—' }}</span>
          </div>
          <button type="submit" class="desk-button save-button">
            <i class="bi bi-cloud-check" aria-hidden="true"></i>Lưu &amp; đồng bộ ngay
          </button>
          <p class="save-hint">Sổ tay tự lưu khi bạn gõ.</p>
        </form>
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

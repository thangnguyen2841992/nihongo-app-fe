<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import { importedAudioUrl, importStateLabel, type ImportContent, type ImportDetail, type ImportLesson, type ImportSummary, type ImportQuestion, type QuestionSuggestion } from '@/services/bookImport'

const endpoint = '/api/staff/book-imports'
const route = useRoute(), router = useRouter()
const sessions = ref<ImportSummary[]>([])
const detail = ref<ImportDetail | null>(null)
const content = ref<ImportContent | null>(null)
const levels = ref<{ levelId: number; levelName: string }[]>([])
const types = ref<{ typeId: number; typeName: string }[]>([])
const bookName = ref(''), levelId = ref<number | ''>(''), typeId = ref<number | ''>('')
const pdf = ref<File | null>(null)
const automatic = ref(true), initialAudio = ref<File[]>([]), editing = ref(false), geminiConfigured = ref<boolean | null>(null)
const initialAudioInput = ref<HTMLInputElement | null>(null)
const onlyProblems = ref(false)
const busy = ref(false), loading = ref(false), uploadPercent = ref(0)
const error = ref(''), notice = ref(''), dirty = ref(false), reviewed = ref(false)
const selectedPart = ref(0), pageNumber = ref(1), firstPage = ref(1), lastPage = ref(1)
const pageImage = ref(''), imageError = ref('')
const tab = ref('reading')
const assistantSourcePage = ref(1), assistantAnswerPage = ref<number | ''>('')
const suggestion = ref<{ lessonIndex: number; questionIndex: number; snapshot: string; result: QuestionSuggestion } | null>(null)
const aiQuestion = ref<number | null>(null)
const lesson = computed(() => content.value?.lessons[selectedPart.value])
const processing = computed(() => ['QUEUED', 'PROCESSING', 'ANALYZING'].includes(detail.value?.summary.state ?? ''))
const incompleteAi = computed(() => detail.value?.summary.autoMode === 'AUTO' && !detail.value.summary.aiCompleted)
const published = computed(() => detail.value?.summary.state === 'IMPORTED')
const stats = computed(() => ({ grammars: content.value?.lessons.reduce((n,l) => n+l.grammars.length,0) ?? 0, questions: content.value?.lessons.reduce((n,l) => n+l.exercises.length,0) ?? 0 }))
const issues = computed(() => content.value?.lessons.map(l => {
  const problems: string[] = []
  if (!l.name.trim()) problems.push('Thiếu tên bài')
  if (!l.reading.trim() && !l.grammars.length && !l.exercises.length) problems.push('Thiếu nội dung học')
  if (l.name.length>180 || l.description.length>255) problems.push('Tên bài hoặc mô tả quá dài')
  if (l.grammars.some(g => !g.title.trim() || !g.description.trim() || !g.examples.length || g.examples.some(e => !e.nihongo.trim() || !e.vietnamese.trim()))) problems.push('Ngữ pháp hoặc bản dịch ví dụ chưa đủ')
  const missing = l.exercises.filter(q => !q.groupName.trim() || !q.contentNihongo.trim() || !['A','B','C','D'].includes(q.correctAnswer) || !([q.answerA,q.answerB,q.answerC,q.answerD]['ABCD'.indexOf(q.correctAnswer)] ?? '').trim() || [q.answerA,q.answerB,q.answerC,q.answerD].filter(v=>v.trim()).length<2).length
  if (missing) problems.push(`${missing} câu cần đối chiếu đáp án/lựa chọn`)
  return problems
}) ?? [])
const problemCount = computed(() => issues.value.filter(p=>p.length).length)
function readable(text: string) {
  const plain = text.replace(/<rt>[\s\S]*?<\/rt>/gi, '').replace(/<\/(?:p|div|li)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  return new DOMParser().parseFromString(plain.replace(/</g, '&lt;'), 'text/html').body.textContent ?? ''
}
function editPart(index: number, section = 'reading') { selectedPart.value=index; tab.value=section; editing.value=true; if(content.value?.lessons[index]) {pageNumber.value=content.value.lessons[index]!.firstPage; assistantSourcePage.value=pageNumber.value; void loadImage()} }
const pageText = computed(() => detail.value?.pages.find(p => p.number === pageNumber.value)?.text ?? '')
let disposed = false, openRequest = 0, imageRequest = 0, timer: ReturnType<typeof setTimeout> | undefined, imageAbort: AbortController | undefined
const message = (e: any, fallback: string) => typeof e.response?.data?.message === 'string' ? e.response.data.message : fallback
function changed(event?: Event) {
  if (event?.target instanceof HTMLElement && event.target.closest('.book-audio')) return
  dirty.value = true; reviewed.value = false; notice.value = ''
}
function audioUrl(id: string) { return detail.value ? importedAudioUrl(`${endpoint}/${detail.value.summary.id}/audio/${id}`) : undefined }
function apply(data: ImportDetail) {
  suggestion.value = null
  detail.value = data; content.value = structuredClone(data.content); editing.value = data.summary.autoMode !== 'AUTO'; dirty.value = false; reviewed.value = data.summary.state === 'READY'
  selectedPart.value = Math.min(selectedPart.value, Math.max(0, data.content.lessons.length - 1))
  if(data.summary.autoMode === 'AUTO' && data.content.lessons.length) pageNumber.value=data.content.lessons[selectedPart.value]!.firstPage
}
async function loadList() {
  const { data } = await gatewayUrl.get<ImportSummary[]>(endpoint)
  if (!disposed) sessions.value = data
}
function canLeave() { return !dirty.value || window.confirm('Bản nháp chưa lưu. Bạn muốn rời màn hình này?') }
async function open(id: string) {
  if (busy.value || !canLeave()) return
  const request = ++openRequest; loading.value = true; error.value = ''; notice.value = ''; selectedPart.value = 0
  try {
    const { data } = await gatewayUrl.get<ImportDetail>(`${endpoint}/${id}`)
    if (disposed || request !== openRequest) return
    apply(data); pageNumber.value = data.content.lessons[0]?.firstPage ?? data.pages[0]?.number ?? 1; firstPage.value = pageNumber.value; lastPage.value = pageNumber.value
    await router.replace({ query: { ...route.query, id } }); await loadImage(); schedulePoll()
  } catch (e) { if (!disposed && request === openRequest) error.value = message(e, 'Chưa mở được bản nháp. Hãy kiểm tra dịch vụ quản lý sách.') }
  finally { if (request === openRequest) loading.value = false }
}
function choosePdf(event: Event) {
  pdf.value = (event.target as HTMLInputElement).files?.[0] ?? null
  if (pdf.value) {
    bookName.value = pdf.value.name.replace(/\.pdf$/i, '').replace(/_/g, ' ')
    const match = pdf.value.name.match(/n([1-5])/i), level = levels.value.find(l => l.levelName.toUpperCase() === `N${match?.[1]}`)
    if(level) levelId.value=level.levelId
    const type = types.value.find(t => /ngữ.*pháp/i.test(t.typeName)); if(type && /try/i.test(pdf.value.name)) typeId.value=type.typeId
  }
}
async function create() {
  if (busy.value || !pdf.value || !bookName.value.trim() || !levelId.value || !typeId.value || !canLeave()) return
  if (initialAudio.value.some(f=>f.size>40*1024*1024)) {error.value='Mỗi file nghe tối đa 40 MB.';return}
  if (pdf.value.size > 100 * 1024 * 1024) { error.value = 'PDF tối đa 100 MB.'; return }
  busy.value = true; error.value = ''; uploadPercent.value = 0
  let received=false
  const form = new FormData(); form.append('pdf', pdf.value); form.append('bookName', bookName.value.trim()); form.append('levelId', String(levelId.value)); form.append('typeId', String(typeId.value)); form.append('automatic', String(automatic.value))
  try {
    const { data } = await gatewayUrl.post<ImportDetail>(endpoint, form, { timeout: 180_000, onUploadProgress: e => { if (e.total) uploadPercent.value = Math.round(e.loaded / e.total * 100) } })
    if (disposed) return
    received=true; selectedPart.value=0; apply(data)
    for (let start=0;data.summary.state !== 'IMPORTED' && start<initialAudio.value.length;start+=5) {
      const audio = new FormData(); initialAudio.value.slice(start,start+5).forEach(file=>audio.append('files',file))
      const response = await gatewayUrl.post<ImportDetail>(`${endpoint}/${data.summary.id}/audio`,audio,{timeout:180_000}); if(disposed) return; apply(response.data)
    }
    initialAudio.value=[]; if(initialAudioInput.value) initialAudioInput.value.value=''
    pageNumber.value = content.value?.lessons[selectedPart.value]?.firstPage ?? 1; firstPage.value = pageNumber.value; lastPage.value = pageNumber.value
    await router.replace({ query: { ...route.query, id: data.summary.id } }); await loadList(); await loadImage(); schedulePoll()
    notice.value = data.summary.state === 'IMPORTED' ? 'PDF này đã được nhập trước đó. Bạn có thể mở sách đã có.' : 'Đã nhận PDF. Bản nháp được lưu để bạn tiếp tục biên tập.'
  } catch (e) { if (!disposed) error.value = message(e, received ? 'PDF đã nhận. Chưa tải hết file nghe; bạn có thể thêm tiếp bên dưới.' : 'Chưa tải được PDF. Hãy thử lại; hệ thống kiểm tra file đã nhận để tránh nhập trùng.') }
  finally { busy.value = false; schedulePoll() }
}
function schedulePoll() {
  if (timer) clearTimeout(timer)
  if (disposed || !processing.value) return
  timer = setTimeout(poll, 2500)
}
async function poll() {
  if (!detail.value || disposed) return
  const id = detail.value.summary.id
  try {
    await loadList(); const summary = sessions.value.find(s => s.id === id)
    if (!summary || detail.value?.summary.id !== id || disposed) return
    detail.value.summary = summary
    if (!busy.value && !dirty.value) {
      const { data } = await gatewayUrl.get<ImportDetail>(`${endpoint}/${id}`)
      if (!disposed && detail.value?.summary.id === id && !busy.value && !dirty.value) {
        const wasEditing = editing.value
        apply(data); editing.value = wasEditing
        if (!pageImage.value) await loadImage()
      }
    }
  } catch (e) { if (!disposed) error.value = message(e, 'Tạm mất kết nối. Bản nháp vẫn được lưu; đang thử tải lại tiến độ.') }
  finally { schedulePoll() }
}
async function loadImage() {
  if (!detail.value) return
  const request = ++imageRequest; imageAbort?.abort(); imageAbort = new AbortController(); imageError.value = ''
  if (pageImage.value) { URL.revokeObjectURL(pageImage.value); pageImage.value = '' }
  try {
    const { data } = await gatewayUrl.get<Blob>(`${endpoint}/${detail.value.summary.id}/pages/${pageNumber.value}`, { responseType: 'blob', signal: imageAbort.signal })
    if (!disposed && request === imageRequest) pageImage.value = URL.createObjectURL(data)
  } catch { if (!disposed && request === imageRequest && !imageAbort.signal.aborted) imageError.value = processing.value ? 'Trang này đang chờ xử lý.' : 'Chưa tải được trang nguồn. Hãy thử lại.' }
}
async function uploadAudio(event: Event) {
  const input = event.target as HTMLInputElement, files = Array.from(input.files ?? [])
  if (!files.length || !detail.value || busy.value) return
  if (files.some(f => f.size > 40 * 1024 * 1024)) { error.value = 'Mỗi file nghe tối đa 40 MB.'; input.value = ''; return }
  busy.value = true; error.value = ''; notice.value = ''
  const id = detail.value.summary.id
  try {
    for (let start = 0; start < files.length; start += 5) {
      const form = new FormData(); files.slice(start, start + 5).forEach(f => form.append('files', f))
      const response = await gatewayUrl.post<ImportDetail>(`${endpoint}/${id}/audio`, form, { timeout: 180_000 })
      const data: ImportDetail = response.data
      if (disposed) return
      detail.value = data; if (content.value) {content.value.audio = data.content.audio; if(!dirty.value) content.value.lessons = structuredClone(data.content.lessons)}
      reviewed.value = false
    }
    notice.value = `Đã thêm ${files.length} file nghe. Hãy chọn file cho bài đọc hoặc câu nghe.`
  } catch (e) { if (!disposed) error.value = message(e, 'Chưa tải hết file nghe. Những file đã nhận vẫn được giữ.') }
  finally { busy.value = false; input.value = '' }
}
function addLesson() {
  if (!content.value || !detail.value || firstPage.value < 1 || lastPage.value < firstPage.value || lastPage.value > detail.value.summary.pageCount) { error.value = 'Hãy chọn khoảng trang hợp lệ.'; return }
  const reading = detail.value.pages.filter(p => p.number >= firstPage.value && p.number <= lastPage.value).map(p => p.text).join('\n\n')
  const part: ImportLesson = { name: `Bài ${content.value.lessons.length + 1}`, description: '', firstPage: firstPage.value, lastPage: lastPage.value, reading, audioId: '', grammars: [], exercises: [] }
  content.value.lessons.push(part); selectedPart.value = content.value.lessons.length - 1; tab.value = 'reading'; changed()
}
function removeLesson() { if (!content.value) return; content.value.lessons.splice(selectedPart.value, 1); selectedPart.value = Math.max(0, selectedPart.value - 1); changed() }
async function save(approve = false) {
  if (!detail.value || !content.value || busy.value || (approve && !reviewed.value)) return
  busy.value = true; error.value = ''
  try {
    const { data } = await gatewayUrl.put<ImportDetail>(`${endpoint}/${detail.value.summary.id}`, { version: detail.value.summary.version, reviewed: approve, content: content.value })
    if (!disposed) { apply(data); notice.value = approve ? 'Đã duyệt. Bạn có thể nhập nội dung thành sách.' : 'Đã lưu bản nháp.'; await loadList() }
  } catch (e) { if (!disposed) error.value = message(e, 'Chưa lưu được bản nháp. Nội dung bạn đang sửa vẫn được giữ trên màn hình.') }
  finally { busy.value = false }
}
async function publish() {
  if (!detail.value || busy.value || dirty.value || detail.value.summary.state !== 'READY') return
  busy.value = true; error.value = ''
  try {
    const { data } = await gatewayUrl.post<ImportDetail>(`${endpoint}/${detail.value.summary.id}/publish`, { version: detail.value.summary.version }, { timeout: 120_000 })
    if (!disposed) { apply(data); notice.value = 'Đã nhập sách và các bài học.'; await loadList() }
  } catch (e) { if (!disposed) error.value = message(e, 'Chưa nhập xong. Hãy tải lại tiến độ hoặc thử lại; hệ thống tránh tạo sách trùng.') }
  finally { busy.value = false }
}
async function retry() {
  if (!detail.value || busy.value || !canLeave()) return
  busy.value = true; error.value = ''
  try { const { data } = await gatewayUrl.post<ImportDetail>(`${endpoint}/${detail.value.summary.id}/retry`); if (!disposed) { apply(data); schedulePoll() } }
  catch (e) { if (!disposed) error.value = message(e, 'Chưa nhận dạng lại được. Hãy thử lại.') }
  finally { busy.value = false }
}
async function automate() {
  if(!detail.value || busy.value || !canLeave()) return
  busy.value=true; error.value=''
  try { const {data}=await gatewayUrl.post<ImportDetail>(`${endpoint}/${detail.value.summary.id}/automate`, {version:detail.value.summary.version}); if(!disposed) {apply(data);schedulePoll()} }
  catch(e) {if(!disposed) error.value=message(e,'Chưa tạo được bản nháp tự động.')} finally {busy.value=false}
}
async function manual() {
  if(!detail.value || busy.value || !canLeave()) return
  busy.value=true;error.value=''
  try {const {data}=await gatewayUrl.post<ImportDetail>(`${endpoint}/${detail.value.summary.id}/manual`,{version:detail.value.summary.version});if(!disposed)apply(data)}
  catch(e) {if(!disposed)error.value=message(e,'Chưa chuyển được chế độ biên tập.')}finally{busy.value=false}
}
async function approveAndPublish() { if(incompleteAi.value || !reviewed.value || problemCount.value || !content.value?.lessons.length) return; await save(true); if(detail.value?.summary.state === 'READY' && !dirty.value) await publish() }
async function assistQuestion(question: ImportQuestion, index: number) {
  if (!detail.value || busy.value || processing.value || published.value) return
  const id = detail.value.summary.id, part = selectedPart.value, snapshot = JSON.stringify(question)
  busy.value = true; aiQuestion.value = index; error.value = ''; suggestion.value = null
  try {
    const { data } = await gatewayUrl.post<QuestionSuggestion>(`${endpoint}/${id}/assist-question`, { version: detail.value.summary.version, question: JSON.parse(snapshot), sourcePage: assistantSourcePage.value, answerPage: assistantAnswerPage.value || null }, { timeout: 190_000 })
    if (!disposed && detail.value?.summary.id === id) suggestion.value = { lessonIndex: part, questionIndex: index, snapshot, result: data }
  } catch (e) { if (!disposed) error.value = message(e, 'Chưa nhận được hỗ trợ AI. Nội dung đang sửa vẫn được giữ; hãy thử lại.') }
  finally { busy.value = false; aiQuestion.value = null }
}
function applySuggestion(question: ImportQuestion) {
  const proposal = suggestion.value
  if (!proposal || busy.value || published.value || proposal.lessonIndex !== selectedPart.value || JSON.stringify(question) !== proposal.snapshot) { error.value = 'Câu hỏi đã thay đổi. Hãy nhờ AI kiểm tra lại trước khi áp dụng.'; return }
  const r = proposal.result
  Object.assign(question, { groupName: r.groupName, contentNihongo: r.contentNihongo, answerA: r.answerA, answerB: r.answerB, answerC: r.answerC, answerD: r.answerD, correctAnswer: r.correctAnswer })
  changed(); suggestion.value = null; notice.value = 'Đã áp dụng đề xuất vào câu hỏi. Hãy lưu bản nháp; nội dung chưa được tự động duyệt.'
}
function beforeUnload(e: BeforeUnloadEvent) { if (dirty.value) { e.preventDefault(); e.returnValue = '' } }
onBeforeRouteLeave(() => canLeave())
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload); loading.value = true
  try {
    const [l, t] = await Promise.all([gatewayUrl.get('/api/staff/levels'), gatewayUrl.get('/api/staff/types')])
    if (disposed) return
    levels.value = l.data; types.value = t.data; await loadList()
    try { const {data}=await gatewayUrl.get<{geminiConfigured:boolean}>(`${endpoint}/capabilities`); if(!disposed) geminiConfigured.value=data.geminiConfigured } catch { /* Older service reports its own update message. */ }
    if (typeof route.query.id === 'string') await open(route.query.id)
  } catch (e) { if (!disposed) error.value = message(e, 'Chưa tải được tính năng nhập sách. Nếu vừa cập nhật, hãy khởi động lại dịch vụ quản lý sách rồi thử lại.') }
  finally { loading.value = false }
})
onBeforeUnmount(() => { disposed = true; openRequest++; imageRequest++; if (timer) clearTimeout(timer); imageAbort?.abort(); if (pageImage.value) URL.revokeObjectURL(pageImage.value); window.removeEventListener('beforeunload', beforeUnload) })
</script>

<template>
  <main class="book-import-feature">
    <RouterLink to="/staff">← Quản lý sách</RouterLink>
    <header><div><h1>Nhập sách</h1><p>Tải sách → Gemini tạo nội dung → kiểm tra và nhập sách.</p></div><RouterLink to="/staff/imports/try-n3/book">Nội dung TRY! N3 đã chuẩn bị</RouterLink></header>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p><p v-if="notice" class="notice success" role="status">{{ notice }}</p>
    <section class="upload-card"><h2>1. Chọn sách</h2><form @submit.prevent="create" class="upload-form">
      <label>PDF <input type="file" accept=".pdf,application/pdf" :disabled="busy" required @change="choosePdf"><small>Tối đa 100 MB, 500 trang. Chọn chế độ tự động để Gemini đọc trang sách.</small></label>
      <label>Tên sách <input v-model="bookName" maxlength="180" required :disabled="busy"></label>
      <label>Trình độ <select v-model="levelId" required :disabled="busy"><option value="">Chọn trình độ</option><option v-for="level in levels" :key="level.levelId" :value="level.levelId">{{ level.levelName }}</option></select></label>
      <label>Loại sách <select v-model="typeId" required :disabled="busy"><option value="">Chọn loại sách</option><option v-for="type in types" :key="type.typeId" :value="type.typeId">{{ type.typeName }}</option></select></label>
      <label class="initial-audio">File nghe (có thể thêm sau) <input ref="initialAudioInput" type="file" multiple accept=".mp3,.m4a,.wav,.ogg" :disabled="busy" @change="initialAudio = Array.from(($event.target as HTMLInputElement).files ?? [])"><small>Tự ghép khi số track trong sách khớp với tên file. Mỗi file tối đa 40 MB.</small></label>
      <label class="auto-option"><input v-model="automatic" type="checkbox" :disabled="busy"> Tự tạo nội dung bằng Gemini <small>Đọc ảnh trang sách, chia bài, tách ngữ pháp, dịch ví dụ và tạo câu hỏi. Trang sách được gửi tới Gemini để xử lý.</small></label>
      <p v-if="automatic &amp;&amp; geminiConfigured === false" class="hint">Gemini chưa được cấu hình trên dịch vụ quản lý sách. TRY! N3 đúng bản PDF đã chuẩn bị vẫn có thể tự điền.</p>
      <button class="primary" type="submit" :disabled="busy || !pdf || loading">{{ busy ? `Đang xử lý… ${uploadPercent}%` : 'Tải PDF và tạo bản nháp' }}</button>
    </form></section>
    <details v-if="sessions.length" class="history" :open="!detail"><summary>Bản nháp và sách đã nhập ({{ sessions.length }})</summary><div class="history-list"><button v-for="s in sessions" :key="s.id" :class="{ active: detail?.summary.id === s.id }" :disabled="busy" @click="open(s.id)"><strong>{{ s.bookName }}</strong><span>{{ importStateLabel[s.state] ?? s.state }} · {{ s.pageCount }} trang</span></button></div></details>
    <section v-if="detail && content" class="draft-card">
      <div class="draft-header"><div><h2>{{ content.bookName }}</h2><p>{{ importStateLabel[detail.summary.state] }} · {{ detail.summary.processedPages }}/{{ detail.summary.pageCount }} trang đã xử lý</p><p v-if="detail.summary.autoMode === 'AUTO'">{{ detail.summary.aiProcessedPages ?? 0 }}/{{ detail.summary.pageCount }} trang đã tạo bản nháp</p></div><RouterLink v-if="detail.summary.bookId" :to="`/staff/books/${detail.summary.bookId}`" class="primary">Mở sách đã nhập</RouterLink><button v-if="['FAILED','AI_FAILED'].includes(detail.summary.state) || (detail.summary.state === 'REVIEW' && detail.summary.processedPages < detail.summary.pageCount)" :disabled="busy" @click="retry">{{ detail.summary.state === 'AI_FAILED' ? 'Tiếp tục tự động' : 'Nhận dạng lại' }}</button><button v-if="detail.summary.state === 'AI_FAILED'" :disabled="busy" @click="manual">Chuyển sang chỉnh thủ công</button></div>
      <progress v-if="processing" :value="detail.summary.state === 'ANALYZING' ? detail.summary.aiProcessedPages : detail.summary.processedPages" :max="detail.summary.pageCount" aria-label="Tiến độ nhận dạng"></progress><p class="notice">{{ detail.summary.message }}</p>
      <fieldset :disabled="busy || published"><legend>File nghe</legend><label>File nghe <input type="file" multiple accept=".mp3,.m4a,.wav,.ogg" @change="uploadAudio"><small>Chọn nhiều file cùng lúc. Tối đa 40 MB/file, tổng 300 MB.</small></label><p>{{ content.audio.length }} file nghe đã tải lên</p></fieldset>
      <details v-if="detail.warnings?.length" class="auto-warnings"><summary>Ghi chú cần đối chiếu ({{ detail.warnings.length }})</summary><p v-for="(warning,i) in detail.warnings" :key="i">{{ warning }}</p></details>
      <section v-if="content.lessons.length" class="quick-review">
        <div class="review-heading"><div><h3>2. Kiểm tra bản nháp</h3><p>{{ content.lessons.length }} bài · {{ stats.grammars }} ngữ pháp · {{ stats.questions }} câu hỏi · {{ content.audio.length }} file nghe</p></div><button :disabled="processing" @click="editing = !editing">{{ editing ? 'Xem bản nháp' : 'Chỉnh nội dung' }}</button></div>
        <p v-if="processing" class="hint">Các phần đã xong được lưu tự động. Chờ xử lý xong để kiểm tra và duyệt.</p>
        <label class="inline-option"><input v-model="onlyProblems" type="checkbox"> Chỉ hiện bài cần bổ sung ({{ problemCount }})</label>
        <div class="lesson-review-list"><button v-for="(part,i) in content.lessons" v-show="!onlyProblems || issues[i]?.length" :key="i" :class="{active:selectedPart===i}" @click="selectedPart=i; pageNumber=part.firstPage; loadImage()"><strong>{{ part.name }}</strong><span>{{ issues[i]?.length ? issues[i]?.join(' · ') : 'Nội dung đã đủ để đối chiếu' }}</span></button></div>
      </section>
      <p v-if="!content.lessons.length && !processing && !published" class="notice error" role="alert">Bản nháp chưa có bài học nào, nên chưa có nội dung để xem hoặc nhập thành sách. Bấm Tạo bản nháp tự động để thử lại. PDF và file nghe đã tải vẫn được giữ.</p>
      <button v-if="!content.lessons.length &amp;&amp; !processing &amp;&amp; !published" class="primary" :disabled="busy" @click="automate">Tạo bản nháp tự động</button>
      <div class="editor-grid">
        <aside class="source-panel"><h3>Trang sách gốc</h3><label>Trang PDF <select v-model="pageNumber" @change="loadImage"><option v-for="n in detail.summary.pageCount" :key="n" :value="n">{{ n }}</option></select></label><p v-if="imageError">{{ imageError }} <button @click="loadImage">Thử lại</button></p><img v-if="pageImage" :src="pageImage" :alt="`Trang PDF ${pageNumber}`"><details><summary>Chữ nhận dạng của trang này</summary><pre>{{ pageText || 'Chưa có chữ nhận dạng.' }}</pre></details><p class="hint">Chữ nhận dạng có thể sai dấu và furigana. Đối chiếu với trang gốc trước khi duyệt.</p></aside>
        <div class="content-panel">
          <section v-if="lesson &amp;&amp; !editing" class="reading-preview">
            <h3>{{ lesson.name }}</h3><p class="hint">Trang {{ lesson.firstPage }}–{{ lesson.lastPage }}</p>
            <p class="preview-text" lang="ja">{{ readable(lesson.reading) || 'Chưa có bài đọc.' }}</p>
            <BookAudioPlayer v-if="lesson.audioId" :key="lesson.audioId" :source="audioUrl(lesson.audioId)" />
            <details v-for="(g,i) in lesson.grammars" :key="i" class="preview-item"><summary>{{ g.title }}</summary><p class="preview-text">{{ readable(g.description) }}</p><div v-for="(e,j) in g.examples" :key="j" class="example"><p class="preview-text" lang="ja">{{ readable(e.nihongo) }}</p><p class="preview-text">{{ readable(e.vietnamese) || 'Cần bổ sung bản dịch.' }}</p></div></details>
            <details v-if="lesson.exercises.length" class="preview-item"><summary>Bài tập ({{ lesson.exercises.length }})</summary><article v-for="(q,i) in lesson.exercises" :key="i" class="preview-question"><p class="hint">{{ q.groupName }}</p><p class="preview-text" lang="ja">{{ readable(q.contentNihongo) }}</p><ol><li v-for="(choice,j) in [q.answerA,q.answerB,q.answerC,q.answerD]" v-show="choice" :key="j">{{ choice }}</li></ol><p>{{ q.correctAnswer ? `Đáp án trong bản nháp: ${'ABCD'.indexOf(q.correctAnswer)+1}` : 'Chưa tìm thấy đáp án trong nguồn.' }}</p><button v-if="!q.correctAnswer" @click="editPart(selectedPart,'questions')">Đối chiếu câu này</button></article></details>
            <button :disabled="processing || published" @click="editPart(selectedPart)">Chỉnh bài này</button>
          </section>
          <div v-show="editing"><h3>Chỉnh nội dung</h3>
          <fieldset :disabled="busy || processing || published"><div class="page-range"><label>Từ trang <input v-model.number="firstPage" type="number" min="1" :max="detail.summary.pageCount"></label><label>Đến trang <input v-model.number="lastPage" type="number" min="1" :max="detail.summary.pageCount"></label><button @click="addLesson">Tạo bài từ các trang này</button></div><p class="hint">Chọn các trang của một bài. Chữ nhận dạng được chép vào bài đọc để bạn chỉnh lại; ngữ pháp và đáp án được biên tập riêng.</p></fieldset>
          <div class="part-tabs"><button v-for="(part, i) in content.lessons" :key="i" :class="{ active: selectedPart === i }" @click="selectedPart = i">{{ part.name || `Bài ${i + 1}` }}</button></div>
          <fieldset v-if="lesson" :disabled="busy || processing || published" @input="changed" @change="changed">
            <label>Tên bài <input v-model="lesson.name" maxlength="180"></label><label>Mục tiêu bài học <textarea v-model="lesson.description" rows="2" maxlength="255"></textarea></label>
            <div class="page-range"><label>Trang đầu <input v-model.number="lesson.firstPage" type="number" min="1" :max="detail.summary.pageCount"></label><label>Trang cuối <input v-model.number="lesson.lastPage" type="number" min="1" :max="detail.summary.pageCount"></label><button class="danger" @click="removeLesson">Bỏ bài này khỏi bản nháp</button></div>
            <div class="editor-tabs"><button :class="{ active: tab === 'reading' }" @click="tab = 'reading'">Bài đọc</button><button :class="{ active: tab === 'grammar' }" @click="tab = 'grammar'">Ngữ pháp ({{ lesson.grammars.length }})</button><button :class="{ active: tab === 'questions' }" @click="tab = 'questions'">Bài tập ({{ lesson.exercises.length }})</button></div>
            <div v-show="tab === 'reading'"><label>Bài đọc <textarea v-model="lesson.reading" rows="15" lang="ja"></textarea></label><label>File nghe của bài đọc <select v-model="lesson.audioId"><option value="">Chưa gắn file nghe</option><option v-for="a in content.audio" :key="a.id" :value="a.id">{{ a.name }}</option></select></label><BookAudioPlayer v-if="lesson.audioId" :key="lesson.audioId" :source="audioUrl(lesson.audioId)" /></div>
            <div v-show="tab === 'grammar'"><article v-for="(g, i) in lesson.grammars" :key="i" class="item-card"><div class="item-heading"><strong>Ngữ pháp {{ i + 1 }}</strong><button class="danger" @click="lesson.grammars.splice(i, 1); changed()">Bỏ mục</button></div><label>Tên ngữ pháp <input v-model="g.title" maxlength="180"></label><label>Cấu trúc và cách dùng <textarea v-model="g.description" rows="5" placeholder="Cấu trúc: …&#10;Giải thích bằng tiếng Việt"></textarea></label><div v-for="(e, j) in g.examples" :key="j" class="example"><label>Ví dụ tiếng Nhật <textarea v-model="e.nihongo" rows="2" lang="ja"></textarea></label><label>Dịch tiếng Việt <textarea v-model="e.vietnamese" rows="2"></textarea></label><button class="danger" @click="g.examples.splice(j, 1); changed()">Bỏ ví dụ</button></div><button @click="g.examples.push({ nihongo: '', vietnamese: '' }); changed()">+ Ví dụ</button></article><button @click="lesson.grammars.push({ title: '', description: '', examples: [{ nihongo: '', vietnamese: '' }] }); changed()">+ Ngữ pháp</button></div>
            <div v-show="tab === 'questions'">
              <section class="ai-help"><h3>AI hỗ trợ chỉnh câu hỏi</h3><p>Chọn trang PDF chứa câu hỏi. AI đối chiếu trang này và trang kế tiếp; có thể thêm trang đáp án nếu bạn biết.</p><div class="page-range"><label>Trang câu hỏi <input v-model.number="assistantSourcePage" type="number" min="1" :max="detail.summary.pageCount" @input.stop @change.stop></label><label>Trang đáp án (nếu có) <input v-model.number="assistantAnswerPage" type="number" min="1" :max="detail.summary.pageCount" placeholder="Không bắt buộc" @input.stop @change.stop></label><button @click="assistantSourcePage = pageNumber">Dùng trang đang xem</button></div><p class="hint">AI đọc câu hỏi và ảnh trang đã chọn qua Gemini. Câu nghe thiếu nội dung sẽ được đánh dấu cần bổ sung.</p></section>
              <article v-for="(q, i) in lesson.exercises" :key="i" class="item-card"><div class="item-heading"><strong>Câu {{ i + 1 }}</strong><button :disabled="!q.contentNihongo.trim() || geminiConfigured === false" @click="assistQuestion(q, i)">{{ aiQuestion === i ? 'AI đang kiểm tra…' : 'Nhờ AI hỗ trợ' }}</button><button class="danger" @click="lesson.exercises.splice(i, 1); changed()">Bỏ câu</button></div>
                <section v-if="suggestion?.lessonIndex === selectedPart && suggestion.questionIndex === i" class="ai-suggestion" role="status"><h4>Đề xuất của AI</h4><p><strong>{{ suggestion.result.basis === 'SOURCE' ? 'Đáp án từ sách' : suggestion.result.basis === 'REASONING' ? 'AI tự giải — cần kiểm tra' : 'Chưa đủ dữ liệu để xác định đáp án' }}</strong></p><p v-if="suggestion.result.basis === 'SOURCE'">Trang PDF {{ suggestion.result.sourcePage }} · {{ suggestion.result.evidence }}</p><p class="preview-text">{{ suggestion.result.explanation }}</p><p class="preview-text" lang="ja">{{ suggestion.result.contentNihongo }}</p><ol><li v-for="(choice,j) in [suggestion.result.answerA,suggestion.result.answerB,suggestion.result.answerC,suggestion.result.answerD]" v-show="choice" :key="j" :value="j+1">{{ choice }}</li></ol><p>{{ suggestion.result.correctAnswer ? `Đáp án đề xuất: ${'ABCD'.indexOf(suggestion.result.correctAnswer)+1}` : 'Đáp án vẫn để trống.' }}</p><p v-for="(warning,j) in suggestion.result.warnings" :key="j">{{ warning }}</p><button class="primary" :disabled="JSON.stringify(q) !== suggestion.snapshot" @click="applySuggestion(q)">Áp dụng đề xuất vào câu này</button><button @click="suggestion = null">Bỏ đề xuất</button><p v-if="JSON.stringify(q) !== suggestion.snapshot" class="hint">Câu hỏi đã thay đổi. Nhờ AI kiểm tra lại để nhận đề xuất mới.</p></section>
                <label>Nhóm bài tập <input v-model="q.groupName" maxlength="180" placeholder="Ví dụ: 問題1〈文法形式の判断〉"></label><label>Nội dung câu hỏi <textarea v-model="q.contentNihongo" rows="5" lang="ja"></textarea></label><div class="choice-editor"><label>Lựa chọn 1 <textarea v-model="q.answerA" maxlength="255" rows="2"></textarea></label><label>Lựa chọn 2 <textarea v-model="q.answerB" maxlength="255" rows="2"></textarea></label><label>Lựa chọn 3 <textarea v-model="q.answerC" maxlength="255" rows="2"></textarea></label><label>Lựa chọn 4 <textarea v-model="q.answerD" maxlength="255" rows="2"></textarea></label></div><label>Đáp án đúng <select v-model="q.correctAnswer"><option value="">Chọn đáp án đã đối chiếu</option><option value="A">1</option><option value="B">2</option><option value="C">3</option><option value="D">4</option></select></label><label>File nghe của câu hỏi <select v-model="q.audioId"><option value="">Không có file nghe</option><option v-for="a in content.audio" :key="a.id" :value="a.id">{{ a.name }}</option></select></label><BookAudioPlayer v-if="q.audioId" :key="q.audioId" :source="audioUrl(q.audioId)" /></article><button @click="lesson.exercises.push({ groupName: 'Bài ôn tập', contentNihongo: '', answerA: '', answerB: '', answerC: '', answerD: '', correctAnswer: '', audioId: '' }); changed()">+ Câu hỏi</button></div>
          </fieldset>
          <p v-else class="hint">Chưa có bài học. Dùng chế độ tự động hoặc chọn trang để thêm thủ công.</p>
          </div>
        </div>
      </div>
      <footer v-if="!published" class="save-bar"><span>{{ content.lessons.length }} bài học · {{ dirty ? 'Có thay đổi chưa lưu' : 'Bản nháp đã lưu' }}</span><button :disabled="busy || processing" @click="save(false)">Lưu bản nháp</button><label><input v-model="reviewed" type="checkbox" :disabled="busy || processing"> Tôi đã đối chiếu nội dung, dịch ví dụ và đáp án với sách.</label><button v-if="editing" :disabled="busy || processing || incompleteAi || !reviewed || !content.lessons.length" @click="save(true)">Duyệt nội dung</button><button v-if="editing" class="primary" :disabled="busy || dirty || detail.summary.state !== 'READY'" @click="publish">Nhập thành sách</button><button v-if="!editing" class="primary" :disabled="busy || processing || incompleteAi || !reviewed || problemCount > 0 || !content.lessons.length" @click="approveAndPublish">3. Duyệt và nhập sách</button><p v-if="problemCount" class="hint">{{ problemCount }} bài cần bổ sung trước khi duyệt. Bấm Chỉnh nội dung để sửa các mục được đánh dấu.</p></footer>
    </section>
  </main>
</template>

<style scoped>
.book-import-feature{max-width:1500px;margin:24px auto;padding:0 24px;color:#27354b}header,.draft-header,.item-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}header{margin:20px 0}h1{font-size:28px;font-weight:750}h2{font-size:21px}h3{font-size:18px}p,small,.hint{color:#66758a;line-height:1.7}.upload-card,.draft-card,.history{background:#fff;border:1px solid #e1e7f0;border-radius:16px;padding:24px;margin-bottom:22px}.upload-form{display:grid;grid-template-columns:2fr 2fr 1fr 1fr;gap:16px}.upload-form>button{grid-column:1/-1;justify-self:start}label{display:flex;flex-direction:column;gap:7px;font-size:14px;margin-bottom:14px}input,select,textarea{border:1px solid #cbd5e1;border-radius:8px;padding:10px;width:100%;background:#fff;color:#26364c}textarea{resize:vertical;line-height:1.8}input[type=file]{padding:8px}button,.primary{border:1px solid #cad5e6;border-radius:8px;background:#fff;color:#31547c;padding:9px 14px;line-height:1.5;text-decoration:none;font-size:14px}.primary{background:#576bea;color:#fff;border-color:#576bea}.danger{color:#a34141}button:disabled{opacity:.5;cursor:not-allowed}fieldset{border:0;padding:0;min-width:0}legend{font-size:18px;margin-bottom:12px}.history-list,.part-tabs,.editor-tabs{display:flex;gap:10px;flex-wrap:wrap}.history-list button{display:flex;flex-direction:column;text-align:left;gap:4px}.history-list span{font-size:12px;color:#64748b}.active{background:#edf1ff;border-color:#7585ef;color:#344bc3}.notice{background:#f3f6fb;padding:14px 18px;border-radius:10px;line-height:1.7}.error{background:#fff0f0;color:#a34141}.success{background:#edf9f3;color:#22784b}.editor-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:28px;margin-top:24px}.source-panel img{width:100%;height:auto;border:1px solid #e2e8f0}.source-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;font-family:inherit}.source-panel details{margin-top:16px}.page-range{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.page-range label{max-width:130px}.part-tabs,.editor-tabs{margin:16px 0}.item-card{border:1px solid #e1e7f0;padding:18px;border-radius:12px;margin:16px 0}.item-heading{margin-bottom:14px}.example{padding:14px;background:#f5f8fd;margin-bottom:12px;border-radius:10px}.choice-editor{display:grid;grid-template-columns:1fr 1fr;gap:12px}.save-bar{display:flex;gap:14px;align-items:center;flex-wrap:wrap;border-top:1px solid #e2e8f0;padding-top:22px;margin-top:24px}.save-bar label{flex-direction:row;align-items:center;margin:0}.save-bar input{width:auto}progress{width:100%;accent-color:#576bea;margin-top:12px}@media(max-width:1000px){.editor-grid{grid-template-columns:1fr}.upload-form{grid-template-columns:1fr 1fr}}@media(max-width:600px){.book-import-feature{padding:0 12px}.upload-card,.draft-card,.history{padding:16px}.upload-form,.choice-editor{grid-template-columns:1fr}.save-bar{align-items:flex-start}}
.initial-audio,.auto-option{grid-column:1/-1}.auto-option,.inline-option{flex-direction:row;align-items:center;flex-wrap:wrap}.auto-option input,.inline-option input{width:auto}.auto-option small{flex-basis:100%}.quick-review{background:#f5f8ff;border:1px solid #dde5f4;border-radius:12px;padding:20px;margin:20px 0}.review-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.lesson-review-list{display:flex;gap:10px;flex-wrap:wrap}.lesson-review-list button{display:flex;flex-direction:column;align-items:flex-start;max-width:100%;overflow-wrap:anywhere;gap:6px}.lesson-review-list span{font-size:12px;color:#697a91}.preview-text{white-space:pre-wrap;line-height:1.9;overflow-wrap:anywhere}.preview-item{border:1px solid #dde5f4;border-radius:10px;padding:14px;margin:14px 0}.preview-item summary{cursor:pointer;font-weight:600}.preview-question{border-bottom:1px solid #dde5f4;padding:14px 0}.auto-warnings{margin:16px 0}.history summary{font-weight:600;cursor:pointer}.history-list{margin-top:16px}
.ai-help,.ai-suggestion{background:#f5f8ff;border:1px solid #dce5f5;border-radius:12px;padding:18px;margin:16px 0;overflow-wrap:anywhere}.ai-suggestion h4{font-size:17px}.ai-suggestion button{margin:6px 8px 6px 0}.ai-suggestion li{white-space:pre-wrap}.ai-help .page-range label{max-width:200px}</style>



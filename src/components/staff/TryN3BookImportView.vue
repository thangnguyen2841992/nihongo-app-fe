<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import BookAudioPlayer from '@/components/BookAudioPlayer.vue'
import GrammarNotes from '@/components/GrammarNotes.vue'
interface Chapter { number: number; title: string; lessonCount: number; grammarCount: number; sourcePdfPages: number[]; reviewed: boolean; imported: boolean }
interface Progress { bookName: string; bookId: number | null; complete: boolean; chapters: Chapter[]; answerPdfPages?: number[] }
interface Draft { pages?: { page: number; text: string }[]; warnings?: string[] }
interface ReviewedLesson { name: string; reading: string; audioTrack?: string; grammars: { number: number; title: string; description: string; examples: { nihongo: string; vietnamese: string }[] }[] }
const endpoint = '/api/staff/imports/try-n3/book'
const progress = ref<Progress | null>(null)
const selected = ref<Chapter | null>(null)
const draft = ref<Draft | null>(null)
const draftContent = ref<unknown>(null)
const selectedPart = ref(0)
const reviewedLessons = computed(() => selected.value?.reviewed ? ((draftContent.value as { lessons?: ReviewedLesson[] } | null)?.lessons ?? []) : [])
const reviewedLesson = computed(() => reviewedLessons.value[selectedPart.value])
const pageNumber = ref(0)
const image = ref('')
const sourceError = ref('')
const error = ref('')
const message = ref('')
const busy = ref(false)
const sourceLoading = ref(false)
const reviewed = ref(false)
const uploaded = ref<unknown>(null)
const uploadName = ref('')
const importedCount = computed(() => progress.value?.chapters.filter(c => c.imported).length ?? 0)
const readyCount = computed(() => progress.value?.chapters.filter(c => c.reviewed && !c.imported).length ?? 0)
const ocrText = computed(() => draft.value?.pages?.find(p => p.page === pageNumber.value)?.text ?? '')
let disposed = false
let sourceRequest = 0
let controller: AbortController | null = null
const failure = (e: any, fallback: string) => typeof e.response?.data?.message === 'string' ? e.response.data.message : fallback
async function load() {
  error.value = ''
  try { const { data } = await gatewayUrl.get<Progress>(endpoint); if (!disposed) progress.value = data }
  catch (e) { if (!disposed) error.value = failure(e, 'Chưa tải được tiến độ nhập sách. Hãy kiểm tra dịch vụ quản lý sách rồi thử lại.') }
}
async function openChapter(chapter: Chapter) {
  if (busy.value) return
  busy.value = true; selected.value = chapter; draft.value = null; draftContent.value = null; selectedPart.value = 0; uploaded.value = null; reviewed.value = false; uploadName.value = ''; error.value = ''
  try {
    const { data } = await gatewayUrl.get(`${endpoint}/chapters/${chapter.number}`)
    if (disposed) return
    draftContent.value = data; draft.value = data
    pageNumber.value = chapter.sourcePdfPages[0]!
    await loadSource()
  } catch (e) { if (!disposed) error.value = failure(e, 'Chưa tải được nội dung chương.') }
  finally { busy.value = false }
}
async function loadSource() {
  const request = ++sourceRequest
  controller?.abort(); controller = new AbortController()
  sourceLoading.value = true; sourceError.value = ''
  if (image.value) { URL.revokeObjectURL(image.value); image.value = '' }
  try {
    const { data } = await gatewayUrl.get<Blob>(`${endpoint}/pages/${pageNumber.value}`, { responseType: 'blob', signal: controller.signal })
    if (!disposed && request === sourceRequest) image.value = URL.createObjectURL(data)
  } catch (e) { if (!disposed && request === sourceRequest && !controller.signal.aborted) sourceError.value = 'Chưa tải được trang sách gốc. Hãy thử lại.' }
  finally { if (request === sourceRequest) sourceLoading.value = false }
}
function downloadDraft() {
  const blob = new Blob([JSON.stringify(draftContent.value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob); const link = document.createElement('a')
  link.href = url; link.download = `try-n3-chuong-${selected.value?.number}.json`; link.click(); URL.revokeObjectURL(url)
}
async function chooseFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  uploaded.value = null; uploadName.value = ''; reviewed.value = false; error.value = ''
  if (!file) return
  if (file.size > 2_000_000) { error.value = 'Gói nội dung quá lớn (tối đa 2 MB mỗi chương).'; return }
  const chapterNumber = selected.value?.number
  try {
    const content = JSON.parse(await file.text())
    if (disposed || selected.value?.number !== chapterNumber) return
    uploaded.value = content; uploadName.value = file.name
  }
  catch { error.value = 'Chưa đọc được gói nội dung. Hãy chọn file biên tập hợp lệ.' }
}
async function saveReview() {
  if (busy.value || !selected.value || !reviewed.value || !uploaded.value) return
  busy.value = true; error.value = ''; message.value = ''
  try {
    const { data } = await gatewayUrl.put<Progress>(`${endpoint}/chapters/${selected.value.number}/review`, { reviewed: true, content: uploaded.value })
    if (disposed) return
    progress.value = data; selected.value = data.chapters.find(c => c.number === selected.value?.number) ?? null
    message.value = 'Đã lưu nội dung được duyệt. Chương này sẵn sàng nhập.'
  } catch (e) { if (!disposed) error.value = failure(e, 'Nội dung chưa đủ hoặc chưa khớp chương. Hãy đối chiếu lại.') }
  finally { busy.value = false }
}
async function importReady() {
  if (busy.value || !progress.value || !readyCount.value) return
  busy.value = true; error.value = ''; message.value = ''
  try {
    // A chapter commits separately. Retry resumes after the last committed chapter.
    for (const chapter of progress.value.chapters) {
      if (disposed || !chapter.reviewed) break
      if (chapter.imported) continue
      const { data } = await gatewayUrl.post<Progress>(`${endpoint}/chapters/${chapter.number}/import`)
      if (disposed) return
      progress.value = data
    }
    if (!disposed) message.value = progress.value.complete ? 'Đã nhập đủ 11 chương.' : `Đã nhập ${importedCount.value}/11 chương. Các chương còn lại đang chờ đối chiếu nội dung.`
  } catch (e) { if (!disposed) { await load(); error.value = failure(e, 'Chưa nhập được chương tiếp theo. Tiến độ đã hoàn tất được giữ lại; bạn có thể thử lại.') } }
  finally { busy.value = false }
}
onMounted(load)
onBeforeUnmount(() => { disposed = true; sourceRequest++; controller?.abort(); if (image.value) URL.revokeObjectURL(image.value) })
</script>

<template>
  <main class="book-import">
    <RouterLink to="/staff">← Quản lý sách</RouterLink>
    <header><div><h1>Nhập sách TRY! N3</h1><p>11 chương · 21 phần học · 113 mục ngữ pháp · 64 file nghe</p></div><RouterLink v-if="progress?.bookId" :to="`/staff/books/${progress.bookId}`" class="btn btn-outline-primary">Mở sách đang nhập</RouterLink></header>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }} <button v-if="!progress" class="btn btn-sm btn-outline-danger" @click="load">Thử lại</button></p>
    <p v-if="message" class="alert alert-success" role="status">{{ message }}</p>
    <template v-if="progress">
      <section class="progress-card"><div><strong>{{ importedCount }}/11 chương đã nhập</strong><p>{{ progress.complete ? 'Đã hoàn tất nội dung sách.' : 'Chỉ nội dung chữ và đáp án đã đối chiếu mới được đưa vào bài học và bộ chấm.' }}</p></div><button class="btn btn-primary" :disabled="busy || !readyCount" @click="importReady">{{ busy ? 'Đang xử lý…' : `Nhập các chương đã duyệt (${readyCount})` }}</button></section>
      <progress :value="importedCount" max="11" :aria-label="`${importedCount} trên 11 chương đã nhập`"></progress>
      <div class="chapter-grid"><button v-for="chapter in progress.chapters" :key="chapter.number" class="chapter" :class="{ selected: selected?.number === chapter.number }" :disabled="busy" @click="openChapter(chapter)"><span>Chương {{ chapter.number }}</span><strong>{{ chapter.title }}</strong><small>{{ chapter.lessonCount }} phần · {{ chapter.grammarCount }} mục ngữ pháp</small><em :class="{ done: chapter.imported }">{{ chapter.imported ? 'Đã nhập' : chapter.reviewed ? 'Sẵn sàng nhập' : 'Chờ đối chiếu' }}</em></button></div>
      <section v-if="selected" class="review-panel"><h2>Chương {{ selected.number }}: {{ selected.title }}</h2>
        <p v-if="!selected.reviewed" class="notice">Bản nhận dạng còn lỗi chữ và dấu tiếng Việt. Chưa dùng bản này để học hoặc chấm điểm.</p>
        <div class="source-toolbar"><label>Trang PDF <select v-model="pageNumber" @change="loadSource"><optgroup label="Nội dung chương"><option v-for="page in selected.sourcePdfPages" :key="page" :value="page">{{ page }} · trang sách {{ page + 1 }}</option></optgroup><optgroup v-if="progress.answerPdfPages?.length" label="Phụ lục đáp án"><option v-for="page in progress.answerPdfPages" :key="page" :value="page">PDF {{ page }} · phụ lục</option></optgroup></select></label><button class="btn btn-sm btn-outline-secondary" :disabled="busy || !draftContent" @click="downloadDraft">Tải gói biên tập</button><RouterLink v-if="selected.number === 1" to="/staff/imports/try-n3">Xem nội dung chữ chương 1</RouterLink></div>
        <p v-if="sourceLoading">Đang tải trang sách…</p><p v-if="sourceError" role="alert">{{ sourceError }} <button @click="loadSource">Thử lại</button></p>
        <div class="comparison"><img v-if="image" :src="image" :alt="`Trang sách gốc TRY! N3, PDF ${pageNumber}`"><div v-if="ocrText"><h3>Chữ nhận dạng chưa duyệt</h3><pre>{{ ocrText }}</pre></div></div>
        <section v-if="reviewedLesson" class="reviewed-content">
          <h3>Nội dung chữ đã đối chiếu</h3>
          <label>Phần học <select v-model="selectedPart"><option v-for="(part, i) in reviewedLessons" :key="part.name" :value="i">{{ part.name }}</option></select></label>
          <BookAudioPlayer v-if="reviewedLesson.audioTrack" :key="reviewedLesson.audioTrack" :track="reviewedLesson.audioTrack" />
          <div class="reviewed-reading" lang="ja" v-html="reviewedLesson.reading"></div>
          <details v-for="grammar in reviewedLesson.grammars" :key="grammar.number"><summary>{{ grammar.title }}</summary><GrammarNotes :description="grammar.description" /><div v-for="(example, i) in grammar.examples" :key="i" class="reviewed-example"><div lang="ja" v-html="example.nihongo"></div><div lang="vi" v-html="example.vietnamese"></div></div></details>
        </section>
        <div v-if="!selected.imported" class="review-upload"><label>Chọn gói nội dung đã biên tập <input type="file" accept=".json,application/json" :disabled="busy" @change="chooseFile"></label><p v-if="uploadName">{{ uploadName }}</p><label><input v-model="reviewed" type="checkbox" :disabled="busy || !uploaded"> Tôi đã đối chiếu bài đọc, ngữ pháp, dịch ví dụ, lựa chọn và đáp án với sách.</label><button class="btn btn-success" :disabled="busy || !reviewed || !uploaded" @click="saveReview">Lưu bản đã duyệt</button></div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.reviewed-content{margin-top:24px;min-width:0}.reviewed-reading{padding:20px;background:#f5f8fd;border-radius:12px;font-size:18px;line-height:2;overflow-wrap:anywhere}.reviewed-content details{border-bottom:1px solid #e2e8f0;padding:18px 0}.reviewed-content summary{cursor:pointer;font-size:18px;font-weight:600}.reviewed-example{padding:14px 0;line-height:1.9}.reviewed-example [lang=vi]{color:#64748b}
</style>

<style scoped>
.book-import{max-width:1250px;margin:24px auto;padding:0 20px;color:#27354b}header,.progress-card,.source-toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}header{margin:24px 0}h1{font-size:28px;font-weight:750}p{color:#65738a;margin:8px 0}.progress-card,.review-panel{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px}progress{width:100%;height:12px;margin:14px 0 24px;accent-color:#576bea}.chapter-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:14px;margin-bottom:26px}.chapter{text-align:left;padding:18px;border:1px solid #dfe6f1;border-radius:12px;background:white;display:flex;flex-direction:column;gap:8px}.chapter.selected{border-color:#576bea;box-shadow:0 0 0 2px #e0e5ff}.chapter span,.chapter small{color:#68788f}.chapter em{font-style:normal;color:#9a6a16;font-size:13px}.chapter em.done{color:#198754}.notice{padding:14px;background:#fff5dc;border-radius:8px;color:#875c18}.source-toolbar{margin:18px 0}select{padding:6px;border:1px solid #cbd5e1;border-radius:6px}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;min-width:0}.comparison img{width:100%;border:1px solid #e2e8f0}.comparison>div{min-width:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;background:#f4f7fc;padding:18px;font-family:inherit;font-size:15px}.review-upload{display:flex;flex-direction:column;align-items:start;gap:16px;margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0}h2{font-size:22px}h3{font-size:17px}@media(max-width:850px){.comparison{grid-template-columns:1fr}}
</style>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, onDeactivated, onActivated, ref, watch } from 'vue'
import axios from 'axios'
import { getCheckTargetsPage, probeCheckTarget, registerCheckTarget, type CheckProbe, type CheckTarget, type CheckRequest } from '@/monitor/checkTargetService'

const props = withDefaults(defineProps<{ embedded?: boolean; checkType?: 'port' | 'web' }>(), { embedded: false, checkType: 'port' })
const emit = defineEmits<{ registered: [target: CheckTarget] }>()
const isWeb = computed(() => props.checkType === 'web')
const title = computed(() => isWeb.value ? 'Web Check' : 'Port Check')
const kind = computed(() => isWeb.value ? 'WEB_CHECK' : 'PORT_CHECK')
const form = ref({ name: '', host: '', port: 443, url: '', statusMin: 200, statusMax: 399 })
const formElement = ref<HTMLFormElement>()
const targets = ref<CheckTarget[]>([])
const visibleTargets = computed(() => targets.value.filter(target => target.type === kind.value))
const page = ref(0), hasNext = ref(false), active = ref(false)
const probe = ref<CheckProbe | null>(null)
const registered = ref<CheckTarget | null>(null)
const error = ref(''), listError = ref(''), busy = ref(false), loading = ref(false)
let operation: AbortController | undefined, listing: AbortController | undefined
let revision = 0
let requestedPage = 0
let refreshTimer: ReturnType<typeof setInterval> | undefined
watch(form, () => { revision++; operation?.abort(); busy.value = false; probe.value = null; registered.value = null; error.value = '' }, { deep: true, flush: 'sync' })
function message(cause: unknown) {
  if (axios.isAxiosError(cause)) {
    if (cause.response?.status === 403) return 'Bạn không có quyền quản lý target.'
    if (cause.response?.status === 409) return 'Tên hoặc địa chỉ này đã được đăng ký.'
    if (cause.response?.status === 503) return 'Bộ kiểm tra đang bận. Vui lòng thử lại; chưa có kết quả UP/DOWN mới.'
    if (typeof cause.response?.data?.message === 'string' && cause.response.status < 500) return cause.response.data.message
  }
  return 'Chưa thực hiện được yêu cầu. Vui lòng thử lại.'
}
function input(): CheckRequest {
  return isWeb.value ? { name: form.value.name.trim(), type: 'WEB_CHECK', url: form.value.url.trim(), statusMin: form.value.statusMin, statusMax: form.value.statusMax }
    : { name: form.value.name.trim(), type: 'PORT_CHECK', host: form.value.host.trim(), port: form.value.port }
}
async function load(nextPage = page.value, force = false) {
  if (loading.value && requestedPage === nextPage && !force) return
  listing?.abort(); const controller = new AbortController(); listing = controller
  requestedPage = nextPage; loading.value = true; listError.value = ''
  try {
    const result = await getCheckTargetsPage(kind.value, nextPage, controller.signal)
    if (!controller.signal.aborted) { targets.value = result.content; page.value = result.number; hasNext.value = result.hasNext }
  }
  catch (cause) { if (!controller.signal.aborted) listError.value = message(cause) }
  finally { if (!controller.signal.aborted) loading.value = false }
}
async function perform(register: boolean) {
  if (busy.value || !formElement.value?.reportValidity()) return
  operation?.abort(); const controller = new AbortController(); operation = controller
  const current = ++revision; busy.value = true; error.value = ''
  try {
    if (register) {
      const target = await registerCheckTarget(input(), controller.signal)
      if (controller.signal.aborted || current !== revision) return
      registered.value = target; await load(0, true)
      if (!controller.signal.aborted && current === revision) emit('registered', target)
    } else {
      const result = await probeCheckTarget(input(), controller.signal)
      if (!controller.signal.aborted && current === revision) probe.value = result
    }
  } catch (cause) { if (!controller.signal.aborted && current === revision) error.value = message(cause) }
  finally { if (current === revision) busy.value = false }
}
function stop() { revision++; operation?.abort(); listing?.abort(); busy.value = false; loading.value = false }
function refreshWhenVisible() { if (active.value && !document.hidden) void load() }
function activate() {
  if (active.value) return
  active.value = true
  refreshWhenVisible()
  refreshTimer = setInterval(refreshWhenVisible, 30000)
  window.addEventListener('focus', refreshWhenVisible)
  document.addEventListener('visibilitychange', refreshWhenVisible)
}
function deactivate() {
  active.value = false; stop(); clearInterval(refreshTimer); refreshTimer = undefined
  window.removeEventListener('focus', refreshWhenVisible)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
}
onMounted(activate)
onBeforeUnmount(deactivate)
onDeactivated(deactivate)
onActivated(activate)
</script>

<template>
  <section class="check-page" :class="{ embedded }" :aria-label="title">
    <h1 v-if="!embedded">Đăng ký {{ title }}</h1>
    <p class="check-intro">{{ isWeb ? 'Gửi GET từ máy chạy staff-service; kiểm tra HTTPS và mã phản hồi. Không theo chuyển hướng, không tải toàn bộ nội dung.' : 'Kiểm tra kết nối TCP từ máy chạy staff-service tới hostname/IP và cổng đã chọn.' }} Không cần cài exporter.</p>
    <form ref="formElement" @submit.prevent="perform(false)">
      <fieldset :disabled="busy">
        <label :for="`${checkType}-name`">Tên target<input :id="`${checkType}-name`" v-model="form.name" required maxlength="200" placeholder="Ví dụ: Website công ty hoặc SSH production"></label>
        <template v-if="isWeb">
          <label for="check-url">URL HTTP/HTTPS<input id="check-url" v-model="form.url" type="url" required maxlength="2048" placeholder="https://example.com/health"></label>
          <div class="check-grid"><label for="check-status-min">HTTP status từ<input id="check-status-min" v-model.number="form.statusMin" type="number" required min="100" max="599"></label><label for="check-status-max">HTTP status đến<input id="check-status-max" v-model.number="form.statusMax" type="number" required :min="form.statusMin" max="599"></label></div>
        </template>
        <div v-else class="check-grid"><label for="check-host">Hostname / IP<input id="check-host" v-model="form.host" required maxlength="253" placeholder="db.example.com"></label><label for="check-port">Cổng TCP<input id="check-port" v-model.number="form.port" type="number" required min="1" max="65535"></label></div>
        <p class="check-hint">Mặc định kiểm tra mỗi 30 giây, timeout 5 giây. Có thể chỉnh lịch trong màn hình hiệu năng. Dịch vụ đang DOWN vẫn đăng ký được để theo dõi phục hồi.</p>
        <div class="check-actions"><button type="submit">{{ busy ? 'Đang xử lý…' : 'Kiểm tra ngay' }}</button><button type="button" :disabled="Boolean(registered)" @click="perform(true)">Đăng ký giám sát</button></div>
      </fieldset>
    </form>
    <p v-if="error" role="alert" class="check-error">{{ error }}</p>
    <div v-if="probe" role="status" class="probe-result" :class="probe.healthy ? 'healthy' : 'down'"><strong>{{ probe.healthy ? 'UP' : 'DOWN' }}</strong><span>{{ probe.message }} · {{ probe.responseMs.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }} ms</span></div>
    <p v-if="registered" role="status" class="registered">Đã đăng ký {{ registered.name }}. <RouterLink :to="`/staff/monitoring/vps/performance?vps=${registered.vpsId}`">Xem hiệu năng và cảnh báo</RouterLink></p>
    <section class="check-list" :aria-label="`Danh sách ${title}`"><h2>{{ title }} đã đăng ký</h2><p class="check-hint">Tự cập nhật mỗi 30 giây khi màn hình đang mở.</p><button type="button" :disabled="loading" @click="load()">{{ loading ? 'Đang cập nhật…' : 'Làm mới danh sách' }}</button><p v-if="listError" role="alert">{{ listError }} <button type="button" @click="load()">Thử lại</button></p><p v-else-if="!visibleTargets.length && !loading">Chưa có target.</p>
      <ul v-else><li v-for="target in visibleTargets" :key="target.vpsId"><div><strong>{{ target.name }}</strong><span>{{ target.url || `${target.host}:${target.port}` }}</span></div><span>{{ target.status }}</span><RouterLink :to="`/staff/monitoring/vps/performance?vps=${target.vpsId}`">Hiệu năng</RouterLink></li></ul>
      <nav v-if="page > 0 || hasNext" aria-label="Phân trang target" class="check-actions"><button type="button" :disabled="loading || page === 0" @click="load(page - 1)">Trang trước</button><span>Trang {{ page + 1 }}</span><button type="button" :disabled="loading || !hasNext" @click="load(page + 1)">Trang sau</button></nav>
    </section>
    <p class="check-hint">Cảnh báo mất kết nối: chọn metric khả dụng, điều kiện nhỏ hơn 1. Thời gian phản hồi có đơn vị ms; HTTP status bằng 0 nghĩa là chưa nhận được phản hồi HTTP.</p>
  </section>
</template>

<style scoped>
.check-page{max-width:960px;margin:auto;padding:24px;color:#27354a}.check-page.embedded{padding:0}.check-intro,.check-hint{color:#6e7f92;font-size:13px;line-height:1.65}fieldset{display:grid;gap:16px;padding:20px;border:1px solid #dfe6ef;border-radius:15px;background:#fff;min-width:0}label{display:grid;gap:7px;font-size:13px;font-weight:650;min-width:0}input{width:100%;min-width:0;border:1px solid #cbd6e3;border-radius:9px;padding:10px;font:inherit}.check-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(110px,1fr);gap:14px}.check-actions{display:flex;gap:10px;flex-wrap:wrap}button{border:1px solid #557ea8;border-radius:9px;padding:9px 14px;color:#fff;background:#557ea8;font:inherit;cursor:pointer}button:disabled{opacity:.55;cursor:default}.check-error,.down{color:#a7353d;background:#fff1f2}.probe-result{display:flex;gap:12px;padding:14px;margin-top:16px;border-radius:10px;flex-wrap:wrap}.healthy,.registered{color:#23664e;background:#ecf9f1}.registered{padding:14px;border-radius:10px;margin-top:16px}.check-list{margin-top:28px}.check-list h2{font-size:17px}.check-list ul{padding:0;list-style:none}.check-list li{display:flex;align-items:center;gap:14px;border-bottom:1px solid #e2e8f0;padding:14px 0}.check-list li>div{display:grid;flex:1;gap:5px;min-width:0}.check-list li span{font-size:12px;overflow-wrap:anywhere}.check-list a{font-size:13px;white-space:nowrap}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #a4c5e7;outline-offset:2px}@media(max-width:600px){.check-page{padding:14px}.check-grid{grid-template-columns:1fr}fieldset{padding:14px}.check-list li{flex-wrap:wrap}}
</style>

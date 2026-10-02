<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { listMysqlTargets, probeMysqlTarget, registerMysqlTarget, replaceMysqlTargetPassword, type MysqlProbe, type MysqlTargetRequest } from '@/monitor/mysqlTargetService'
import type { MonitorVps } from '@/monitor/monitorVpsService'

const form = ref<MysqlTargetRequest>({ name: '', host: '', port: 3306, username: '', password: '', sslMode: 'VERIFY_IDENTITY' })
const targets = ref<MonitorVps[]>([])
const probe = ref<MysqlProbe | null>(null)
const registered = ref<MonitorVps | null>(null)
const busy = ref(false)
const loadingList = ref(false)
const error = ref('')
const passwordTarget = ref<MonitorVps | null>(null)
const replacementPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const passwordBusy = ref(false)

watch(form, () => { probe.value = null; registered.value = null; error.value = '' }, { deep: true, flush: 'sync' })

function message(cause: unknown): string {
  if (!axios.isAxiosError(cause)) return 'Không thể thực hiện yêu cầu. Vui lòng thử lại.'
  if (cause.response?.status === 409) return 'Tên hoặc host và cổng này đã được đăng ký.'
  if (cause.response?.status === 401) return 'Phiên đăng nhập đã hết hạn.'
  if (cause.response?.status === 403) return 'Bạn không có quyền đăng ký target.'
  const detail = cause.response?.data?.message
  return typeof detail === 'string' && cause.response?.status !== 500 ? detail : 'Không kết nối được MySQL. Kiểm tra host, cổng, tài khoản và TLS.'
}

async function loadTargets() {
  loadingList.value = true
  try { targets.value = await listMysqlTargets() }
  catch (cause) { error.value = message(cause) }
  finally { loadingList.value = false }
}

async function check() {
  busy.value = true; error.value = ''; probe.value = null
  try { probe.value = await probeMysqlTarget(form.value) }
  catch (cause) { error.value = message(cause) }
  finally { busy.value = false }
}

async function register() {
  if (!probe.value || busy.value) return
  busy.value = true; error.value = ''
  try {
    const target = await registerMysqlTarget(form.value)
    form.value.password = ''
    registered.value = target
    await loadTargets()
  } catch (cause) { error.value = message(cause) }
  finally { busy.value = false }
}

function openPassword(target: MonitorVps) {
  passwordTarget.value = target
  replacementPassword.value = ''
  passwordError.value = ''
}

function closePassword() {
  if (passwordBusy.value) return
  passwordTarget.value = null
  replacementPassword.value = ''
  passwordError.value = ''
}

async function savePassword() {
  const target = passwordTarget.value
  if (!target || !replacementPassword.value.trim() || passwordBusy.value) return
  passwordBusy.value = true
  passwordError.value = ''
  try {
    await replaceMysqlTargetPassword(target.vpsId, replacementPassword.value)
    passwordSuccess.value = `Đã cập nhật mật khẩu cho ${target.hostname}. Dữ liệu và lịch sử giám sát được giữ nguyên.`
    passwordTarget.value = null
    replacementPassword.value = ''
  } catch (cause) {
    passwordError.value = message(cause)
  } finally {
    passwordBusy.value = false
  }
}

onMounted(() => { void loadTargets() })
</script>

<template>
  <main class="mysql-page">
    <header class="page-header"><span class="icon"><i class="bi bi-database" aria-hidden="true"></i></span><div><span class="eyebrow">GIÁM SÁT DATABASE</span><h1>Đăng ký MySQL</h1><p>Thu thập metric MySQL trực tiếp qua JDBC theo lịch, lưu lịch sử và tạo event theo ngưỡng.</p></div></header>
    <div v-if="error" class="notice error" role="alert">{{ error }}</div>
    <div v-if="passwordSuccess" class="notice success" role="status">{{ passwordSuccess }}</div>
    <div v-if="registered" class="notice success" role="status">Đã đăng ký {{ registered.hostname }}. <RouterLink :to="`/staff/monitoring/vps/performance?vps=${registered.vpsId}`">Xem metric</RouterLink></div>
    <div class="layout">
      <section class="panel">
        <h2>Thông tin kết nối</h2>
        <p class="help">Dùng tài khoản MySQL chỉ để đọc trạng thái. Mật khẩu được mã hóa khi lưu.</p>
        <form @submit.prevent="check">
          <label for="mysql-name">Tên target</label><input id="mysql-name" v-model.trim="form.name" required maxlength="200" placeholder="MySQL production" :disabled="busy" />
          <div class="row"><div><label for="mysql-host">Host hoặc IP</label><input id="mysql-host" v-model.trim="form.host" required maxlength="45" placeholder="db.example.com" :disabled="busy" /></div><div><label for="mysql-port">Cổng</label><input id="mysql-port" v-model.number="form.port" type="number" min="1" max="65535" required :disabled="busy" /></div></div>
          <div class="row"><div><label for="mysql-user">Tài khoản giám sát</label><input id="mysql-user" v-model.trim="form.username" required maxlength="128" autocomplete="username" :disabled="busy" /></div><div><label for="mysql-password">Mật khẩu</label><input id="mysql-password" v-model="form.password" type="password" required maxlength="256" autocomplete="new-password" :disabled="busy" /></div></div>
          <label for="mysql-tls">Bảo mật kết nối</label><select id="mysql-tls" v-model="form.sslMode" :disabled="busy"><option value="VERIFY_IDENTITY">TLS và xác thực máy chủ</option><option value="DISABLED">Không dùng TLS (mạng nội bộ)</option></select>
          <p class="help">Mặc định xác thực TLS: nhập hostname khớp chứng chỉ, không nhập IP. URL JDBC có useSSL=false tương ứng với Không dùng TLS; hãy ưu tiên TLS khi server có chứng chỉ hợp lệ.</p>
          <div class="actions"><button type="submit" :disabled="busy">{{ busy && !probe ? 'Đang kiểm tra...' : 'Kiểm tra kết nối' }}</button><button type="button" class="primary" :disabled="busy || !probe || !!registered" @click="register">{{ busy && probe ? 'Đang đăng ký...' : 'Đăng ký giám sát' }}</button></div>
        </form>
      </section>
      <section class="panel"><h2>Kiểm tra MySQL</h2><div v-if="probe" class="probe"><p><strong>Đã kết nối</strong> · {{ probe.version || 'MySQL' }}</p><dl><div><dt>Thời gian chạy</dt><dd>{{ probe.uptimeSeconds ?? '—' }} giây</dd></div><div><dt>Kết nối đang mở</dt><dd>{{ probe.threadsConnected ?? '—' }}</dd></div><div><dt>Luồng đang chạy</dt><dd>{{ probe.threadsRunning ?? '—' }}</dd></div></dl></div><p v-else class="empty">Nhập thông tin rồi chọn Kiểm tra kết nối. Hệ thống sẽ đọc trạng thái trực tiếp từ MySQL.</p></section>
    </div>
    <section class="panel list"><div class="list-heading"><div><h2>Database đã đăng ký</h2><p class="help">Metric riêng gồm uptime, kết nối, truy vấn, truy vấn chậm và lưu lượng dữ liệu.</p></div><button type="button" :disabled="loadingList" @click="loadTargets">Làm mới</button></div><p v-if="loadingList" role="status">Đang tải...</p><p v-else-if="!targets.length" class="empty">Chưa có target MySQL.</p><div v-else class="table-wrap"><table><thead><tr><th>Tên</th><th>Host</th><th>Cổng</th><th>Phiên bản</th><th>Metric</th><th>Thao tác</th></tr></thead><tbody><tr v-for="target in targets" :key="target.vpsId"><td>{{ target.hostname }}</td><td>{{ target.ipAddress }}</td><td>{{ target.agentPort }}</td><td>{{ target.osVersion || '—' }}</td><td><RouterLink :to="`/staff/monitoring/vps/performance?vps=${target.vpsId}`">Xem hiệu năng</RouterLink></td><td><button type="button" @click="openPassword(target)">Cập nhật mật khẩu</button></td></tr></tbody></table></div></section>
    <div v-if="passwordTarget" class="modal-backdrop" @click.self="closePassword">
      <section class="password-dialog panel" role="dialog" aria-modal="true" aria-labelledby="password-dialog-title">
        <h2 id="password-dialog-title">Cập nhật mật khẩu MySQL</h2>
        <p class="help">{{ passwordTarget.hostname }} · {{ passwordTarget.ipAddress }}:{{ passwordTarget.agentPort }}</p>
        <p class="help">Nhập lại mật khẩu của tài khoản giám sát hiện tại. Hệ thống sẽ kiểm tra kết nối rồi mã hóa bằng khóa đang dùng; target, metric và lịch sử vẫn được giữ nguyên.</p>
        <div v-if="passwordError" class="notice error" role="alert">{{ passwordError }}</div>
        <form @submit.prevent="savePassword">
          <label for="mysql-replacement-password">Mật khẩu hiện tại của tài khoản MySQL</label>
          <input id="mysql-replacement-password" v-model="replacementPassword" type="password" required maxlength="256" autocomplete="new-password" :disabled="passwordBusy" />
          <div class="actions">
            <button type="button" :disabled="passwordBusy" @click="closePassword">Hủy</button>
            <button type="submit" class="primary" :disabled="passwordBusy || !replacementPassword.trim()">{{ passwordBusy ? 'Đang kiểm tra...' : 'Kiểm tra và cập nhật' }}</button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.mysql-page{max-width:1120px;margin:auto;padding:32px 24px 48px;color:#27354a}.page-header{display:flex;gap:18px;align-items:center;margin-bottom:26px}.icon{display:grid;place-items:center;flex:none;width:62px;height:62px;border-radius:18px;background:#e8f1f0;color:#317b72;font-size:28px}.eyebrow{font-size:11px;letter-spacing:1.5px;color:#6d8990;font-weight:700}h1{font-size:28px;margin:4px 0 8px}h2{font-size:17px;margin:0 0 7px}p{margin:0;line-height:1.6}.page-header p,.help,.empty{color:#758394;font-size:13px}.layout{display:grid;grid-template-columns:1.25fr 1fr;gap:22px}.panel{background:#fff;border:1px solid #e3e8ef;border-radius:18px;padding:25px;box-shadow:0 8px 28px #27354a08}.list{margin-top:22px}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.row>div{min-width:0}label{display:block;margin:18px 0 7px;font-size:13px;font-weight:650}input,select{width:100%;box-sizing:border-box;border:1px solid #dce3ed;border-radius:10px;padding:11px 13px;color:#27354a;background:#fbfcfe}input:focus,select:focus{outline:3px solid #9cc9be70;border-color:#438d80}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}button{border:1px solid #d8e5e3;border-radius:10px;background:#eef6f4;color:#287569;padding:10px 15px;font-weight:650;cursor:pointer}.primary{background:#317b72;color:#fff}button:disabled{opacity:.55;cursor:not-allowed}.notice{padding:14px 17px;border-radius:10px;margin-bottom:18px;font-size:13px}.error{background:#fff3f2;color:#a84d45}.success{background:#eef8f3;color:#36775f}.empty{padding:30px 0}.probe{padding-top:20px}.probe strong{color:#267868}.probe dl{margin-top:18px}.probe dl div{display:flex;justify-content:space-between;border-bottom:1px solid #eef1f4;padding:13px 0;gap:12px}.probe dt{color:#718092}.probe dd{margin:0;font-weight:700}.list-heading{display:flex;justify-content:space-between;gap:16px;align-items:start}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;margin-top:15px;font-size:13px;text-align:left}th,td{padding:13px;border-bottom:1px solid #e8edf2}th{color:#6d7d90;background:#f7f9fc}a{color:#287569;font-weight:650}.modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:#14273891}.password-dialog{width:min(100%,460px);max-height:calc(100vh - 40px);overflow:auto}.password-dialog .help{margin-top:12px}.password-dialog .notice{margin-top:16px}@media(max-width:900px){.layout{grid-template-columns:1fr}}@media(max-width:600px){.mysql-page{padding:20px 14px}.row{grid-template-columns:1fr}.page-header{align-items:flex-start}.icon{width:48px;height:48px;font-size:22px}}
</style>

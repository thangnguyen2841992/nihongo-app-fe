<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import axios from 'axios'
import {
  discoveryVps,
  registerVps,
  listVps,
  type NodeExporterDiscoveryResult,
  type MonitorVps
} from '@/monitor/monitorVpsService.ts'

const ipAddress = ref('')
const agentPort = ref(9100)
const exporterKind = ref<'NODE_EXPORTER' | 'WINDOWS_EXPORTER'>('NODE_EXPORTER')

watch(exporterKind, type => {
  agentPort.value = type === 'WINDOWS_EXPORTER' ? 9182 : 9100
})

const loadingDiscovery = ref(false)
const loadingRegister = ref(false)

const error = ref('')
const success = ref('')

const discoveryResult = ref<NodeExporterDiscoveryResult | null>(null)
const registeredVps = ref<MonitorVps | null>(null)
const showList = ref(false)
const loadingList = ref(false)
const listError = ref('')
const vpsList = ref<MonitorVps[]>([])
const listDialog = ref<HTMLDialogElement | null>(null)
let previousOverflow: string | undefined

const closeList = () => {
  listDialog.value?.close()
  showList.value = false
}

const restoreScroll = () => {
  if (previousOverflow !== undefined) {
    document.body.style.overflow = previousOverflow
    previousOverflow = undefined
  }
}

watch(showList, async open => {
  if (!open) {
    restoreScroll()
    return
  }
  await nextTick()
  if (!showList.value || !listDialog.value) return
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  listDialog.value.showModal()
})
onBeforeUnmount(restoreScroll)

const loadList = async () => {
  if (loadingList.value) return
  loadingList.value = true
  listError.value = ''
  try {
    vpsList.value = (await listVps()).filter(vps => vps.exporterType !== 'MYSQL_JDBC')
  } catch (cause: unknown) {
    listError.value = errorMessage(cause, 'Không thể tải danh sách máy chủ. Vui lòng thử lại.')
  } finally {
    loadingList.value = false
  }
}

const toggleList = () => {
  showList.value = !showList.value
  if (showList.value) void loadList()
}

const errorMessage = (cause: unknown, fallback: string) => {
  if (!axios.isAxiosError(cause)) return fallback
  const status = cause.response?.status
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 409) return cause.response?.data?.message || 'Máy chủ này đã được đăng ký. Vui lòng kiểm tra danh sách máy chủ.'
  if (cause.code === 'ECONNABORTED' || cause.code === 'ETIMEDOUT') return 'Yêu cầu quá thời gian chờ. Vui lòng kiểm tra danh sách máy chủ trước khi đăng ký lại.'
  if (!cause.response) return 'Không kết nối được tới hệ thống. Vui lòng kiểm tra mạng và thử lại.'
  const message = cause.response.data?.message
  if (typeof message === 'string' && message.trim() && status !== 500) return message
  return fallback
}

watch([ipAddress, agentPort, exporterKind], () => {
  discoveryResult.value = null
  registeredVps.value = null
  success.value = ''
  error.value = ''
})

const discovery = async () => {
  error.value = ''
  success.value = ''
  discoveryResult.value = null
  registeredVps.value = null

  if (!ipAddress.value.trim()) {
    error.value = 'Vui lòng nhập IP hoặc hostname của máy chủ'
    return
  }

  if (!Number.isInteger(agentPort.value) || agentPort.value < 1 || agentPort.value > 65535) {
    error.value = 'Cổng phải là số nguyên từ 1 đến 65535.'
    return
  }

  loadingDiscovery.value = true

  try {
    const result = await discoveryVps({
      ipAddress: ipAddress.value.trim(),
      agentPort: agentPort.value
    })

    if (!result.installed) {
      error.value =
        result.message ||
        'Không tìm thấy Node Exporter hoặc Windows Exporter'
      return
    }

    discoveryResult.value = result
    success.value = result.message || 'Đã tìm thấy exporter.'
  } catch (e: unknown) {
    error.value = errorMessage(e, 'Không thể kiểm tra máy chủ. Vui lòng kiểm tra địa chỉ và exporter.')
  } finally {
    loadingDiscovery.value = false
  }
}

const register = async () => {
  if (loadingRegister.value || registeredVps.value) return
  const result = discoveryResult.value

  if (!result?.installed) {
    error.value = 'Vui lòng Discovery VPS thành công trước'
    return
  }

  error.value = ''
  success.value = ''
  loadingRegister.value = true

  try {
    const vps = await registerVps({
      ipAddress: result.ipAddress,
      agentPort: result.port,
      hostname: result.hostname,
      osType: result.osType,
      osVersion: result.osVersion,
      architecture: result.architecture
    })

    registeredVps.value = vps
    success.value = `Đăng ký máy chủ thành công: ${vps.hostname || vps.ipAddress}`
    if (showList.value) void loadList()
  } catch (e: unknown) {
    error.value = errorMessage(e, 'Không thể đăng ký máy chủ. Vui lòng kiểm tra danh sách và thử lại sau.')
  } finally {
    loadingRegister.value = false
  }
}
</script>

<template>
  <main class="vps-page">
    <header class="page-heading">
      <span class="heading-icon"><i class="bi bi-hdd-network" aria-hidden="true"></i></span>
      <div><span class="eyebrow">GIÁM SÁT HỆ THỐNG</span><h1>Đăng ký máy chủ</h1><p>Kết nối Linux Node Exporter hoặc Windows Exporter và theo dõi tài nguyên cùng Prometheus.</p></div>
      <button class="list-toggle" type="button" :aria-expanded="showList" aria-controls="registered-vps-list" @click="toggleList"><i class="bi bi-list-ul" aria-hidden="true"></i>{{ showList ? 'Ẩn danh sách máy chủ' : 'Xem danh sách máy chủ' }}</button>
    </header>
    <ol class="steps" aria-label="Tiến trình đăng ký">
      <li :class="{ active: !discoveryResult, complete: discoveryResult }"><span>1</span> Nhập kết nối</li>
      <li :class="{ active: discoveryResult && !registeredVps, complete: registeredVps }"><span>2</span> Kiểm tra máy chủ</li>
      <li :class="{ active: registeredVps }"><span>3</span> Đăng ký giám sát</li>
    </ol>
    <div v-if="error" class="notice notice-error" role="alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><div><strong>Chưa hoàn tất yêu cầu</strong><p>{{ error }}</p></div></div>
    <div v-if="success" class="notice notice-success" role="status" aria-live="polite"><i class="bi bi-check-circle" aria-hidden="true"></i><div><strong>{{ registeredVps ? 'Máy chủ đã được đăng ký' : 'Máy chủ sẵn sàng' }}</strong><p>{{ success }}</p></div></div>
    <dialog v-if="showList" id="registered-vps-list" ref="listDialog" class="panel vps-dialog" aria-labelledby="vps-list-title" :aria-busy="loadingList" @cancel.prevent="closeList" @close="showList = false" @click.self="closeList">
      <div class="list-heading"><div><h2 id="vps-list-title">Máy chủ đã đăng ký</h2><p class="field-help">Các máy chủ đã lưu trong hệ thống.</p></div><button type="button" class="dialog-close" aria-label="Đóng danh sách máy chủ" autofocus @click="closeList"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>
      <div class="list-toolbar"><span>{{ loadingList ? 'Đang cập nhật...' : `${vpsList.length} VPS đã đăng ký` }}</span><button type="button" class="btn-discover" :disabled="loadingList" @click="loadList"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i>Làm mới</button></div>
      <p v-if="loadingList" role="status" class="list-placeholder">Đang tải danh sách máy chủ...</p>
      <div v-else-if="listError" role="alert" class="notice notice-error">{{ listError }}</div>
      <p v-else-if="!vpsList.length" class="list-placeholder">Chưa có máy chủ nào được đăng ký.</p>
      <div v-else class="table-scroll"><table><caption class="visually-hidden">Danh sách VPS đã đăng ký</caption><thead><tr><th scope="col">Hostname</th><th scope="col">Địa chỉ IP</th><th scope="col">Cổng</th><th scope="col">Hệ điều hành</th><th scope="col">Trạng thái</th><th scope="col">Hiệu năng</th></tr></thead><tbody><tr v-for="vps in vpsList" :key="vps.vpsId"><td>{{ vps.hostname || '—' }}</td><td>{{ vps.ipAddress }}</td><td>{{ vps.agentPort }}</td><td>{{ [vps.osType, vps.osVersion].filter(Boolean).join(' ') || '—' }}</td><td><span class="vps-status">{{ ['UP', 'ONLINE'].includes(vps.status) ? 'Đang hoạt động' : vps.status === 'DOWN' ? 'Không hoạt động' : 'Chưa xác định' }}</span></td><td><a :href="`/staff/monitoring/vps/performance?vps=${vps.vpsId}`" class="perf-link">Xem perf <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a></td></tr></tbody></table></div>
      <div class="dialog-footer"><button type="button" class="btn-discover" @click="closeList">Đóng</button></div>
    </dialog>
    <div class="vps-grid">
      <section class="panel connection-panel">
        <div class="panel-heading"><span class="small-icon"><i class="bi bi-plug" aria-hidden="true"></i></span><div><h2>Thông tin kết nối</h2><p>Chọn exporter và nhập địa chỉ máy chủ cần giám sát.</p></div></div>
        <form @submit.prevent="discovery">
          <label for="exporter-type">Loại exporter</label>
          <select id="exporter-type" v-model="exporterKind" :disabled="loadingDiscovery || loadingRegister || !!registeredVps">
            <option value="NODE_EXPORTER">Linux · Node Exporter</option>
            <option value="WINDOWS_EXPORTER">Windows · Windows Exporter</option>
          </select>
          <label for="vps-ip">Địa chỉ IP / hostname</label>
          <input id="vps-ip" v-model="ipAddress" :placeholder="exporterKind === 'WINDOWS_EXPORTER' ? '127.0.0.1 nếu chạy cùng máy' : 'Ví dụ: 160.22.107.232'" autocomplete="off" :disabled="loadingDiscovery || loadingRegister || !!registeredVps" />
          <label for="vps-port">Cổng exporter</label>
          <input id="vps-port" v-model.number="agentPort" type="number" min="1" max="65535" :disabled="loadingDiscovery || loadingRegister || !!registeredVps" aria-describedby="port-help" />
          <p id="port-help" class="field-help">Cổng mặc định: {{ exporterKind === 'WINDOWS_EXPORTER' ? '9182' : '9100' }}. Với Windows Exporter trên chính máy chạy staff-service, dùng 127.0.0.1.</p>
          <div class="actions">
            <button class="btn-discover" type="submit" :disabled="loadingDiscovery || loadingRegister || !!registeredVps"><i :class="loadingDiscovery ? 'bi bi-hourglass-split' : 'bi bi-search'" aria-hidden="true"></i>{{ loadingDiscovery ? 'Đang kiểm tra...' : 'Kiểm tra kết nối' }}</button>
            <button class="btn-register" type="button" :disabled="!discoveryResult?.installed || loadingDiscovery || loadingRegister || !!registeredVps" @click="register"><i class="bi bi-plus-circle" aria-hidden="true"></i>{{ loadingRegister ? 'Đang đăng ký...' : registeredVps ? 'Đã đăng ký' : 'Đăng ký máy chủ' }}</button>
          </div>
        </form>
        <p class="connection-note"><i class="bi bi-info-circle" aria-hidden="true"></i> Kiểm tra kết nối thành công trước khi đăng ký.</p>
      </section>
      <section class="panel result-panel" :aria-busy="loadingDiscovery">
        <div class="panel-heading"><span class="small-icon"><i class="bi bi-pc-display" aria-hidden="true"></i></span><div><h2>Thông tin máy chủ</h2><p>Kết quả được lấy trực tiếp từ exporter.</p></div></div>
        <div v-if="!discoveryResult" class="empty-result"><span class="server-illustration"><i class="bi bi-hdd-rack" aria-hidden="true"></i></span><h3>{{ loadingDiscovery ? 'Đang tìm máy chủ' : 'Chưa có máy chủ kết nối' }}</h3><p>{{ loadingDiscovery ? 'Vui lòng đợi kết quả kiểm tra kết nối.' : 'Nhập địa chỉ và chọn Kiểm tra kết nối để xem thông tin máy chủ tại đây.' }}</p></div>
        <template v-else>
          <div class="server-summary"><div><span class="eyebrow">HOSTNAME</span><h3>{{ discoveryResult.hostname || discoveryResult.ipAddress }}</h3></div><span class="detected"><span></span> Đã kết nối</span></div>
          <dl class="server-details">
            <div><dt>Địa chỉ IP</dt><dd>{{ discoveryResult.ipAddress }}</dd></div>
            <div><dt>Cổng exporter</dt><dd>{{ discoveryResult.port }}</dd></div>
            <div><dt>Hệ điều hành</dt><dd>{{ discoveryResult.osType || 'Chưa xác định' }}</dd></div>
            <div><dt>Phiên bản OS</dt><dd>{{ discoveryResult.osVersion || '—' }}</dd></div>
            <div><dt>Kiến trúc</dt><dd>{{ discoveryResult.architecture || '—' }}</dd></div>
            <div><dt>Exporter</dt><dd>{{ discoveryResult.exporterType === 'WINDOWS_EXPORTER' ? 'Windows Exporter' : 'Node Exporter' }} {{ discoveryResult.nodeExporterVersion || '' }}</dd></div>
          </dl>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
.perf-link{color:#47678e;text-decoration:none;white-space:nowrap;font-weight:650}.perf-link:hover{text-decoration:underline}
.vps-dialog{width:min(920px,calc(100vw - 32px));max-width:none;max-height:calc(100dvh - 48px);margin:auto;overflow-y:auto;color:#27354a;box-shadow:0 24px 80px #152c4b33}.vps-dialog::backdrop{background:rgb(21 35 56 / 48%);backdrop-filter:blur(4px)}.dialog-close{padding:9px 11px;background:#f0f4f9;color:#65748b}.dialog-close:hover{background:#e1e9f3}.list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.list-toolbar>span{font-size:13px;color:#778396}.dialog-footer{display:flex;justify-content:flex-end;border-top:1px solid #edf0f5;margin-top:20px;padding-top:18px}
.page-heading{flex-wrap:wrap}.list-toggle{margin-left:auto;color:#47678e;background:#edf3fa;border-color:#d9e4f0}.list-toggle:hover{background:#e0ebf7}.list-panel{margin-bottom:22px}.list-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}.list-placeholder{padding:24px 0;color:#778396;font-size:14px}.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px;text-align:left}th{background:#f5f8fc;color:#778396;font-weight:600;white-space:nowrap}th,td{padding:14px 16px;border-bottom:1px solid #edf0f5}td{overflow-wrap:anywhere}.vps-status{display:inline-block;border-radius:7px;padding:5px 9px;background:#edf3fa;color:#47678e;white-space:nowrap}@media(max-width:600px){.list-toggle{margin-left:0;width:100%}.list-heading{align-items:flex-start}.table-scroll table{min-width:620px}}
.vps-page{max-width:1120px;margin:0 auto;padding:32px 24px 48px;color:#27354a}.page-heading{display:flex;align-items:center;gap:18px;margin-bottom:28px}.heading-icon{display:grid;place-items:center;width:62px;height:62px;background:#e5eef8;color:#4c7099;border-radius:18px;font-size:28px;flex-shrink:0}.eyebrow{font-size:11px;letter-spacing:1.6px;font-weight:700;color:#7c8b9f}h1{font-size:28px;font-weight:750;margin:5px 0 8px}p{margin:0;line-height:1.6}.page-heading p,.panel-heading p{color:#778396;font-size:14px}.steps{display:flex;gap:24px;list-style:none;padding:16px 20px;margin:0 0 24px;background:#f0f4f9;border:1px solid #e3e9f1;border-radius:14px}.steps li{display:flex;align-items:center;gap:9px;color:#65748b;font-size:13px;flex:1}.steps li span{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#e0e7f0;font-weight:700}.steps .active{color:#345982;font-weight:700}.steps .active span{background:#4c7099;color:white}.steps .complete span{background:#dbece6;color:#36775f}.vps-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:22px}.panel{background:#fff;border:1px solid #e3e8ef;border-radius:20px;padding:26px;box-shadow:0 8px 28px #27354a06;min-width:0}.panel-heading{display:flex;gap:12px;align-items:flex-start;margin-bottom:26px}.small-icon{display:grid;place-items:center;width:38px;height:38px;background:#f0f4fa;color:#5e799b;border-radius:12px;flex-shrink:0}h2{font-size:17px;font-weight:700;margin:0 0 6px}label{display:block;font-size:13px;font-weight:650;margin:20px 0 8px}input{width:100%;border:1px solid #dce3ed;border-radius:10px;padding:12px 14px;color:#27354a;background:#fbfcfe;outline:none}input:focus{border-color:#7197bc;box-shadow:0 0 0 3px #7197bc20}input:disabled{background:#f1f4f8;color:#68778c}.field-help{font-size:12px;color:#7c8b9f;margin-top:7px}.actions{display:flex;gap:10px;margin-top:26px;flex-wrap:wrap}button{display:flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;padding:12px 16px;font-size:13px;font-weight:650;border:1px solid transparent;transition:background .15s}button:focus-visible{outline:3px solid #a3bdd7;outline-offset:3px}.btn-discover{color:#47678e;background:#edf3fa;border-color:#d9e4f0}.btn-discover:hover{background:#e0ebf7}.btn-register{background:#4c7099;color:#fff}.btn-register:hover{background:#3e6087}button:disabled{opacity:.5;cursor:not-allowed}.connection-note{border-top:1px solid #edf0f5;margin-top:25px;padding-top:17px;color:#7c8b9f;font-size:12px}.connection-note i{margin-right:6px}.empty-result{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;text-align:center;padding:20px}.server-illustration{font-size:44px;color:#8da5c0;background:#f0f4f9;padding:16px 25px;border-radius:22px;margin-bottom:20px}h3{font-size:17px;font-weight:700;margin:0 0 10px}.empty-result p{font-size:13px;color:#8591a3;max-width:280px}.server-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f5f8fc;padding:18px;border-radius:13px;margin-bottom:20px}.server-summary h3{margin:7px 0 0;overflow-wrap:anywhere}.detected{display:flex;align-items:center;gap:6px;font-size:11px;color:#397b65;white-space:nowrap}.detected span{width:7px;height:7px;background:#60a58a;border-radius:50%}.server-details{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin:0}.server-details div{border-bottom:1px solid #edf0f5;padding:16px 0;min-width:0}dt{font-size:12px;color:#8691a1;font-weight:400;margin-bottom:6px}dd{font-size:14px;font-weight:600;margin:0;overflow-wrap:anywhere}.notice{display:flex;gap:12px;padding:16px 20px;border-radius:12px;margin-bottom:20px;border:1px solid}.notice>i{font-size:21px}.notice strong{font-size:14px}.notice p{font-size:13px;margin-top:4px}.notice-error{background:#fff3f2;border-color:#f0d4d1;color:#a84d45}.notice-success{background:#eef8f3;border-color:#d2e8dd;color:#36775f}@media(max-width:900px){.vps-grid{grid-template-columns:1fr}}@media(max-width:600px){.vps-page{padding:20px 14px}.page-heading{gap:12px}h1{font-size:23px}.heading-icon{width:48px;height:48px;font-size:23px}.steps{gap:10px;padding:12px}.steps li{flex-direction:column;text-align:center;font-size:11px}.panel{padding:20px}.actions button{flex:1}.server-summary{flex-wrap:wrap}}
select{width:100%;border:1px solid #dce3ed;border-radius:10px;padding:12px 14px;color:#27354a;background:#fbfcfe;outline:none}
select:focus{border-color:#7197bc;box-shadow:0 0 0 3px #7197bc20}
select:disabled{background:#f1f4f8;color:#68778c}
</style>

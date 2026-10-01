<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import MetricEventRules from './MetricEventRules.vue'
import VpsEventHistory from './VpsEventHistory.vue'
import { listVps, type MonitorVps } from '@/monitor/monitorVpsService'
import {
  getMetricConfigs,
  getPerformanceMetrics,
  getVpsPerformance,
  type MetricConfig,
  type PerformanceMetric,
  type VpsPerformance,
} from '@/monitor/vpsPerformanceService'
import { connectVpsPerformance, type PerformanceLiveStatus } from '@/monitor/vpsPerformanceRealtime'

const route = useRoute()
const router = useRouter()
const vpsList = ref<MonitorVps[]>([])
const metrics = ref<PerformanceMetric[]>([])
const configs = ref<MetricConfig[]>([])
const selectedVps = ref<number | null>(null)
const isMysql = computed(() => vpsList.value.find(vps => vps.vpsId === selectedVps.value)?.exporterType === 'MYSQL_JDBC')
const selectedMetric = ref('')
const current = ref<VpsPerformance | null>(null)
const editor = ref<InstanceType<typeof MetricEventRules> | null>(null)
const initializing = ref(true)
const loadingConfigs = ref(false)
const loading = ref(false)
const error = ref('')
const liveStatus = ref<PerformanceLiveStatus>('connecting')
const saving = computed(() => !!editor.value?.saving)
const metric = computed(() => metrics.value.find((m) => m.code === selectedMetric.value))
const visibleMetrics = computed(() =>
  metrics.value.filter((m) => configs.value.some((c) => c.code === m.code)),
)
let disposed = false
let configRequest: AbortController | undefined
let snapshotRequest: AbortController | undefined
let stopSocket: (() => void) | undefined
let generation = 0
let socketRevision = 0
const failure = (cause: unknown) =>
  axios.isAxiosError(cause) && typeof cause.response?.data?.message === 'string'
    ? cause.response.data.message
    : 'Không tải được dữ liệu event. Vui lòng kiểm tra kết nối và thử lại.'

async function initialize() {
  initializing.value = true
  error.value = ''
  try {
    const [servers, catalog] = await Promise.all([listVps(), getPerformanceMetrics()])
    if (disposed) return
    vpsList.value = servers
    metrics.value = catalog
    const requested = Number(route.query.vps)
    const id = servers.find((v) => v.vpsId === requested)?.vpsId ?? servers[0]?.vpsId ?? null
    if (selectedVps.value === id && id != null) void loadConfigs()
    else selectedVps.value = id
  } catch (cause) {
    if (!disposed) error.value = failure(cause)
  } finally {
    if (!disposed) initializing.value = false
  }
}
async function loadConfigs() {
  configRequest?.abort()
  const id = selectedVps.value
  const preferred =
    Number(route.query.vps) === id && typeof route.query.metric === 'string'
      ? route.query.metric
      : selectedMetric.value || 'CPU_USAGE'
  selectedMetric.value = ''
  configs.value = []
  current.value = null
  if (id == null) return
  const request = new AbortController()
  configRequest = request
  loadingConfigs.value = true
  error.value = ''
  try {
    const links = await getMetricConfigs(id, request.signal)
    if (disposed || request.signal.aborted) return
    configs.value = links
    selectedMetric.value = links.find((c) => c.code === preferred)?.code ?? links[0]?.code ?? ''
  } catch (cause) {
    if (!disposed && !request.signal.aborted) error.value = failure(cause)
  } finally {
    if (!disposed && !request.signal.aborted) loadingConfigs.value = false
  }
}
async function refresh() {
  const id = selectedVps.value,
    code = selectedMetric.value
  if (id == null || !code || disposed) return
  snapshotRequest?.abort()
  const request = new AbortController()
  snapshotRequest = request
  const revision = socketRevision
  loading.value = true
  error.value = ''
  try {
    const data = await getVpsPerformance(id, code, request.signal)
    if (disposed || request.signal.aborted || revision !== socketRevision) return
    current.value = data
  } catch (cause) {
    if (!disposed && !request.signal.aborted && revision === socketRevision)
      error.value = failure(cause)
  } finally {
    if (!disposed && !request.signal.aborted) loading.value = false
  }
}
function subscribe() {
  stopSocket?.()
  stopSocket = undefined
  snapshotRequest?.abort()
  const session = ++generation
  socketRevision = 0
  current.value = null
  loading.value = false
  liveStatus.value = 'connecting'
  const id = selectedVps.value,
    code = selectedMetric.value
  if (id == null || !code) return
  const query = { ...route.query, vps: String(id), metric: code }
  if (route.query.vps !== query.vps || route.query.metric !== code) void router.replace({ query })
  stopSocket = connectVpsPerformance(
    id,
    code,
    (data) => {
      if (disposed || session !== generation) return
      if (!data) {
        void refresh()
        return
      }
      socketRevision++
      current.value = data
      error.value = ''
      loading.value = false
    },
    (status) => {
      if (!disposed && session === generation) liveStatus.value = status
    },
  )
  void refresh()
}
watch(selectedVps, () => {
  void loadConfigs()
})
watch([selectedVps, selectedMetric], subscribe)
watch(
  () => [route.query.vps, route.query.metric],
  () => {
    const id = Number(route.query.vps)
    if (!vpsList.value.some((v) => v.vpsId === id)) return
    if (selectedVps.value !== id) selectedVps.value = id
    else if (
      typeof route.query.metric === 'string' &&
      configs.value.some((c) => c.code === route.query.metric)
    )
      selectedMetric.value = route.query.metric
  },
)
onBeforeRouteLeave(() => !saving.value)
onBeforeRouteUpdate(() => !saving.value)
onMounted(() => {
  void initialize()
})
onBeforeUnmount(() => {
  disposed = true
  generation++
  configRequest?.abort()
  snapshotRequest?.abort()
  stopSocket?.()
})
</script>

<template>
  <main class="events-page">
    <header>
      <div>
        <span class="eyebrow">{{ isMysql ? 'GIÁM SÁT MYSQL' : 'GIÁM SÁT VPS' }}</span>
        <h1>{{ isMysql ? 'Event MySQL' : 'Event VPS' }}</h1>
        <p>Cấu hình điều kiện theo từng object và theo dõi event phát sinh trực tiếp.</p>
      </div>
      <span v-if="selectedMetric" class="live-state" :class="liveStatus" role="status">{{
        liveStatus === 'live'
          ? '● Đang nhận trực tiếp'
          : liveStatus === 'offline'
            ? 'Mất kết nối · Đang thử lại'
            : 'Đang kết nối socket...'
      }}</span>
    </header>
    <p v-if="error" class="error" role="alert">
      {{ error }}
      <button
        type="button"
        :disabled="saving"
        @click="!vpsList.length ? initialize() : !configs.length ? loadConfigs() : refresh()"
      >
        Thử lại
      </button>
    </p>
    <p v-if="initializing" class="empty" role="status">Đang tải danh sách target...</p>
    <p v-else-if="!vpsList.length && !error" class="empty">
      Chưa có target nào được đăng ký. Hãy đăng ký máy chủ hoặc MySQL trước khi cấu hình event.
    </p>
    <template v-else-if="vpsList.length">
      <section class="filters" aria-label="Chọn target và metric">
        <div>
          <label for="event-vps">Target giám sát</label
          ><select id="event-vps" v-model="selectedVps" :disabled="saving">
            <option v-for="vps in vpsList" :key="vps.vpsId" :value="vps.vpsId">
              {{ vps.hostname || vps.ipAddress }} · {{ vps.ipAddress }}
            </option>
          </select>
        </div>
        <div>
          <label for="event-metric">Metric</label
          ><select
            id="event-metric"
            v-model="selectedMetric"
            :disabled="saving || loadingConfigs || !configs.length"
          >
            <option v-if="!selectedMetric" value="">
              {{ loadingConfigs ? 'Đang tải metric...' : 'Chưa có metric' }}
            </option>
            <option v-for="item in visibleMetrics" :key="item.code" :value="item.code">
              {{ item.name }}{{ item.unit ? ` (${item.unit})` : '' }}
            </option>
          </select>
        </div>
        <button
          class="primary"
          type="button"
          :disabled="loading || loadingConfigs || saving || !selectedMetric"
          @click="refresh"
        >
          {{ loading ? 'Đang tải...' : 'Làm mới' }}
        </button>
      </section>
      <p v-if="loadingConfigs || (loading && !current)" class="empty" role="status">
        Đang tải cấu hình và lịch sử event...
      </p>
      <p v-else-if="!selectedMetric && !error" class="empty">VPS này chưa được gán metric.</p>
      <p v-if="saving" class="hint" role="status">
        Đang lưu cấu hình. Vui lòng đợi trước khi chuyển VPS hoặc metric.
      </p>
      <template v-if="selectedVps != null && selectedMetric && current">
        <MetricEventRules
          ref="editor"
          :key="`rules:${selectedVps}:${selectedMetric}`"
          :vps-id="selectedVps"
          :metric-code="selectedMetric"
          :metric-name="metric?.name || selectedMetric"
          :unit="metric?.unit || ''"
          :objects="current.objects"
          @saved="refresh"
        />
        <VpsEventHistory
          :key="`events:${selectedVps}:${selectedMetric}`"
          :vps-id="selectedVps"
          :metric-code="selectedMetric"
          :unit="metric?.unit || ''"
          :events="current.events || []"
        />
      </template>
    </template>
  </main>
</template>

<style scoped>
.events-page {
  max-width: 1320px;
  margin: auto;
  padding: 30px 24px;
  color: #27354a;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 1.5px;
  font-weight: 700;
  color: #8391a4;
}
h1 {
  font-size: 27px;
  margin: 7px 0 10px;
  font-weight: 750;
}
header p,
.hint {
  font-size: 13px;
  line-height: 1.7;
  color: #7a879a;
  margin: 0;
}
.live-state {
  font-size: 12px;
  white-space: nowrap;
  color: #8290a3;
}
.live {
  color: #287864;
}
.offline {
  color: #a5642a;
}
.filters {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  background: white;
  border: 1px solid #e3e8ef;
  padding: 22px;
  border-radius: 16px;
}
.filters > div {
  flex: 1;
  min-width: 0;
}
label {
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin-bottom: 8px;
}
select {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid #dce3ed;
  border-radius: 9px;
  color: #3b506b;
  background: #f9fbfd;
  font-size: 13px;
}
button {
  cursor: pointer;
  border: 1px solid #dce3ed;
  border-radius: 9px;
  padding: 11px 16px;
  background: #f7f9fc;
  color: #526c8b;
  font-size: 13px;
}
button.primary {
  background: #4c7099;
  color: white;
  border: 0;
  font-weight: 600;
}
button:disabled,
select:disabled {
  opacity: 0.55;
  cursor: wait;
}
button:focus-visible,
select:focus-visible {
  outline: 3px solid #b4cbe3;
  outline-offset: 3px;
}
.empty {
  padding: 30px;
  text-align: center;
  background: #f5f8fc;
  color: #7e8da1;
  border-radius: 13px;
  font-size: 14px;
  margin-top: 20px;
}
.error {
  padding: 15px 18px;
  color: #a34f48;
  background: #fff1ef;
  border: 1px solid #efd8d3;
  border-radius: 12px;
  font-size: 13px;
}
.error button {
  border: 0;
  background: none;
  color: inherit;
  text-decoration: underline;
}
.hint {
  margin-top: 14px;
}
@media (max-width: 650px) {
  .events-page {
    padding: 20px 14px;
  }
  header {
    flex-wrap: wrap;
  }
  h1 {
    font-size: 23px;
  }
  .filters {
    flex-direction: column;
    align-items: stretch;
    padding: 18px;
  }
  .filters > div {
    width: 100%;
  }
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MetricScheduleDialog from './MetricScheduleDialog.vue'
import axios from 'axios'
import { Chart, registerables } from 'chart.js'
import { listVps, type MonitorVps } from '@/monitor/monitorVpsService'
import {
  getPerformanceMetrics,
  getVpsPerformance,
  getMetricConfigs,
  type MetricConfig,
  type PerformanceMetric,
  type PerformanceObject,
  type PerformancePoint,
  type VpsPerformance,
} from '@/monitor/vpsPerformanceService'

import { connectVpsPerformance, type PerformanceLiveStatus } from '@/monitor/vpsPerformanceRealtime'

Chart.register(...registerables)
const route = useRoute()
const router = useRouter()
const showSchedules = ref(false)
const scheduleButton = ref<HTMLButtonElement | null>(null)
watch(
  () => route.query.schedules,
  (value) => {
    if (value === '1') showSchedules.value = true
  },
  { immediate: true },
)
function closeSchedules() {
  showSchedules.value = false
  if (route.query.schedules)
    void router.replace({ query: { ...route.query, schedules: undefined } })
  void nextTick(() => scheduleButton.value?.focus())
}
async function schedulesSaved() {
  const id = selectedVps.value
  if (id == null) return
  try {
    const [catalog, links] = await Promise.all([getPerformanceMetrics(), getMetricConfigs(id)])
    if (disposed || id !== selectedVps.value) return
    metrics.value = catalog
    configs.value = links
  } catch {
    /* The dialog displays the save result; the socket still supplies collection updates. */
  }
}
const vpsList = ref<MonitorVps[]>([])
const metrics = ref<PerformanceMetric[]>([])
const configs = ref<MetricConfig[]>([])
const config = computed(() => configs.value.find((c) => c.code === selectedMetric.value))
const visibleMetrics = computed(() =>
  metrics.value.filter((m) => configs.value.some((c) => c.code === m.code)),
)
const selectedVps = ref<number | null>(null)
const selectedMetric = ref('CPU_USAGE')
const selectedObject = ref('')
const minutes = ref(10)
const current = ref<VpsPerformance | null>(null)
const history = ref<VpsPerformance | null>(null)
const error = ref('')
const historyError = ref('')
const loading = ref(false)
const loadingHistory = ref(false)
const initializing = ref(true)
const liveStatus = ref<PerformanceLiveStatus>('connecting')
const clock = ref(Date.now())
const updatedAt = ref<Date | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const metric = computed(() => metrics.value.find((m) => m.code === selectedMetric.value))
const object = computed(() =>
  current.value?.objects.find((o) => o.objectKey === selectedObject.value),
)
let request: AbortController | undefined
let historyRequest: AbortController | undefined
let chart: Chart | undefined
let chartRevision = 0
let timer: ReturnType<typeof setInterval> | undefined
let stopSocket: (() => void) | undefined
let socketRevision = 0
const livePoints = new Map<string, PerformancePoint[]>()
let disposed = false
const message = (cause: unknown) =>
  axios.isAxiosError(cause)
    ? cause.response?.data?.message ||
      (cause.response?.status === 403
        ? 'Bạn không có quyền xem metric VPS.'
        : 'Không tải được dữ liệu. Vui lòng kiểm tra kết nối và thử lại.')
    : 'Không tải được dữ liệu. Vui lòng thử lại.'
const formatValue = (value: number | null | undefined) =>
  value == null
    ? 'Chưa có dữ liệu'
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
const latest = (item: PerformanceObject) => item.points[item.points.length - 1]

async function initialize() {
  initializing.value = true
  error.value = ''
  try {
    const [servers, catalog] = await Promise.all([listVps(), getPerformanceMetrics()])
    if (disposed) return
    vpsList.value = servers
    metrics.value = catalog
    const id = Number(route.query.vps)
    selectedVps.value = servers.find((v) => v.vpsId === id)?.vpsId ?? servers[0]?.vpsId ?? null
    await nextTick()
  } catch (cause) {
    if (!disposed) error.value = message(cause)
  } finally {
    initializing.value = false
  }
  if (!disposed) {
    subscribe()
    await refresh()
  }
}

async function refresh() {
  if (selectedVps.value == null || initializing.value) return
  request?.abort()
  const controller = new AbortController()
  request = controller
  loading.value = true
  error.value = ''
  const revision = socketRevision
  try {
    const links = await getMetricConfigs(selectedVps.value, controller.signal)
    if (controller.signal.aborted || disposed) return
    configs.value = links
    if (!links.some((c) => c.code === selectedMetric.value)) {
      if (links[0]) selectedMetric.value = links[0].code
      else {
        current.value = null
        loading.value = false
      }
      return
    }
    const result = await getVpsPerformance(
      selectedVps.value,
      selectedMetric.value,
      controller.signal,
    )
    if (controller.signal.aborted || disposed) return
    if (revision === socketRevision) applySnapshot(result)
    void loadHistory()
  } catch (cause) {
    if (!controller.signal.aborted && !disposed && revision === socketRevision) {
      error.value = message(cause)
      current.value = null
      updatedAt.value = null
      selectedObject.value = ''
    }
  } finally {
    if (!controller.signal.aborted && !disposed) loading.value = false
  }
}

async function loadHistory() {
  historyRequest?.abort()
  chart?.destroy()
  chart = undefined
  history.value = null
  historyError.value = ''
  if (!selectedObject.value || selectedVps.value == null) {
    loadingHistory.value = false
    return
  }
  const controller = new AbortController()
  historyRequest = controller
  loadingHistory.value = true
  try {
    const result = await getVpsPerformance(
      selectedVps.value,
      selectedMetric.value,
      controller.signal,
      undefined,
      selectedObject.value,
      minutes.value,
    )
    if (controller.signal.aborted || disposed) return
    history.value = result
    const series = result.objects[0]
    if (series) series.points = mergePoints(series.points, livePoints.get(series.objectKey) || [])
    await renderChart(series?.points || [])
  } catch (cause) {
    if (!controller.signal.aborted && !disposed) historyError.value = message(cause)
  } finally {
    if (!controller.signal.aborted && !disposed) loadingHistory.value = false
  }
}

async function renderChart(points: PerformancePoint[]) {
  const revision = ++chartRevision
  chart?.destroy()
  chart = undefined
  await nextTick()
  if (disposed || revision !== chartRevision) return
  if (canvas.value && points.length) {
    chart = new Chart(canvas.value, {
      type: 'line',
      data: {
        labels: points.map((p) => new Date(p.timestamp * 1000).toLocaleString('vi-VN')),
        datasets: [
          {
            label: `${object.value?.objectName || 'Object'} (${metric.value?.unit || ''})`,
            data: points.map((p) => p.value),
            borderColor: '#527ca9',
            backgroundColor: '#527ca918',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 5,
              maxRotation: 0,
              callback: (value) => {
                const point = points[Number(value)]
                if (!point) return ''
                const time = new Date(point.timestamp * 1000)
                return minutes.value > 1440
                  ? time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                  : time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              },
            },
          },
          y: { title: { display: true, text: metric.value?.unit || 'Giá trị' } },
        },
        plugins: { legend: { display: false } },
      },
    })
  }
}

watch([selectedVps, selectedMetric], () => {
  chartRevision++
  current.value = null
  selectedObject.value = ''
  updatedAt.value = null
  historyRequest?.abort()
  history.value = null
  chart?.destroy()
  chart = undefined
  livePoints.clear()
  socketRevision++
  if (!initializing.value) {
    subscribe()
    void refresh()
  }
})
watch([selectedObject, minutes], () => void loadHistory())
function applySnapshot(result: VpsPerformance) {
  current.value = result
  if (result.scheduleSeconds)
    configs.value = configs.value.map((c) =>
      c.code === result.metricCode
        ? { ...c, effectiveScheduleSeconds: result.scheduleSeconds! }
        : c,
    )
  updatedAt.value = new Date()
  if (!result.objects.some((o) => o.objectKey === selectedObject.value))
    selectedObject.value = result.objects[0]?.objectKey || ''
}
function mergePoints(base: PerformancePoint[], incoming: PerformancePoint[]) {
  const points = new Map(base.map((p) => [p.timestamp, p]))
  for (const p of incoming) points.set(p.timestamp, p)
  const cutoff = Date.now() / 1000 - minutes.value * 60
  return [...points.values()]
    .filter((p) => p.timestamp >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-1000)
}
function subscribe() {
  stopSocket?.()
  stopSocket = undefined
  liveStatus.value = 'connecting'
  if (selectedVps.value == null || disposed) return
  const id = selectedVps.value,
    code = selectedMetric.value
  stopSocket = connectVpsPerformance(
    id,
    code,
    (data) => {
      if (disposed || selectedVps.value !== id || selectedMetric.value !== code) return
      if (!data) {
        void refresh()
        return
      }
      socketRevision++
      applySnapshot(data)
      for (const item of data.objects)
        livePoints.set(
          item.objectKey,
          mergePoints(livePoints.get(item.objectKey) || [], item.points),
        )
      const series = history.value?.objects[0]
      if (series) {
        series.points = mergePoints(series.points, livePoints.get(series.objectKey) || [])
        void renderChart(series.points)
      }
    },
    (status) => {
      if (!disposed && selectedVps.value === id && selectedMetric.value === code)
        liveStatus.value = status
    },
  )
}
const objects = computed(
  () =>
    current.value?.objects.map((item) => ({
      ...item,
      stale:
        item.stale ||
        (!!latest(item) &&
          clock.value / 1000 - latest(item)!.timestamp >
            (config.value?.effectiveScheduleSeconds || metric.value?.scheduleSeconds || 60) * 2 +
              10),
    })) || [],
)
onMounted(() => {
  void initialize()
  timer = setInterval(() => {
    clock.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  disposed = true
  request?.abort()
  historyRequest?.abort()
  chart?.destroy()
  clearInterval(timer)
  stopSocket?.()
})
</script>

<template>
  <main class="perf-page">
    <header>
      <div>
        <span class="eyebrow">GIÁM SÁT VPS</span>
        <h1>Hiệu năng từng object</h1>
        <p>Tải dữ liệu 10 phút gần nhất từ DB, sau đó nối tiếp giá trị mới qua socket.</p>
      </div>
      <button
        ref="scheduleButton"
        type="button"
        @click="showSchedules = true"
        aria-haspopup="dialog"
        class="link-button"
      >
        <i class="bi bi-sliders" aria-hidden="true"></i> Lịch thu thập
      </button>
    </header>
    <div v-if="error" role="alert" class="error-message">
      {{ error }}
      <button type="button" @click="initializing || !vpsList.length ? initialize() : refresh()">
        Thử lại
      </button>
    </div>
    <div v-if="initializing" role="status" class="empty">Đang tải danh sách máy chủ...</div>
    <div v-else-if="!vpsList.length && !error" class="empty">
      Chưa có VPS nào được đăng ký. Hãy đăng ký máy chủ trước khi xem hiệu năng.
    </div>
    <template v-else-if="vpsList.length">
      <section class="filters">
        <div>
          <label for="perf-vps">Máy chủ VPS</label
          ><select id="perf-vps" v-model="selectedVps">
            <option v-for="vps in vpsList" :key="vps.vpsId" :value="vps.vpsId">
              {{ vps.hostname || vps.ipAddress }} · {{ vps.ipAddress }}
            </option>
          </select>
        </div>
        <div>
          <label for="perf-metric">Metric</label
          ><select id="perf-metric" v-model="selectedMetric">
            <option v-for="item in visibleMetrics" :key="item.code" :value="item.code">
              {{ item.name }}{{ item.unit ? ` (${item.unit})` : '' }}
            </option>
          </select>
        </div>
        <button class="primary" type="button" :disabled="loading" @click="refresh">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
          {{ loading ? 'Đang tải...' : 'Làm mới' }}
        </button>
      </section>
      <div class="status-line">
        <span class="state" :class="current?.state?.toLowerCase()">{{
          current?.state === 'UP'
            ? 'Có dữ liệu thu thập gần đây'
            : current?.state === 'PAUSED'
              ? 'Đã tắt thu thập metric này'
              : current?.state === 'DOWN'
                ? 'Thu thập lỗi hoặc dữ liệu đã cũ'
                : 'Chưa thu thập'
        }}</span
        ><span v-if="updatedAt">Cập nhật lúc {{ updatedAt.toLocaleTimeString('vi-VN') }}</span
        ><span class="auto" role="status" :class="liveStatus">{{
          liveStatus === 'live'
            ? '● Đang nhận trực tiếp'
            : liveStatus === 'connecting'
              ? 'Đang kết nối socket...'
              : 'Mất kết nối · Đang thử lại'
        }}</span>
        <span v-if="config">Chu kỳ {{ config.effectiveScheduleSeconds }} giây</span>
      </div>
      <div v-if="current?.collectionError" class="error-message" role="alert">
        {{ current.collectionError }}
      </div>
      <div v-if="loading && !current" role="status" class="empty">Đang lấy giá trị metric...</div>
      <div v-else-if="current && !current.objects.length" class="empty">
        Chưa có object cho metric này. Object sẽ được nhận diện trong lần thu thập thành công.
      </div>
      <div v-else-if="current?.objects.length" class="perf-grid">
        <section class="panel">
          <h2>
            Object của metric <span>{{ current.objects.length }}</span>
          </h2>
          <p class="hint">Chọn object để xem lịch sử riêng.</p>
          <div class="object-list">
            <button
              v-for="item in objects"
              :key="item.objectKey"
              class="object-row"
              :class="{ selected: selectedObject === item.objectKey }"
              type="button"
              :aria-pressed="selectedObject === item.objectKey"
              @click="selectedObject = item.objectKey"
            >
              <span
                ><strong>{{ item.objectName }}</strong
                ><small>{{
                  Object.entries(item.labels)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' · ') || 'Metric toàn máy chủ'
                }}</small
                ><small v-if="latest(item)">{{
                  new Date(latest(item)!.timestamp * 1000).toLocaleString('vi-VN')
                }}</small
                ><small
                  v-if="item.status === 'OFFLINE' || (item.stale && latest(item))"
                  class="stale"
                  >{{
                    item.status === 'OFFLINE' ? 'Object không hoạt động' : 'Giá trị đã cũ'
                  }}</small
                ></span
              ><span class="value"
                >{{ formatValue(latest(item)?.value)
                }}<small v-if="latest(item)?.value != null">{{ metric?.unit }}</small></span
              >
            </button>
          </div>
        </section>
        <section class="panel history-panel">
          <div class="chart-heading">
            <div>
              <h2>{{ object?.objectName }}</h2>
              <p class="hint">{{ metric?.name }} · {{ metric?.unit || 'Giá trị' }}</p>
            </div>
            <div>
              <label for="perf-hours" class="visually-hidden">Khoảng thời gian</label
              ><select id="perf-hours" v-model="minutes">
                <option :value="10">10 phút gần nhất</option>
                <option :value="60">1 giờ</option>
                <option :value="360">6 giờ</option>
                <option :value="1440">24 giờ</option>
                <option :value="10080">7 ngày</option>
              </select>
            </div>
          </div>
          <div v-if="historyError" class="error-message" role="alert">
            {{ historyError }} <button @click="loadHistory">Thử lại</button>
          </div>
          <p v-if="loadingHistory" role="status" class="hint">Đang tải lịch sử...</p>
          <p v-else-if="history && !history.objects[0]?.points.length" class="empty">
            Chưa có lịch sử cho object này.
          </p>
          <div class="chart-container">
            <canvas
              ref="canvas"
              role="img"
              :aria-label="`Biểu đồ ${metric?.name} của ${object?.objectName}`"
            ></canvas>
          </div>
          <p class="hint">
            Giá trị thiếu được hiển thị là khoảng trống. Thời gian hiển thị theo múi giờ trên máy
            bạn.
          </p>
        </section>
      </div>
    </template>
  </main>
  <MetricScheduleDialog
    v-if="showSchedules"
    :vps-id="selectedVps"
    :metric-code="selectedMetric"
    @close="closeSchedules"
    @saved="schedulesSaved"
  />
</template>

<style scoped>
.auto.live {
  color: #287864;
}
.auto.offline {
  color: #a5642a;
}
.object-row small.stale {
  color: #b07837;
}
.perf-page {
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
.link-button,
button.primary {
  background: #4c7099;
  color: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  text-decoration: none;
  white-space: nowrap;
  border: 0;
  font-size: 13px;
  font-weight: 600;
}
.filters {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  background: #fff;
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
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
button:focus-visible,
a:focus-visible,
select:focus-visible {
  outline: 3px solid #b4cbe3;
  outline-offset: 3px;
}
.status-line {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 20px 0;
  color: #8290a3;
  font-size: 12px;
}
.state {
  padding: 6px 10px;
  border-radius: 8px;
  background: #e9eef5;
  color: #6b7b91;
}
.state.up {
  color: #347a60;
  background: #e8f5ef;
}
.state.down {
  color: #a44e48;
  background: #fff0ed;
}
.auto {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 0 auto;
  font-weight: 400;
}
.perf-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr);
  gap: 20px;
}
.panel {
  padding: 24px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 17px;
  min-width: 0;
}
h2 {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 6px;
}
h2 > span {
  font-size: 12px;
  color: #6e8baa;
  background: #eef3f9;
  border-radius: 6px;
  padding: 3px 7px;
  margin-left: 6px;
}
.object-list {
  margin-top: 20px;
  max-height: 520px;
  overflow-y: auto;
}
.object-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  width: 100%;
  padding: 16px 12px;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  color: #304760;
  margin-bottom: 10px;
}
.object-row.selected {
  border-color: #92afce;
  background: #f0f6fc;
}
.object-row strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}
.object-row small {
  display: block;
  font-size: 11px;
  color: #8191a5;
  margin-top: 6px;
  overflow-wrap: anywhere;
}
.value {
  text-align: right;
  font-weight: 700;
  flex-shrink: 0;
  font-size: 15px;
}
.value small {
  font-weight: 400;
}
.chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.chart-container {
  height: 320px;
  position: relative;
  margin: 18px 0;
}
.empty {
  padding: 35px 24px;
  text-align: center;
  background: #f5f8fc;
  color: #7e8da1;
  border-radius: 13px;
  font-size: 14px;
}
.error-message {
  padding: 15px 18px;
  color: #a34f48;
  background: #fff1ef;
  border: 1px solid #efd8d3;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 18px;
}
.error-message button {
  background: transparent;
  color: inherit;
  border: 0;
  text-decoration: underline;
  padding: 4px 8px;
}
@media (max-width: 1000px) {
  .perf-grid {
    grid-template-columns: 1fr;
  }
  .object-list {
    max-height: 280px;
  }
}
@media (max-width: 650px) {
  .perf-page {
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
  .auto {
    margin-left: 0;
  }
  .panel {
    padding: 18px;
  }
  .chart-container {
    height: 260px;
  }
}
</style>

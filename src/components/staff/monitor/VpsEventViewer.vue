<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { listVps, type MonitorVps } from '@/monitor/monitorVpsService'
import { getPerformanceMetrics, type PerformanceMetric } from '@/monitor/vpsPerformanceService'
import {
  getVpsEvents,
  severityLabels,
  type EventSeverity,
  type MonitorEvent,
  type VpsEventQuery,
} from '@/monitor/monitorEventService'
import { connectVpsEvents } from '@/monitor/vpsEventRealtime'
import type { PerformanceLiveStatus } from '@/monitor/vpsPerformanceRealtime'
import EventTable from './EventTable.vue'

const props = defineProps<{ realtime: boolean }>()
const route = useRoute(),
  router = useRouter()
const vpsList = ref<MonitorVps[]>([]),
  metrics = ref<PerformanceMetric[]>([])
const selectedVps = ref<number | null>(null),
  selectedMetric = ref(''),
  selectedSeverity = ref<EventSeverity | ''>('')
const isMysql = computed(() => vpsList.value.find(vps => vps.vpsId === selectedVps.value)?.exporterType === 'MYSQL_JDBC')
const events = ref<MonitorEvent[]>([]),
  cursor = ref<number | null>(null)
const initializing = ref(true),
  loading = ref(false),
  loadingMore = ref(false),
  error = ref('')
const queried = ref(false),
  liveStatus = ref<PerformanceLiveStatus>('connecting')
const localTime = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
const toTime = ref(localTime(new Date())),
  fromTime = ref(localTime(new Date(Date.now() - 3600000)))
const applied = ref<VpsEventQuery | null>(null)
const visible = computed(() =>
  props.realtime
    ? events.value.filter(
        (e) =>
          (!selectedMetric.value || e.metricCode === selectedMetric.value) &&
          (!selectedSeverity.value || e.severity === selectedSeverity.value),
      )
    : events.value,
)
const appliedLabel = computed(() =>
  applied.value?.from && applied.value.to
    ? `${new Date(applied.value.from).toLocaleString('vi-VN')} → ${new Date(applied.value.to).toLocaleString('vi-VN')}`
    : '',
)
let disposed = false,
  generation = 0
let request: AbortController | undefined,
  moreRequest: AbortController | undefined,
  stopSocket: (() => void) | undefined
const failure = (cause: unknown) =>
  axios.isAxiosError(cause) && typeof cause.response?.data?.message === 'string'
    ? cause.response.data.message
    : 'Không tải được event. Vui lòng thử lại.'
const sorted = (rows: MonitorEvent[]) =>
  [...new Map(rows.map((e) => [e.eventId, e])).values()].sort(
    (a, b) => b.timestamp - a.timestamp || b.eventId - a.eventId,
  )
const latestRealtime = (rows: MonitorEvent[]) => {
  const names = new Set<string>()
  return sorted(rows)
    .filter((event) => {
      const key = JSON.stringify([event.metricCode, event.objectKey, event.ruleName])
      if (names.has(key)) return false
      names.add(key)
      return true
    })
    .slice(0, 200)
}
let pendingLive: MonitorEvent[] = []
async function initialize() {
  initializing.value = true
  error.value = ''
  try {
    const [servers, catalog] = await Promise.all([listVps(), getPerformanceMetrics()])
    if (disposed) return
    vpsList.value = servers
    metrics.value = catalog
    selectedVps.value =
      servers.find((v) => v.vpsId === Number(route.query.vps))?.vpsId ?? servers[0]?.vpsId ?? null
    selectedMetric.value = catalog.some((m) => m.code === route.query.metric)
      ? String(route.query.metric)
      : ''
  } catch (cause) {
    if (!disposed) error.value = failure(cause)
  } finally {
    if (!disposed) initializing.value = false
  }
}
function stop() {
  generation++
  request?.abort()
  moreRequest?.abort()
  stopSocket?.()
  stopSocket = undefined
  loading.value = false
  loadingMore.value = false
  events.value = []
  pendingLive = []
  cursor.value = null
  queried.value = false
  applied.value = null
  error.value = ''
}
function selectVps() {
  stop()
  const id = selectedVps.value,
    session = generation
  if (id == null || !props.realtime) return
  liveStatus.value = 'connecting'
  stopSocket = connectVpsEvents(
    id,
    (rows) => {
      if (disposed || session !== generation) return
      if (!rows) {
        void search()
        return
      }
      if (loading.value) pendingLive = latestRealtime([...pendingLive, ...rows])
      events.value = latestRealtime([...events.value, ...rows])
      queried.value = true
    },
    (status) => {
      if (!disposed && session === generation) liveStatus.value = status
    },
  )
  void search()
}
async function search() {
  const id = selectedVps.value
  if (id == null) return
  let query: VpsEventQuery = {}
  if (!props.realtime) {
    const from = new Date(fromTime.value),
      to = new Date(toTime.value)
    if (
      !fromTime.value ||
      !toTime.value ||
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      from > to
    ) {
      error.value = 'Chọn mốc bắt đầu và kết thúc hợp lệ; bắt đầu không được sau kết thúc.'
      return
    }
    query = {
      from: from.toISOString(),
      to: to.toISOString(),
      metric: selectedMetric.value || undefined,
      severity: selectedSeverity.value || undefined,
    }
  }
  request?.abort()
  moreRequest?.abort()
  loadingMore.value = false
  const controller = new AbortController()
  request = controller
  const session = generation
  loading.value = true
  error.value = ''
  pendingLive = []
  try {
    const page = await getVpsEvents(id, query, controller.signal)
    if (disposed || controller.signal.aborted || session !== generation) return
    events.value = props.realtime
      ? latestRealtime([...page.events, ...pendingLive])
      : page.events
    cursor.value = page.nextCursor
    queried.value = true
    applied.value = query
  } catch (cause) {
    if (!disposed && !controller.signal.aborted && session === generation)
      error.value = failure(cause)
  } finally {
    if (!disposed && !controller.signal.aborted && session === generation) loading.value = false
  }
}
async function older() {
  if (
    loadingMore.value ||
    loading.value ||
    cursor.value == null ||
    selectedVps.value == null ||
    !applied.value
  )
    return
  const controller = new AbortController()
  moreRequest = controller
  const session = generation
  loadingMore.value = true
  error.value = ''
  try {
    const page = await getVpsEvents(
      selectedVps.value,
      { ...applied.value, beforeId: cursor.value },
      controller.signal,
    )
    if (disposed || controller.signal.aborted || session !== generation) return
    events.value = sorted([...events.value, ...page.events])
    cursor.value = page.nextCursor
  } catch (cause) {
    if (!disposed && !controller.signal.aborted && session === generation)
      error.value = failure(cause)
  } finally {
    if (!disposed && !controller.signal.aborted && session === generation) loadingMore.value = false
  }
}
watch(selectedVps, selectVps)
watch(() => props.realtime, selectVps)
watch(
  () => route.query.vps,
  (value) => {
    const id = Number(value)
    if (vpsList.value.some((v) => v.vpsId === id)) selectedVps.value = id
  },
)
onMounted(() => {
  void initialize()
})
onBeforeUnmount(() => {
  disposed = true
  stop()
})
function historyLink() {
  void router.push({
    path: '/staff/monitoring/vps/events/history',
    query: { vps: selectedVps.value, metric: selectedMetric.value || undefined },
  })
}
</script>
<template>
  <main class="event-viewer">
    <header>
      <div>
        <span class="eyebrow">{{ isMysql ? 'GIÁM SÁT MYSQL' : 'GIÁM SÁT VPS' }}</span>
        <h1>{{ realtime ? 'Event realtime' : 'Lịch sử event' }}</h1>
        <p>
          {{
            realtime
              ? 'Nhận event mới của mọi metric trên target qua socket.'
              : 'Tra cứu event đã lưu theo mốc thời gian, metric và cấp độ.'
          }}
        </p>
      </div>
      <span
        v-if="realtime && selectedVps != null"
        class="connection"
        :class="liveStatus"
        role="status"
        >{{
          liveStatus === 'live'
            ? '● Đang nhận trực tiếp'
            : liveStatus === 'offline'
              ? 'Mất kết nối · Đang thử lại'
              : 'Đang kết nối socket...'
        }}</span
      >
    </header>
    <p v-if="error" class="error" role="alert">
      {{ error }}
      <button type="button" @click="!vpsList.length ? initialize() : search()">Thử lại</button>
    </p>
    <p v-if="initializing" class="empty" role="status">Đang tải danh sách target...</p>
    <p v-else-if="!vpsList.length && !error" class="empty">Chưa có target nào được đăng ký.</p>
    <template v-else-if="vpsList.length">
      <form class="filters" @submit.prevent="search">
        <div>
          <label for="event-view-vps">Target giám sát</label
          ><select id="event-view-vps" v-model="selectedVps">
            <option v-for="vps in vpsList" :key="vps.vpsId" :value="vps.vpsId">
              {{ vps.hostname || vps.ipAddress }} · {{ vps.ipAddress }}
            </option>
          </select>
        </div>
        <div>
          <label for="event-view-metric">Metric</label
          ><select id="event-view-metric" v-model="selectedMetric">
            <option value="">Tất cả metric</option>
            <option v-for="metric in metrics" :key="metric.code" :value="metric.code">
              {{ metric.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="event-view-severity">Mức độ</label
          ><select id="event-view-severity" v-model="selectedSeverity">
            <option value="">Tất cả mức độ</option>
            <option v-for="(label, key) in severityLabels" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </div>
        <template v-if="!realtime"
          ><div>
            <label for="event-from">Từ thời điểm</label
            ><input id="event-from" v-model="fromTime" type="datetime-local" step="1" required />
          </div>
          <div>
            <label for="event-to">Đến thời điểm</label
            ><input id="event-to" v-model="toTime" type="datetime-local" step="1" required /></div
        ></template>
        <button type="submit" class="primary" :disabled="loading">
          {{ loading ? 'Đang tải...' : realtime ? 'Đồng bộ lại' : 'Tra cứu' }}
        </button>
      </form>
      <section class="results" aria-label="Danh sách event">
        <div class="results-heading">
          <div>
            <h2>{{ realtime ? 'Event mới nhất của VPS' : 'Kết quả tra cứu' }}</h2>
            <p v-if="realtime">
              {{ visible.length }} event hiển thị · Mỗi tên event chỉ hiện bản mới nhất trên từng
              metric/object (tối đa 200).
            </p>
            <p v-else-if="queried">{{ events.length }} event · {{ appliedLabel }}</p>
          </div>
          <button v-if="realtime" type="button" @click="historyLink">Xem theo thời gian</button>
        </div>
        <p v-if="loading" role="status" class="hint">Đang tải event từ DB...</p>
        <p v-if="!queried && !loading" class="empty">
          {{ realtime ? 'Đang chờ event...' : 'Chọn VPS và khoảng thời gian, sau đó bấm Tra cứu.' }}
        </p>
        <p v-else-if="queried && !visible.length && !loading" class="empty">
          {{
            realtime
              ? 'Chưa có event phù hợp trong các event gần nhất.'
              : 'Không có event trong khoảng thời gian và bộ lọc đã chọn.'
          }}
        </p>
        <EventTable v-if="visible.length" :events="visible" />
        <button
          v-if="!realtime && cursor != null"
          type="button"
          :disabled="loading || loadingMore"
          @click="older"
        >
          {{ loadingMore ? 'Đang tải...' : 'Xem thêm event' }}
        </button>
      </section>
      <p class="hint">Thời gian hiển thị theo múi giờ trên máy bạn.</p>
    </template>
  </main>
</template>
<style scoped>
.event-viewer {
  max-width: 1400px;
  margin: auto;
  padding: 30px 24px;
  color: #27354a;
}
header,
.results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
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
}
h2 {
  font-size: 17px;
  margin: 0 0 6px;
}
p,
.hint {
  font-size: 13px;
  line-height: 1.7;
  color: #7a879a;
}
.connection {
  font-size: 12px;
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
  flex-wrap: wrap;
  gap: 16px;
  padding: 22px;
  border: 1px solid #e3e8ef;
  border-radius: 16px;
  background: white;
}
.filters > div {
  flex: 1;
  min-width: 180px;
}
label {
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin-bottom: 8px;
}
select,
input {
  box-sizing: border-box;
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
  padding: 11px 16px;
  border: 1px solid #dce3ed;
  border-radius: 9px;
  background: #f7f9fc;
  color: #526c8b;
  font-size: 13px;
}
.primary {
  background: #4c7099;
  color: white;
  border: 0;
}
button:disabled {
  opacity: 0.55;
  cursor: wait;
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 3px solid #b4cbe3;
  outline-offset: 3px;
}
.results {
  padding: 24px;
  background: white;
  border: 1px solid #e3e8ef;
  border-radius: 17px;
  margin-top: 22px;
}
.results-heading p {
  margin: 0;
}
.empty {
  padding: 28px;
  text-align: center;
  background: #f5f8fc;
  border-radius: 12px;
}
.error {
  padding: 15px 18px;
  color: #a34f48;
  background: #fff1ef;
  border: 1px solid #efd8d3;
  border-radius: 12px;
}
.error button {
  border: 0;
  background: none;
  color: inherit;
  text-decoration: underline;
}
@media (max-width: 650px) {
  .event-viewer {
    padding: 20px 14px;
  }
  header,
  .results-heading {
    flex-wrap: wrap;
  }
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  .filters > div {
    width: 100%;
  }
  .results {
    padding: 18px;
  }
}
</style>

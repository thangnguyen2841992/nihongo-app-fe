<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import {
  getMonitorEvents,
  operatorLabels,
  severityLabels,
  type MonitorEvent,
} from '@/monitor/monitorEventService'

const props = defineProps<{
  vpsId: number
  metricCode: string
  unit: string
  events: MonitorEvent[]
}>()
const items = ref<MonitorEvent[]>([])
const loading = ref(false)
const more = ref(false)
const error = ref('')
const request = new AbortController()
let disposed = false
let historyRevision = 0
function merge(events: MonitorEvent[]) {
  items.value = [...new Map([...items.value, ...events].map((e) => [e.eventId, e])).values()].sort(
    (a, b) => b.eventId - a.eventId,
  )
}
watch(
  () => props.events,
  (events) => {
    // If more than one page arrived while disconnected, reload from the new cursor.
    // Merging the old page would otherwise skip the events between the two pages.
    if (
      events.length >= 50 &&
      items.value.length &&
      events[events.length - 1]!.eventId > items.value[0]!.eventId
    ) {
      items.value = []
      historyRevision++
      error.value = ''
    }
    if (!items.value.length) more.value = events.length >= 50
    merge(events)
  },
  { immediate: true },
)
async function older() {
  if (loading.value || !items.value.length) return
  loading.value = true
  error.value = ''
  const revision = historyRevision
  try {
    const events = await getMonitorEvents(
      props.vpsId,
      props.metricCode,
      items.value[items.value.length - 1]!.eventId,
      request.signal,
    )
    if (disposed || revision !== historyRevision) return
    merge(events)
    more.value = events.length === 50
  } catch {
    if (!disposed && revision === historyRevision)
      error.value = 'Không tải được event cũ. Vui lòng thử lại.'
  } finally {
    if (!disposed) loading.value = false
  }
}
onBeforeUnmount(() => {
  disposed = true
  request.abort()
})
const value = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n)
</script>

<template>
  <section class="events" aria-labelledby="vps-events-title">
    <div class="heading">
      <div>
        <h2 id="vps-events-title">Event của metric</h2>
        <p>Lưu trong DB và cập nhật trực tiếp. Các object được đánh giá độc lập.</p>
      </div>
      <span>{{ items.length }} event</span>
    </div>
    <p v-if="!items.length" class="empty">
      Chưa phát sinh event. Mở “Cấu hình event” để đặt điều kiện.
    </p>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Event / object</th>
            <th>Mức độ</th>
            <th>Trạng thái</th>
            <th>Giá trị ghi nhận</th>
            <th>Điều kiện</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in items" :key="event.eventId">
            <td>{{ new Date(event.timestamp * 1000).toLocaleString('vi-VN') }}</td>
            <td>
              <strong>{{ event.ruleName }}</strong
              ><small
                >{{ event.objectName }} · #{{ event.eventId
                }}<template v-if="event.openedEventId">
                  · Hồi phục event #{{ event.openedEventId }}</template
                ></small
              >
            </td>
            <td>
              <span class="badge" :class="event.severity.toLowerCase()">{{
                severityLabels[event.severity]
              }}</span>
            </td>
            <td>
              <span class="badge" :class="{ recovered: event.kind === 'RECOVERY' }">{{
                event.kind === 'RECOVERY' ? 'Hồi phục' : 'Phát sinh'
              }}</span>
            </td>
            <td>{{ value(event.value) }} {{ unit }}</td>
            <td>{{ operatorLabels[event.operator] }} {{ value(event.threshold) }} {{ unit }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <button v-if="more" type="button" :disabled="loading" @click="older">
      {{ loading ? 'Đang tải...' : 'Xem event cũ hơn' }}
    </button>
  </section>
</template>

<style scoped>
.events {
  margin-top: 22px;
  padding: 24px;
  background: white;
  border: 1px solid #e3e8ef;
  border-radius: 17px;
  color: #304760;
}
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  font-size: 17px;
  margin: 0 0 6px;
}
p,
small,
.heading > span {
  font-size: 12px;
  color: #7a879a;
  line-height: 1.6;
}
.table-scroll {
  overflow: auto;
  max-height: 420px;
  margin-top: 18px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
th {
  text-align: left;
  color: #70839b;
  font-weight: 600;
  background: #f5f8fc;
  position: sticky;
  top: 0;
}
th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid #edf1f6;
  white-space: nowrap;
}
strong {
  display: block;
  max-width: 260px;
  white-space: normal;
  overflow-wrap: anywhere;
}
small {
  display: block;
  margin-top: 5px;
}
.badge {
  border-radius: 6px;
  padding: 5px 8px;
  background: #edf3fb;
  color: #51729c;
}
.minor {
  background: #edf3fb;
  color: #51729c;
}
.warning {
  background: #fff4df;
  color: #94631f;
}
.critical {
  background: #ffebe8;
  color: #a84e49;
}
.fatal {
  background: #f6e3ed;
  color: #8c2453;
  border: 1px solid #e5b8ce;
  font-weight: 700;
}
.recovered {
  background: #eaf6ef;
  color: #307654;
}
.empty {
  padding: 22px;
  text-align: center;
  background: #f6f8fc;
  border-radius: 10px;
}
button {
  margin-top: 15px;
  padding: 9px 13px;
  border: 1px solid #dce4ef;
  border-radius: 8px;
  background: #f7f9fc;
  color: #526c8b;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
}
button:focus-visible {
  outline: 3px solid #b4cbe3;
  outline-offset: 2px;
}
.error {
  color: #a34f48;
}
@media (max-width: 650px) {
  .events {
    padding: 18px;
  }
}
</style>

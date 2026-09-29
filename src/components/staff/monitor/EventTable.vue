<script setup lang="ts">
import { operatorLabels, severityLabels, type MonitorEvent } from '@/monitor/monitorEventService'
defineProps<{ events: MonitorEvent[] }>()
const number = (value: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
</script>
<template>
  <div class="event-table-scroll">
    <table>
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Metric / object</th>
          <th>Event</th>
          <th>Mức độ</th>
          <th>Trạng thái</th>
          <th>Giá trị</th>
          <th>Điều kiện</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="event in events" :key="event.eventId">
          <td>{{ new Date(event.timestamp * 1000).toLocaleString('vi-VN') }}</td>
          <td>
            <strong>{{ event.metricName || event.metricCode }}</strong
            ><small>{{ event.objectName }}</small>
          </td>
          <td>
            <strong>{{ event.ruleName }}</strong
            ><small
              >#{{ event.eventId
              }}<template v-if="event.openedEventId">
                · Hồi phục #{{ event.openedEventId }}</template
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
          <td>{{ number(event.value) }} {{ event.unit }}</td>
          <td>
            {{ operatorLabels[event.operator] }} {{ number(event.threshold) }} {{ event.unit }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.event-table-scroll {
  overflow: auto;
  max-height: 650px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #304760;
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
  padding: 14px 12px;
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
  font-size: 11px;
  color: #7a879a;
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
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import axios from 'axios'
import { listVps, type MonitorVps } from '@/monitor/monitorVpsService'
import {
  getPerformanceMetrics,
  getMetricConfigs,
  updateVpsMetricConfig,
  updateDefaultMetricConfig,
  type PerformanceMetric,
  type MetricConfig,
} from '@/monitor/vpsPerformanceService'

interface Draft {
  seconds: number
  timeout: number
  inherited: boolean
  enabled: boolean
  saving: boolean
  notice: string
  failed: boolean
}
const route = useRoute()
const props = defineProps<{
  embedded?: boolean
  initialVps?: number | null
  initialMetric?: string
}>()
const emit = defineEmits<{ saved: [] }>()
const selectedCode = ref(props.initialMetric || '')
const servers = ref<MonitorVps[]>([])
const metrics = ref<PerformanceMetric[]>([])
const configs = ref<MetricConfig[]>([])
const selectedVps = ref<number | null>(null)
const scope = ref('vps')
const drafts = ref<Record<string, Draft>>({})
const loading = ref(true)
const error = ref('')
const saving = computed(() => Object.values(drafts.value).some((d) => d.saving))
const availableRows = computed(() =>
  scope.value === 'default'
    ? metrics.value
    : metrics.value.filter((m) => configs.value.some((c) => c.code === m.code)),
)
const rows = computed(() =>
  selectedCode.value
    ? availableRows.value.filter((m) => m.code === selectedCode.value)
    : availableRows.value,
)
defineExpose({ saving })
let request: AbortController | undefined
let disposed = false
const message = (cause: unknown) =>
  axios.isAxiosError(cause)
    ? cause.response?.data?.message || 'Không tải hoặc lưu được cấu hình. Vui lòng thử lại.'
    : 'Không tải hoặc lưu được cấu hình. Vui lòng thử lại.'
function resetDraft(metric: PerformanceMetric) {
  const link = configs.value.find((c) => c.code === metric.code)
  drafts.value[metric.code] = {
    seconds:
      scope.value === 'default'
        ? metric.scheduleSeconds
        : link?.effectiveScheduleSeconds || metric.scheduleSeconds,
    timeout: metric.timeoutMs,
    inherited: link?.scheduleSeconds == null,
    enabled: scope.value === 'default' ? metric.enabled : !!link?.enabled,
    saving: false,
    notice: '',
    failed: false,
  }
}
async function load() {
  request?.abort()
  const controller = new AbortController()
  request = controller
  loading.value = true
  error.value = ''
  try {
    const [catalog, links] = await Promise.all([
      getPerformanceMetrics(),
      selectedVps.value == null
        ? Promise.resolve([])
        : getMetricConfigs(selectedVps.value, controller.signal),
    ])
    if (disposed || controller.signal.aborted) return
    metrics.value = catalog
    configs.value = links
    if (!availableRows.value.some((m) => m.code === selectedCode.value)) selectedCode.value = ''
    drafts.value = {}
    availableRows.value.forEach(resetDraft)
  } catch (cause) {
    if (!disposed && !controller.signal.aborted) error.value = message(cause)
  } finally {
    if (!disposed && !controller.signal.aborted) loading.value = false
  }
}
async function initialize() {
  loading.value = true
  error.value = ''
  try {
    servers.value = await listVps()
    if (disposed) return
    selectedVps.value =
      servers.value.find((v) => v.vpsId === (props.initialVps || Number(route.query.vps)))?.vpsId ||
      servers.value[0]?.vpsId ||
      null
    await load()
  } catch (cause) {
    if (!disposed) {
      error.value = message(cause)
      loading.value = false
    }
  }
}
async function save(metric: PerformanceMetric) {
  const draft = drafts.value[metric.code]
  if (!draft || draft.saving) return
  draft.notice = ''
  draft.failed = false
  if (
    (!draft.inherited || scope.value === 'default') &&
    (!Number.isInteger(draft.seconds) || draft.seconds < 5 || draft.seconds > 86400)
  ) {
    draft.failed = true
    draft.notice = 'Chu kỳ phải là số nguyên từ 5 đến 86400 giây.'
    return
  }
  if (
    scope.value === 'default' &&
    (!Number.isInteger(draft.timeout) || draft.timeout < 1000 || draft.timeout > 30000)
  ) {
    draft.failed = true
    draft.notice = 'Timeout phải từ 1000 đến 30000 ms.'
    return
  }
  draft.saving = true
  try {
    if (scope.value === 'default') {
      await updateDefaultMetricConfig(metric.metricId, {
        scheduleSeconds: draft.seconds,
        timeoutMs: draft.timeout,
        enabled: draft.enabled,
      })
      metric.scheduleSeconds = draft.seconds
      metric.timeoutMs = draft.timeout
      metric.enabled = draft.enabled
    } else if (selectedVps.value != null) {
      const saved = await updateVpsMetricConfig(selectedVps.value, metric.code, {
        scheduleSeconds: draft.inherited ? null : draft.seconds,
        enabled: draft.enabled,
      })
      if (saved) {
        configs.value = configs.value.map((c) => (c.code === saved.code ? saved : c))
        draft.seconds = saved.effectiveScheduleSeconds
      }
    } else return
    draft.notice = 'Đã lưu. Áp dụng từ lần thu thập tiếp theo.'
    emit('saved')
  } catch (cause) {
    draft.failed = true
    draft.notice = message(cause)
  } finally {
    draft.saving = false
  }
}
watch([selectedVps, scope], () => {
  if (!loading.value) void load()
})
onMounted(() => void initialize())
onBeforeUnmount(() => {
  disposed = true
  request?.abort()
})
</script>

<template>
  <section class="schedule-page" :class="{ embedded: props.embedded }">
    <header v-if="!props.embedded">
      <div>
        <span class="eyebrow">GIÁM SÁT VPS</span>
        <h1>Lịch thu thập metric</h1>
        <p>Điều chỉnh chu kỳ, bật/tắt từng metric và chọn lịch riêng cho từng máy chủ.</p>
      </div>
      <RouterLink
        :to="{
          path: '/staff/monitoring/vps/performance',
          query: { vps: selectedVps || undefined },
        }"
        class="link-button"
        ><i class="bi bi-graph-up" aria-hidden="true"></i> Hiệu năng trực tiếp</RouterLink
      >
    </header>
    <div v-if="error" class="error" role="alert">
      {{ error }} <button @click="initialize">Thử lại</button>
    </div>
    <section class="filters">
      <div>
        <label for="schedule-scope">Phạm vi</label
        ><select id="schedule-scope" v-model="scope" :disabled="saving || loading">
          <option value="vps">Từng VPS</option>
          <option value="default">Mặc định của metric</option>
        </select>
      </div>
      <div v-if="scope === 'vps'">
        <label for="schedule-vps">Máy chủ VPS</label
        ><select id="schedule-vps" v-model="selectedVps" :disabled="saving || loading">
          <option v-for="vps in servers" :key="vps.vpsId" :value="vps.vpsId">
            {{ vps.hostname || vps.ipAddress }} · {{ vps.ipAddress }}
          </option>
        </select>
      </div>
      <div v-if="props.embedded">
        <label for="schedule-metric">Metric</label
        ><select id="schedule-metric" v-model="selectedCode" :disabled="saving || loading">
          <option value="">Tất cả metric</option>
          <option v-for="metric in availableRows" :key="metric.code" :value="metric.code">
            {{ metric.name }}
          </option>
        </select>
      </div>
    </section>
    <p class="scope-note">
      {{
        scope === 'default'
          ? 'Lịch mặc định áp dụng cho VPS dùng lịch chung. Tắt metric tại đây sẽ dừng thu thập metric đó trên mọi VPS.'
          : 'Mỗi metric có thể dùng lịch mặc định hoặc chu kỳ riêng trên VPS đang chọn.'
      }}
    </p>
    <div v-if="loading" class="empty" role="status">Đang tải cấu hình...</div>
    <div v-else-if="!rows.length && !error" class="empty">
      {{
        servers.length
          ? 'Chưa có metric được gán cho VPS này.'
          : 'Chưa có VPS được đăng ký. Bạn vẫn có thể cấu hình lịch mặc định.'
      }}
    </div>
    <section v-else-if="rows.length" class="metric-list" aria-label="Lịch thu thập từng metric">
      <article v-for="metric in rows" :key="metric.code" class="metric-card">
        <template v-if="drafts[metric.code]">
          <div class="metric-heading">
            <div>
              <h2>{{ metric.name }}</h2>
              <span class="code">{{ metric.code }}</span
              ><small v-if="scope === 'vps'"
                >Mặc định: {{ metric.scheduleSeconds }} giây · Timeout
                {{ metric.timeoutMs }} ms</small
              >
            </div>
            <span
              class="badge"
              :class="{
                paused: !drafts[metric.code]!.enabled || (scope === 'vps' && !metric.enabled),
              }"
              >{{
                drafts[metric.code]!.enabled && (scope === 'default' || metric.enabled)
                  ? 'Đang bật'
                  : 'Tạm dừng'
              }}</span
            >
          </div>
          <fieldset :disabled="drafts[metric.code]!.saving">
            <div class="fields">
              <label :for="`seconds-${metric.code}`"
                >Chu kỳ (giây)<input
                  :id="`seconds-${metric.code}`"
                  v-model.number="drafts[metric.code]!.seconds"
                  type="number"
                  min="5"
                  max="86400"
                  step="1"
                  :disabled="scope === 'vps' && drafts[metric.code]!.inherited"
              /></label>
              <label v-if="scope === 'default'" :for="`timeout-${metric.code}`"
                >Timeout (ms)<input
                  :id="`timeout-${metric.code}`"
                  v-model.number="drafts[metric.code]!.timeout"
                  type="number"
                  min="1000"
                  max="30000"
              /></label>
              <label v-if="scope === 'vps'" class="check"
                ><input
                  v-model="drafts[metric.code]!.inherited"
                  type="checkbox"
                  @change="
                    drafts[metric.code]!.inherited &&
                    (drafts[metric.code]!.seconds = metric.scheduleSeconds)
                  "
                />
                Dùng lịch mặc định</label
              >
              <label class="check"
                ><input v-model="drafts[metric.code]!.enabled" type="checkbox" /> Bật thu
                thập</label
              >
              <button class="primary" type="button" @click="save(metric)">
                {{ drafts[metric.code]!.saving ? 'Đang lưu...' : 'Lưu cấu hình' }}
              </button>
            </div>
          </fieldset>
          <p v-if="scope === 'vps' && !metric.enabled" class="hint">
            Metric đang bị tắt ở cấu hình mặc định. Bật mặc định để tiếp tục thu thập trên VPS này.
          </p>
          <p
            v-if="drafts[metric.code]!.notice"
            :role="drafts[metric.code]!.failed ? 'alert' : 'status'"
            class="notice"
            :class="{ failed: drafts[metric.code]!.failed }"
          >
            {{ drafts[metric.code]!.notice }}
          </p>
        </template>
      </article>
    </section>
  </section>
</template>

<style scoped>
.schedule-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 30px;
  color: #283951;
}
.schedule-page.embedded {
  padding: 0;
}
header,
.metric-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
header {
  margin-bottom: 24px;
}
h1 {
  font-size: 28px;
  margin: 8px 0;
}
h2 {
  font-size: 17px;
  margin: 0 0 6px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  color: #6382a1;
  font-weight: 700;
}
header p,
.scope-note,
.hint {
  font-size: 13px;
  color: #708198;
  line-height: 1.6;
}
.link-button {
  padding: 11px 15px;
  border: 1px solid #dce4ed;
  border-radius: 10px;
  color: #42698d;
  text-decoration: none;
  white-space: nowrap;
}
.filters {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e1e7ef;
  border-radius: 14px;
}
.filters > div {
  flex: 1;
  min-width: 0;
}
label {
  display: block;
  font-size: 13px;
  font-weight: 600;
}
select,
input[type='number'] {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dce3ed;
  border-radius: 9px;
  background: #f9fbfd;
  color: #283951;
  font: inherit;
  margin-top: 8px;
}
.metric-list {
  display: grid;
  gap: 16px;
}
.metric-card {
  padding: 22px;
  background: #fff;
  border: 1px solid #e1e7ef;
  border-radius: 14px;
}
.metric-heading small {
  display: block;
  color: #738299;
  font-size: 12px;
  margin-top: 8px;
}
.code {
  font-size: 11px;
  color: #71859c;
}
.badge {
  padding: 6px 10px;
  border-radius: 20px;
  background: #e6f4ec;
  color: #36745b;
  font-size: 12px;
}
.badge.paused {
  background: #f3ede5;
  color: #927044;
}
.fields {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.fields > label:not(.check) {
  max-width: 200px;
  flex: 1;
  min-width: 130px;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 400;
  padding-bottom: 11px;
}
.primary {
  border: 0;
  border-radius: 9px;
  background: #527ca9;
  color: #fff;
  padding: 11px 16px;
  cursor: pointer;
  margin-left: auto;
}
.primary:disabled,
fieldset:disabled {
  opacity: 0.65;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 22px 0 0;
}
.notice {
  color: #36745b;
  font-size: 13px;
  margin: 16px 0 0;
}
.notice.failed,
.error {
  color: #a34848;
}
.error {
  background: #fff0f0;
  padding: 14px;
  border-radius: 9px;
  margin-bottom: 18px;
}
.empty {
  text-align: center;
  padding: 40px;
  color: #708198;
  background: #fff;
  border-radius: 14px;
}
.hint {
  margin: 14px 0 0;
}
@media (max-width: 700px) {
  .schedule-page {
    padding: 18px 12px;
  }
  header,
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  h1 {
    font-size: 24px;
  }
  .metric-card {
    padding: 18px;
  }
  .primary {
    width: 100%;
    margin-left: 0;
  }
  .fields {
    gap: 14px;
  }
  .fields > label:not(.check) {
    max-width: none;
  }
  .metric-heading {
    gap: 10px;
  }
}
</style>

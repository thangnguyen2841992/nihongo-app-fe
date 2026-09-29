<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import axios from 'axios'
import type { PerformanceObject } from '@/monitor/vpsPerformanceService'
import {
  getEventRules,
  saveEventRule,
  deleteEventRule,
  operatorLabels,
  severityLabels,
  type EventRule,
  type EventRuleInput,
} from '@/monitor/monitorEventService'

const props = defineProps<{
  vpsId: number
  metricCode: string
  metricName: string
  unit: string
  objects: PerformanceObject[]
}>()
const emit = defineEmits<{ saved: [] }>()
const nameInput = ref<HTMLInputElement | null>(null)
const rules = ref<EventRule[]>([])
const editing = ref<number | undefined>()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const removing = ref<number | null>(null)
const defaults = (): EventRuleInput => ({
  name: '',
  objectKey: 'all',
  operator: 'GTE',
  threshold: 80,
  severity: 'WARNING',
  consecutiveSamples: 2,
  enabled: true,
})
const form = reactive<EventRuleInput>(defaults())
const request = new AbortController()
let disposed = false
defineExpose({ saving })
function failure(cause: unknown) {
  return axios.isAxiosError(cause) && typeof cause.response?.data?.message === 'string'
    ? cause.response.data.message
    : 'Không lưu/tải được cấu hình event. Vui lòng thử lại.'
}
function reset() {
  editing.value = undefined
  removing.value = null
  Object.assign(form, defaults())
}
function edit(rule: EventRule) {
  editing.value = rule.ruleId
  removing.value = null
  Object.assign(form, rule)
  error.value = ''
  success.value = ''
  nameInput.value?.focus()
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    rules.value = await getEventRules(props.vpsId, props.metricCode, request.signal)
  } catch (cause) {
    if (!disposed) error.value = failure(cause)
  } finally {
    if (!disposed) loading.value = false
  }
}
async function save() {
  if (saving.value || loading.value) return
  error.value = ''
  success.value = ''
  if (
    !form.name.trim() ||
    !Number.isFinite(form.threshold) ||
    !Number.isInteger(form.consecutiveSamples) ||
    form.consecutiveSamples < 1 ||
    form.consecutiveSamples > 100
  ) {
    error.value = 'Nhập tên, ngưỡng hợp lệ và số mẫu liên tiếp từ 1 đến 100.'
    return
  }
  saving.value = true
  try {
    const input: EventRuleInput = {
      name: form.name.trim(),
      objectKey: form.objectKey,
      operator: form.operator,
      threshold: form.threshold,
      severity: form.severity,
      consecutiveSamples: form.consecutiveSamples,
      enabled: form.enabled,
    }
    const saved = await saveEventRule(props.vpsId, props.metricCode, input, editing.value)
    if (disposed) return
    rules.value = [...rules.value.filter((r) => r.ruleId !== saved.ruleId), saved].sort(
      (a, b) => a.ruleId - b.ruleId,
    )
    reset()
    success.value = 'Đã lưu rule. Áp dụng từ mẫu perf hợp lệ tiếp theo.'
    emit('saved')
  } catch (cause) {
    if (!disposed) error.value = failure(cause)
  } finally {
    if (!disposed) saving.value = false
  }
}
async function remove(rule: EventRule) {
  if (saving.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await deleteEventRule(props.vpsId, props.metricCode, rule.ruleId)
    if (disposed) return
    rules.value = rules.value.filter((r) => r.ruleId !== rule.ruleId)
    if (editing.value === rule.ruleId) reset()
    removing.value = null
    success.value = 'Đã xóa rule. Lịch sử event được giữ lại.'
    emit('saved')
  } catch (cause) {
    if (!disposed) error.value = failure(cause)
  } finally {
    if (!disposed) saving.value = false
  }
}
function target(key: string) {
  return key === 'all'
    ? 'Tất cả object (đánh giá riêng)'
    : props.objects.find((o) => o.objectKey === key)?.objectName || `Object #${key}`
}
onMounted(() => {
  void load()
})
onBeforeUnmount(() => {
  disposed = true
  request.abort()
})
</script>

<template>
  <section class="event-rules" aria-labelledby="event-rules-title">
    <header>
      <div>
        <h2 id="event-rules-title">Cấu hình event</h2>
        <p>Điều kiện phát sinh event cho {{ metricName }}.</p>
      </div>
    </header>
    <div class="body">
      <p class="hint">
        Phát event khi đủ mẫu liên tiếp vượt ngưỡng. Mỗi object chỉ có một event cảnh báo cho một
        đợt; có event hồi phục khi giá trị trở lại bình thường.
      </p>
      <p v-if="error" role="alert" class="error">
        {{ error }}
        <button v-if="loading === false && !rules.length" type="button" @click="load">
          Tải lại
        </button>
      </p>
      <p v-if="success" role="status" class="success">{{ success }}</p>
      <p v-if="loading" role="status">Đang tải rule...</p>
      <div class="layout">
        <section class="rules">
          <h3>
            Rule đã cấu hình <span>{{ rules.length }}</span>
          </h3>
          <p v-if="!loading && !rules.length" class="hint">
            Chưa có rule. Thêm điều kiện bên cạnh để phát sinh event.
          </p>
          <article v-for="rule in rules" :key="rule.ruleId" :class="{ disabled: !rule.enabled }">
            <div class="row">
              <strong>{{ rule.name }}</strong
              ><span class="badge" :class="rule.severity.toLowerCase()">{{
                severityLabels[rule.severity]
              }}</span>
            </div>
            <p>{{ target(rule.objectKey) }}</p>
            <p>
              Giá trị {{ operatorLabels[rule.operator] }} {{ rule.threshold }} {{ unit }} ·
              {{ rule.consecutiveSamples }} mẫu liên tiếp
            </p>
            <p class="hint">
              {{ rule.enabled ? 'Đang bật' : 'Đã tắt'
              }}<span v-if="rule.activeObjects">
                · {{ rule.activeObjects }} object đang cảnh báo (lúc tải)</span
              >
            </p>
            <div class="actions">
              <button :disabled="saving" type="button" @click="edit(rule)">Sửa</button>
              <template v-if="removing === rule.ruleId"
                ><button :disabled="saving" type="button" class="danger" @click="remove(rule)">
                  Xác nhận xóa</button
                ><button :disabled="saving" type="button" @click="removing = null">
                  Hủy
                </button></template
              >
              <button
                v-else
                :disabled="saving"
                type="button"
                class="danger"
                @click="removing = rule.ruleId"
              >
                Xóa
              </button>
            </div>
          </article>
        </section>
        <form @submit.prevent="save">
          <h3>{{ editing == null ? 'Thêm rule' : 'Sửa rule' }}</h3>
          <fieldset :disabled="saving || loading">
            <label for="rule-name">Tên event</label
            ><input
              ref="nameInput"
              id="rule-name"
              v-model="form.name"
              maxlength="100"
              required
              placeholder="Ví dụ: CPU quá tải"
            />
            <label for="rule-object">Phạm vi object</label
            ><select id="rule-object" v-model="form.objectKey">
              <option value="all">Tất cả object</option>
              <option v-for="object in objects" :key="object.objectKey" :value="object.objectKey">
                {{ object.objectName }}{{ object.status === 'OFFLINE' ? ' (offline)' : '' }}
              </option>
            </select>
            <p class="hint">
              Tất cả object bao gồm cả object phát hiện mới; ngưỡng áp dụng riêng từng object.
            </p>
            <div class="fields">
              <div>
                <label for="rule-operator">Điều kiện</label
                ><select id="rule-operator" v-model="form.operator">
                  <option v-for="(label, key) in operatorLabels" :key="key" :value="key">
                    {{ label }}
                  </option>
                </select>
              </div>
              <div>
                <label for="rule-threshold">Ngưỡng {{ unit ? `(${unit})` : '' }}</label
                ><input
                  id="rule-threshold"
                  type="number"
                  step="any"
                  v-model.number="form.threshold"
                  required
                />
              </div>
            </div>
            <div class="fields">
              <div>
                <label for="rule-severity">Mức độ</label
                ><select id="rule-severity" v-model="form.severity">
                  <option v-for="(label, key) in severityLabels" :key="key" :value="key">
                    {{ label }}
                  </option>
                </select>
              </div>
              <div>
                <label for="rule-samples">Số mẫu liên tiếp</label
                ><input
                  id="rule-samples"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  v-model.number="form.consecutiveSamples"
                  required
                />
              </div>
            </div>
            <label class="checkbox"
              ><input type="checkbox" v-model="form.enabled" /> Bật rule</label
            >
            <p class="hint">
              Sửa hoặc tắt rule sẽ reset trạng thái đánh giá. Event cũ vẫn được giữ; không đánh giá
              lại perf lịch sử.
            </p>
            <div class="actions">
              <button type="submit" class="primary">
                {{ saving ? 'Đang lưu...' : 'Lưu rule' }}</button
              ><button v-if="editing != null" type="button" @click="reset">Hủy sửa</button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.event-rules {
  margin-top: 22px;
  border: 1px solid #dce4ef;
  border-radius: 18px;
  background: #f6f8fc;
  color: #283951;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 24px 26px;
  background: white;
  border-bottom: 1px solid #e1e7ef;
}
h2 {
  margin: 8px 0;
  font-size: 23px;
}
h3 {
  font-size: 16px;
  margin: 0 0 16px;
}
p {
  font-size: 13px;
  line-height: 1.6;
  margin: 6px 0;
}
.hint {
  color: #708198;
  font-size: 12px;
}
.body {
  padding: 22px 26px;
}
.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  margin-top: 22px;
}
form,
.rules {
  min-width: 0;
  padding: 20px;
  background: white;
  border-radius: 14px;
  border: 1px solid #e1e7ef;
}
article {
  padding: 15px;
  border: 1px solid #e1e7ef;
  border-radius: 12px;
  margin-bottom: 12px;
}
.disabled {
  background: #f6f8fb;
}
.row,
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.actions {
  justify-content: flex-start;
  margin-top: 14px;
}
strong {
  overflow-wrap: anywhere;
  font-size: 13px;
}
.badge {
  font-size: 11px;
  border-radius: 6px;
  padding: 4px 7px;
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
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin: 15px 0 7px;
}
input:not([type='checkbox']),
select {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #dce4ef;
  border-radius: 8px;
  background: #f9fbfd;
  color: #334c6c;
  font: inherit;
  font-size: 13px;
}
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}
button {
  border: 1px solid #dce4ef;
  padding: 9px 13px;
  border-radius: 8px;
  background: #f7f9fc;
  color: #526c8b;
  cursor: pointer;
  font-size: 13px;
}
button:disabled,
fieldset:disabled {
  opacity: 0.55;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid #b4cbe3;
  outline-offset: 2px;
}
.primary {
  background: #4c7099;
  color: white;
  border-color: #4c7099;
}
.danger {
  color: #ab504a;
}
.error,
.success {
  padding: 12px;
  border-radius: 9px;
}
.error {
  background: #fff1ef;
  color: #a34f48;
}
.success {
  background: #eaf6ef;
  color: #307654;
}
@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }
  header,
  .body {
    padding: 18px 16px;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import axios from 'axios'
import {
  listKafkaTargets,
  probeKafkaTarget,
  registerKafkaTarget,
  replaceKafkaTargetCredentials,
  type KafkaProbe,
  type KafkaTarget,
  type KafkaTargetRequest,
} from '@/monitor/kafkaTargetService'

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const emit = defineEmits<{ registered: [target: KafkaTarget] }>()

const form = ref<KafkaTargetRequest>({
  name: '',
  bootstrapServers: '',
  securityProtocol: 'SASL_SSL',
  saslMechanism: 'SCRAM-SHA-512',
  username: '',
  password: '',
})
const targets = shallowRef<KafkaTarget[]>([])
const probe = shallowRef<KafkaProbe | null>(null)
const registered = shallowRef<KafkaTarget | null>(null)
const busy = ref(false)
const loadingList = ref(false)
const error = ref('')
const credentialsTarget = shallowRef<KafkaTarget | null>(null)
const replacementUsername = ref('')
const replacementPassword = ref('')
const credentialsError = ref('')
const credentialsSuccess = ref('')
const credentialsBusy = ref(false)
const usesSasl = computed(() => form.value.securityProtocol === 'SASL_SSL')

watch(form, () => {
  probe.value = null
  registered.value = null
  error.value = ''
}, { deep: true, flush: 'sync' })

function message(cause: unknown): string {
  if (!axios.isAxiosError(cause)) return 'Không thể thực hiện yêu cầu. Vui lòng thử lại.'
  if (cause.response?.status === 409) return 'Tên hoặc cụm Kafka này đã được đăng ký.'
  if (cause.response?.status === 401) return 'Phiên đăng nhập đã hết hạn.'
  if (cause.response?.status === 403) return 'Bạn không có quyền đăng ký target.'
  const detail = cause.response?.data?.message
  return typeof detail === 'string' && cause.response?.status !== 500
    ? detail
    : 'Không kết nối được Kafka. Kiểm tra broker, chứng chỉ TLS và tài khoản SASL.'
}

function request(): KafkaTargetRequest {
  return {
    ...form.value,
    saslMechanism: usesSasl.value ? form.value.saslMechanism : null,
    username: usesSasl.value ? form.value.username : null,
    password: usesSasl.value ? form.value.password : null,
  }
}

async function loadTargets() {
  loadingList.value = true
  try { targets.value = await listKafkaTargets() }
  catch (cause) { error.value = message(cause) }
  finally { loadingList.value = false }
}

async function check() {
  busy.value = true
  error.value = ''
  probe.value = null
  try { probe.value = await probeKafkaTarget(request()) }
  catch (cause) { error.value = message(cause) }
  finally { busy.value = false }
}

async function register() {
  if (!probe.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const target = await registerKafkaTarget(request())
    form.value.password = ''
    registered.value = target
    targets.value = [target, ...targets.value.filter(item => item.vpsId !== target.vpsId)]
    emit('registered', target)
  } catch (cause) { error.value = message(cause) }
  finally { busy.value = false }
}

function openCredentials(target: KafkaTarget) {
  credentialsTarget.value = target
  replacementUsername.value = ''
  replacementPassword.value = ''
  credentialsError.value = ''
}

function closeCredentials() {
  if (credentialsBusy.value) return
  credentialsTarget.value = null
  replacementUsername.value = ''
  replacementPassword.value = ''
  credentialsError.value = ''
}

async function saveCredentials() {
  const target = credentialsTarget.value
  if (!target || !replacementUsername.value.trim() || !replacementPassword.value || credentialsBusy.value) return
  credentialsBusy.value = true
  credentialsError.value = ''
  try {
    await replaceKafkaTargetCredentials(target.vpsId, replacementUsername.value.trim(), replacementPassword.value)
    credentialsSuccess.value = `Đã cập nhật tài khoản SASL cho ${target.hostname}. Dữ liệu và lịch sử giám sát được giữ nguyên.`
    credentialsTarget.value = null
    replacementUsername.value = ''
    replacementPassword.value = ''
  } catch (cause) { credentialsError.value = message(cause) }
  finally { credentialsBusy.value = false }
}

onMounted(() => { void loadTargets() })
</script>

<template>
  <main class="kafka-page" :class="{ embedded }">
    <header v-if="!embedded" class="page-header">
      <span class="icon"><i class="bi bi-diagram-3" aria-hidden="true"></i></span>
      <div><span class="eyebrow">GIÁM SÁT MESSAGE BROKER</span><h1>Đăng ký Kafka</h1><p>Theo dõi broker, topic, partition, replica và consumer lag bằng Kafka Admin API.</p></div>
    </header>
    <div v-if="error" class="notice error" role="alert">{{ error }}</div>
    <div v-if="credentialsSuccess" class="notice success" role="status">{{ credentialsSuccess }}</div>
    <div v-if="registered" class="notice success" role="status">Đã đăng ký {{ registered.hostname }}. <RouterLink :to="`/staff/monitoring/vps/performance?vps=${registered.vpsId}`">Xem metric</RouterLink></div>

    <div class="layout">
      <section class="panel">
        <h2>Thông tin cụm Kafka</h2>
        <p class="help">Có thể nhập tối đa 10 broker, cách nhau bằng dấu phẩy. Tài khoản SASL chỉ cần quyền đọc metadata, consumer group và offset.</p>
        <form @submit.prevent="check">
          <label for="kafka-name">Tên target</label>
          <input id="kafka-name" v-model.trim="form.name" required maxlength="200" placeholder="Kafka production" :disabled="busy" />
          <label for="kafka-brokers">Bootstrap servers</label>
          <input id="kafka-brokers" v-model.trim="form.bootstrapServers" required maxlength="1000" placeholder="broker-1.example.com:9093,broker-2.example.com:9093" :disabled="busy" />
          <div class="row">
            <div><label for="kafka-security">Bảo mật kết nối</label><select id="kafka-security" v-model="form.securityProtocol" :disabled="busy"><option value="SASL_SSL">TLS + SASL</option><option value="SSL">Chỉ TLS</option><option value="PLAINTEXT">Không mã hóa</option></select></div>
            <div v-if="usesSasl"><label for="kafka-mechanism">Cơ chế SASL</label><select id="kafka-mechanism" v-model="form.saslMechanism" :disabled="busy"><option value="SCRAM-SHA-512">SCRAM-SHA-512</option><option value="SCRAM-SHA-256">SCRAM-SHA-256</option><option value="PLAIN">PLAIN</option></select></div>
          </div>
          <div v-if="usesSasl" class="row">
            <div><label for="kafka-user">Tài khoản giám sát</label><input id="kafka-user" v-model.trim="form.username" required maxlength="256" autocomplete="username" :disabled="busy" /></div>
            <div><label for="kafka-password">Mật khẩu</label><input id="kafka-password" v-model="form.password" type="password" required maxlength="512" autocomplete="new-password" :disabled="busy" /></div>
          </div>
          <p class="help tls-help">Khi dùng TLS, chứng chỉ của broker phải được Java trên staff service tin cậy và hostname phải khớp chứng chỉ. Mật khẩu SASL được mã hóa trước khi lưu.</p>
          <div class="actions"><button type="submit" :disabled="busy">{{ busy && !probe ? 'Đang kiểm tra...' : 'Kiểm tra kết nối' }}</button><button type="button" class="primary" :disabled="busy || !probe || !!registered" @click="register">{{ busy && probe ? 'Đang đăng ký...' : 'Đăng ký giám sát' }}</button></div>
        </form>
      </section>

      <section class="panel">
        <h2>Kết quả kiểm tra</h2>
        <div v-if="probe" class="probe">
          <p><strong>Đã kết nối</strong> · Cluster {{ probe.clusterId || 'không cung cấp ID' }}</p>
          <dl><div><dt>Broker</dt><dd>{{ probe.brokerCount }}</dd></div><div><dt>Controller</dt><dd>{{ probe.controllerId ?? '—' }}</dd></div><div><dt>Topic</dt><dd>{{ probe.topicCount }}</dd></div><div><dt>Partition</dt><dd>{{ probe.partitionCount }}</dd></div><div><dt>Consumer group</dt><dd>{{ probe.consumerGroupCount ?? 'Không có quyền đọc' }}</dd></div></dl>
        </div>
        <p v-else class="empty">Nhập thông tin rồi chọn Kiểm tra kết nối. Hệ thống sẽ đọc metadata trực tiếp từ cụm Kafka.</p>
      </section>
    </div>

    <section class="panel list">
      <div class="list-heading"><div><h2>Cụm Kafka đã đăng ký</h2><p class="help">Metric được thu thập theo lịch và dùng chung biểu đồ, event cùng cảnh báo của hệ thống.</p></div><button type="button" :disabled="loadingList" @click="loadTargets">Làm mới</button></div>
      <p v-if="loadingList" role="status">Đang tải...</p><p v-else-if="!targets.length" class="empty">Chưa có target Kafka.</p>
      <div v-else class="table-wrap"><table><thead><tr><th>Tên</th><th>Bootstrap servers</th><th>Bảo mật</th><th>Cluster ID</th><th>Metric</th><th>Thao tác</th></tr></thead><tbody><tr v-for="target in targets" :key="target.vpsId"><td>{{ target.hostname }}</td><td>{{ target.bootstrapServers || `${target.ipAddress}:${target.agentPort}` }}</td><td>{{ target.securityProtocol || '—' }}<small v-if="target.saslMechanism"> · {{ target.saslMechanism }}</small></td><td>{{ target.osVersion || '—' }}</td><td><RouterLink :to="`/staff/monitoring/vps/performance?vps=${target.vpsId}`">Xem hiệu năng</RouterLink></td><td><button v-if="target.securityProtocol === 'SASL_SSL'" type="button" @click="openCredentials(target)">Cập nhật SASL</button><span v-else>—</span></td></tr></tbody></table></div>
    </section>

    <div v-if="credentialsTarget" class="modal-backdrop" @click.self="closeCredentials">
      <section class="credentials-dialog panel" role="dialog" aria-modal="true" aria-labelledby="kafka-credentials-title">
        <h2 id="kafka-credentials-title">Cập nhật tài khoản SASL</h2>
        <p class="help">{{ credentialsTarget.hostname }} · {{ credentialsTarget.bootstrapServers }}</p>
        <p class="help">Hệ thống kiểm tra tài khoản mới trước khi thay thế và giữ nguyên target, metric cùng lịch sử.</p>
        <div v-if="credentialsError" class="notice error" role="alert">{{ credentialsError }}</div>
        <form @submit.prevent="saveCredentials">
          <label for="kafka-replacement-user">Tài khoản</label><input id="kafka-replacement-user" v-model.trim="replacementUsername" required maxlength="256" autocomplete="username" :disabled="credentialsBusy" />
          <label for="kafka-replacement-password">Mật khẩu</label><input id="kafka-replacement-password" v-model="replacementPassword" type="password" required maxlength="512" autocomplete="new-password" :disabled="credentialsBusy" />
          <div class="actions"><button type="button" :disabled="credentialsBusy" @click="closeCredentials">Hủy</button><button type="submit" class="primary" :disabled="credentialsBusy || !replacementUsername.trim() || !replacementPassword">{{ credentialsBusy ? 'Đang kiểm tra...' : 'Kiểm tra và cập nhật' }}</button></div>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.kafka-page{max-width:1180px;margin:auto;padding:32px 24px 48px;color:#27354a}.page-header{display:flex;gap:18px;align-items:center;margin-bottom:26px}.icon{display:grid;place-items:center;flex:none;width:62px;height:62px;border-radius:18px;background:#eeeafb;color:#6955a3;font-size:28px}.eyebrow{font-size:11px;letter-spacing:1.5px;color:#796c9b;font-weight:700}h1{font-size:28px;margin:4px 0 8px}h2{font-size:17px;margin:0 0 7px}p{margin:0;line-height:1.6}.page-header p,.help,.empty{color:#758394;font-size:13px}.layout{display:grid;grid-template-columns:1.25fr 1fr;gap:22px}.panel{background:#fff;border:1px solid #e3e8ef;border-radius:18px;padding:25px;box-shadow:0 8px 28px #27354a08}.list{margin-top:22px}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.row>div{min-width:0}label{display:block;margin:18px 0 7px;font-size:13px;font-weight:650}input,select{width:100%;box-sizing:border-box;border:1px solid #dce3ed;border-radius:10px;padding:11px 13px;color:#27354a;background:#fbfcfe}input:focus,select:focus{outline:3px solid #aa9bd270;border-color:#7662ae}.tls-help{margin-top:15px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}button{border:1px solid #ded8ee;border-radius:10px;background:#f1eef8;color:#66529e;padding:10px 15px;font-weight:650;cursor:pointer}.primary{background:#6b57a3;color:#fff}button:disabled{opacity:.55;cursor:not-allowed}.notice{padding:14px 17px;border-radius:10px;margin-bottom:18px;font-size:13px}.error{background:#fff3f2;color:#a84d45}.success{background:#eef8f3;color:#36775f}.empty{padding:30px 0}.probe{padding-top:20px}.probe strong{color:#65519b}.probe dl{margin-top:18px}.probe dl div{display:flex;justify-content:space-between;border-bottom:1px solid #eef1f4;padding:13px 0;gap:12px}.probe dt{color:#718092}.probe dd{margin:0;font-weight:700;text-align:right}.list-heading{display:flex;justify-content:space-between;gap:16px;align-items:start}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;margin-top:15px;font-size:13px;text-align:left}th,td{padding:13px;border-bottom:1px solid #e8edf2;vertical-align:middle}th{color:#6d7d90;background:#f7f9fc}td:nth-child(2){max-width:290px;overflow-wrap:anywhere}a{color:#66529e;font-weight:650}.modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:#14273891}.credentials-dialog{width:min(100%,460px);max-height:calc(100vh - 40px);overflow:auto}.credentials-dialog .help{margin-top:12px}.credentials-dialog .notice{margin-top:16px}@media(max-width:900px){.layout{grid-template-columns:1fr}}@media(max-width:600px){.kafka-page{padding:20px 14px}.row{grid-template-columns:1fr}.page-header{align-items:flex-start}.icon{width:48px;height:48px;font-size:22px}}
.kafka-page.embedded{max-width:none;padding:0}@media(max-width:600px){.kafka-page.embedded{padding:0}}
</style>

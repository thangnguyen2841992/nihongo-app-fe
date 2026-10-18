<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RegisterVps from './RegisterVps.vue'
import RegisterMysql from './RegisterMysql.vue'
import RegisterKafka from './RegisterKafka.vue'
import RegisterCheck from './RegisterCheck.vue'
import {
  monitoringTargetTypes,
  serverOsType,
  serverOsTypes,
  targetType,
  type MonitoringTargetType,
  type ServerOsType,
} from '@/monitor/monitoringTargetTypes'

const route = useRoute()
const router = useRouter()
const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const emit = defineEmits<{ registered: [target: { vpsId: number }] }>()
const localType = ref<MonitoringTargetType>('server')
const localOs = ref<ServerOsType>('linux')
const components = {
  server: RegisterVps,
  mysql: RegisterMysql,
  kafka: RegisterKafka,
  port: RegisterCheck,
  web: RegisterCheck,
}
const selectedType = computed(() => props.embedded ? localType.value : targetType(route.query.type))
const selectedOs = computed(() => props.embedded ? localOs.value : serverOsType(route.query.os))
const selectedDefinition = computed(() => monitoringTargetTypes.find(item => item.id === selectedType.value)!)
const selectedComponent = computed(() => components[selectedType.value])

function chooseType(type: MonitoringTargetType) {
  if (props.embedded) { localType.value = type; return }
  const query = type === 'server' ? { type, os: selectedOs.value } : { type }
  void router.replace({ path: '/staff/monitoring/register', query })
}

function chooseOs(os: ServerOsType) {
  if (props.embedded) { localOs.value = os; return }
  void router.replace({ path: '/staff/monitoring/register', query: { type: 'server', os } })
}
</script>

<template>
  <main class="registration-page" :class="{ embedded }">
    <header v-if="!embedded" class="registration-header">
      <span class="header-icon"><i class="bi bi-plus-square" aria-hidden="true"></i></span>
      <div><span class="eyebrow">GIÁM SÁT HỆ THỐNG</span><h1>Đăng ký target</h1><p>Chọn loại tài nguyên cần giám sát. Cấu trúc Type cho phép bổ sung database, message broker và dịch vụ mới sau này.</p></div>
    </header>

    <section aria-labelledby="target-type-title" class="type-section">
      <div class="section-heading"><span>1</span><div><h2 id="target-type-title">Chọn Type</h2><p>Mỗi Type có kết nối và bộ metric riêng.</p></div></div>
      <div class="type-grid">
        <button v-for="item in monitoringTargetTypes" :key="item.id" type="button" class="type-card" :class="{ selected: selectedType === item.id }" :aria-pressed="selectedType === item.id" @click="chooseType(item.id)">
          <span class="type-icon"><i class="bi" :class="item.icon" aria-hidden="true"></i></span><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><i class="bi" :class="selectedType === item.id ? 'bi-check-circle-fill' : 'bi-chevron-right'" aria-hidden="true"></i>
        </button>
      </div>
    </section>

    <section v-if="selectedType === 'server'" aria-labelledby="server-os-title" class="os-section">
      <div class="section-heading"><span>2</span><div><h2 id="server-os-title">Chọn OS type</h2><p>OS type quyết định exporter và cổng mặc định.</p></div></div>
      <div class="os-grid">
        <button v-for="os in serverOsTypes" :key="os.id" type="button" class="os-card" :class="{ selected: selectedOs === os.id }" :aria-pressed="selectedOs === os.id" @click="chooseOs(os.id)">
          <i class="bi" :class="os.icon" aria-hidden="true"></i><span><strong>{{ os.label }}</strong><small>{{ os.description }} Cổng mặc định {{ os.defaultPort }}.</small></span><i class="bi bi-check-circle-fill check" aria-hidden="true"></i>
        </button>
      </div>
    </section>

    <section class="registration-content" :aria-labelledby="`${selectedType}-form-title`">
      <div class="section-heading content-heading"><span>{{ selectedType === 'server' ? 3 : 2 }}</span><div><h2 :id="`${selectedType}-form-title`">Cấu hình {{ selectedDefinition.label }}</h2><p>{{ selectedDefinition.description }}</p></div></div>
      <KeepAlive :max="8">
        <component :is="selectedComponent" :key="`${selectedType}:${selectedOs}`" embedded :os-type="selectedType === 'server' ? selectedOs : undefined" v-bind="selectedType === 'port' || selectedType === 'web' ? { checkType: selectedType } : {}" @registered="emit('registered', $event)" />
      </KeepAlive>
    </section>
  </main>
</template>

<style scoped>
.registration-page.embedded{padding:0;max-width:none}
.registration-page{max-width:1180px;margin:auto;padding:32px 24px 52px;color:#27354a}.registration-header{display:flex;align-items:center;gap:18px;margin-bottom:28px}.header-icon{display:grid;place-items:center;flex:none;width:62px;height:62px;border-radius:18px;background:#e8eef7;color:#4c7099;font-size:27px}.eyebrow{color:#7c8b9f;font-size:11px;font-weight:700;letter-spacing:1.6px}h1{margin:5px 0 8px;font-size:28px}h2{margin:0 0 5px;font-size:17px}.registration-header p,.section-heading p{margin:0;color:#778396;font-size:13px;line-height:1.55}.type-section,.os-section{margin-bottom:24px}.section-heading{display:flex;align-items:center;gap:11px;margin-bottom:14px}.section-heading>span{display:grid;place-items:center;width:29px;height:29px;border-radius:9px;background:#4c7099;color:#fff;font-size:12px;font-weight:750}.type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.type-card,.os-card{display:flex;align-items:center;gap:13px;width:100%;padding:17px;border:1px solid #dfe6ef;border-radius:15px;background:#fff;color:#344a63;text-align:left;cursor:pointer;transition:.15s ease}.type-card:hover,.os-card:hover{border-color:#9fb7d0;transform:translateY(-1px)}.type-card.selected,.os-card.selected{border-color:#668bb3;background:#f1f6fb;box-shadow:0 0 0 3px #6e91b51a}.type-icon{display:grid;place-items:center;flex:none;width:42px;height:42px;border-radius:12px;background:#edf3fa;color:#4c7099;font-size:19px}.type-card>span:nth-child(2),.os-card>span{display:flex;flex:1;flex-direction:column;gap:5px;min-width:0}.type-card strong,.os-card strong{font-size:14px}.type-card small,.os-card small{color:#7b899b;font-size:11px;line-height:1.45}.type-card>i:last-child{color:#7e96b0}.type-card.selected>i:last-child{color:#4d82b2}.os-grid{display:grid;grid-template-columns:repeat(2,minmax(0,330px));gap:14px}.os-card>i:first-child{font-size:23px;color:#547ca5}.os-card .check{visibility:hidden;color:#4d82b2}.os-card.selected .check{visibility:visible}.registration-content{border-top:1px solid #e3e8ef;padding-top:24px}.content-heading{margin-bottom:20px}@media(max-width:850px){.type-grid{grid-template-columns:1fr}.os-grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.registration-page{padding:20px 14px 40px}.registration-header{align-items:flex-start}.header-icon{width:48px;height:48px;font-size:22px}h1{font-size:24px}.os-grid{grid-template-columns:1fr}.type-card,.os-card{padding:14px}}
</style>

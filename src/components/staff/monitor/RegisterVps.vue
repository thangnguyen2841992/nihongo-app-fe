<script setup lang="ts">

import { ref } from 'vue'
import {
  discoveryVps,
  registerVps,
  type NodeExporterDiscoveryResult,
  type MonitorVps
} from "@/monitor/monitorVpsService.ts"

const ipAddress = ref('')
const agentPort = ref(9100)

const loadingDiscovery = ref(false)
const loadingRegister = ref(false)

const error = ref('')
const success = ref('')

const discoveryResult = ref<NodeExporterDiscoveryResult | null>(null)
const registeredVps = ref<MonitorVps | null>(null)


const discovery = async () => {

  error.value = ''
  success.value = ''

  discoveryResult.value = null
  registeredVps.value = null

  if (!ipAddress.value.trim()) {
    error.value = 'Vui lòng nhập IP VPS'
    return
  }

  if (!agentPort.value || agentPort.value <= 0) {
    error.value = 'Port không hợp lệ'
    return
  }

  loadingDiscovery.value = true

  try {

    const result = await discoveryVps({
      ipAddress: ipAddress.value.trim(),
      agentPort: agentPort.value
    })

    discoveryResult.value = result

    if (!result.installed) {

      error.value =
        result.message ||
        'Không tìm thấy Node Exporter'

      discoveryResult.value = null

      return
    }

    success.value =
      'Discovery thành công. Đã tìm thấy Node Exporter.'

  } catch (e: any) {

    error.value =
      e.response?.data?.message ||
      'Không thể kết nối tới VPS'

  } finally {

    loadingDiscovery.value = false
  }
}


const register = async () => {

  if (!discoveryResult.value?.installed) {
    error.value =
      'Vui lòng Discovery VPS thành công trước'

    return
  }

  error.value = ''
  success.value = ''

  loadingRegister.value = true

  try {

    const vps = await registerVps({
      ipAddress: ipAddress.value.trim(),
      agentPort: agentPort.value
    })

    registeredVps.value = vps

    success.value =
      `Đăng ký VPS thành công: ${vps.hostname}`

  } catch (e: any) {

    error.value =
      e.response?.data?.message ||
      'Không thể đăng ký VPS'

  } finally {

    loadingRegister.value = false
  }
}

</script>


<template>

  <div class="container mt-4">

    <h4 class="mb-4">
      Đăng ký VPS Monitor
    </h4>

    <div class="mb-3">

      <label class="form-label">
        IP Address
      </label>

      <input
        v-model="ipAddress"
        class="form-control"
        placeholder="180.93.115.154"
        :disabled="loadingDiscovery || loadingRegister"
      />

    </div>


    <div class="mb-3">

      <label class="form-label">
        Node Exporter Port
      </label>

      <input
        v-model.number="agentPort"
        type="number"
        class="form-control"
        :disabled="loadingDiscovery || loadingRegister"
      />

    </div>

    <button
      class="btn btn-info me-2"
      :disabled="loadingDiscovery || loadingRegister"
      @click="discovery"
    >

      {{ loadingDiscovery
      ? 'Đang Discovery...'
      : 'Discovery'
      }}

    </button>

    <button
      class="btn btn-primary"
      :disabled="
        !discoveryResult?.installed ||
        loadingDiscovery ||
        loadingRegister
      "
      @click="register"
    >

      {{ loadingRegister
      ? 'Đang đăng ký...'
      : 'Đăng ký VPS'
      }}

    </button>


    <div
      v-if="discoveryResult"
      class="card mt-4"
    >

      <div class="card-header">

        <strong>
          VPS Discovery Result
        </strong>

      </div>


      <div class="card-body">

        <div class="row">

          <div class="col-md-6 mb-2">
            <strong>IP:</strong>
            {{ discoveryResult.ipAddress }}
          </div>

          <div class="col-md-6 mb-2">
            <strong>Port:</strong>
            {{ discoveryResult.port }}
          </div>

          <div class="col-md-6 mb-2">
            <strong>Hostname:</strong>
            {{ discoveryResult.hostname || '-' }}
          </div>

          <div class="col-md-6 mb-2">
            <strong>OS:</strong>
            {{ discoveryResult.osType || '-' }}
          </div>

          <div class="col-md-6 mb-2">
            <strong>OS Version:</strong>
            {{ discoveryResult.osVersion || '-' }}
          </div>

          <div class="col-md-6 mb-2">
            <strong>Architecture:</strong>
            {{ discoveryResult.architecture || '-' }}
          </div>

          <div class="col-md-6 mb-2">
            <strong>Node Exporter:</strong>
            {{ discoveryResult.nodeExporterVersion || '-' }}
          </div>

          <div class="col-md-6 mb-2">

            <strong>Status:</strong>

            <span class="badge bg-success ms-2">
              Detected
            </span>

          </div>

        </div>

      </div>

    </div>


    <div
      v-if="success"
      class="alert alert-success mt-3"
    >
      {{ success }}
    </div>


    <div
      v-if="error"
      class="alert alert-danger mt-3"
    >
      {{ error }}
    </div>

  </div>

</template>

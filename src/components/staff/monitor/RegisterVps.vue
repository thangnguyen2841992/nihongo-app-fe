<script setup lang="ts">

import { ref } from 'vue'
import {registerVps} from "@/monitor/monitorVpsService.ts";

const ipAddress = ref('')
const agentPort = ref(9100)

const loading = ref(false)
const error = ref('')
const success = ref('')

const register = async () => {

  error.value = ''
  success.value = ''

  if (!ipAddress.value.trim()) {
    error.value = 'Vui lòng nhập IP VPS'
    return
  }

  loading.value = true

  try {

    const vps = await registerVps({
      ipAddress: ipAddress.value.trim(),
      agentPort: agentPort.value
    })

    success.value =
      `Đăng ký thành công: ${vps.hostname}`

    console.log(vps)

  } catch (e: any) {

    error.value =
      e.response?.data?.message
      || 'Không thể đăng ký VPS'

  } finally {

    loading.value = false
  }
}

</script>


<template>

  <div class="container mt-4">

    <h4>Đăng ký VPS Monitor</h4>

    <div class="mb-3">

      <label class="form-label">
        IP Address
      </label>

      <input
        v-model="ipAddress"
        class="form-control"
        placeholder="180.93.115.154"
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
      />

    </div>


    <button
      class="btn btn-primary"
      :disabled="loading"
      @click="register"
    >

      {{ loading
      ? 'Đang kiểm tra...'
      : 'Đăng ký VPS'
      }}

    </button>


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

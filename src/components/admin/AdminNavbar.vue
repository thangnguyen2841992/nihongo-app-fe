<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm px-4">
    <a class="navbar-brand fw-bold text-warning">
      <i class="bi bi-torii-gate"></i> Nihongo Admin
    </a>

    <div class="ms-auto d-flex align-items-center">

      <div v-if="isLoggedIn" class="d-flex align-items-center gap-3">
        <span class="text-white">
          <i class="bi bi-person-circle me-1"></i>
          {{ name }}
        </span>

        <a href="http://localhost:8082/api/auth/logout"
           class="btn btn-outline-light btn-sm">
          <i class="bi bi-box-arrow-right"></i>
        </a>
      </div>

      <div v-else>
        <a href="http://localhost:8082/api/auth/login"
           class="btn btn-warning btn-sm">
          <i class="bi bi-box-arrow-in-right"></i> Login
        </a>
      </div>

    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayUrl from "@/api/authApi"

const isLoggedIn = ref(false)
const name = ref('')

onMounted(async () => {
  try {
    const res = await gatewayUrl.get('/api/admin/home')
    isLoggedIn.value = true
    name.value = res.data.name
  } catch {
    isLoggedIn.value = false
  }
})
</script>

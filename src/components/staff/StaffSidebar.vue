<script setup lang="ts">
import { useRouter, useRoute } from "vue-router"

const router = useRouter()
const route = useRoute()

const go = (path: string) => {
  router.push(path)
}

const isActive = (path: string) => {
  return route.path === path
}
</script>

<template>
  <div class="sidebar d-flex flex-column p-3">

    <h4 class="text-white mb-4">
      <i class="bi bi-person-badge me-2"></i>
      STAFF
    </h4>

    <ul class="nav nav-pills flex-column">

      <li class="nav-item">
        <button
          class="nav-link text-start"
          :class="{ active: isActive('/staff') }"
          @click="go('/staff')"
        >
          <i class="bi bi-house me-2"></i>
          Dashboard
        </button>
      </li>

      <li class="nav-item">
        <button
          class="nav-link text-start"
          :class="{ active: isActive('/staff/create-book') }"
          @click="go('/staff/create-book')"
        >
          <i class="bi bi-book me-2"></i>
          Create Book
        </button>
      </li>

    </ul>

  </div>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: #1e293b;
}

.nav-link {
  color: #cbd5e1;
  margin-bottom: 5px;
}

.nav-link:hover {
  background: #334155;
  color: white;
}

.nav-link.active {
  background: #0d6efd;
  color: white;
}
</style>

<script setup lang="ts">
import { onMounted } from 'vue'
import { initAuth } from '@/services/useAuth'

onMounted(() => {
  initAuth()
})
</script>

<template>
  <RouterView />
</template>

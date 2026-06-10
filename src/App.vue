<script setup lang="ts">
import { onMounted } from 'vue'
import { initAuth } from '@/services/authState.ts'
import FloatingScrollButtons from "@/components/common/FloatingScrollButtons.vue";

onMounted(() => {
  initAuth()
})
</script>

<template>
  <RouterView />
  <FloatingScrollButtons />
</template>

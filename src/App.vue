<script setup lang="ts">
import { RouterView } from 'vue-router'
import {onMounted} from "vue";
import gatewayUrl from "@/api/authApi.ts";
import {connectWebSocket} from "@/services/ws.ts";

onMounted(async () => {
  const res = await gatewayUrl.get('/api/auth/checkLogin')

  if (res.data.isLoggedIn) {
    connectWebSocket()
  }
})
</script>

<template>
  <RouterView />
</template>

<style>
body {
  margin: 0;
}
</style>

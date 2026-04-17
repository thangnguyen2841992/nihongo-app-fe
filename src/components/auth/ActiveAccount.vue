<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gatewayUrl from '@/api/authApi'

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const userId = Number(route.query.userId)
  const activeCode = route.query.activeCode as string
  const email = route.query.email as string

  if (!userId || !activeCode || !email) {
    await router.push('/active-failed')
    return
  }

  try {
    const res = await gatewayUrl.get('/api/active-user/active', {
      params: { userId, activeCode, email }
    })

    const data = res.data

    if (data.status === 'SUCCESS') {
      await router.push({
        path: '/reset-password',
        query: {email: data.email}
      })
    } else if (data.status === 'EXPIRED') {
      await router.push({
        path: '/active-expired',
        query: {userId: data.userId}
      })
    } else {
      await router.push('/active-failed')
    }

  } catch (e) {
    await router.push('/active-failed')
  }
})
</script>

<template>
  <div class="wrapper">
    <div class="card">
      <div class="spinner"></div>
      <p>Đang kích hoạt tài khoản...</p>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #ddd;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

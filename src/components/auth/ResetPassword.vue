<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gatewayUrl from '@/api/authApi'

const route = useRoute()
const router = useRouter()

const email = ref(route.query.email || '')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')

const submit = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = 'Mật khẩu không khớp'
    return
  }

  try {
    await gatewayUrl.post('/api/active-user/updatePassword', {
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    })

    router.push('/login')
  } catch (e) {
    error.value = 'Có lỗi xảy ra'
  }
}
</script>

<template>
  <div class="card">
    <h2>Đặt lại mật khẩu</h2>

    <input v-model="email" disabled />

    <input v-model="password" type="password" placeholder="Mật khẩu" />
    <input v-model="confirmPassword" type="password" placeholder="Nhập lại mật khẩu" />

    <button @click="submit">Xác nhận</button>

    <p class="text-danger">{{ error }}</p>
  </div>
</template>

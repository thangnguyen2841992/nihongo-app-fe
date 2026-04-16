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
const loading = ref(false)

// 👁 toggle password
const showPassword = ref(false)
const showConfirm = ref(false)

const submit = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = 'Mật khẩu không khớp'
    return
  }

  try {
    loading.value = true
    error.value = ''

    await gatewayUrl.post('/api/active-user/updatePassword', {
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    })

    await router.push('/login')
  } catch (e) {
    error.value = 'Có lỗi xảy ra'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="card shadow-lg p-4 auth-card">
      <h3 class="text-center mb-4 fw-bold text-primary">
        🔐 Đặt lại mật khẩu
      </h3>

      <!-- Email -->
      <div class="mb-3">
        <label class="form-label">Email</label>
        <input v-model="email" class="form-control" disabled />
      </div>

      <!-- Password -->
      <div class="mb-3 position-relative">
        <label class="form-label">Mật khẩu mới</label>
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          class="form-control pe-5"
          placeholder="Nhập mật khẩu mới"
        />
        <span class="toggle-eye" @click="showPassword = !showPassword">
          {{ showPassword ? '🙈' : '👁' }}
        </span>
      </div>

      <!-- Confirm -->
      <div class="mb-3 position-relative">
        <label class="form-label">Nhập lại mật khẩu</label>
        <input
          v-model="confirmPassword"
          :type="showConfirm ? 'text' : 'password'"
          class="form-control pe-5"
          placeholder="Xác nhận mật khẩu"
        />
        <span class="toggle-eye" @click="showConfirm = !showConfirm">
          {{ showConfirm ? '🙈' : '👁' }}
        </span>
      </div>

      <!-- Error -->
      <div v-if="error" class="alert alert-danger py-2">
        {{ error }}
      </div>

      <!-- Button -->
      <button
        @click="submit"
        class="btn btn-primary w-100"
        :disabled="loading"
      >
        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
        {{ loading ? 'Đang xử lý...' : 'Xác nhận' }}
      </button>

      <div class="text-center mt-3">
        <a @click="router.push('/login')" class="text-decoration-none">
          ← Quay lại đăng nhập
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #e3f2fd, #ffffff);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}

.toggle-eye {
  position: absolute;
  right: 12px;
  top: 38px;
  cursor: pointer;
  user-select: none;
  font-size: 18px;
}

.form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 5px rgba(13, 110, 253, 0.5);
}
</style>

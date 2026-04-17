<script setup lang="ts">
import { ref, watch } from 'vue'
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

// 👇 refs để focus
const passwordRef = ref<HTMLInputElement | null>(null)
const confirmRef = ref<HTMLInputElement | null>(null)

// 🔐 regex password mạnh
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/

// realtime errors
const passwordError = ref('')
const confirmError = ref('')

// 👇 validate realtime
watch(password, (val) => {
  if (!val) {
    passwordError.value = 'Vui lòng nhập mật khẩu'
  } else if (!passwordRegex.test(val)) {
    passwordError.value =
      'Ít nhất 8 ký tự, gồm chữ hoa, thường, số, ký tự đặc biệt'
  } else {
    passwordError.value = ''
  }
})

watch(confirmPassword, (val) => {
  if (!val) {
    confirmError.value = 'Vui lòng nhập lại mật khẩu'
  } else if (val !== password.value) {
    confirmError.value = 'Mật khẩu không khớp'
  } else {
    confirmError.value = ''
  }
})

// 👉 submit
const submit = async () => {
  if (passwordError.value || confirmError.value) return

  try {
    loading.value = true
    error.value = ''

    await gatewayUrl.post('/api/active-user/updatePassword', {
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    })

    await router.push('/login')
  } catch {
    error.value = 'Có lỗi xảy ra'
  } finally {
    loading.value = false
  }
}

// 👉 Enter chuyển field
const handleEnterPassword = () => {
  confirmRef.value?.focus()
}

const handleEnterConfirm = () => {
  submit()
}
</script>

<template>
  <div class="auth-container">
    <div class="card shadow-lg p-4 auth-card">
      <h3 class="text-center mb-4 fw-bold text-primary">
        🔐 Đặt lại mật khẩu
      </h3>

      <form @submit.prevent="submit">

        <!-- Email -->
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input v-model="email" class="form-control" disabled />
        </div>

        <!-- Password -->
        <div class="mb-3 position-relative">
          <label class="form-label">Mật khẩu mới</label>
          <input
            ref="passwordRef"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control pe-5"
            placeholder="Nhập mật khẩu mới"
            @keyup.enter="handleEnterPassword"
          />
          <span class="toggle-eye" @click="showPassword = !showPassword">
          {{ showPassword ? '🙈' : '👁' }}
        </span>

          <small class="text-danger">{{ passwordError }}</small>
        </div>

        <!-- Confirm -->
        <div class="mb-3 position-relative">
          <label class="form-label">Nhập lại mật khẩu</label>
          <input
            ref="confirmRef"
            v-model="confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            class="form-control pe-5"
            placeholder="Xác nhận mật khẩu"
            @keyup.enter="handleEnterConfirm"
          />
          <span class="toggle-eye" @click="showConfirm = !showConfirm">
          {{ showConfirm ? '🙈' : '👁' }}
        </span>

          <small class="text-danger">{{ confirmError }}</small>
        </div>

        <!-- Error -->
        <div v-if="error" class="alert alert-danger py-2">
          {{ error }}
        </div>

        <!-- Button -->
        <button
          type="submit"
          class="btn btn-primary w-100"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          {{ loading ? 'Đang xử lý...' : 'Xác nhận' }}
        </button>
      </form>

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
  background: url('@/assets/images/register.jpg') no-repeat center/cover;
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

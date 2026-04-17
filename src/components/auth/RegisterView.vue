<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import gatewayUrl from "@/api/authApi.ts";

const router = useRouter()
const googleLoading = ref(false)

// state
const email = ref('')
const firstName = ref('')
const lastName = ref('')
const birthday = ref('')
const address = ref('')

const error = ref('')
const message = ref('')
const loading = ref(false)

const loginGoogle = () => {
  if (googleLoading.value) return

  googleLoading.value = true

  window.location.href = `http://localhost:8180/realms/nihongo/protocol/openid-connect/auth
?client_id=japanese_app
&response_type=code
&scope=openid%20email%20profile
&redirect_uri=http://localhost:8082/api/auth/callbackGoogle
&kc_idp_hint=google`
}
const register = async () => {
  if (loading.value) return

  error.value = ''
  message.value = ''
  loading.value = true

  try {
    const res = await gatewayUrl.post('/api/auth/register', {
      email: email.value,
      firstName: firstName.value,
      lastName: lastName.value,
      dateOfBirth: birthday.value,
      address: address.value
    })

    sessionStorage.setItem('email-register', res.data.email)

    await router.push({
      path: '/check-email',
      query: {
        userId: res.data.userId,
      }
    })

  } catch (e: any) {
    error.value = e.response?.data || 'Đăng ký thất bại'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-wrapper">
    <div class="register-card shadow-lg">

      <!-- TITLE -->
      <div class="text-center mb-3">
        <i class="bi bi-torii-gate-fill icon"></i>
        <h4 class="title mt-2">Tạo tài khoản</h4>
      </div>

      <!-- FORM -->
      <form @submit.prevent="register">

        <!-- Email -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="bi bi-envelope"></i></span>
          <input v-model="email" type="email" class="form-control" placeholder="Email" required>
        </div>

        <!-- Name -->
        <div class="row">
          <div class="col-6 mb-3 input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input v-model="lastName" type="text" class="form-control" placeholder="Họ" required>
          </div>
          <div class="col-6 mb-3 input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input v-model="firstName" type="text" class="form-control" placeholder="Tên" required>
          </div>
        </div>

        <!-- Birthday -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="bi bi-calendar"></i></span>
          <input v-model="birthday" type="date" class="form-control">
        </div>

        <!-- Address -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="bi bi-geo-alt"></i></span>
          <input v-model="address" type="text" class="form-control" placeholder="Địa chỉ">
        </div>

        <!-- Message -->
        <div class="text-danger text-center mb-2">{{ error }}</div>
        <div class="text-success text-center mb-2">{{ message }}</div>

        <!-- Button -->
        <button class="btn btn-primary w-100" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-person-plus"></i>
          {{ loading ? 'Đang xử lý...' : 'Đăng ký' }}
        </button>
      </form>
      <a
        @click.prevent="loginGoogle"
        class="btn-google w-100 mb-3 mt-3"
        :class="{ disabled: googleLoading }"
      >
        <span v-if="googleLoading" class="spinner"></span>

        <svg v-else width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.4 30.4 0 24 0 14.6 0 6.4 5.4 2.6 13.3l8 6.2C12.4 13.3 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.15-3.1-.4-4.5H24v9h12.5c-.54 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 7-9.9 7-17.3z"/>
          <path fill="#FBBC05" d="M10.6 28.5c-1-2.9-1-6.1 0-9l-8-6.2C.9 17.2 0 20.5 0 24s.9 6.8 2.6 10.7l8-6.2z"/>
          <path fill="#34A853" d="M24 48c6.4 0 11.9-2.1 15.9-5.7l-7.3-5.7c-2 1.4-4.6 2.2-8.6 2.2-6.3 0-11.6-3.8-13.4-9.2l-8 6.2C6.4 42.6 14.6 48 24 48z"/>
        </svg>

        <span>
    {{ googleLoading ? 'Đang chuyển hướng...' : 'Đăng ký bằng Google' }}
  </span>
      </a>
      <!-- Footer -->
      <div class="footer">
        Đã có tài khoản?
        <router-link to="/login" class="login-link">Đăng nhập</router-link>
      </div>

    </div>
  </div>
</template>

<style scoped>
.register-wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;

  background: url('@/assets/images/register.jpg') no-repeat center/cover;
}

/* overlay */
.register-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
}

/* card */
.register-card {
  position: relative;
  width: 420px;
  border-radius: 20px;
  backdrop-filter: blur(15px);
  background: rgba(255, 255, 255, 0.9);
  padding: 30px;
  z-index: 1;
}

.title {
  font-weight: bold;
  color: #dc2626;
}

.icon {
  font-size: 2.5rem;
  color:#dc2626;
}

.form-control {
  border-radius: 10px;
}

.input-group-text {
  border-radius: 10px 0 0 10px;
}

.btn-primary {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  border-radius: 12px;
  font-weight: 500;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
}

.footer {
  text-align: center;
  margin-top: 15px;
}

.login-link {
  color: #dc2626;
  font-weight: 500;
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}

/* Google button */
.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  background: #fff;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 10px;

  font-weight: 500;
  color: #444;

  cursor: pointer;
  transition: all 0.25s ease;
  text-decoration: none;
}

/* Hover effect */
.btn-google:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.1);
}

/* Click effect */
.btn-google:active {
  transform: scale(0.97);
}

/* SVG animation */
.btn-google svg {
  transition: transform 0.3s ease;
}

/* Khi hover thì icon xoay nhẹ */
.btn-google:hover svg {
  transform: rotate(8deg) scale(1.1);
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0,0,0,0.2);
  border-top: 2px solid #444;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.btn-google.disabled {
  pointer-events: none;
  opacity: 0.7;
}
</style>

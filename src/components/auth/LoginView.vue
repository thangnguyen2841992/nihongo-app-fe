<script setup lang="ts">
import { ref } from 'vue'
import gatewayUrl from "@/api/authApi"
import {useRouter} from "vue-router";

// state
const email = ref('')
const password = ref('')
const error = ref('')

const showPassword = ref(false)
const showPasswordForm = ref(false)
const showGoogle = ref(false)
const googleLoading = ref(false)

const router = useRouter()

// toggle password
const togglePassword = () => {
  showPassword.value = !showPassword.value
}



const loginGoogle = () => {
  if (googleLoading.value) return

  googleLoading.value = true

  window.location.href =
    'http://localhost:8180/realms/nihongo/protocol/openid-connect/auth' +
    '?client_id=japanese_app' +
    '&response_type=code' +
    '&scope=openid%20email%20profile' +
    '&redirect_uri=http://localhost:8082/api/auth/callbackGoogle' +
    '&kc_idp_hint=google'
}

// check email
const checkEmail = async () => {
  error.value = ''
  try {
    const res = await gatewayUrl.get(`/api/auth/checkEmail?email=${email.value}`)
    const type = res.data.type;
    if (type === 'GOOGLE') {
      showGoogle.value = true
    } else if (type === 'LOCAL') {
      showPasswordForm.value = true
    } else {
      error.value = 'Email chưa tồn tại'
    }
  } catch (e) {
    error.value = 'Có lỗi xảy ra'
  }
}

// login
const login = async () => {
  error.value = ''
  try {
    await gatewayUrl.post('/api/auth/login', {
      email: email.value,
      password: password.value
    })

    // 2. Gọi checkLogin để lấy role
    const res = await gatewayUrl.get('/api/auth/checkLogin')

    if (!res.data.isLoggedIn) {
      error.value = 'Không xác thực được'
      return
    }

    const role = res.data.role

    // 3. Điều hướng theo role
    if (role === 'ADMIN') {
      await router.push('/admin')
    } else {
      await router.push('/')
    }

  } catch (e) {
    error.value = 'Sai tài khoản hoặc mật khẩu'
  }
}

// submit bằng Enter
const handleSubmit = () => {
  if (!showPasswordForm.value && !showGoogle.value) {
    checkEmail()
  } else if (showPasswordForm.value) {
    login()
  }
}

</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2>Đăng Nhập</h2>

      <form @submit.prevent="handleSubmit">

        <!-- EMAIL -->
        <div class="input-group mb-3">
          <span class="input-group-text">
            <i class="bi bi-envelope"></i>
          </span>

          <input
            v-model="email"
            type="email"
            class="form-control"
            placeholder="Email"
            :disabled="showPasswordForm || showGoogle"
            required
          />
        </div>

        <!-- NEXT -->
        <button
          v-if="!showPasswordForm && !showGoogle"
          class="btn btn-next w-100"
        >
          Tiếp tục <i class="bi bi-arrow-right"></i>
        </button>

        <!-- PASSWORD -->
        <div v-if="showPasswordForm" class="password-wrapper">
          <div class="input-group custom-input">
            <span class="input-group-text">
              <i class="bi bi-lock"></i>
            </span>

            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              class="form-control"
              placeholder="Nhập mật khẩu"
              required
            />

            <span class="input-group-text eye-btn" @click="togglePassword">
              <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </span>
          </div>

          <button class="btn btn-login w-100">
            <i class="bi bi-box-arrow-in-right"></i> Đăng nhập
          </button>
        </div>
      </form>

      <!-- GOOGLE -->
      <a
        v-if="showGoogle"
        @click.prevent="loginGoogle"
        class="btn-google w-100 mt-3"
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
    {{ googleLoading ? 'Đang chuyển hướng...' : 'Tiếp tục với Google' }}
  </span>
      </a>

      <!-- DIVIDER -->
      <div class="divider">
        <span>hoặc</span>
      </div>

      <!-- REGISTER -->
      <router-link to="/register" class="btn-register w-100">
        <i class="bi bi-person-plus"></i> Tạo tài khoản mới
      </router-link>

      <!-- ERROR -->
      <p class="text-danger mt-2">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: url('@/assets/images/anh1.jpg') no-repeat center/cover;
}

.login-card {
  background: #fff;
  padding: 50px 40px;
  border-radius: 16px;
  width: 420px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.password-wrapper {
  margin-top: 15px;
}

.custom-input {
  border-radius: 12px;
  overflow: hidden;
}

.eye-btn {
  cursor: pointer;
}

.btn-next {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  border: none;
  color: white;
  padding: 12px;
  border-radius: 12px;
}

.btn-login {
  margin-top: 15px;
  background: linear-gradient(135deg, #667eea, #5a67d8);
  border: none;
  color: #fff;
  padding: 12px;
  border-radius: 12px;
}

.btn-google {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #ddd;
  text-decoration: none;
  color: #444;
}

.btn-google img {
  width: 20px;
}

/* divider */
.divider {
  margin: 20px 0;
  text-align: center;
  position: relative;
}

.divider span {
  background: #fff;
  padding: 0 10px;
  color: #999;
  position: relative;
  z-index: 1;
}

.divider::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 1px;
  background: #ddd;
  top: 50%;
  left: 0;
}

/* register button */
.btn-register {
  display: block;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  transition: 0.25s;
}

.btn-register:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(34, 197, 94, 0.4);
}
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

.btn-google:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.1);
}

.btn-google:active {
  transform: scale(0.97);
}

.btn-google svg {
  transition: transform 0.3s ease;
}

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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

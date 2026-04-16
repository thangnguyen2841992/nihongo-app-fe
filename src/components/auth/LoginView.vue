<script setup lang="ts">
import { ref } from 'vue'
import gatewayUrl from "@/api/authApi"

// state
const email = ref('')
const password = ref('')
const error = ref('')

const showPassword = ref(false)
const showPasswordForm = ref(false)
const showGoogle = ref(false)

// toggle password
const togglePassword = () => {
  showPassword.value = !showPassword.value
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

    window.location.href = '/'
  } catch (e) {
    error.value = 'Sai mật khẩu'
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

// google login
const googleLoginUrl =
  'http://localhost:8180/realms/nihongo/protocol/openid-connect/auth' +
  '?client_id=japanese_app' +
  '&response_type=code' +
  '&scope=openid%20email%20profile' +
  '&redirect_uri=http://localhost:8082/api/auth/callbackGoogle' +
  '&kc_idp_hint=google'
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
        :href="googleLoginUrl"
        class="btn btn-google w-100"
      >
        <img src="https://developers.google.com/identity/images/g-logo.png" />
        <span>Tiếp tục với Google</span>
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
</style>

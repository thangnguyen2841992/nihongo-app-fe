<template>
  <div class="google-setup-wrapper">

    <!-- Overlay -->
    <div class="background-overlay"></div>

    <!-- Card -->
    <div class="google-setup-card shadow-lg">

      <!-- Header -->
      <div class="text-center header-section">
        <div class="google-icon">
          <svg width="34" height="34" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.4 30.4 0 24 0
              14.6 0 6.4 5.4 2.6 13.3l8 6.2C12.4 13.3 17.7 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.1 24.5c0-1.6-.15-3.1-.4-4.5H24v9h12.5
              c-.54 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 7-9.9 7-17.3z"
            />
            <path
              fill="#FBBC05"
              d="M10.6 28.5c-1-2.9-1-6.1 0-9l-8-6.2C.9 17.2 0 20.5 0
              24s.9 6.8 2.6 10.7l8-6.2z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.4 0 11.9-2.1 15.9-5.7l-7.3-5.7
              c-2 1.4-4.6 2.2-8.6 2.2-6.3 0-11.6-3.8-13.4-9.2l-8 6.2
              C6.4 42.6 14.6 48 24 48z"
            />
          </svg>
        </div>

        <h2>Tạo mật khẩu</h2>

        <p class="subtitle">
          Hoàn tất đăng ký tài khoản Google của bạn
        </p>
      </div>

      <!-- Google account -->
      <div class="google-account">
        <div class="account-icon">
          <i class="bi bi-google"></i>
        </div>

        <div class="account-info">
          <span class="account-label">Tài khoản Google</span>
          <strong>{{ email }}</strong>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="setupPassword">

        <!-- Password -->
        <div class="form-group">
          <label>
            <i class="bi bi-lock"></i>
            Mật khẩu
          </label>

          <div class="input-wrapper">
            <i class="bi bi-lock-fill input-icon"></i>

            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              placeholder="Nhập mật khẩu"
              required
              minlength="8"
            />
          </div>

          <small class="password-hint">
            Mật khẩu phải có ít nhất 8 ký tự
          </small>
        </div>

        <!-- Confirm Password -->
        <div class="form-group">
          <label>
            <i class="bi bi-shield-lock"></i>
            Xác nhận mật khẩu
          </label>

          <div class="input-wrapper">
            <i class="bi bi-lock-fill input-icon"></i>

            <input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="Nhập lại mật khẩu"
              required
              minlength="8"
            />
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="error-message"
        >
          <i class="bi bi-exclamation-circle-fill"></i>
          <span>{{ error }}</span>
        </div>

        <!-- Button -->
        <button
          type="submit"
          class="create-button"
          :disabled="loading"
        >
          <span
            v-if="loading"
            class="spinner"
          ></span>

          <i
            v-else
            class="bi bi-person-plus-fill"
          ></i>

          <span>
            {{ loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản' }}
          </span>
        </button>

      </form>

      <!-- Security note -->
      <div class="security-note">
        <i class="bi bi-shield-check"></i>

        <span>
          Mật khẩu của bạn được mã hóa và bảo vệ an toàn.
        </span>
      </div>

      <!-- Back -->
      <div class="footer">
        <button
          type="button"
          class="back-button"
          @click="router.push('/register')"
        >
          <i class="bi bi-arrow-left"></i>
          Quay lại đăng ký
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const password = ref<string>('')
const confirmPassword = ref<string>('')
const email = ref<string>('')
const setupToken = ref<string>('')
const loading = ref<boolean>(false)
const error = ref<string>('')

onMounted(() => {
  const token = route.query.token
  const emailParam = route.query.email

  if (typeof token === 'string') {
    setupToken.value = token
  }

  if (typeof emailParam === 'string') {
    email.value = emailParam
  }

  if (!setupToken.value) {
    error.value = 'Google setup token không hợp lệ'
  }
})

const setupPassword = async (): Promise<void> => {
  if (loading.value) return

  error.value = ''

  if (!setupToken.value) {
    error.value = 'Google setup token không hợp lệ'
    return
  }

  if (!password.value) {
    error.value = 'Vui lòng nhập mật khẩu'
    return
  }

  if (password.value.length < 8) {
    error.value = 'Mật khẩu phải có ít nhất 8 ký tự'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Mật khẩu không khớp'
    return
  }

  loading.value = true

  try {
    await axios.post(
      'http://localhost:8082/api/auth/google/setup-password',
      {
        setupToken: setupToken.value,
        password: password.value,
        confirmPassword: confirmPassword.value
      },
      {
        withCredentials: true
      }
    )

    await router.replace('/')

  } catch (e: any) {
    error.value =
      e.response?.data?.message ||
      e.response?.data ||
      'Tạo tài khoản thất bại'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.google-setup-wrapper {
  min-height: 100vh;
  width: 100%;

  display: flex;
  justify-content: center;
  align-items: center;

  position: relative;

  background: url('@/assets/images/register.jpg')
  no-repeat center center / cover;

  padding: 30px 15px;
}

/* =========================
   OVERLAY
========================= */

.background-overlay {
  position: absolute;
  inset: 0;

  background: rgba(0, 0, 0, 0.5);
}

/* =========================
   CARD
========================= */

.google-setup-card {
  position: relative;
  z-index: 1;

  width: 440px;
  max-width: 100%;

  padding: 34px 35px 28px;

  border-radius: 22px;

  background: rgba(255, 255, 255, 0.93);

  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.25);
}

/* =========================
   HEADER
========================= */

.header-section {
  margin-bottom: 24px;
}

.google-icon {
  width: 62px;
  height: 62px;

  margin: 0 auto 12px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: #fff;

  box-shadow:
    0 5px 18px rgba(0, 0, 0, 0.12);
}

.google-icon svg {
  width: 38px;
  height: 38px;
}

.header-section h2 {
  margin: 0;

  font-size: 25px;
  font-weight: 700;

  color: #dc2626;
}

.subtitle {
  margin: 7px 0 0;

  color: #777;
  font-size: 14px;
}

/* =========================
   GOOGLE ACCOUNT
========================= */

.google-account {
  display: flex;
  align-items: center;

  gap: 12px;

  padding: 13px 15px;

  margin-bottom: 24px;

  border-radius: 13px;

  background: #f8f9fa;

  border: 1px solid #e5e7eb;
}

.account-icon {
  width: 40px;
  height: 40px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: white;

  color: #4285f4;

  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08);
}

.account-info {
  display: flex;
  flex-direction: column;

  min-width: 0;
}

.account-label {
  font-size: 12px;
  color: #888;

  margin-bottom: 2px;
}

.account-info strong {
  font-size: 14px;
  color: #333;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* =========================
   FORM
========================= */

.form-group {
  margin-bottom: 19px;
}

.form-group label {
  display: block;

  margin-bottom: 7px;

  font-size: 14px;
  font-weight: 600;

  color: #444;
}

.form-group label i {
  color: #dc2626;
  margin-right: 5px;
}

/* =========================
   INPUT
========================= */

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;

  left: 14px;
  top: 50%;

  transform: translateY(-50%);

  color: #999;

  pointer-events: none;
}

.input-wrapper input {
  width: 100%;

  height: 46px;

  border: 1px solid #ddd;

  border-radius: 11px;

  padding: 0 14px 0 42px;

  outline: none;

  font-size: 14px;

  background: #fff;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.input-wrapper input:focus {
  border-color: #dc2626;

  box-shadow:
    0 0 0 3px rgba(220, 38, 38, 0.1);
}

.input-wrapper input::placeholder {
  color: #aaa;
}

.password-hint {
  display: block;

  margin-top: 6px;

  font-size: 12px;

  color: #888;
}

/* =========================
   ERROR
========================= */

.error-message {
  display: flex;
  align-items: center;

  gap: 8px;

  padding: 11px 13px;

  margin-bottom: 16px;

  border-radius: 10px;

  color: #dc2626;

  background: #fef2f2;

  border: 1px solid #fecaca;

  font-size: 13px;
}

.error-message i {
  flex-shrink: 0;
}

/* =========================
   BUTTON
========================= */

.create-button {
  width: 100%;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: center;

  gap: 8px;

  border: none;
  border-radius: 12px;

  color: white;

  background:
    linear-gradient(
      135deg,
      #ef4444,
      #dc2626
    );

  font-size: 15px;
  font-weight: 600;

  cursor: pointer;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.create-button:hover:not(:disabled) {
  transform: translateY(-2px);

  background:
    linear-gradient(
      135deg,
      #dc2626,
      #b91c1c
    );

  box-shadow:
    0 7px 18px rgba(220, 38, 38, 0.3);
}

.create-button:active:not(:disabled) {
  transform: scale(0.98);
}

.create-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

/* =========================
   SPINNER
========================= */

.spinner {
  width: 17px;
  height: 17px;

  border: 2px solid rgba(255, 255, 255, 0.4);

  border-top-color: white;

  border-radius: 50%;

  animation: spin 0.65s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   SECURITY
========================= */

.security-note {
  display: flex;
  align-items: center;
  justify-content: center;

  gap: 7px;

  margin-top: 17px;

  color: #777;

  font-size: 12px;

  text-align: center;
}

.security-note i {
  color: #16a34a;

  font-size: 15px;
}

/* =========================
   FOOTER
========================= */

.footer {
  margin-top: 18px;

  text-align: center;

  padding-top: 17px;

  border-top: 1px solid #eee;
}

.back-button {
  border: none;

  background: transparent;

  color: #dc2626;

  font-size: 13px;
  font-weight: 500;

  cursor: pointer;

  transition: opacity 0.2s ease;
}

.back-button:hover {
  opacity: 0.75;
}

.back-button i {
  margin-right: 5px;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 480px) {

  .google-setup-wrapper {
    padding: 20px 12px;
  }

  .google-setup-card {
    padding: 28px 22px 23px;

    border-radius: 18px;
  }

  .header-section h2 {
    font-size: 23px;
  }

  .google-icon {
    width: 56px;
    height: 56px;
  }

  .google-icon svg {
    width: 34px;
    height: 34px;
  }
}
</style>

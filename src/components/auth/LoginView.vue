<script setup lang="ts">
import {ref, nextTick, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {gatewayUrl} from '@/api/authApi'
import {setAuth} from '@/services/authState.ts'

type LoginType = 'LOCAL' | 'GOOGLE' | null

const router = useRouter()

// =========================
// STATE
// =========================

const email = ref('')
const password = ref('')

const loginType = ref<LoginType>(null)

const loading = ref(false)
const error = ref('')

const showPassword = ref(false)

const emailRef = ref<HTMLInputElement | null>(null)
const passwordRef = ref<HTMLInputElement | null>(null)

// =========================
// SESSION
// =========================

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('sessionId')

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('sessionId', sessionId)
  }

  return sessionId
}

// =========================
// RESET
// =========================

const resetLogin = async () => {
  password.value = ''
  loginType.value = null
  error.value = ''
  showPassword.value = false

  await nextTick()

  emailRef.value?.focus()
}

const resetError = () => {
  error.value = ''
}

// =========================
// PASSWORD
// =========================

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// =========================
// CHECK EMAIL
// =========================

const checkEmail = async () => {
  if (loading.value) {
    return
  }

  resetError()

  const emailValue = email.value.trim()

  if (!emailValue) {
    error.value = 'Vui lòng nhập email'
    return
  }

  loading.value = true

  try {
    const response = await gatewayUrl.get(
      '/api/auth/checkEmail',
      {
        params: {
          email: emailValue
        }
      }
    )

    const type = response.data?.type

    if (type === 'LOCAL') {
      loginType.value = 'LOCAL'

      await nextTick()

      passwordRef.value?.focus()

    } else if (type === 'GOOGLE') {
      loginType.value = 'GOOGLE'

    } else {
      loginType.value = null
      error.value = 'Email chưa tồn tại'
    }

  } catch (e: any) {

    console.error('Check email error:', e)

    if (e.response?.status === 404) {
      error.value = 'Email chưa tồn tại'
    } else if (e.response?.status === 400) {
      error.value =
        e.response?.data?.message ||
        'Email không hợp lệ'
    } else {
      error.value = 'Không thể kiểm tra email'
    }

  } finally {
    loading.value = false
  }
}

// =========================
// LOGIN LOCAL
// =========================

const login = async () => {
  if (loading.value) {
    return
  }

  resetError()

  const emailValue = email.value.trim()

  if (!emailValue) {
    error.value = 'Vui lòng nhập email'
    return
  }

  if (!password.value) {
    error.value = 'Vui lòng nhập mật khẩu'
    return
  }

  loading.value = true

  try {

    // =========================
    // SESSION ID
    // =========================

    const sessionId = getSessionId()

    // =========================
    // LOGIN
    // =========================

    const loginResponse = await gatewayUrl.post(
      '/api/auth/login',
      {
        email: emailValue,
        password: password.value,
        sessionId: sessionId
      }
    )

    /*
     * Backend hiện tại trả:
     *
     * {
     *   access_token: "...",
     *   refresh_token: "..."
     * }
     *
     * Không lưu JWT vào localStorage.
     *
     * Nếu backend đã chuyển JWT sang HttpOnly Cookie
     * thì phần này vẫn không cần lưu token.
     */

    const tokenResponse = loginResponse.data

    if (!tokenResponse) {
      error.value = 'Không nhận được thông tin đăng nhập'
      return
    }

    // =========================
    // CHECK LOGIN
    // =========================

    const response =
      await gatewayUrl.get('/api/auth/checkLogin')

    if (!response.data?.isLoggedIn) {
      error.value = 'Không xác thực được tài khoản'
      return
    }

    // =========================
    // AUTH STATE
    // =========================

    setAuth()

    // =========================
    // REDIRECT
    // =========================

    await redirectByRole(
      response.data.role
    )

  } catch (e: any) {

    console.error('Login error:', e)

    if (e.response?.status === 401) {

      error.value =
        e.response?.data?.message ||
        'Sai tài khoản hoặc mật khẩu'

    } else if (e.response?.status === 403) {

      error.value =
        e.response?.data?.message ||
        'Tài khoản chưa được phép đăng nhập'

    } else if (e.response?.status === 404) {

      error.value =
        e.response?.data?.message ||
        'Tài khoản không tồn tại'

    } else {

      error.value =
        e.response?.data?.message ||
        'Đăng nhập thất bại'
    }

  } finally {
    loading.value = false
  }
}

// =========================
// GOOGLE LOGIN
// =========================

const loginGoogle = () => {

  if (loading.value) {
    return
  }

  resetError()

  /*
   * Không gọi Google trực tiếp từ FE.
   *
   * FE -> Gateway
   * Gateway -> Google OAuth
   *
   * Backend xử lý callback Google,
   * tạo session + JWT rồi redirect
   * về frontend.
   */

  window.location.href =
    `${window.location.origin}/api/auth/google`
}

// =========================
// REDIRECT
// =========================

const redirectByRole = async (
  role: string
) => {

  switch (role) {

    case 'ADMIN':

      await router.push('/admin')

      break

    case 'STAFF':

      await router.push('/staff')

      break

    case 'USER':

    default:

      await router.push('/')

      break
  }
}

// =========================
// FORM SUBMIT
// =========================

const handleSubmit = async () => {

  if (loading.value) {
    return
  }

  if (!loginType.value) {

    await checkEmail()

    return
  }

  if (loginType.value === 'LOCAL') {

    await login()

    return
  }

  if (loginType.value === 'GOOGLE') {

    loginGoogle()

    return
  }
}

// =========================
// INIT
// =========================

onMounted(async () => {

  await nextTick()

  emailRef.value?.focus()
})
</script>

<template>

  <div class="login-wrapper">

    <div class="login-card">

      <!-- HEADER -->

      <div class="login-header">

        <h2>Đăng nhập</h2>

        <p>
          Đăng nhập để tiếp tục sử dụng hệ thống
        </p>

      </div>


      <!-- FORM -->

      <form
        @submit.prevent="handleSubmit"
        autocomplete="off"
      >

        <!-- EMAIL -->

        <div class="input-group custom-input">

          <span class="input-group-text">

            <i class="bi bi-envelope"></i>

          </span>

          <input
            ref="emailRef"
            v-model="email"
            type="email"
            class="form-control"
            placeholder="Email"
            :disabled="!!loginType || loading"
            autocomplete="email"
            required
            @input="resetError"
          />

        </div>


        <!-- NEXT -->

        <button
          v-if="!loginType"
          type="submit"
          class="btn btn-next w-100"
          :disabled="loading"
        >

          <span
            v-if="loading"
            class="spinner"
          ></span>

          <span v-else>

            Tiếp tục

            <i class="bi bi-arrow-right"></i>

          </span>

        </button>


        <!-- LOCAL LOGIN -->

        <div
          v-if="loginType === 'LOCAL'"
          class="login-step"
        >

          <!-- PASSWORD -->

          <div class="input-group custom-input">

            <span class="input-group-text">

              <i class="bi bi-lock"></i>

            </span>

            <input
              ref="passwordRef"
              v-model="password"
              :type="
                showPassword
                  ? 'text'
                  : 'password'
              "
              class="form-control"
              placeholder="Mật khẩu"
              autocomplete="current-password"
              required
              @input="resetError"
            />

            <button
              type="button"
              class="input-group-text eye-btn"
              @click="togglePassword"
            >

              <i
                :class="
                  showPassword
                    ? 'bi bi-eye-slash'
                    : 'bi bi-eye'
                "
              ></i>

            </button>

          </div>


          <!-- LOGIN -->

          <button
            type="submit"
            class="btn btn-login w-100"
            :disabled="loading"
          >

            <span
              v-if="loading"
              class="spinner spinner-white"
            ></span>

            <span v-else>

              <i
                class="bi bi-box-arrow-in-right"
              ></i>

              Đăng nhập

            </span>

          </button>


          <!-- BACK -->

          <button
            type="button"
            class="btn-back"
            :disabled="loading"
            @click="resetLogin"
          >

            <i class="bi bi-arrow-left"></i>

            Đổi email

          </button>

        </div>


        <!-- GOOGLE LOGIN -->

        <div
          v-if="loginType === 'GOOGLE'"
          class="google-step"
        >

          <button
            type="button"
            class="btn-google w-100"
            :disabled="loading"
            @click="loginGoogle"
          >

            <span
              v-if="loading"
              class="spinner"
            ></span>

            <template v-else>

              <svg
                width="20"
                height="20"
                viewBox="0 0 48 48"
              >

                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.4 30.4 0 24 0 14.6 0 6.4 5.4 2.6 13.3l8 6.2C12.4 13.3 17.7 9.5 24 9.5z"
                />

                <path
                  fill="#4285F4"
                  d="M46.1 24.5c0-1.6-.15-3.1-.4-4.5H24v9h12.5c-.54 2.9-2.2 5.4-4.7 7.1l7.3 5.7c4.3-4 7-9.9 7-17.3z"
                />

                <path
                  fill="#FBBC05"
                  d="M10.6 28.5c-1-2.9-1-6.1 0-9l-8-6.2C.9 17.2 0 20.5 0 24s.9 6.8 2.6 10.7l8-6.2z"
                />

                <path
                  fill="#34A853"
                  d="M24 48c6.4 0 11.9-2.1 15.9-5.7l-7.3-5.7c-2 1.4-4.6 2.2-8.6 2.2-6.3 0-11.6-3.8-13.4-9.2l-8 6.2C6.4 42.6 14.6 48 24 48z"
                />

              </svg>

            </template>

            <span>

              {{
                loading
                  ? 'Đang chuyển hướng...'
                  : 'Tiếp tục với Google'
              }}

            </span>

          </button>


          <!-- BACK -->

          <button
            type="button"
            class="btn-back"
            :disabled="loading"
            @click="resetLogin"
          >

            <i class="bi bi-arrow-left"></i>

            Đổi email

          </button>

        </div>

      </form>


      <!-- DIVIDER -->

      <div class="divider">

        <span>hoặc</span>

      </div>


      <!-- REGISTER -->

      <router-link
        to="/register"
        class="btn-register w-100"
      >

        <i class="bi bi-person-plus"></i>

        Tạo tài khoản mới

      </router-link>


      <!-- ERROR -->

      <div
        v-if="error"
        class="error-message"
      >

        <i
          class="bi bi-exclamation-circle"
        ></i>

        {{ error }}

      </div>

    </div>

  </div>

</template>

<style scoped>

.login-wrapper {
  min-height: 100vh;

  display: flex;

  justify-content: center;

  align-items: center;

  padding: 20px;

  background: url('@/assets/images/background.jpg') no-repeat center / cover;
}


.login-card {
  width: 420px;

  padding: 42px 40px;

  background: rgba(255, 255, 255, 0.96);

  border-radius: 20px;

  text-align: center;

  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.20);
}


.login-header {
  margin-bottom: 28px;
}


.login-header h2 {
  margin: 0;

  font-size: 28px;

  font-weight: 700;

  color: #222;
}


.login-header p {
  margin: 8px 0 0;

  font-size: 14px;

  color: #888;
}


/* =========================
   INPUT
   ========================= */

.custom-input {
  height: 48px;

  margin-bottom: 15px;

  overflow: hidden;

  border: 1px solid #ddd;

  border-radius: 12px;

  background: #fff;
}


.custom-input:focus-within {
  border-color: #667eea;

  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.10);
}


.custom-input .input-group-text {
  border: none;

  background: transparent;

  color: #888;
}


.custom-input .form-control {
  border: none;

  box-shadow: none;
}


.custom-input .form-control:focus {
  box-shadow: none;
}


.eye-btn {
  cursor: pointer;
}


/* =========================
   BUTTON
   ========================= */

.btn-next,
.btn-login {
  height: 48px;

  border: none;

  border-radius: 12px;

  color: #fff;

  font-weight: 600;

  transition: 0.2s ease;
}


.btn-next {
  background: linear-gradient(
    135deg,
    #4facfe,
    #00c6ff
  );
}


.btn-login {
  background: linear-gradient(
    135deg,
    #667eea,
    #5a67d8
  );
}


.btn-next:hover:not(:disabled),
.btn-login:hover:not(:disabled) {
  transform: translateY(-1px);

  box-shadow: 0 7px 18px rgba(0, 0, 0, 0.15);
}


.btn-next:disabled,
.btn-login:disabled,
.btn-google:disabled {
  opacity: 0.65;

  cursor: not-allowed;
}


.login-step,
.google-step {
  margin-top: 5px;
}


/* =========================
   GOOGLE
   ========================= */

.btn-google {
  height: 48px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 10px;

  border: 1px solid #ddd;

  border-radius: 12px;

  background: #fff;

  color: #444;

  font-weight: 600;

  cursor: pointer;

  transition: 0.2s ease;
}


.btn-google:hover:not(:disabled) {
  background: #f8f9fa;

  transform: translateY(-1px);

  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}


/* =========================
   BACK
   ========================= */

.btn-back {
  margin-top: 14px;

  border: none;

  background: transparent;

  color: #777;

  font-size: 14px;

  cursor: pointer;
}


.btn-back:hover:not(:disabled) {
  color: #444;
}


/* =========================
   DIVIDER
   ========================= */

.divider {
  display: flex;

  align-items: center;

  gap: 12px;

  margin: 24px 0;

  color: #aaa;

  font-size: 13px;
}


.divider::before,
.divider::after {
  content: '';

  flex: 1;

  height: 1px;

  background: #ddd;
}


.divider span {
  white-space: nowrap;
}


/* =========================
   REGISTER
   ========================= */

.btn-register {
  display: flex;

  align-items: center;

  justify-content: center;

  gap: 8px;

  height: 48px;

  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #22c55e,
    #16a34a
  );

  color: #fff;

  text-decoration: none;

  font-weight: 600;

  transition: 0.2s ease;
}


.btn-register:hover {
  transform: translateY(-1px);

  box-shadow: 0 7px 18px rgba(34, 197, 94, 0.25);
}


/* =========================
   ERROR
   ========================= */

.error-message {
  display: flex;

  align-items: center;

  justify-content: center;

  gap: 6px;

  margin-top: 16px;

  padding: 10px 12px;

  border-radius: 8px;

  background: #fff1f2;

  color: #dc2626;

  font-size: 14px;
}


/* =========================
   SPINNER
   ========================= */

.spinner {
  width: 16px;

  height: 16px;

  border: 2px solid rgba(0, 0, 0, 0.18);

  border-top-color: #444;

  border-radius: 50%;

  animation: spin 0.6s linear infinite;
}


.spinner-white {
  border-color: rgba(255, 255, 255, 0.35);

  border-top-color: #fff;
}


@keyframes spin {

  to {
    transform: rotate(360deg);
  }

}

</style>

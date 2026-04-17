<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import gatewayUrl from '@/api/authApi'

const route = useRoute()

const email = ref(sessionStorage.getItem('email-register') || '')
const userId = ref(route.query.userId as string)

const timeLeft = ref(60)
const showButton = ref(false)
const message = ref('')
const loading = ref(false)
let timer: any = null

const startCountdown = () => {
  showButton.value = false

  if (timer) clearInterval(timer)

  timer = setInterval(() => {
    timeLeft.value--

    if (timeLeft.value <= 0) {
      clearInterval(timer)
      showButton.value = true
      timeLeft.value = 60
    }
  }, 1000)
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// resend email
const resendEmail = async () => {
  if (loading.value) return

  loading.value = true
  message.value = ''

  try {
    await gatewayUrl.post('/api/active-user/resend-active', {
      userId: userId.value
    })

    message.value = '📩 Đã gửi lại email!'
    startCountdown()

  } catch {
    message.value = '❌ Có lỗi xảy ra!'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  startCountdown()
})
</script>

<template>
  <div class="wrapper">
    <div class="card">
      <div class="icon">📧</div>

      <h2>Kiểm tra email</h2>

      <p>
        Chúng tôi đã gửi link đến
        <span class="email">{{ email }}</span>
      </p>

      <p>Vui lòng kiểm tra email để kích hoạt tài khoản.</p>

      <div class="btn-group">
        <a href="https://mail.google.com" target="_blank" class="btn btn-primary">
          Mở Gmail
        </a>

        <router-link to="/" class="btn btn-outline">
          Trang chủ
        </router-link>
      </div>

      <div class="resend">
        Không nhận được email?

        <button
          v-if="showButton"
          @click="resendEmail"
          class="btn-resend"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner"></span>
          <span v-else class="icon">↻</span>

          {{ loading ? 'Đang gửi...' : 'Gửi lại' }}
        </button>

        <span v-else> ({{ timeLeft }}s) </span>
      </div>

      <p class="note">Kiểm tra cả Spam nếu không thấy email.</p>

      <p class="msg">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: url('@/assets/images/register.jpg') no-repeat center/cover;
}

.card {
  width: 400px;
  background: #fff;
  border-radius: 18px;
  padding: 30px;
  text-align: center;
}

.icon {
  font-size: 50px;
}

.email {
  color: #4f46e5;
  font-weight: bold;
}

.btn {
  padding: 10px 15px;
  margin: 5px;
  border-radius: 8px;
  text-decoration: none;
}

.btn-primary {
  background: #4f46e5;
  color: white;
}

.btn-outline {
  border: 1px solid #ccc;
}

.resend {
  margin-top: 15px;
}

.note {
  font-size: 12px;
  color: gray;
}

.msg {
  margin-top: 10px;
  color: green;
}
.btn-resend {
  margin-left: 6px;
  padding: 4px 10px;

  border: none;
  border-radius: 20px;

  background: #4f46e5;
  color: #fff;

  font-size: 12px;
  font-weight: 500;

  display: inline-flex;
  align-items: center;
  gap: 5px;

  cursor: pointer;
  transition: all 0.2s ease;
}

/* nhỏ + nhẹ hơn */
.btn-resend:hover:not(:disabled) {
  background: #4338ca;
}

/* disabled */
.btn-resend:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* icon */
.btn-resend .icon {
  font-size: 13px;
}

/* spinner */
.spinner {
  width: 12px;
  height: 12px;

  border: 2px solid rgba(255,255,255,0.5);
  border-top: 2px solid #fff;
  border-radius: 50%;

  animation: spin 0.7s linear infinite;
}

/* animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

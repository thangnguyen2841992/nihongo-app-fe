<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gatewayUrl from '@/api/authApi'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const message = ref('')
const error = ref('')
const countdown = ref(0)

const userId = route.query.userId

const goHome = () => router.push('/')

// resend email
const resendEmail = async () => {
  if (!userId) {
    error.value = 'Không tìm thấy userId'
    return
  }

  loading.value = true
  error.value = ''
  message.value = ''

  try {
    const res = await gatewayUrl.post('/api/active-user/resend-active', {
      userId: Number(userId)
    })

    message.value = res.data.message

    // 🔥 start countdown
    countdown.value = 30
    const timer = setInterval(() => {
      countdown.value--

      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)

  } catch (e) {
    error.value = 'Gửi lại email thất bại'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="wrapper">
    <div class="card">
      <div class="icon">⏰</div>

      <h2>Link đã hết hạn</h2>
      <p>Vui lòng yêu cầu gửi lại email kích hoạt.</p>

      <!-- MESSAGE -->
      <p class="success" v-if="message">{{ message }}</p>
      <p class="error" v-if="error">{{ error }}</p>

      <!-- RESEND BUTTON -->
      <button
        class="btn resend"
        @click="resendEmail"
        :disabled="loading || countdown > 0"
      >
        <span v-if="loading">Đang gửi...</span>
        <span v-else-if="countdown > 0">
          Gửi lại ({{ countdown }}s)
        </span>
        <span v-else>
          🔄 Gửi lại email
        </span>
      </button>

      <!-- HOME -->
      <button @click="goHome" class="btn secondary">
        Về trang chủ
      </button>
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
  background: #fff;
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  width: 360px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.icon {
  font-size: 45px;
  margin-bottom: 10px;
}

.btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  transition: 0.25s;
}

.resend {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.resend:hover {
  transform: translateY(-1px);
}

.secondary {
  background: #6b7280;
}

.secondary:hover {
  background: #4b5563;
}

.success {
  color: green;
  margin-top: 10px;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>

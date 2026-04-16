<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import gatewayUrl from '@/api/authApi'

const route = useRoute()

const email = ref(route.query.email as string)
const userId = ref(route.query.userId as string)

const timeLeft = ref(30)
const showButton = ref(false)
const message = ref('')

// countdown
const startCountdown = () => {
  showButton.value = false

  const timer = setInterval(() => {
    timeLeft.value--

    if (timeLeft.value <= 0) {
      clearInterval(timer)
      showButton.value = true
      timeLeft.value = 30
    }
  }, 1000)
}

// resend email
const resendEmail = async () => {
  try {
    await gatewayUrl.post('/api/active-user/resend-active', null, {
      params: { userId: userId.value }
    })

    message.value = '📩 Đã gửi lại email!'
    startCountdown()

  } catch {
    message.value = '❌ Có lỗi xảy ra!'
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

        <button v-if="showButton" @click="resendEmail">
          🔄 Gửi lại
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
  background: linear-gradient(135deg, #eef2ff, #ecfdf5);
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
</style>

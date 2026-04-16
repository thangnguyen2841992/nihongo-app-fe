<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import gatewayUrl from "@/api/authApi.ts";

const router = useRouter()

// state
const email = ref('')
const firstName = ref('')
const lastName = ref('')
const birthday = ref('')
const address = ref('')

const error = ref('')
const message = ref('')

const register = async () => {
  error.value = ''
  message.value = ''

  try {
    const res = await gatewayUrl.post('/api/auth/register', {
      email: email.value,
      firstName: firstName.value,
      lastName: lastName.value,
      dateOfBirth: birthday.value,
      address: address.value
    })

    // 👉 redirect sang trang verify
    await router.push({
      path: '/check-email',
      query: {
        userId: res.data.userId,
        email: res.data.email
      }
    })

  } catch (e: any) {
    error.value = e.response?.data || 'Đăng ký thất bại'
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
        <button class="btn btn-primary w-100">
          <i class="bi bi-person-plus"></i> Đăng ký
        </button>
      </form>

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

  background: url('@/assets/images/anh1.jpg') no-repeat center/cover;
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
</style>

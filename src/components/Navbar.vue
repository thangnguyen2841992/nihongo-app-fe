<script setup lang="ts">
import {useRouter} from "vue-router";
import gatewayUrl from "@/api/authApi.ts";

defineProps<{
  isLoggedIn: boolean
  name: string
}>()

const emit = defineEmits(['toggle'])

const router = useRouter()

const logout = async () => {

  try {
    await gatewayUrl.post('/api/auth/logout', {
      withCredentials: true // 🔥 QUAN TRỌNG (cookie)
    })

    await router.replace('/login') // 🔥 dùng replace thay vì push
  } catch (e) {
    console.error('Logout error', e)
  }
}
</script>

<template>
  <nav class="navbar-custom">
    <!-- button mobile -->
    <button class="btn btn-light me-2 d-md-none" @click="emit('toggle')">
      ☰
    </button>

    <span class="fw-bold text-primary">🇯🇵 NihongoApp</span>

    <div class="ms-auto">
      <!-- loading -->
      <span v-if="isLoggedIn === null">
    <!-- có thể để trống hoặc loading -->
  </span>

      <!-- đã đăng nhập -->
      <span v-else-if="isLoggedIn">
    Xin chào, <b>{{ name }}</b>
    <button @click="logout" class="btn btn-outline-danger btn-sm ms-2">
      Logout
    </button>
  </span>

      <!-- chưa đăng nhập -->
      <span v-else>
    <button
      @click="router.push('/login')"
      class="btn btn-outline-primary btn-sm me-2"
    >
      Đăng nhập
    </button>

    <button
      @click="router.push('/register')"
      class="btn btn-primary btn-sm"
    >
      Đăng ký
    </button>
  </span>
    </div>
  </nav>
</template>

<style scoped>
.navbar-custom {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;

  display: flex;
  align-items: center;
  padding: 0 20px;

  background: white;
  border-bottom: 1px solid #ddd;
  z-index: 1000;
}
</style>

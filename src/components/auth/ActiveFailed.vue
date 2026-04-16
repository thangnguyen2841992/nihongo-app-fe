<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goLogin = () => router.push('/login')
</script>

<template>
  <div class="wrapper">
    <div class="card">
      <div class="icon">❌</div>
      <h2>Kích hoạt thất bại</h2>
      <p>Link không hợp lệ hoặc đã bị thay đổi.</p>

      <button @click="goLogin" class="btn">
        Đăng nhập
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
  background: linear-gradient(135deg, #ef4444, #dc2626);
}
.card {
  background: #fff;
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  width: 350px;
}
.icon {
  font-size: 40px;
}
.btn {
  margin-top: 15px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #dc2626;
  color: #fff;
}
</style>

<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <aside id="guest-sidebar" class="learning-sidebar guest-sidebar" :class="{ open: isOpen }" aria-label="Menu học tập" @keydown.esc="emit('close')">
    <div class="sidebar-heading">
      <span>Học tập</span>
      <button class="close-menu" type="button" aria-label="Đóng menu" @click="emit('close')"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
    </div>
    <nav aria-label="Điều hướng học tập">
      <RouterLink to="/courses" class="learning-link" @click="emit('close')">
        <i class="bi bi-compass" aria-hidden="true"></i><span>Khám phá khóa học</span>
      </RouterLink>
    </nav>
    <div class="guest-account">
      <div class="account-icon" aria-hidden="true"><i class="bi bi-person-circle"></i></div>
      <h2>Chào mừng đến Nihongo</h2>
      <p>Đăng nhập để đăng ký khóa học và theo dõi tiến độ học tập.</p>
      <RouterLink to="/login" class="account-login" @click="emit('close')">Đăng nhập</RouterLink>
      <RouterLink to="/register" class="account-register" @click="emit('close')">Tạo tài khoản miễn phí</RouterLink>
    </div>
  </aside>
  <button v-if="isOpen" class="sidebar-overlay guest-overlay" type="button" aria-label="Đóng menu" @click="emit('close')"></button>
</template>

<style scoped src="./learningSidebar.css"></style>
<style scoped>
.guest-sidebar { display: flex; flex-direction: column; }
.guest-account { margin-top: auto; padding: 18px 12px 12px; border: 1px solid #e3d5df; border-radius: 14px; background: linear-gradient(140deg, #ffffffb0, #f7edf380); }
.account-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: #f0e2eb; color: #a07894; font-size: 24px; margin-bottom: 12px; }
.guest-account h2 { font-size: 12px; font-weight: 650; color: #5d4968; line-height: 1.6; margin: 0 0 8px; }
.guest-account p { color: #7c6d85; font-size: 11px; line-height: 1.8; margin: 0 0 16px; }
.guest-account a { display: block; border-radius: 9px; padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 600; text-decoration: none; }
.account-login { color: #fff; background: linear-gradient(110deg, #8e7999, #a1849d); box-shadow: 0 3px 12px #73627b15; }
.account-login:hover { background: #806b8c; }
.account-register { margin-top: 4px; color: #71647d; }
.account-register:hover { color: #53495f; background: #ede5ee; }
</style>

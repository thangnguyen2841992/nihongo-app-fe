<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
const emit = defineEmits(['close'])
</script>

<template>
  <div :class="['sidebar', { open: isOpen }]">
    <h5 class="text-center mt-3">Menu</h5>

    <router-link to="/">🏠 Trang chủ</router-link>
    <router-link to="/courses">📚 Khóa học</router-link>
    <router-link to="/lessons">📝 Bài học</router-link>
    <router-link to="/vocab">🌐 Từ vựng</router-link>
    <router-link to="/kanji">🈶 Kanji</router-link>
    <router-link to="/settings">⚙️ Cài đặt</router-link>
  </div>

  <!-- overlay mobile -->
  <div v-if="isOpen" class="overlay" @click="emit('close')"></div>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 60px;
  left: 0;
  width: 220px;
  height: 100vh;
  background: #1e293b;
  padding: 20px;
  color: white;

  transition: transform 0.3s;
}

.sidebar a {
  display: block;
  padding: 10px;
  color: #cbd5e1;
  text-decoration: none;
}

.sidebar a:hover {
  background: #334155;
  border-radius: 6px;
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}

/* overlay */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.3);
}
</style>

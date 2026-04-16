<script setup lang="ts">
import {onMounted, ref} from 'vue'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import gatewayUrl from "@/api/authApi.ts";

const isLoggedIn = ref<boolean>(
  localStorage.getItem('isLoggedIn') === 'true'
)

const name = ref<string>(
  localStorage.getItem('name') || ''
)

// 👉 gọi API chỉ để sync lại (không ảnh hưởng UI ban đầu)
onMounted(async () => {
  try {
    const res = await gatewayUrl.get('/api/auth/checkLogin', {
      withCredentials: true
    })

    isLoggedIn.value = res.data.isLoggedIn
    name.value = res.data.name || ''

    // sync lại localStorage
    localStorage.setItem('isLoggedIn', String(res.data.isLoggedIn))
    localStorage.setItem('name', res.data.name || '')
  } catch (e) {
    isLoggedIn.value = false
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('name')
  }
})

const isOpen = ref(false)
const toggleSidebar = () => isOpen.value = !isOpen.value
</script>

<template>
  <Navbar
    :isLoggedIn="isLoggedIn"
    :name="name"
    @toggle="toggleSidebar"
  />

  <div class="layout">
    <Sidebar :isOpen="isOpen" @close="isOpen = false" />

    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
}

/* Main content */
.main-content {
  flex: 1;
  margin-left: 220px;
  padding: 80px 20px 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
</style>

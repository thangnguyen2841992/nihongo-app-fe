<script setup lang="ts">
import {onMounted, ref} from 'vue'
import Navbar from '@/users/Navbar.vue'
import Sidebar from '@/users/Sidebar.vue'
import {gatewayUrl} from "@/api/authApi.ts";
import NavbarUser from "@/users/NavbarUser.vue";

const isLoggedIn = ref<boolean>(false)

const name = ref<string>('')

const email = ref<string>('')

onMounted(async () => {
  try {
    const res = await gatewayUrl.get('/api/auth/checkLogin', {
      withCredentials: true
    })

    isLoggedIn.value = res.data.isLoggedIn
    name.value = res.data.name || ''
    email.value = res.data.email
  } catch (e) {
    isLoggedIn.value = false
  }
})

const isOpen = ref(false)
const toggleSidebar = () => isOpen.value = !isOpen.value
</script>

<template>
  <Navbar
    :isLoggedIn="isLoggedIn"
    :name="name"
    :email="email"
    @toggle="toggleSidebar"
  />
<!--  <NavbarUser/>-->
  <div class="layout">
    <Sidebar :isOpen="isOpen" @close="isOpen = false"/>

    <div class="main-content">
      <router-view/>
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
  margin-top: 15px;
  padding: 40px 20px 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
</style>

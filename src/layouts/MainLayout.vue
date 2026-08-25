<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import Navbar from '@/users/Navbar.vue'
import Sidebar from '@/users/Sidebar.vue'
import {gatewayUrl} from "@/api/authApi.ts";
import NavbarUser from "@/users/NavbarUser.vue";
import StaffSidebar from "@/components/staff/StaffSidebar.vue";
import StaffNavbar from "@/components/staff/StaffNavbar.vue";

const isLoggedIn = ref<boolean>(false)

const name = ref<string>('')

const email = ref<string>('')

const role = ref<string>('')

onMounted(async () => {
  try {
    const res = await gatewayUrl.get('/api/auth/checkLogin', {
      withCredentials: true
    })

    isLoggedIn.value = res.data.isLoggedIn
    name.value = res.data.name || ''
    email.value = res.data.email
    role.value = res.data.role || ''
  } catch (e) {
    isLoggedIn.value = false
    role.value = ''
  }
})

const isOpen = ref(false)
const toggleSidebar = () => isOpen.value = !isOpen.value
const isStaff = computed(() => role.value === 'STAFF')
const isUser = computed(() => role.value === 'USER')
</script>

<template>
  <!-- STAFF -->
  <StaffNavbar
    v-if="isStaff"
    :isLoggedIn="isLoggedIn"
    :name="name"
    :email="email"
    @toggle="toggleSidebar"
  />

  <!-- USER -->
  <Navbar
    v-else-if="isUser"
    :isLoggedIn="isLoggedIn"
    :name="name"
    :email="email"
    @toggle="toggleSidebar"
  />


  <div class="layout">

    <!-- STAFF -->
    <StaffSidebar
      v-if="isStaff"
      :isOpen="isOpen"
      @close="isOpen = false"
    />

    <!-- USER -->
    <Sidebar
      v-else-if="isUser"
      :isOpen="isOpen"
      @close="isOpen = false"
    />

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

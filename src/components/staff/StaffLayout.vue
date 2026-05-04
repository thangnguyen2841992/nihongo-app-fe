<script setup lang="ts">
import StaffSidebar from "@/components/staff/StaffSidebar.vue";
import StaffNavbar from "@/components/staff/StaffNavbar.vue";
</script>

<template>
  <div class="layout">

    <!-- SIDEBAR -->
    <StaffSidebar />

    <!-- MAIN -->
    <div class="main d-flex flex-column">

      <StaffNavbar />

      <div class="content flex-grow-1">
        <router-view />
      </div>

    </div>

  </div>
</template>

<style scoped>
.layout {
  display: flex;
}

.main {
  flex: 1;
  min-height: 100vh;
  background: #f1f5f9;
}

.content {
  padding: 20px;
}
</style>

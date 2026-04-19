<template>
  <div>
    <AdminNavbar />

    <div class="container-fluid">
      <div class="row">
        <AdminSidebar />

        <!-- Content -->
        <main class="col-md-10 ms-sm-auto px-md-4 py-4 content-area">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AdminNavbar from "@/components/admin/AdminNavbar.vue"
import AdminSidebar from "@/components/admin/AdminSidebar.vue"
</script>

<style scoped>
.content-area {
  background: #f8fafc;
  min-height: 100vh;
}
</style>

<script setup lang="ts">
</script>

<template>
  <nav
    class="navbar navbar-expand-lg navbar-light bg-light shadow-sm user-navbar"
  >
    <div class="container">

      <RouterLink
        to="/user"
        class="navbar-brand"
      >
        Nihongo
      </RouterLink>

      <div class="navbar-nav">

        <RouterLink
          to="/user"
          class="nav-link"
        >
          🏠 Trang chủ
        </RouterLink>

        <RouterLink
          to="/courses"
          class="nav-link"
        >
          📚 Danh sách khóa học
        </RouterLink>

        <RouterLink
          to="/user/my-courses"
          class="nav-link"
        >
          🎓 Khóa học của tôi
        </RouterLink>

      </div>

    </div>
  </nav>
</template>

<style scoped>
.user-navbar {
  margin-top: 56px;
}

.router-link-active {
  font-weight: bold;
}
</style>

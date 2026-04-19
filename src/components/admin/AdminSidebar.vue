<template>
  <aside class="col-md-2 sidebar d-flex flex-column p-3">

    <h6 class="text-uppercase text-secondary small mb-3">
      <i class="bi bi-grid"></i> Menu
    </h6>

    <router-link to="/admin/users" class="nav-item">
      <i class="bi bi-people"></i> Users
    </router-link>

    <router-link to="/admin/dashboard" class="nav-item">
      <i class="bi bi-speedometer2"></i> Dashboard
    </router-link>

  </aside>
</template>

<style scoped>
.sidebar {
  height: 100vh;
  background: #111827;
  color: #fff;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 8px;
  text-decoration: none;
  color: #cbd5e1;
  transition: 0.2s;
}

.nav-item:hover {
  background: #1f2937;
  color: #fff;
  transform: translateX(4px);
}

.router-link-active {
  background: #2563eb;
  color: white !important;
}
</style>

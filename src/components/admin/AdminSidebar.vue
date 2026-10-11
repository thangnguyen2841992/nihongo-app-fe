<template>
  <aside class="col-md-2 sidebar d-flex flex-column p-3">
    <router-link to="/admin/operations" class="nav-item"><i class="bi bi-activity"></i> Trung tâm vận hành</router-link>
    <router-link to="/admin/refunds" class="nav-item"><i class="bi bi-arrow-return-left"></i> Hoàn tiền khóa học</router-link>
    <router-link to="/staff/classrooms" class="nav-item"><i class="bi bi-mortarboard"></i> Lớp học & giao đề</router-link>
    <router-link to="/account" class="nav-item"><i class="bi bi-shield-lock"></i> Bảo mật tài khoản</router-link>
    <router-link to="/admin/wallet-deposits" class="nav-item">
      <i class="bi bi-wallet2"></i> Đối soát nạp tiền
    </router-link>

    <h6 class="text-uppercase text-secondary small mb-3">
      <i class="bi bi-grid"></i> Menu
    </h6>

    <router-link to="/admin/users" class="nav-item">
      <i class="bi bi-people"></i> Tài khoản
    </router-link>

    <router-link to="/admin/reviews" class="nav-item">
      <i class="bi bi-journal-check"></i> Duyệt sách
    </router-link>

    <router-link to="/admin/revenue" class="nav-item"><i class="bi bi-graph-up"></i> Doanh thu</router-link>
    <router-link to="/admin/catalog" class="nav-item"><i class="bi bi-tags"></i> Khóa học & gói giá</router-link>
    <router-link to="/admin/promotions" class="nav-item"><i class="bi bi-ticket-perforated"></i> Mã giảm giá</router-link>
    <router-link to="/admin/audit" class="nav-item"><i class="bi bi-clock-history"></i> Nhật ký quản trị</router-link>

    <router-link to="/admin/dashboard" class="nav-item">
      <i class="bi bi-speedometer2"></i> Tổng quan
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
@media (max-width: 767px) {
  .sidebar { height: auto; flex-direction: row !important; flex-wrap: wrap; gap: 4px; }
  .sidebar h6 { display: none; }
  .nav-item { padding: 9px; font-size: 13px; margin-bottom: 0; }
}
</style>

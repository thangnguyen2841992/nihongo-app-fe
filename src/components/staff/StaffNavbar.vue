<script setup lang="ts">
import { logout, useAuthState } from "@/services/useAuth.ts"
import router from "@/router"

/* =========================
   AUTH STATE
========================= */

const {
  userName,
  userEmail
} = useAuthState()

/* =========================
   LOGOUT
========================= */

const handleLogout = async () => {

  try {

    await logout()

    await router.replace("/login")

  } catch (e) {

    console.error("Lỗi đăng xuất", e)

  }
}
</script>

<template>

  <nav
    class="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-3"
  >

    <div class="container-fluid">

      <!-- LOGO -->
      <span class="navbar-brand fw-bold">

        📚 Quản trị nhân viên

      </span>

      <!-- RIGHT -->
      <div class="d-flex align-items-center">

        <!-- NOTIFICATION -->
        <button
          class="btn btn-light position-relative me-3 notification-btn"
        >

          <i class="bi bi-bell"></i>

          <span
            class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
          >
            3
          </span>

        </button>

        <!-- USER DROPDOWN -->
        <div class="dropdown">

          <button
            class="btn user-dropdown-btn dropdown-toggle"
            data-bs-toggle="dropdown"
          >

            <!-- AVATAR -->
            <div class="avatar-circle">

              <i class="bi bi-person-fill"></i>

            </div>

            <!-- INFO -->
            <div class="user-info">

              <div class="user-name">

                {{ userName || "Nhân viên" }}

              </div>

              <div class="user-email">

                {{ userEmail }}

              </div>

            </div>

          </button>

          <!-- MENU -->
          <ul
            class="dropdown-menu dropdown-menu-end shadow border-0"
          >

            <li>

              <a class="dropdown-item">

                <i class="bi bi-person me-2"></i>

                Thông tin cá nhân

              </a>

            </li>

            <li>

              <a class="dropdown-item">

                <i class="bi bi-gear me-2"></i>

                Cài đặt

              </a>

            </li>

            <li>
              <hr class="dropdown-divider">
            </li>

            <li>

              <a
                class="dropdown-item text-danger"
                @click="handleLogout"
              >

                <i class="bi bi-box-arrow-right me-2"></i>

                Đăng xuất

              </a>

            </li>

          </ul>

        </div>

      </div>

    </div>

  </nav>

</template>

<style scoped>

/* =========================
   NAVBAR
========================= */

.navbar {
  height: 72px;
}

/* =========================
   NOTIFICATION BUTTON
========================= */

.notification-btn {
  width: 46px;
  height: 46px;

  border-radius: 50%;

  display: flex;
  justify-content: center;
  align-items: center;

  transition: 0.2s ease;
}

.notification-btn:hover {
  background: #f1f3f5;
}

/* =========================
   USER BUTTON
========================= */

.user-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 12px;

  background: #fff;

  border: 1px solid #e5e7eb;

  border-radius: 14px;

  padding: 8px 14px;

  transition: 0.2s ease;
}

.user-dropdown-btn:hover {
  background: #f8f9fa;
}

/* =========================
   AVATAR
========================= */

.avatar-circle {
  width: 42px;
  height: 42px;

  border-radius: 50%;

  background: linear-gradient(
    135deg,
    #0d6efd,
    #4f8cff
  );

  color: white;

  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 18px;

  flex-shrink: 0;
}

/* =========================
   USER INFO
========================= */

.user-info {
  text-align: left;
}

.user-name {
  font-weight: 700;

  font-size: 14px;

  line-height: 1.2;
}

.user-email {
  font-size: 12px;

  color: #6c757d;

  line-height: 1.2;
}

/* =========================
   DROPDOWN
========================= */

.dropdown-menu {
  border-radius: 14px;

  min-width: 220px;

  padding: 8px;
}

.dropdown-item {
  border-radius: 10px;

  padding: 10px 14px;

  transition: 0.2s ease;

  cursor: pointer;
}

.dropdown-item:hover {
  background: #f5f7fa;
}

/* =========================
   MOBILE
========================= */

@media (max-width: 768px) {

  .user-email {
    display: none;
  }

  .user-dropdown-btn {
    padding: 8px 10px;
  }
}

</style>

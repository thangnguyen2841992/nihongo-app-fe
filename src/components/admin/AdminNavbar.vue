<script setup lang="ts">
import { ref, onMounted } from "vue"
import { logout } from "@/services/authState.ts"
import router from "@/router"
import {gatewayUrl} from "@/api/authApi.ts"

/* =========================
   USER INFO
========================= */

const isLoggedIn = ref(false)

const userName = ref("")
const userEmail = ref("")

/* =========================
   LOAD USER
========================= */

onMounted(async () => {

  try {

    const res = await gatewayUrl.get("/api/auth/checkLogin")

    if (res.data.isLoggedIn) {

      isLoggedIn.value = true

      userName.value = res.data.name
      userEmail.value = res.data.email

    } else {

      isLoggedIn.value = false
    }

  } catch (e) {

    isLoggedIn.value = false

    console.error("Không thể lấy thông tin người dùng", e)
  }
})

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
    class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm px-4"
  >

    <div class="container-fluid">

      <!-- LOGO -->
      <span
        class="navbar-brand fw-bold text-warning"
      >

        <i class="bi bi-torii-gate me-2"></i>

        Nihongo Admin

      </span>

      <!-- RIGHT -->
      <div class="ms-auto d-flex align-items-center">
        <!-- NOTIFICATION -->
        <button
          class="btn btn-dark position-relative me-3 notification-btn"
        >

          <i class="bi bi-bell-fill text-warning"></i>

          <span
            class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
          >
      3
    </span>

        </button>
        <!-- USER -->
        <div
          v-if="isLoggedIn"
          class="dropdown"
        >

          <button
            class="btn admin-user-btn dropdown-toggle"
            data-bs-toggle="dropdown"
          >

            <!-- AVATAR -->
            <div class="avatar-circle">

              <i class="bi bi-person-fill"></i>

            </div>

            <!-- INFO -->
            <div class="user-info">

              <div class="user-name">

                {{ userName || "Quản trị viên" }}

              </div>

              <div class="user-email">

                {{ userEmail }}

              </div>

            </div>

          </button>

          <!-- DROPDOWN -->
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

        <!-- LOGIN -->
        <div v-else>

          <button
            class="btn btn-warning"
            @click="router.push('/login')"
          >

            <i class="bi bi-box-arrow-in-right me-1"></i>

            Đăng nhập

          </button>

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
   USER BUTTON
========================= */

.admin-user-btn {
  display: flex;
  align-items: center;
  gap: 12px;

  background: rgba(255,255,255,0.08);

  border: 1px solid rgba(255,255,255,0.12);

  border-radius: 14px;

  padding: 8px 14px;

  color: white;

  transition: 0.2s ease;
}

.admin-user-btn:hover {
  background: rgba(255,255,255,0.15);
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
    #ffc107,
    #ff9800
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

  color: white;
}

.user-email {
  font-size: 12px;

  color: rgba(255,255,255,0.7);

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

  .admin-user-btn {
    padding: 8px 10px;
  }
}

/* =========================
   NOTIFICATION
========================= */

.notification-btn {
  width: 46px;
  height: 46px;

  border-radius: 50%;

  display: flex;
  justify-content: center;
  align-items: center;

  border: 1px solid rgba(255,255,255,0.12);

  transition: 0.2s ease;
}

.notification-btn:hover {
  background: rgba(255,255,255,0.12);
}

.notification-btn i {
  font-size: 18px;
}

</style>

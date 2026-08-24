<script setup lang="ts">
import { ref } from "vue"
import { logout, useAuthState } from "@/services/authState.ts"
import router from "@/router"
import { analyzeJapanese } from "@/services/japaneseAiService"
/* =========================
   AUTH STATE
========================= */

const {
  userName,
  userEmail
} = useAuthState()

/* =========================
   SEARCH
========================= */

const searchKeyword = ref("")
const searchLoading = ref(false)

const handleSearch = async () => {

  const keyword = searchKeyword.value.trim()

  if (!keyword || searchLoading.value) {
    return
  }

  try {

    searchLoading.value = true

    const result = await analyzeJapanese(keyword)

    console.log("Japanese AI result:", result)

  } catch (e) {

    console.error("Japanese AI search error:", e)

  } finally {

    searchLoading.value = false

  }
}
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


      <!-- =========================
           SEARCH
      ========================== -->

      <form
        class="navbar-search"
        @submit.prevent="handleSearch"
      >

        <i class="bi bi-search search-icon"></i>

        <input
          v-model="searchKeyword"
          type="text"
          class="form-control search-input"
          placeholder="Tìm kiếm..."
        />

        <button
          v-if="searchKeyword"
          type="button"
          class="search-clear"
          @click="searchKeyword = ''"
        >

          <i class="bi bi-x"></i>

        </button>

      </form>


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
  position: fixed;

  top: 0;
  left: 300px;

  right: 0;
  height: 72px;

  z-index: 999;

  background: white;
}


/* =========================
   SEARCH
========================= */

.navbar-search {
  position: relative;

  width: 420px;

  margin-left: 50px;
  margin-right: auto;
}

.search-input {
  height: 44px;

  padding-left: 42px;
  padding-right: 42px;

  border: 1px solid #e5e7eb;

  border-radius: 12px;

  background: #f8f9fa;

  font-size: 14px;

  transition: 0.2s ease;
}

.search-input:focus {
  background: white;

  border-color: #86b7fe;

  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
}

.search-icon {
  position: absolute;

  left: 15px;
  top: 50%;

  transform: translateY(-50%);

  color: #6c757d;

  z-index: 2;
}

.search-clear {
  position: absolute;

  right: 10px;
  top: 50%;

  transform: translateY(-50%);

  border: none;

  background: transparent;

  color: #6c757d;

  width: 28px;
  height: 28px;

  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
}

.search-clear:hover {
  background: #e9ecef;
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

@media (max-width: 992px) {

  .navbar-search {
    width: 280px;

    margin-left: 20px;
  }

}

@media (max-width: 768px) {

  .navbar-search {
    width: 200px;

    margin-left: 10px;
  }

  .user-email {
    display: none;
  }

  .user-dropdown-btn {
    padding: 8px 10px;
  }

}

@media (max-width: 576px) {

  .navbar-search {
    width: 44px;

    margin-left: auto;
    margin-right: 10px;
  }

  .search-input {
    width: 44px;

    padding-left: 42px;
    padding-right: 5px;

    cursor: pointer;
  }

  .search-input::placeholder {
    color: transparent;
  }

  .search-input:focus {
    position: absolute;

    right: 0;

    width: 220px;

    background: white;
  }

  .search-clear {
    display: none;
  }

}

</style>

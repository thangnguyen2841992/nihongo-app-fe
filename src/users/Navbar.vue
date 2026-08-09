<script setup lang="ts">
import {ref} from "vue"
import {useRouter} from "vue-router"
import {logout} from "@/services/authState.ts"

const props = defineProps<{
  isLoggedIn: boolean
  name?: string
  email?: string
}>()

const emit =
  defineEmits(["toggle"])

const router =
  useRouter()

const notificationCount =
  ref(3)

const showNotification =
  ref(false)

const notifications =
  ref([
    {
      id: 1,
      message:
        "Bạn có 5 từ vựng cần ôn tập"
    },
    {
      id: 2,
      message:
        "Bài kiểm tra N3 đã sẵn sàng"
    },
    {
      id: 3,
      message:
        "Có 1 bình luận mới"
    }
  ])

const toggleNotification =
  () => {
    showNotification.value =
      !showNotification.value
  }

const handleLogout =
  async () => {

    try {

      await logout()

      await router.replace(
        "/login"
      )

    } catch (e) {

      console.error(
        "Logout error",
        e
      )
    }
  }
</script>
<template>

  <nav class="navbar-custom">

    <button
      class="btn btn-light me-2 d-md-none"
      @click="emit('toggle')"
    >
      ☰
    </button>

    <div
      class="brand"
      @click="router.push('/')"
    >
      🇯🇵 NihongoApp
    </div>

    <div class="ms-auto">

      <div
        v-if="isLoggedIn"
        class="navbar-right"
      >

        <!-- Notification -->

        <div
          class="notification-wrapper"
        >

          <button
            class="notification-btn"
            @click="
              toggleNotification
            "
          >
            🔔

            <span
              v-if="
                notificationCount > 0
              "
              class="
                notification-badge
              "
            >
              {{
                notificationCount
              }}
            </span>

          </button>

          <div
            v-if="
              showNotification
            "
            class="
              notification-dropdown
            "
          >

            <div
              class="
                notification-title
              "
            >
              Thông báo
            </div>

            <div
              v-for="
                item in notifications
              "
              :key="item.id"
              class="
                notification-item
              "
            >
              {{ item.message }}
            </div>

          </div>

        </div>

        <!-- User -->

        <div class="user-info">

          <div class="avatar">
            {{
              name
                ?.charAt(0)
                ?.toUpperCase()
            }}
          </div>

          <div
            class="user-detail"
          >

            <div
              class="user-name"
            >
              {{ name }}
            </div>

            <div
              class="user-email"
            >
              {{ email }}
            </div>

          </div>

          <button
            class="logout-btn"
            @click="
              handleLogout
            "
          >
            Logout
          </button>

        </div>

      </div>

      <div v-else>

        <button
          @click="
            router.push(
              '/login'
            )
          "
          class="
            btn
            btn-outline-primary
            btn-sm
            me-2
          "
        >
          Đăng nhập
        </button>

        <button
          @click="
            router.push(
              '/register'
            )
          "
          class="
            btn
            btn-primary
            btn-sm
          "
        >
          Đăng ký
        </button>

      </div>

    </div>

  </nav>

</template>

<style scoped>

.navbar-custom {

  position: fixed;

  top: 0;
  left: 0;

  width: 100%;
  height: 64px;

  display: flex;
  align-items: center;

  padding: 0 24px;

  background: white;

  border-bottom:
    1px solid #e5e7eb;

  z-index: 1000;

  box-shadow:
    0 2px 12px
    rgba(0,0,0,.04);
}

.brand {

  font-size: 22px;

  font-weight: 700;

  color: #2563eb;

  cursor: pointer;
}

.navbar-right {

  display: flex;

  align-items: center;

  gap: 20px;
}

/* Notification */

.notification-wrapper {
  position: relative;
}

.notification-btn {

  position: relative;

  width: 42px;
  height: 42px;

  border: none;

  border-radius: 50%;

  background: #f1f5f9;

  font-size: 20px;

  cursor: pointer;

  transition: .2s;
}

.notification-btn:hover {
  background: #e2e8f0;
}

.notification-badge {

  position: absolute;

  top: -4px;
  right: -4px;

  min-width: 20px;
  height: 20px;

  border-radius: 999px;

  background: #ef4444;

  color: white;

  font-size: 11px;

  font-weight: 700;

  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-dropdown {

  position: absolute;

  top: 52px;
  right: 0;

  width: 320px;

  background: white;

  border-radius: 16px;

  overflow: hidden;

  box-shadow:
    0 10px 30px
    rgba(0,0,0,.15);
}

.notification-title {

  padding: 14px 16px;

  font-weight: 700;

  border-bottom:
    1px solid #eee;
}

.notification-item {

  padding: 14px 16px;

  cursor: pointer;
}

.notification-item:hover {
  background: #f8fafc;
}

/* User */

.user-info {

  display: flex;

  align-items: center;

  gap: 12px;
}

.avatar {

  width: 42px;
  height: 42px;

  border-radius: 50%;

  background:
    linear-gradient(
      135deg,
      #4f8cff,
      #7b61ff
    );

  color: white;

  font-weight: 700;

  display: flex;
  align-items: center;
  justify-content: center;
}

.user-detail {
  line-height: 1.2;
}

.user-name {
  font-weight: 700;
}

.user-email {

  font-size: 12px;

  color: #64748b;
}

.logout-btn {

  border: none;

  padding: 8px 14px;

  border-radius: 10px;

  background: #fee2e2;

  color: #dc2626;

  font-weight: 600;

  transition: .2s;
}

.logout-btn:hover {
  background: #fecaca;
}

@media (
max-width: 768px
) {

  .user-email {
    display: none;
  }

  .logout-btn {
    display: none;
  }
}

</style>

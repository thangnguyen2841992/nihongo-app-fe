<script setup lang="ts">
import {ref} from "vue"
import {useRouter} from "vue-router"
import {logout} from "@/services/authState.ts"
import {analyzeJapanese} from "@/services/japaneseAiService.ts";

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
const searchKeyword = ref('')
const searchLoading = ref(false)

const handleSearch = async () => {

  const keyword = searchKeyword.value.trim()

  if (!keyword || searchLoading.value) {
    return
  }

  try {

    searchLoading.value = true

    const result = await analyzeJapanese(keyword)

    // Lưu kết quả để JapaneseAiResult.vue đọc
    sessionStorage.setItem(
      'japaneseAiResult',
      JSON.stringify(result)
    )

    await router.push('/japanese-ai')

  } catch (e) {

    console.error(
      'Japanese AI search error:',
      e
    )

  } finally {

    searchLoading.value = false

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
    <form
      class="ai-search"
      @submit.prevent="handleSearch"
    >
  <span class="search-icon">
    🔍
  </span>

      <input
        v-model="searchKeyword"
        type="text"
        placeholder="Tìm kiếm tiếng Nhật..."
        :disabled="searchLoading"
      />

      <button
        v-if="searchKeyword"
        type="button"
        class="search-clear"
        @click="searchKeyword = ''"
      >
        ×
      </button>

      <button
        type="submit"
        class="search-ai-btn"
        :disabled="searchLoading || !searchKeyword.trim()"
      >
        <span v-if="searchLoading">...</span>
        <span v-else>AI</span>
      </button>
    </form>
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

  border-bottom: 1px solid #e5e7eb;

  z-index: 1000;

  box-shadow: 0 2px 12px rgba(0, 0, 0, .04);
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

  box-shadow: 0 10px 30px rgba(0, 0, 0, .15);
}

.notification-title {

  padding: 14px 16px;

  font-weight: 700;

  border-bottom: 1px solid #eee;
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

  background: linear-gradient(
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

/* =========================
   AI SEARCH
========================= */

.ai-search {
  position: relative;

  display: flex;
  align-items: center;

  width: 360px;

  margin-left: 40px;
}

.ai-search input {
  width: 100%;
  height: 42px;

  padding: 0 75px 0 40px;

  border: 1px solid #e5e7eb;
  border-radius: 12px;

  background: #f8fafc;

  outline: none;

  font-size: 14px;

  transition: .2s;
}

.ai-search input:focus {
  background: white;

  border-color: #86b7fe;

  box-shadow: 0 0 0 3px rgba(13, 110, 253, .1);
}

.search-icon {
  position: absolute;

  left: 14px;

  z-index: 2;

  font-size: 15px;
}

.search-clear {
  position: absolute;

  right: 48px;

  width: 25px;
  height: 25px;

  border: none;
  border-radius: 50%;

  background: transparent;

  color: #64748b;

  cursor: pointer;
}

.search-ai-btn {
  position: absolute;

  right: 5px;

  height: 32px;

  padding: 0 10px;

  border: none;
  border-radius: 8px;

  background: #2563eb;

  color: white;

  font-size: 12px;

  font-weight: 700;

  cursor: pointer;
}

.search-ai-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}
</style>

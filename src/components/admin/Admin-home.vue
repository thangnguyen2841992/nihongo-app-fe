<template>
  <div>

    <!-- Title -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="fw-bold">
        <i class="bi bi-people"></i> Danh sách người dùng
      </h4>

      <button @click="openModal" class="btn btn-primary">
        <i class="bi bi-plus-lg"></i> Thêm
      </button>
    </div>

    <!-- Card -->
    <div class="card shadow-sm border-0">
      <div class="card-body">

        <table class="table table-hover align-middle">
          <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Email</th>
            <th>Tên</th>
            <th>Số Điện Thoại</th>
            <th>Địa Chỉ</th>
            <th>Sinh Nhật</th>
            <th>Quyền Hạn</th>
            <th>Trạng thái</th>
            <th class="text-end">Hành động</th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="(user, index) in users" :key="user.id">
            <td>{{ index + 1 }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.fullName }}</td>
            <td>{{ user.phoneNumber }}</td>
            <td>{{ user.address }}</td>
            <td>{{ user.dateOfBirth }}</td>
            <td>{{ user.roleName }}</td>
            <td>
      <span
        :class="user.activeStatus === 'Đã kích hoạt' ? 'badge bg-success' : 'badge bg-secondary'">
            {{ user.activeStatus === 'Đã kích hoạt' ? 'Active' : 'Inactive' }}
      </span>
            </td>

            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-2">
                <i class="bi bi-pencil"></i>
              </button>

              <button class="btn btn-sm btn-outline-danger">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
          </tbody>
        </table>

      </div>
    </div>

  </div>

  <div v-if="showModal" class="modal-backdrop">
    <div class="modal-box">

      <h5 class="mb-3">Tạo tài khoản</h5>

      <form @submit.prevent="createUser">

        <!-- Email -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="bi bi-envelope"></i></span>
          <input v-model="newUser.email" type="email" class="form-control" placeholder="Email" ref="emailRef" required>
        </div>

        <!-- Name -->
        <div class="row">
          <div class="col-6 mb-3 input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input v-model="newUser.lastName" type="text" class="form-control" placeholder="Họ" required>
          </div>
          <div class="col-6 mb-3 input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input v-model="newUser.firstName" type="text" class="form-control" placeholder="Tên" required>
          </div>
        </div>

        <!-- Birthday -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="bi bi-calendar"></i></span>
          <input v-model="newUser.dateOfBirth" type="date" class="form-control">
        </div>

        <!-- Address -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="bi bi-geo-alt"></i></span>
          <input v-model="newUser.address" type="text" class="form-control" placeholder="Địa chỉ">
        </div>

        <!-- ROLE -->
        <div class="mb-3 input-group">
          <span class="input-group-text"><i class="bi bi-shield-lock"></i></span>
          <select v-model="newUser.roleName" class="form-select">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
          </select>
        </div>

        <!-- Message -->
        <div class="text-danger text-center mb-2">{{ error }}</div>
        <div class="text-success text-center mb-2">{{ message }}</div>

        <!-- Buttons -->
        <div class="d-flex justify-content-end gap-2 mt-2">
          <button type="button" class="btn btn-secondary" @click="showModal = false">
            Hủy
          </button>

          <button class="btn btn-primary" type="submit" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-person-plus"></i>
            {{ loading ? 'Đang xử lý...' : 'Tạo tài khoản' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<style>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.4);

  display: flex;
  justify-content: center;
  align-items: center;

  z-index: 999;
}

.modal-box {
  background: #fff;
  padding: 25px;
  border-radius: 12px;
  width: 350px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
</style>

<script setup lang="ts">
import {ref, onMounted, nextTick } from 'vue'
import gatewayUrl from "@/api/authApi"

type User = {
  id: number
  email: string
  fullName: string
  phoneNumber: string
  address: string
  dateOfBirth: string
  roleName: string
  activeStatus: string
}

const users = ref<User[]>([])

const showModal = ref(false)
const loading = ref(false)
const error = ref('')
const message = ref('')
const emailRef = ref<HTMLInputElement | null>(null)

const newUser = ref({
  email: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  address: '',
  roleName: 'USER'
})

const openModal = async () => {
  showModal.value = true

  await nextTick() // 🔥 đợi DOM render

  emailRef.value?.focus()
}

const createUser = async () => {
  error.value = ''
  message.value = ''
  loading.value = true

  try {
    await gatewayUrl.post('/api/auth/register', newUser.value, {
      withCredentials: true
    })

    message.value = 'Tạo tài khoản thành công'
    showModal.value = false

    // reset form
    newUser.value = {
      email: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      address: '',
      roleName: 'USER'
    }

  } catch (e) {
    error.value = 'Tạo tài khoản thất bại'
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  const res = await gatewayUrl.get('/api/admin/getAllUsers')
  users.value = res.data
})
</script>

<template>
  <div>

    <!-- Title -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="fw-bold">
        <i class="bi bi-people"></i> Danh sách người dùng
      </h4>

      <button class="btn btn-primary">
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
            <th>Trạng thái</th>
            <th class="text-end">Hành động</th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="(user, index) in users" :key="user.id">
            <td>{{ index + 1 }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.name }}</td>

            <td>
              <span class="badge bg-success">Active</span>
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
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import gatewayUrl from "@/api/authApi"

type User = {
  id: number
  email: string
  name: string
}

const users = ref<User[]>([])

onMounted(async () => {
  const res = await gatewayUrl.get('/api/admin/users')
  users.value = res.data
})
</script>

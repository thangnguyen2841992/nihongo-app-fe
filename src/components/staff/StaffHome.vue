
<script setup lang="ts">
import { ref, onMounted } from "vue"
import axios from "axios"
import CreateBookModal from "@/components/staff/CreateBookModal.vue";

interface Book {
  id: number
  bookName: string
  types?: {
    name: string
  }
  level?: {
    name: string
  }
}

const books = ref<Book[]>([])
const showModal = ref(false)

const fetchBooks = async () => {
  const res = await axios.get("http://localhost:8082/api/staff/books")
  books.value = res.data
}

onMounted(fetchBooks)

const openModal = () => showModal.value = true
const closeModal = () => showModal.value = false

const onCreated = () => {
  fetchBooks()
  closeModal()
}
</script>

<template>
  <div class="container mt-4">

    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="fw-bold">📚 Book Management</h3>

      <button class="btn btn-primary" @click="openModal">
        <i class="bi bi-plus-circle me-1"></i>
        Add Book
      </button>
    </div>

    <!-- TABLE CARD -->
    <div class="card shadow-sm">
      <div class="card-body">

        <table class="table table-hover align-middle">
          <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Type</th>
            <th>Level</th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="b in books" :key="b.id">
            <td>{{ b.id }}</td>
            <td class="fw-semibold">{{ b.bookName }}</td>
            <td>
                <span class="badge bg-info text-dark">
                  {{ b.types?.name }}
                </span>
            </td>
            <td>
                <span class="badge bg-secondary">
                  {{ b.level?.name }}
                </span>
            </td>
          </tr>
          </tbody>
        </table>

        <div v-if="books.length === 0" class="text-center text-muted py-3">
          No books found
        </div>

      </div>
    </div>

    <!-- MODAL -->
    <CreateBookModal
      v-if="showModal"
      @close="closeModal"
      @created="onCreated"
    />

  </div>
</template>

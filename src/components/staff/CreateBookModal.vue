<script setup lang="ts">
import {onMounted, ref} from "vue"
import axios from "axios"
import gatewayUrl from "@/api/authApi.ts";

const emit = defineEmits(["close", "created"])
interface Type {
  id: number
  name: string
}

interface Level {
  id: number
  name: string
}
const types = ref<Type[]>([])
const levels = ref<Level[]>([])

const loading = ref(false)

const form = ref({
  bookName: "",
  typeId: null,
  levelId: null,
  urls: ""
})

onMounted(async () => {
  const [t, l] = await Promise.all([
    gatewayUrl.get("/api/staff/types"),
    gatewayUrl.get("/api/staff/levels")
  ])

  types.value = t.data
  levels.value = l.data
})

const submit = async () => {
  loading.value = true
  try {
    await axios.post("http://localhost:8080/api/staff/books", {
      bookName: form.value.bookName,
      typeId: form.value.typeId,
      levelId: form.value.levelId,
      urls: form.value.urls.split(",")
    })

    emit("created")
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal fade show d-block">
    <div class="modal-dialog">
      <div class="modal-content shadow">

        <!-- HEADER -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-book me-2"></i>
            Create New Book
          </h5>
          <button class="btn-close" @click="$emit('close')"></button>
        </div>

        <!-- BODY -->
        <div class="modal-body">

          <div class="mb-3">
            <label class="form-label">Book Name</label>
            <input
              v-model="form.bookName"
              class="form-control"
              placeholder="Enter book name"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Type</label>
            <select v-model="form.typeId" class="form-select">
              <option :value="null">Select type</option>
              <option v-for="t in types" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Level</label>
            <select v-model="form.levelId" class="form-select">
              <option :value="null">Select level</option>
              <option v-for="l in levels" :key="l.id" :value="l.id">
                {{ l.name }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">URLs</label>
            <input
              v-model="form.urls"
              class="form-control"
              placeholder="url1,url2"
            />
          </div>

        </div>

        <!-- FOOTER -->
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>

          <button class="btn btn-primary" @click="submit" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
            Save
          </button>
        </div>

      </div>
    </div>
  </div>

  <!-- BACKDROP -->
  <div class="modal-backdrop fade show"></div>
</template>

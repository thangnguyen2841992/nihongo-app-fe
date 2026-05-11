<script setup lang="ts">
import {onMounted, ref} from "vue"
import axios from "axios"
import gatewayUrl from "@/api/authApi.ts";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "firebase/storage"
import {storage} from "@/services/firebase.ts";

const files = ref<File[]>([])
const emit = defineEmits(["close", "created"])
interface Type {
  typeId: number
  typeName: string
}

interface Level {
  levelId: number
  levelName: string
}
const types = ref<Type[]>([])
const levels = ref<Level[]>([])

const loading = ref(false)

const form = ref<{
  bookName: string
  typeId: number | null
  levelId: number | null
  urls: string
}>({

  bookName: "",

  typeId: null,

  levelId: null,

  urls: ""
})

onMounted(async () => {

  const [t, l] = await Promise.all([
    gatewayUrl.get('/api/staff/types'),
    gatewayUrl.get('/api/staff/levels')
  ])

  types.value = t.data
  levels.value = l.data

  // ✅ chọn record cuối cùng
  if (types.value.length > 0) {
    form.value.typeId =
      types.value[types.value.length - 1]?.typeId ?? null
  }

  if (levels.value.length > 0) {
    form.value.levelId =
      levels.value[levels.value.length - 1]?.levelId ?? null
  }
})

const submit = async () => {
  loading.value = true
  try {
    const urls = await uploadFiles()
    await axios.post("http://localhost:8080/api/staff/books", {
      bookName: form.value.bookName,
      typeId: form.value.typeId,
      levelId: form.value.levelId,
      urls: urls
    })

    emit("created")
  } finally {
    loading.value = false
  }
}

const handleFiles = (
  e: Event
) => {

  const target =
    e.target as HTMLInputElement

  if (!target.files) return

  files.value =
    Array.from(target.files)
}

const uploadFiles = async () => {

  const urls: string[] = []

  for (const file of files.value) {

    const fileRef = storageRef(
      storage,
      `books/${Date.now()}_${file.name}`
    )

    await uploadBytes(fileRef, file)

    const url =
      await getDownloadURL(fileRef)

    urls.push(url)
  }

  return urls
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
              <option v-for="t in types" :key="t.typeId" :value="t.typeId">
                {{ t.typeName }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Level</label>
            <select v-model="form.levelId" class="form-select">
              <option v-for="l in levels" :key="l.levelId" :value="l.levelId">
                {{ l.levelName }}
              </option>
            </select>
          </div>

          <div class="mb-3">

            <label class="form-label">
              Upload Files
            </label>

            <input
              type="file"
              multiple
              class="form-control"
              @change="handleFiles"
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

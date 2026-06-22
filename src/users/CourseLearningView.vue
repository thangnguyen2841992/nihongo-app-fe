<script setup lang="ts">
import {onMounted, ref} from "vue";
import {useRoute} from "vue-router";
import {gatewayUrl} from "@/api/authApi.ts";

interface ImageDTO {
  imageId: number
  imgUrl: string
}

interface BookResponse {
  bookId: number
  bookName: string
  description: string
  imageUrls: ImageDTO[]
  typeName: string
  levelName: string
}

const route = useRoute()

const courseId =
  Number(route.params.courseId)

const books =
  ref<BookResponse[]>([])

const loading =
  ref(true)

const loadBooks =
  async () => {

    try {

      const res =
        await gatewayUrl.get(
          `/api/nihongo-user/getBooksByLevel/${courseId}`
        )

      books.value =
        res.data

    } catch (e) {

      console.error(e)

    } finally {

      loading.value =
        false

    }
  }

onMounted(() => {
  loadBooks()
})
</script>

<template>

  <div class="container">

    <h3 class="mb-4">
      📚 Danh sách sách
    </h3>

    <div
      v-if="loading"
      class="text-center"
    >
      Đang tải...
    </div>

    <div
      v-else-if="books.length === 0"
      class="alert alert-warning"
    >
      Chưa có sách nào
    </div>

    <div
      v-else
      class="row"
    >

      <div
        v-for="book in books"
        :key="book.bookId"
        class="col-md-4 mb-4"
      >

        <div class="card book-card h-100">

          <img
            v-if="book.imageUrls?.length"
            :src="book.imageUrls[0].imgUrl"
            class="card-img-top"
            alt="book"
          >

          <div class="card-body">

            <span
              class="badge bg-primary me-2"
            >
              {{ book.levelName }}
            </span>

            <span
              class="badge bg-secondary"
            >
              {{ book.typeName }}
            </span>

            <h5
              class="mt-3 fw-bold"
            >
              {{ book.bookName }}
            </h5>

            <p
              class="text-muted"
            >
              {{ book.description }}
            </p>

          </div>

          <div
            class="card-footer bg-white border-0"
          >

            <router-link
              :to="`/book/${book.bookId}`"
              class="btn btn-primary w-100"
            >
              📖 Học ngay
            </router-link>

          </div>

        </div>

      </div>

    </div>

  </div>

</template>

<style scoped>
.book-card {
  border: none;
  border-radius: 16px;
  overflow: hidden;
  transition: all .25s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
}

.book-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(0,0,0,.15);
}

.card-img-top {
  height: 260px;
  object-fit: cover;
}

.card-body {
  padding: 1rem;
}

.card-footer {
  padding: 1rem;
}
</style>

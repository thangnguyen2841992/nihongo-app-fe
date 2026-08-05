<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { gatewayUrl } from "@/api/authApi"
import router from "@/router";

interface BookImage {
  imageId: number
  imgUrl: string
}

interface Book {
  bookId: number
  bookName: string
  description: string | null
  imageUrls: BookImage[]
  typeName: string
  levelName: string
}

const route = useRoute()

const books = ref<Book[]>([])
const loading = ref(true)

const loadBooks = async () => {

  const courseId = route.params.courseId

  try {

    const res = await gatewayUrl.get(
      `/api/nihongo-user/getBooksByLevel/${courseId}`
    )

    books.value = res.data

  } finally {

    loading.value = false

  }

}

const openBook = (bookId: number) => {

  router.push({
    name: "CourseBookDetail",
    params: {
      bookId
    }
  })

}

onMounted(loadBooks)
</script>

<template>
  <div class="page">

    <h2 class="title">📚 Danh sách giáo trình</h2>

    <div v-if="loading" class="loading">
      Đang tải...
    </div>

    <div v-else class="book-list">

      <div
        class="book-row"
        v-for="b in books"
        :key="b.bookId"
      >
        <img
          :src="b.imageUrls[0]?.imgUrl"
          class="cover"
        />

        <div class="info">

          <h3>{{ b.bookName }}</h3>

          <div class="meta">

            <span class="level">
              {{ b.levelName }}
            </span>

            <span class="type">
              {{ b.typeName }}
            </span>

          </div>

        </div>

        <button
          class="btn"
          @click="openBook(b.bookId)"
        >
          ▶ Học ngay
        </button>

      </div>

    </div>

  </div>
</template>

<style scoped>

.page{
  padding:30px;
  background:#f5f7fb;
  min-height:100vh;
}

.title{
  margin-bottom:25px;
  font-size:30px;
  font-weight:700;
}

.loading{
  text-align:center;
  padding:40px;
}

.book-list{
  display:flex;
  flex-direction:column;
  gap:16px;
}

.book-row{

  display:flex;
  align-items:center;

  background:white;

  border-radius:14px;

  padding:16px;

  box-shadow:0 6px 16px rgba(0,0,0,.08);

  transition:.2s;
}

.book-row:hover{

  transform:translateY(-2px);

  box-shadow:0 10px 24px rgba(0,0,0,.12);

}

.cover{

  width:90px;
  height:120px;

  object-fit:cover;

  border-radius:8px;

  margin-right:20px;

}

.info{

  flex:1;

}

.info h3{

  margin:0 0 10px;

  font-size:20px;

}

.meta{

  display:flex;

  gap:10px;

}

.level{

  background:#1677ff;

  color:white;

  padding:4px 12px;

  border-radius:20px;

  font-size:13px;

}

.type{

  background:#f3f4f6;

  color:#555;

  padding:4px 12px;

  border-radius:20px;

  font-size:13px;

}

.btn{

  border:none;

  padding:10px 20px;

  border-radius:8px;

  background:#1677ff;

  color:white;

  cursor:pointer;

  font-weight:600;

}

.btn:hover{

  background:#0f5fd6;

}
</style>

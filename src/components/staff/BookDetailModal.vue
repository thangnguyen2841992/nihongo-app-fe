<script setup lang="ts">
interface ImageDTO {
  imageId: number
  imgUrl: string
}

interface Book {
  bookId: number
  bookName: string
  typeName: string
  levelName: string
  imageUrls: ImageDTO[]
}

defineProps<{
  book: Book
}>()

defineEmits([
  "close",
  "preview-images"
])
</script>

<template>
  <div class="modal fade show d-block">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content shadow">

        <!-- HEADER -->
        <div class="modal-header">

          <h5 class="modal-title fw-bold">
            📚 Chi tiết sách
          </h5>

          <button
            class="btn-close"
            @click="$emit('close')"
          ></button>

        </div>

        <!-- BODY -->
        <div class="modal-body">

          <!-- INFO -->
          <div class="row">

            <!-- LEFT -->
            <div class="col-md-4 text-center">

              <img
                v-if="book.imageUrls?.length"
                :src="book.imageUrls[0]!.imgUrl"
                class="main-image"
                alt="book"
                @click="$emit('preview-images', book.imageUrls)"
              />

              <div
                v-else
                class="text-muted"
              >
                Chưa có ảnh
              </div>

            </div>

            <!-- RIGHT -->
            <div class="col-md-8">

              <div class="info-item">
                <span class="label">
                  Tên sách:
                </span>

                <span class="value">
                  {{ book.bookName }}
                </span>
              </div>

              <div class="info-item">
                <span class="label">
                  Thể loại:
                </span>

                <span class="badge bg-info text-dark">
                  {{ book.typeName }}
                </span>
              </div>

              <div class="info-item">
                <span class="label">
                  Trình độ:
                </span>

                <span class="badge bg-secondary">
                  {{ book.levelName }}
                </span>
              </div>

              <div class="info-item">

                <span class="label">
                  Số lượng ảnh:
                </span>

                <span class="value">
                  {{ book.imageUrls.length }}
                </span>

              </div>

            </div>

          </div>

          <!-- GALLERY -->
          <div
            v-if="book.imageUrls?.length"
            class="mt-4"
          >

            <h6 class="fw-bold mb-3">
              Hình ảnh
            </h6>

            <div class="gallery-grid">

              <img
                v-for="(img, index) in book.imageUrls"
                :key="img.imageId"
                :src="img.imgUrl"
                class="gallery-image"
                @click="$emit('preview-images', book.imageUrls, index)"
              />

            </div>

          </div>

        </div>

        <!-- FOOTER -->
        <div class="modal-footer">

          <button
            class="btn btn-secondary"
            @click="$emit('close')"
          >
            Đóng
          </button>

        </div>

      </div>
    </div>
  </div>

  <!-- BACKDROP -->
  <div class="modal-backdrop fade show"></div>
</template>

<style scoped>

.main-image {
  width: 100%;
  max-height: 350px;

  object-fit: cover;

  border-radius: 12px;

  cursor: pointer;

  transition: 0.2s;
}

.main-image:hover {
  transform: scale(1.02);
}

.info-item {
  margin-bottom: 18px;
}

.label {
  font-weight: 700;
  margin-right: 8px;
}

.value {
  color: #333;
}

.gallery-grid {
  display: grid;

  grid-template-columns:
    repeat(auto-fill, minmax(120px, 1fr));

  gap: 12px;
}

.gallery-image {
  width: 100%;
  height: 120px;

  object-fit: cover;

  border-radius: 10px;

  cursor: pointer;

  transition: 0.2s;
}

.gallery-image:hover {
  transform: scale(1.04);
}

</style>

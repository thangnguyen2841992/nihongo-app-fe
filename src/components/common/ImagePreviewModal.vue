<script setup lang="ts">
import {
  computed,
  onMounted,
  onBeforeUnmount,
  ref
} from "vue"

interface ImageDTO {
  imageId: number
  imgUrl: string
}

const props = defineProps<{
  images: ImageDTO[]
  currentIndex: number
}>()

const emit = defineEmits([
  "close",
  "update:currentIndex"
])

/* =========================
   IMAGE
========================= */

const currentImage = computed(() => {
  return props.images[props.currentIndex]
})

/* =========================
   NAVIGATION
========================= */

const nextImage = () => {
  if (props.currentIndex < props.images.length - 1) {
    emit("update:currentIndex", props.currentIndex + 1)
    resetZoom()
  }
}

const prevImage = () => {
  if (props.currentIndex > 0) {
    emit("update:currentIndex", props.currentIndex - 1)
    resetZoom()
  }
}

/* =========================
   KEYBOARD
========================= */

const handleKeydown = (e: KeyboardEvent) => {

  if (e.key === "ArrowRight") {
    nextImage()
  }

  if (e.key === "ArrowLeft") {
    prevImage()
  }

  if (e.key === "Escape") {
    emit("close")
  }

  if (e.key.toLowerCase() === "f") {
    toggleFullscreen()
  }
}

/* =========================
   ZOOM
========================= */

const scale = ref(1)

const zoomIn = () => {
  if (scale.value < 4) {
    scale.value += 0.2
  }
}

const zoomOut = () => {
  if (scale.value > 1) {
    scale.value -= 0.2
  }
}

const resetZoom = () => {
  scale.value = 1
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()

  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

/* =========================
   FULLSCREEN
========================= */

const isFullscreen = ref(false)

const toggleFullscreen = async () => {

  const el = document.documentElement

  if (!document.fullscreenElement) {

    await el.requestFullscreen()
    isFullscreen.value = true

  } else {

    await document.exitFullscreen()
    isFullscreen.value = false
  }
}

/* =========================
   LIFECYCLE
========================= */

onMounted(() => {

  window.addEventListener("keydown", handleKeydown)

})

onBeforeUnmount(() => {

  window.removeEventListener("keydown", handleKeydown)

})
</script>

<template>
  <transition name="fade">
    <div
      class="image-modal-overlay"
      @click.self="emit('close')"
    >

      <div class="image-modal">

        <!-- TOP BAR -->
        <div class="top-bar">

          <div class="counter-badge">
            {{ currentIndex + 1 }} / {{ images.length }}
          </div>

          <div class="top-actions">

            <button
              class="icon-btn"
              @click="zoomOut"
            >
              ➖
            </button>

            <button
              class="icon-btn"
              @click="zoomIn"
            >
              ➕
            </button>

            <button
              class="icon-btn"
              @click="toggleFullscreen"
            >
              ⛶
            </button>

            <button
              class="close-btn"
              @click="emit('close')"
            >
              ✕
            </button>

          </div>

        </div>

        <!-- IMAGE AREA -->
        <div
          class="image-wrapper"
          @wheel="handleWheel"
        >

          <!-- PREV -->
          <button
            class="side-btn left-btn"
            :disabled="currentIndex === 0"
            @click="prevImage"
          >
            ❮
          </button>

          <!-- IMAGE -->
          <transition name="slide-fade" mode="out-in">

            <img
              v-if="currentImage"
              :key="currentImage.imageId"
              :src="currentImage.imgUrl"
              class="preview-image"
              :style="{
                transform: `scale(${scale})`
              }"
              alt="preview"
            />

          </transition>

          <!-- NEXT -->
          <button
            class="side-btn right-btn"
            :disabled="currentIndex === images.length - 1"
            @click="nextImage"
          >
            ❯
          </button>

        </div>

        <!-- THUMBNAILS -->
        <div class="thumbnail-list">

          <img
            v-for="(img, i) in images"
            :key="img.imageId"
            :src="img.imgUrl"
            class="mini-thumbnail"
            :class="{ active: i === currentIndex }"
            @click="emit('update:currentIndex', i)"
          />

        </div>

        <!-- HELP -->
        <div class="helper-text">
          ← → chuyển ảnh • Scroll để zoom • F fullscreen • ESC để đóng
        </div>

      </div>

    </div>
  </transition>
</template>

<style scoped>

/* =========================
   OVERLAY
========================= */

.image-modal-overlay {
  position: fixed;
  inset: 0;

  background: rgba(0,0,0,0.92);

  display: flex;
  justify-content: center;
  align-items: center;

  z-index: 99999;

  backdrop-filter: blur(4px);

  padding: 16px;
}

/* =========================
   MODAL
========================= */

.image-modal {
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;
}

/* =========================
   TOP BAR
========================= */

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 14px;
}

.counter-badge {
  background: rgba(255,255,255,0.12);

  color: white;

  padding: 10px 18px;

  border-radius: 999px;

  font-size: 15px;
  font-weight: 700;

  backdrop-filter: blur(5px);
}

.top-actions {
  display: flex;
  gap: 10px;
}

.icon-btn,
.close-btn {
  width: 46px;
  height: 46px;

  border: none;
  border-radius: 50%;

  background: rgba(255,255,255,0.14);

  color: white;

  font-size: 18px;
  font-weight: bold;

  cursor: pointer;

  transition: all 0.2s ease;
}

.icon-btn:hover,
.close-btn:hover {
  background: rgba(255,255,255,0.25);
  transform: scale(1.08);
}

/* =========================
   IMAGE WRAPPER
========================= */

.image-wrapper {
  flex: 1;

  position: relative;

  display: flex;
  justify-content: center;
  align-items: center;

  overflow: hidden;
}

/* =========================
   IMAGE
========================= */

.preview-image {
  max-width: 100%;
  max-height: 78vh;

  object-fit: contain;

  border-radius: 14px;

  transition:
    transform 0.25s ease,
    opacity 0.25s ease;

  user-select: none;
}

/* =========================
   SIDE BUTTONS
========================= */

.side-btn {
  position: absolute;
  top: 50%;

  transform: translateY(-50%);

  width: 64px;
  height: 64px;

  border: none;
  border-radius: 50%;

  background: rgba(255,255,255,0.15);

  color: white;

  font-size: 34px;
  font-weight: bold;

  cursor: pointer;

  transition: all 0.2s ease;

  backdrop-filter: blur(4px);

  z-index: 10;
}

.side-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
  transform: translateY(-50%) scale(1.08);
}

.side-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.left-btn {
  left: 24px;
}

.right-btn {
  right: 24px;
}

/* =========================
   THUMBNAILS
========================= */

.thumbnail-list {
  display: flex;
  gap: 12px;

  overflow-x: auto;

  padding: 16px 0;
}

.thumbnail-list::-webkit-scrollbar {
  height: 7px;
}

.thumbnail-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.25);
  border-radius: 999px;
}

.mini-thumbnail {
  width: 90px;
  height: 90px;

  object-fit: cover;

  border-radius: 12px;

  cursor: pointer;

  border: 3px solid transparent;

  opacity: 0.65;

  transition: all 0.2s ease;

  flex-shrink: 0;
}

.mini-thumbnail:hover {
  opacity: 1;
  transform: scale(1.05);
}

.mini-thumbnail.active {
  border-color: #0d6efd;
  opacity: 1;

  transform: scale(1.06);

  box-shadow:
    0 0 16px rgba(13,110,253,0.6);
}

/* =========================
   HELPER TEXT
========================= */

.helper-text {
  text-align: center;

  color: rgba(255,255,255,0.7);

  font-size: 14px;

  margin-top: 4px;
}

/* =========================
   ANIMATIONS
========================= */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.25s ease;
}

.slide-fade-leave-active {
  transition: all 0.18s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.96);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-40px) scale(0.96);
}

/* =========================
   MOBILE
========================= */

@media (max-width: 768px) {

  .side-btn {
    width: 50px;
    height: 50px;
    font-size: 26px;
  }

  .left-btn {
    left: 10px;
  }

  .right-btn {
    right: 10px;
  }

  .mini-thumbnail {
    width: 70px;
    height: 70px;
  }

  .preview-image {
    max-height: 65vh;
  }
}
</style>

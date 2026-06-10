<script setup lang="ts">
import {
  onMounted,
  onUnmounted,
  ref
} from "vue"

const showTopButton =
  ref(false)

const showBottomButton =
  ref(true)

const handleScroll = () => {

  const scrollTop =
    window.scrollY

  const windowHeight =
    window.innerHeight

  const documentHeight =
    document.documentElement
      .scrollHeight

  const isTop =
    scrollTop < 100

  const isBottom =
    scrollTop + windowHeight >=
    documentHeight - 100

  if (isTop) {

    showTopButton.value =
      false

    showBottomButton.value =
      true

  } else if (isBottom) {

    showTopButton.value =
      true

    showBottomButton.value =
      false

  } else {

    showTopButton.value =
      true

    showBottomButton.value =
      true
  }
}

const scrollToTop = () => {

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  })
}

const scrollToBottom = () => {

  window.scrollTo({
    top:
    document.documentElement
      .scrollHeight,
    behavior: "smooth"
  })
}

onMounted(() => {

  handleScroll()

  window.addEventListener(
    "scroll",
    handleScroll
  )
})

onUnmounted(() => {

  window.removeEventListener(
    "scroll",
    handleScroll
  )
})
</script>

<template>
  <div class="floating-actions">

    <button
      v-if="showTopButton"
      class="scroll-btn"
      title="Lên đầu trang"
      @click="scrollToTop"
    >
      ⬆
    </button>

    <button
      v-if="showBottomButton"
      class="scroll-btn"
      title="Xuống cuối trang"
      @click="scrollToBottom"
    >
      ⬇
    </button>

  </div>
</template>

<style scoped>
.floating-actions {
  position: fixed;
  right: 24px;
  bottom: 24px;

  display: flex;
  flex-direction: column;
  gap: 12px;

  z-index: 9999;
}

.scroll-btn {
  width: 56px;
  height: 56px;

  border: none;
  border-radius: 50%;

  cursor: pointer;

  font-size: 22px;

  color: white;

  background: linear-gradient(
    135deg,
    #4f8cff,
    #7b61ff
  );

  box-shadow:
    0 8px 20px
    rgba(
      79,
      140,
      255,
      .35
    );

  transition: .2s;
}

.scroll-btn:hover {
  transform: translateY(-3px);
}
</style>

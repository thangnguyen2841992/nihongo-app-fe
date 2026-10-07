<script setup lang="ts">
import './studyPages.css'
</script>

<template>
  <div class="study-page">
    <header class="study-hero">
      <h1>Luyện nghe hội thoại</h1>
      <p>Nghe hội thoại tiếng Nhật, dừng sau mỗi câu và đọc theo để luyện phản xạ.</p>
    </header>
    <section class="study-panel" aria-labelledby="conversation-video-title">
      <h2 id="conversation-video-title">Video luyện nghe hội thoại</h2>
      <div class="conversation-video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/4u1pFXayzLE"
          title="Video luyện nghe hội thoại tiếng Nhật trên YouTube"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
      <p>Nghe một lượt, sau đó nghe lại từng đoạn và ghi lại những từ hoặc câu bạn chưa hiểu. Bạn có thể chỉnh tốc độ phát và phụ đề trong trình phát nếu video hỗ trợ.</p>
      <a class="study-button secondary" href="https://www.youtube.com/watch?v=4u1pFXayzLE" target="_blank" rel="noopener noreferrer">Mở video trên YouTube</a>
    </section>
  </div>
</template>

<style scoped>
.study-panel { margin-top: 20px; }
.conversation-video { margin: 16px 0; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 12px; background: #111827; }
.conversation-video iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>

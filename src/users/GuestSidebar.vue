<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <aside id="guest-sidebar" class="guest-sidebar" :class="{ open: isOpen }" @keydown.esc="emit('close')">
    <div class="sidebar-top">
      <div class="workspace-label"><span class="workspace-icon" aria-hidden="true">あ</span><div>Không gian học tập<span>Khám phá cùng Nihongo</span></div></div>
      <nav aria-label="Menu dành cho khách">
        <p class="menu-label">KHÁM PHÁ</p>
        <RouterLink to="/courses" class="course-link" @click="emit('close')">
          <i class="bi bi-grid-1x2" aria-hidden="true"></i><span>Khóa học tiếng Nhật</span><i class="bi bi-chevron-right arrow" aria-hidden="true"></i>
        </RouterLink>
      </nav>
      <div class="learning-note">
        <i class="bi bi-bookmark" aria-hidden="true"></i>
        <p>Hành trình của riêng bạn<span>Đăng nhập để lưu khóa học và tiếp tục học mỗi ngày.</span></p>
      </div>
    </div>
    <div class="sidebar-bottom">
      <div class="account-card">
        <span class="card-eyebrow"><span></span> CÙNG BẮT ĐẦU</span>
        <h2>Một ngôn ngữ mới.<br />Nhiều cơ hội mới.</h2>
        <p>Tạo tài khoản và tìm khóa học phù hợp với bạn.</p>
        <RouterLink to="/register" class="sign-up" @click="emit('close')">Đăng ký miễn phí <i class="bi bi-arrow-right" aria-hidden="true"></i></RouterLink>
        <div class="sign-in-note">Đã có tài khoản? <RouterLink to="/login" @click="emit('close')">Đăng nhập</RouterLink></div>
      </div>
      <div class="sidebar-footer"><span class="japan-dot" aria-hidden="true"></span> Học mỗi ngày · Tiến xa hơn</div>
    </div>
  </aside>
  <button v-if="isOpen" class="guest-overlay" type="button" aria-label="Đóng menu" @click="emit('close')"></button>
</template>

<style scoped>
.guest-sidebar { position: fixed; top: 76px; bottom: 0; left: 0; width: 252px; z-index: 999; padding: 26px 16px 18px; overflow-y: auto; background: #fff; border-right: 1px solid #e8edf4; display: flex; flex-direction: column; justify-content: space-between; gap: 48px; }
.workspace-label { display: flex; align-items: center; gap: 10px; margin: 0 8px 34px; color: #334155; font-size: 13px; font-weight: 650; }
.workspace-label div > span { display: block; margin-top: 3px; color: #94a3b8; font-size: 11px; font-weight: 400; }
.workspace-icon { display: grid; place-items: center; width: 36px; height: 36px; background: #f5f7fb; border: 1px solid #e8edf4; border-radius: 10px; font-size: 21px; color: #64748b; }
.menu-label { margin: 0 12px 12px; color: #94a3b8; font-size: 10px; font-weight: 650; letter-spacing: 1.7px; }
.course-link { display: flex; align-items: center; gap: 11px; padding: 13px 12px; border-radius: 9px; color: #475569; font-size: 13px; font-weight: 600; text-decoration: none; }
.course-link > .bi:first-child { font-size: 17px; }
.course-link .arrow { margin-left: auto; font-size: 10px; opacity: .6; }
.course-link:hover, .course-link.router-link-active { background: #eef3ff; color: #3155a6; }
.learning-note { display: flex; gap: 11px; margin: 22px 12px 0; padding-top: 22px; border-top: 1px solid #eef1f5; color: #a0aec0; }
.learning-note > i { font-size: 16px; }
.learning-note p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; }
.learning-note p span { display: block; margin-top: 5px; color: #94a3b8; font-size: 11px; }
.account-card { padding: 19px 16px 16px; border: 1px solid #e4eaf5; border-radius: 13px; background: linear-gradient(145deg, #f7f9ff, #edf2fc); }
.card-eyebrow { display: flex; align-items: center; gap: 6px; color: #64799e; font-size: 9px; font-weight: 700; letter-spacing: 1.3px; }
.card-eyebrow > span { width: 5px; height: 5px; border-radius: 50%; background: #7892c1; }
h2 { margin: 14px 0 9px; font-size: 18px; line-height: 1.5; letter-spacing: -.4px; color: #273b63; font-weight: 700; }
.account-card p { margin-bottom: 18px; color: #78869c; font-size: 12px; line-height: 1.8; }
.sign-up { display: flex; align-items: center; justify-content: space-between; padding: 11px 12px; border-radius: 8px; background: #fff; border: 1px solid #dce4f2; color: #3155a6; font-size: 12px; font-weight: 650; text-decoration: none; }
.sign-up:hover { background: #f7f9ff; border-color: #a9bbdf; }
.sign-in-note { margin-top: 13px; text-align: center; font-size: 10px; color: #8491a5; }
.sign-in-note a { color: #435e93; text-decoration: none; font-weight: 650; }
.sidebar-footer { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 20px; color: #94a3b8; font-size: 10px; }
.japan-dot { width: 6px; height: 6px; border-radius: 50%; background: #da8c92; }
a:focus-visible, button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 3px; }
.guest-overlay { display: none; }
@media (max-width: 768px) {
  .guest-sidebar { top: 68px; width: min(280px, 85vw); visibility: hidden; transform: translateX(-100%); transition: transform .2s, visibility .2s; }
  .guest-sidebar.open { visibility: visible; transform: translateX(0); box-shadow: 12px 0 40px rgb(15 23 42 / 10%); }
  .guest-overlay { display: block; position: fixed; inset: 68px 0 0; z-index: 998; border: 0; background: rgb(15 23 42 / 30%); backdrop-filter: blur(3px); }
}
@media (prefers-reduced-motion: reduce) { .guest-sidebar { transition: none; } }
</style>

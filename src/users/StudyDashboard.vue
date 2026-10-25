<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { saveStudyGoal, type StudyDashboard, type MyCourse } from '@/api/study'

const props = defineProps<{ dashboard: StudyDashboard; courses: MyCourse[] }>()
const emit = defineEmits<{ saved: [] }>()
const goal = ref({ ...props.dashboard.goal })
watch(() => props.dashboard.goal, value => { goal.value = { ...value } })
const saving = ref(false)
const message = ref('')
const failed = ref(false)
const completion = computed(() => {
  const g = props.dashboard.goal
  const parts = [g.dailyCards ? Math.min(1, props.dashboard.cardsToday / g.dailyCards) : null,
    g.dailyAttempts ? Math.min(1, props.dashboard.attemptsToday / g.dailyAttempts) : null].filter((n): n is number => n !== null)
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 100) : 0
})
const trend = computed(() => {
  const data = new Map(props.dashboard.trend.map(day => [day.day, day]))
  const today = new Date(`${props.dashboard.today}T00:00:00Z`)
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today); date.setUTCDate(date.getUTCDate() - 29 + i)
    const day = date.toISOString().slice(0, 10)
    return data.get(day) || { day, attempts: 0, averageScore: 0 }
  })
})
async function save() {
  if (saving.value) return
  saving.value = true; message.value = ''; failed.value = false
  try {
    await saveStudyGoal(goal.value); message.value = 'Đã lưu mục tiêu và tùy chọn nhắc học.'; emit('saved')
  } catch { failed.value = true; message.value = 'Chưa lưu được. Chọn ít nhất một mục tiêu: tối đa 200 thẻ và 20 bài mỗi ngày.' }
  finally { saving.value = false }
}
function courseName(id: number) { return props.courses.find(c => c.courseId === id)?.courseName || `Khóa học ${id}` }
</script>

<template>
  <section class="study-grid" aria-label="Tiến độ học tập">
    <article class="study-panel"><h2>Bài đã luyện</h2><div class="study-count">{{ dashboard.lessons }}</div><p>{{ dashboard.attempts }} lượt làm bài tổng cộng</p></article>
    <article class="study-panel"><h2>Điểm trung bình</h2><div class="study-count">{{ dashboard.attempts ? Math.round(dashboard.averageScore) : '—' }}</div><p>Trên tất cả lượt làm bài đã lưu</p></article>
    <article class="study-panel"><h2>Chuỗi ngày học</h2><div class="study-count">{{ dashboard.streak }} ngày</div><p>Dài nhất: {{ dashboard.longestStreak }} ngày · tính ngày có ôn thẻ, luyện câu sai hoặc làm bài</p></article>
  </section>
  <section class="study-grid">
    <article class="study-panel">
      <h2>Mục tiêu hôm nay</h2>
      <p class="study-meta">{{ dashboard.today }} · múi giờ {{ dashboard.timeZone }}</p>
      <p v-if="dashboard.goal.dailyCards">{{ dashboard.cardsToday }} / {{ dashboard.goal.dailyCards }} thẻ đã ôn</p>
      <p v-if="dashboard.goal.dailyAttempts">{{ dashboard.attemptsToday }} / {{ dashboard.goal.dailyAttempts }} lượt làm bài</p>
      <div class="study-progress" role="progressbar" aria-label="Tiến độ mục tiêu hôm nay" :aria-valuenow="completion" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${completion}%` }"></span></div>
      <p class="study-meta" style="margin-top:12px">{{ dashboard.goalCompleted ? 'Đã hoàn thành mục tiêu hôm nay!' : 'Tiếp tục học để hoàn thành mục tiêu.' }} Mỗi thẻ chỉ tính một lần mỗi ngày.</p>
      <p v-if="dashboard.practiceToday">Đã luyện {{ dashboard.practiceToday }} câu sai hôm nay.</p>
      <form class="study-goal-form" @submit.prevent="save">
        <label>Thẻ mỗi ngày<input v-model.number="goal.dailyCards" type="number" min="0" max="200" required class="form-control"></label>
        <label>Bài mỗi ngày<input v-model.number="goal.dailyAttempts" type="number" min="0" max="20" required class="form-control"></label>
        <label class="study-reminder-toggle"><input v-model="goal.remindersEnabled" type="checkbox"> Nhắc ôn và khóa sắp hết hạn trong ứng dụng</label>
        <p class="study-meta">Đặt 0 để bỏ một mục tiêu. Cần chọn ít nhất một mục tiêu.</p>
        <button class="study-button" :disabled="saving">{{ saving ? 'Đang lưu...' : 'Lưu mục tiêu' }}</button>
        <p v-if="message" :role="failed ? 'alert' : 'status'" :class="{ 'study-error': failed }">{{ message }}</p>
      </form>
    </article>
    <article class="study-panel">
      <h2>Điểm trong 30 ngày</h2><p class="study-meta">Điểm trung bình mỗi ngày có làm bài, thang 100.</p>
      <div v-if="dashboard.trend.length" class="study-trend" aria-label="Biểu đồ điểm 30 ngày">
        <div v-for="day in trend" :key="day.day" class="study-trend-column" :title="`${day.day}: ${day.attempts} lượt, ${Math.round(day.averageScore)} điểm`">
          <span :style="{ height: `${day.attempts ? Math.max(3, day.averageScore) : 0}%` }"></span>
        </div>
      </div>
      <p v-else class="study-empty">Chưa có lượt làm bài trong 30 ngày qua.</p>
      <details v-if="dashboard.trend.length" class="study-trend-details"><summary>Xem số liệu từng ngày</summary><table class="study-table"><thead><tr><th>Ngày</th><th>Lượt làm</th><th>Điểm TB</th></tr></thead><tbody><tr v-for="day in dashboard.trend" :key="day.day"><td>{{ day.day }}</td><td>{{ day.attempts }}</td><td>{{ Math.round(day.averageScore) }}</td></tr></tbody></table></details>
    </article>
  </section>
  <section v-if="dashboard.reminders.length" class="study-panel study-reminders" aria-label="Nhắc học">
    <h2>Nhắc học</h2>
    <article v-for="reminder in dashboard.reminders" :key="reminder.key" class="study-reminder">
      <template v-if="reminder.courseId"><p><strong>{{ courseName(reminder.courseId) }}</strong> · {{ reminder.message }}<br><span v-if="reminder.expiresAt" class="study-meta">Hết hạn: {{ new Date(reminder.expiresAt).toLocaleString('vi-VN') }}</span></p><RouterLink class="study-button secondary" :to="{ path: '/courses', query: { renew: String(reminder.courseId) } }">Gia hạn ngay</RouterLink></template>
      <template v-else><p>{{ reminder.message }}</p><RouterLink class="study-button secondary" to="/user/review">Ôn ngay</RouterLink></template>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)
interface LessonResult {
  resultId: number
  lessonId: number
  lessonName: string
  totalQuestion: number
  correctCount: number
  wrongCount: number
  unansweredCount: number | null
  chosenAnswers: Record<string, string> | null
  correctAnswers: Record<string, string> | null
  score: number
  submittedAt: string
}
const route = useRoute()
const router = useRouter()
const lessonId = computed(() => Number(route.params.lessonId))
const results = ref<LessonResult[]>([])
const page = ref(0), totalPages = ref(0), totalElements = ref(0)
const loading = ref(true)
const loadError = ref('')
const selectedResultId = ref<number | null>(null)
const selectedResult = computed(() => results.value.find(r => r.resultId === selectedResultId.value))
const openResult = async (resultId: number) => {
  selectedResultId.value = resultId
  await nextTick()
  document.getElementById('attempt-details')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}
const scoreChart = ref<HTMLCanvasElement | null>(null)
let scoreChartInstance: Chart | null = null
let requestId = 0
let disposed = false
let controller: AbortController | null = null
const destroyChart = () => { scoreChartInstance?.destroy(); scoreChartInstance = null }

const drawScoreChart = async (id: number) => {
  await nextTick()
  if (disposed || id !== requestId || !scoreChart.value || !results.value.length) return
  const ctx = scoreChart.value.getContext('2d')
  if (!ctx) return
  const chronological = [...results.value].reverse()
  scoreChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chronological.map((_, i) => `Lần ${totalElements.value - page.value * 20 - results.value.length + i + 1}`),
      datasets: [
        { label: 'Điểm', data: chronological.map(r => r.score), borderColor: '#6b4f86', yAxisID: 'score' },
        { label: 'Câu đúng', data: chronological.map(r => r.correctCount), borderColor: '#16803C', yAxisID: 'question' },
        { label: 'Câu sai', data: chronological.map(r => r.wrongCount), borderColor: '#C62828', yAxisID: 'question' },
        { label: 'Chưa trả lời', data: chronological.map(r => r.unansweredCount ?? null), borderColor: '#d97706', yAxisID: 'question' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        score: { type: 'linear', position: 'left', min: 0, max: 100, title: { display: true, text: 'Điểm (%)' } },
        question: { type: 'linear', position: 'right', beginAtZero: true, ticks: { precision: 0 }, grid: { drawOnChartArea: false } }
      }
    }
  })
}

const loadHistory = async () => {
  const id = ++requestId
  controller?.abort()
  controller = new AbortController()
  destroyChart()
  results.value = []
  selectedResultId.value = null
  loadError.value = ''
  loading.value = true
  try {
    if (!Number.isSafeInteger(lessonId.value) || lessonId.value <= 0) throw new Error('Invalid lesson')
    const { data } = await gatewayUrl.get<{ content: LessonResult[]; totalPages: number; totalElements: number }>(`/api/nihongo-user/lesson-result/${lessonId.value}/page`, { signal: controller.signal, params: { page: page.value, size: 20 } })
    if (disposed || id !== requestId) return
    results.value = [...data.content].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.resultId - a.resultId)
    totalPages.value = data.totalPages; totalElements.value = data.totalElements
  } catch {
    if (disposed || id !== requestId) return
    loadError.value = 'Không tải được lịch sử làm bài. Vui lòng thử lại.'
  } finally {
    if (!disposed && id === requestId) loading.value = false
  }
  if (!disposed && id === requestId && !loadError.value) await drawScoreChart(id)
}
const totalExam = computed(() => results.value.length)
const totalQuestion = computed(() => results.value.reduce((sum, r) => sum + r.totalQuestion, 0))
const totalCorrect = computed(() => results.value.reduce((sum, r) => sum + r.correctCount, 0))
const totalWrong = computed(() => results.value.reduce((sum, r) => sum + r.wrongCount, 0))
const hasLegacyResults = computed(() => results.value.some(r => r.unansweredCount == null))
const totalUnanswered = computed(() => hasLegacyResults.value ? '—' : results.value.reduce((sum, r) => sum + (r.unansweredCount ?? 0), 0))
const averageScore = computed(() => results.value.length ? Math.round(results.value.reduce((sum, r) => sum + r.score, 0) / results.value.length) : 0)
const getScoreClass = (score: number) => score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 60 ? 'normal' : 'bad'
const goBack = () => router.back()
watch(lessonId, () => { page.value = 0; void loadHistory() }, { immediate: true })
function changePage(next: number) { page.value = next; void loadHistory() }
onBeforeUnmount(() => { disposed = true; ++requestId; controller?.abort(); destroyChart() })
</script>





<template>

  <div class="history-page">

    <!-- =========================
         HEADER
    ========================== -->

    <div class="page-header">

      <div>

        <h1>
          <i class="bi bi-bar-chart-line" aria-hidden="true"></i> Lịch sử làm bài
        </h1>

        <p
          v-if="results.length"
          class="lesson-name"
        >
          <i class="bi bi-journal-text" aria-hidden="true"></i> {{ results[0]?.lessonName }}
        </p>

      </div>

      <button
        class="back-btn"
        @click="goBack"
      >
        ← Quay lại
      </button>

    </div>


    <!-- =========================
         LOADING
    ========================== -->

    <div
      v-if="loading"
      class="loading"
    >
      <div class="loading-icon">
        <i class="bi bi-hourglass-split" aria-hidden="true"></i>
      </div>

      Đang tải lịch sử...
    </div>


    <div v-else-if="loadError" class="empty" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="back-btn" @click="loadHistory">Thử lại</button>
    </div>
    <template v-else>

      <!-- =========================
           EMPTY
      ========================== -->

      <div
        v-if="results.length === 0"
        class="empty"
      >

        <div class="empty-icon">
          <i class="bi bi-book" aria-hidden="true"></i>
        </div>

        <h3>
          Bạn chưa làm bài tập này
        </h3>

        <p>
          Hãy hoàn thành bài tập để xem
          lịch sử kết quả.
        </p>

      </div>


      <template v-else>
        <p v-if="hasLegacyResults" class="legacy-note">Lần làm cũ chưa lưu riêng câu bỏ trống; số câu sai của những lần đó bao gồm cả câu bỏ trống. Dấu — nghĩa là chưa có dữ liệu.</p>

        <section v-if="selectedResult" id="attempt-details" class="attempt-details" aria-label="Chi tiết lần làm bài">
          <div class="detail-heading"><h2>Chi tiết lần làm {{ totalElements - page * 20 - results.findIndex(r => r.resultId === selectedResultId) }}</h2><button type="button" class="back-btn" @click="selectedResultId = null">Đóng chi tiết</button></div>
          <p>Đáp án được lưu tại thời điểm nộp bài. Mã câu hỏi dùng để đối chiếu với dữ liệu bài tập.</p>
          <div v-for="(answer, questionId) in selectedResult.correctAnswers" :key="questionId" class="answer-detail">
            <strong>Mã câu hỏi {{ questionId }}</strong>
            <span>Bạn chọn: {{ selectedResult.chosenAnswers?.[questionId] ?? 'Chưa trả lời' }}</span>
            <span>Đáp án đúng: {{ answer }}</span>
            <span>{{ !selectedResult.chosenAnswers?.[questionId] ? 'Chưa trả lời' : selectedResult.chosenAnswers[questionId] === answer ? 'Đúng' : 'Sai' }}</span>
          </div>
        </section>

        <!-- =========================
             SUMMARY
        ========================== -->

        <p class="legacy-note">Thống kê và biểu đồ của {{ totalExam }} lượt trên trang này · {{ totalElements }} lượt tổng cộng.</p>
        <div class="summary">

          <!-- Số lần làm -->

          <div class="summary-card">

            <div class="summary-icon">
              <i class="bi bi-journal-check" aria-hidden="true"></i>
            </div>

            <div class="summary-content">

              <div class="number">
                {{ totalExam }}
              </div>

              <div class="title">
                Số lần làm
              </div>

            </div>

          </div>


          <!-- Điểm trung bình -->

          <div class="summary-card">

            <div class="summary-icon">
              <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
            </div>

            <div class="summary-content">

              <div class="number">
                {{ averageScore }}%
              </div>

              <div class="title">
                Điểm trung bình
              </div>

            </div>

          </div>


          <!-- Tổng câu hỏi -->

          <div class="summary-card">

            <div class="summary-icon">
              <i class="bi bi-book" aria-hidden="true"></i>
            </div>

            <div class="summary-content">

              <div class="number">
                {{ totalQuestion }}
              </div>

              <div class="title">
                Tổng câu hỏi
              </div>

            </div>

          </div>


          <!-- Tổng đúng -->

          <div class="summary-card">

            <div class="summary-icon">
              <i class="bi bi-check-circle" aria-hidden="true"></i>
            </div>

            <div class="summary-content">

              <div class="number good">
                {{ totalCorrect }}
              </div>

              <div class="title">
                Tổng câu đúng
              </div>

            </div>

          </div>


          <!-- Tổng sai -->

          <div class="summary-card">

            <div class="summary-icon">
              <i class="bi bi-x-circle" aria-hidden="true"></i>
            </div>

            <div class="summary-content">

              <div class="number bad">
                {{ totalWrong }}
              </div>

              <div class="title">
                Tổng câu sai
              </div>

            </div>

          </div>


          <!-- Chưa trả lời -->

          <div class="summary-card">

            <div class="summary-icon">
              ⏭️
            </div>

            <div class="summary-content">

              <div class="number unanswered">
                {{ totalUnanswered }}
              </div>

              <div class="title">
                Chưa trả lời
              </div>

            </div>

          </div>

        </div>

        <div class="chart-section">

          <div class="section-header">

            <div>

              <h2>
                <i class="bi bi-graph-up" aria-hidden="true"></i> Biểu đồ điểm
              </h2>

              <p>
                Điểm số qua từng lần làm bài
              </p>

            </div>

          </div>

          <div class="chart-container">

            <canvas ref="scoreChart"></canvas>

          </div>

        </div>

        <!-- =========================
             HISTORY TABLE
        ========================== -->

        <div class="history-section">

          <div class="section-header">

            <div>

              <h2>
                <i class="bi bi-list-check" aria-hidden="true"></i> Các lần làm bài
              </h2>

              <p>
                Chi tiết kết quả từng lần làm
              </p>

            </div>

            <div class="attempt-count">

              {{ totalExam }} lần

            </div>

          </div>

          <!-- TABLE -->

          <div class="table-wrapper">

            <table class="history-table">

              <thead>

              <tr>

                <th class="stt-column">
                  STT
                </th>

                <th>
                  Ngày làm
                </th>

                <th>
                  Tổng câu
                </th>

                <th>
                  Đúng ✓
                </th>

                <th>
                  Sai ✕
                </th>

                <th>
                  Chưa trả lời
                </th>

                <th>
                  Tỷ lệ (%)
                </th>
                <th>Chi tiết</th>

              </tr>

              </thead>


              <tbody>

              <tr
                v-for="(r, index) in results"
                :key="r.resultId"
              >

                <!-- STT -->

                <td>

                  <div class="attempt-badge">

                    {{ totalElements - page * 20 - index }}

                  </div>

                </td>


                <!-- NGÀY LÀM -->

                <td>

                  <div class="date">

                    <span class="date-icon">
                      <i class="bi bi-clock" aria-hidden="true"></i>
                    </span>

                    <span>
                      {{
                        new Date(
                          r.submittedAt
                        ).toLocaleString(
                          "vi-VN"
                        )
                      }}
                    </span>

                  </div>

                </td>


                <!-- TỔNG CÂU -->

                <td>

                  <span class="total-count">

                    {{ r.totalQuestion }}

                  </span>

                </td>


                <!-- ĐÚNG -->

                <td>

                  <span class="correct-count">

                     {{ r.correctCount }}

                  </span>

                </td>


                <!-- SAI -->

                <td>

                  <span class="wrong-count">

                     {{ r.wrongCount }}

                  </span>

                </td>


                <!-- CHƯA TRẢ LỜI -->

                <td>

                  <span class="unanswered-count">


                    {{
                      r.unansweredCount ?? '—'
                    }}

                  </span>

                </td>


                <!-- ĐIỂM -->

                <td>

                  <span
                    class="score"
                    :class="
                      getScoreClass(
                        r.score
                      )
                    "
                  >

                    {{ Math.round(r.score) }}

                  </span>

                </td>

                <td><button v-if="r.correctAnswers && r.chosenAnswers" type="button" class="detail-button" :aria-pressed="selectedResultId === r.resultId" @click="openResult(r.resultId)">Xem đáp án</button><span v-else>Chưa lưu chi tiết</span></td>

              </tr>

              </tbody>

            </table>

          </div>

        </div>

        <nav v-if="totalPages > 1" class="history-pagination" aria-label="Trang lịch sử"><button class="back-btn" :disabled="loading || page === 0" @click="changePage(page - 1)">Trước</button><span>{{ page + 1 }} / {{ totalPages }}</span><button class="back-btn" :disabled="loading || page + 1 >= totalPages" @click="changePage(page + 1)">Sau</button></nav>
      </template>

    </template>

  </div>

</template>


<style scoped>
.history-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.legacy-note { padding: 12px; border-radius: 10px; background: #fff7e6; color: #785019; font-size: 14px; }
.attempt-details { padding: 18px; margin-bottom: 20px; border: 1px solid var(--learn-border); border-radius: 16px; background: #fff; scroll-margin-top: 80px; }
.detail-heading { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.detail-heading h2 { font-size: 20px; margin: 0; }
.answer-detail { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; padding: 12px 0; border-top: 1px solid var(--learn-border); }
.detail-button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--learn-primary-soft); border-radius: 10px; background: var(--learn-primary-soft); color: var(--learn-primary); white-space: nowrap; }

.history-page {

  width: 100%;

  max-width: 1500px;

  margin: 0 auto;

  padding: 24px 32px 50px;

}


/* =========================
   HEADER
========================= */

.page-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 28px;

}


.page-header h1 {

  margin: 0;

  color: var(--learn-text);

  font-size: 30px;

  font-weight: 800;

}


.lesson-name {

  margin: 8px 0 0;

  color: var(--learn-muted);

  font-size: 16px;

  font-weight: 500;

}


.back-btn {

  border: none;

  padding: 11px 20px;

  border-radius: 12px;

  background: white;

  color: var(--learn-heading);

  font-size: 14px;

  font-weight: 700;

  cursor: pointer;

  box-shadow: 0 4px 14px rgba(63, 53, 72, .08);

  transition: .2s;

}


.back-btn:hover {

  background: var(--learn-surface-muted);

  transform: translateY(-1px);

}


/* =========================
   LOADING
========================= */

.loading {

  min-height: 300px;

  display: flex;

  flex-direction: column;

  justify-content: center;

  align-items: center;

  gap: 12px;

  color: var(--learn-muted);

  font-size: 16px;

}


.loading-icon {

  font-size: 32px;

}


/* =========================
   EMPTY
========================= */

.empty {

  min-height: 400px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  background: white;

  border-radius: 20px;

  text-align: center;

  box-shadow: 0 4px 20px rgba(63, 53, 72, .05);

}


.empty-icon {

  font-size: 60px;

  margin-bottom: 12px;

}


.empty h3 {

  margin: 0 0 8px;

  color: var(--learn-heading);

}


.empty p {

  margin: 0;

  color: var(--learn-subtle);

}


/* =========================
   SUMMARY
========================= */

.summary {

  display: grid;

  grid-template-columns:
    repeat(6, minmax(0, 1fr));

  gap: 16px;

  margin-bottom: 30px;

}


.summary-card {

  display: flex;

  align-items: center;

  gap: 14px;

  min-height: 105px;

  padding: 18px;

  background: white;

  border: 1px solid var(--learn-border);

  border-radius: 16px;

  box-shadow: 0 4px 18px rgba(63, 53, 72, .05);

}


.summary-icon {

  width: 46px;

  height: 46px;

  flex-shrink: 0;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 12px;

  background: var(--learn-surface-muted);

  font-size: 22px;

}


.summary-content {

  min-width: 0;

}


.number {

  color: var(--learn-text);

  font-size: 25px;

  font-weight: 800;

  line-height: 1.2;

}


.number.good {

  color: #16a34a;

}


.number.bad {

  color: #dc2626;

}


.number.unanswered {

  color: #d97706;

}


.title {

  margin-top: 5px;

  color: var(--learn-muted);

  font-size: 13px;

  white-space: nowrap;

}


/* =========================
   HISTORY SECTION
========================= */

.history-section {

  background: white;

  border: 1px solid var(--learn-border);

  border-radius: 20px;

  overflow: hidden;

  box-shadow: 0 5px 24px rgba(63, 53, 72, .06);

}


.section-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  padding: 22px 24px;

  border-bottom: 1px solid var(--learn-border);

}


.section-header h2 {

  margin: 0;

  color: var(--learn-text);

  font-size: 21px;

  font-weight: 800;

}


.section-header p {

  margin: 5px 0 0;

  color: var(--learn-subtle);

  font-size: 14px;

}


.attempt-count {

  padding: 7px 14px;

  border-radius: 999px;

  background: var(--learn-primary-soft);

  color: var(--learn-primary);

  font-size: 13px;

  font-weight: 700;

}


/* =========================
   TABLE
========================= */

.table-wrapper {

  width: 100%;

  overflow-x: auto;

}


.history-table {

  width: 100%;

  min-width: 850px;

  border-collapse: collapse;

  table-layout: auto;

}


.history-table thead {

  background: var(--learn-surface-muted);

}


.history-table th {

  padding: 15px 18px;

  color: var(--learn-muted);

  font-size: 13px;

  font-weight: 700;

  text-align: left;

  white-space: nowrap;

  border-bottom: 1px solid var(--learn-border);

}


.history-table td {

  padding: 16px 18px;

  color: var(--learn-heading);

  font-size: 14px;

  border-bottom: 1px solid var(--learn-surface-muted);

}


.history-table tbody tr {

  transition: background .2s;

}


.history-table tbody tr:hover {

  background: var(--learn-surface-muted);

}


.history-table tbody tr:last-child td {

  border-bottom: none;

}


.stt-column {

  width: 60px;

  text-align: center !important;

}


/* =========================
   ATTEMPT NUMBER
========================= */

.attempt-badge {

  width: 34px;

  height: 34px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 10px;

  background: var(--learn-primary-soft);

  color: var(--learn-primary);

  font-weight: 800;

}


/* =========================
   DATE
========================= */

.date {

  display: flex;

  align-items: center;

  gap: 8px;

  white-space: nowrap;

}


.date-icon {

  font-size: 15px;

}


/* =========================
   COUNTS
========================= */

.total-count {

  display: inline-flex;

  min-width: 32px;

  justify-content: center;

  padding: 5px 9px;

  border-radius: 8px;

  background: var(--learn-surface-muted);

  color: var(--learn-heading);

  font-weight: 700;

}


.correct-count {

  display: inline-flex;

  padding: 5px 10px;

  border-radius: 8px;

  background: #dcfce7;

  color: #15803d;

  font-weight: 700;

}


.wrong-count {

  display: inline-flex;

  padding: 5px 10px;

  border-radius: 8px;

  background: #fee2e2;

  color: #dc2626;

  font-weight: 700;

}


.unanswered-count {

  display: inline-flex;

  padding: 5px 10px;

  border-radius: 8px;

  background: #fef3c7;

  color: #b45309;

  font-weight: 700;

}


/* =========================
   SCORE
========================= */

.score {

  display: inline-flex;

  min-width: 60px;

  justify-content: center;

  padding: 6px 12px;

  border-radius: 999px;

  font-size: 13px;

  font-weight: 800;

}


.score.excellent {

  background: #dcfce7;

  color: #15803d;

}


.score.good {

  background: var(--learn-primary-soft);

  color: var(--learn-primary);

}


.score.normal {

  background: #fef3c7;

  color: #b45309;

}


.score.bad {

  background: #fee2e2;

  color: #dc2626;

}


/* =========================
   RESPONSIVE
========================= */

@media (max-width: 1200px) {

  .summary {

    grid-template-columns:
      repeat(3, 1fr);

  }

}


@media (max-width: 768px) {

  .history-page {

    padding: 20px 16px 40px;

  }


  .page-header {

    align-items: flex-start;

    gap: 16px;

  }


  .page-header h1 {

    font-size: 24px;

  }


  .summary {

    grid-template-columns:
      repeat(2, 1fr);

  }


  .summary-card {

    padding: 14px;

  }


  .summary-icon {

    width: 40px;

    height: 40px;

    font-size: 19px;

  }


  .number {

    font-size: 21px;

  }


  .section-header {

    padding: 18px;

  }

}


@media (max-width: 500px) {

  .page-header {

    flex-direction: column;

  }


  .back-btn {

    width: 100%;

  }


  .summary {

    grid-template-columns: 1fr;

  }

}
.chart-container {
  position: relative;
  width: 100%;
  height: 360px;
  margin-top: 20px;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>

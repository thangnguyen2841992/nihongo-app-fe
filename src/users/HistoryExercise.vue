<script setup lang="ts">

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref
} from "vue"

import {
  useRoute,
  useRouter
} from "vue-router"

import { gatewayUrl } from "@/api/authApi"

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js"


// =====================================================
// CHART.JS REGISTER
// =====================================================

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)


// =====================================================
// ROUTER
// =====================================================

const route = useRoute()

const router = useRouter()


// =====================================================
// DATA
// =====================================================

interface LessonResult {

  resultId: number

  lessonId: number

  lessonName: string

  totalQuestion: number

  correctCount: number

  wrongCount: number

  score: number

  submittedAt: string

}


const results =
  ref<LessonResult[]>([])


const loading =
  ref(true)


// =====================================================
// LESSON ID
// =====================================================

const lessonId = computed(() => {

  return Number(
    route.params.lessonId
  )

})


// =====================================================
// CHART CANVAS
//
// TEMPLATE CỦA BẠN:
// <canvas ref="scoreChart"></canvas>
//
// Vì vậy ở đây cũng phải là scoreChart.
// =====================================================

const scoreChart =
  ref<HTMLCanvasElement | null>(null)


let scoreChartInstance:
  Chart | null = null


// =====================================================
// DRAW SCORE CHART
// =====================================================

const drawScoreChart = async () => {

  /*
   * Chờ Vue render lại DOM.
   */

  await nextTick()


  console.log(
    "========== DRAW CHART =========="
  )

  console.log(
    "results:",
    results.value
  )

  console.log(
    "canvas:",
    scoreChart.value
  )


  // ---------------------------------------------------
  // CANVAS CHƯA TỒN TẠI
  // ---------------------------------------------------

  if (!scoreChart.value) {

    console.error(
      "❌ scoreChart.value = null"
    )

    return

  }


  // ---------------------------------------------------
  // KHÔNG CÓ DATA
  // ---------------------------------------------------

  if (!results.value.length) {

    console.warn(
      "⚠ Không có dữ liệu để vẽ chart"
    )

    return

  }


  // ---------------------------------------------------
  // HỦY CHART CŨ
  // ---------------------------------------------------

  if (scoreChartInstance) {

    scoreChartInstance.destroy()

    scoreChartInstance = null

  }


  // ---------------------------------------------------
  // ĐẢO DATA
  //
  // API:
  // mới nhất -> cũ nhất
  //
  // Chart:
  // lần 1 -> lần 2 -> lần 3
  // ---------------------------------------------------

  const chartResults =
    [...results.value].reverse()


  // ---------------------------------------------------
  // LABEL
  // ---------------------------------------------------

  const labels =
    chartResults.map(
      (_, index) =>
        `Lần ${index + 1}`
    )


  // ---------------------------------------------------
  // SCORE
  // ---------------------------------------------------

  const scores =
    chartResults.map(
      result =>
        Number(
          result.score || 0
        )
    )


  // ---------------------------------------------------
  // CORRECT
  // ---------------------------------------------------

  const correct =
    chartResults.map(
      result =>
        Number(
          result.correctCount || 0
        )
    )


  // ---------------------------------------------------
  // WRONG
  // ---------------------------------------------------

  const wrong =
    chartResults.map(
      result =>
        Number(
          result.wrongCount || 0
        )
    )


  console.log(
    "labels:",
    labels
  )

  console.log(
    "scores:",
    scores
  )

  console.log(
    "correct:",
    correct
  )

  console.log(
    "wrong:",
    wrong
  )


  // ---------------------------------------------------
  // CANVAS CONTEXT
  // ---------------------------------------------------

  const ctx =
    scoreChart.value.getContext(
      "2d"
    )


  if (!ctx) {

    console.error(
      "❌ Không lấy được canvas 2D context"
    )

    return

  }


  // ---------------------------------------------------
  // CREATE CHART
  // ---------------------------------------------------

  scoreChartInstance =
    new Chart(
      ctx,
      {

        type: "line",

        data: {

          labels,

datasets: [

  {
    label: "Điểm",

    data: scores,

    borderColor: "#1565C0",
    backgroundColor: "#1565C0",

    borderWidth: 4,

    tension: 0.35,

    pointRadius: 5,

    pointHoverRadius: 8,

    pointBackgroundColor: "#FFFFFF",
    pointBorderColor: "#1565C0",
    pointBorderWidth: 3,

    yAxisID: "score"
  },


  {
    label: "Câu đúng",

    data: correct,

    borderColor: "#16803C",
    backgroundColor: "#16803C",

    borderWidth: 3,

    tension: 0.35,

    pointRadius: 4,

    pointHoverRadius: 7,

    pointBackgroundColor: "#FFFFFF",
    pointBorderColor: "#16803C",
    pointBorderWidth: 3,

    yAxisID: "question"
  },


  {
    label: "Câu sai",

    data: wrong,

    borderColor: "#C62828",
    backgroundColor: "#C62828",

    borderWidth: 3,

    tension: 0.35,

    pointRadius: 4,

    pointHoverRadius: 7,

    pointBackgroundColor: "#FFFFFF",
    pointBorderColor: "#C62828",
    pointBorderWidth: 3,

    yAxisID: "question"
  }

]


      },


        options: {

          responsive: true,

          maintainAspectRatio: false,


          interaction: {

            mode: "index",

            intersect: false

          },


          plugins: {

            legend: {

              display: true,

              position: "top"

            },


            tooltip: {

              callbacks: {

                label: context => {

                  if (
                    context.dataset.label ===
                    "Điểm"
                  ) {

                    return (
                      `Điểm: ` +
                      `${context.parsed.y}%`
                    )

                  }


                  return (
                    `${context.dataset.label}: ` +
                    `${context.parsed.y}`
                  )

                }

              }

            }

          },


          scales: {

            // =======================================
            // SCORE AXIS
            // =======================================

            score: {

              type: "linear",

              position: "left",

              min: 0,

              max: 100,

              ticks: {

                stepSize: 10,

                callback: value => {

                  return `${value}%`

                }

              },

              title: {

                display: true,

                text: "Điểm"

              }

            },


            // =======================================
            // QUESTION AXIS
            // =======================================

            question: {

              type: "linear",

              position: "right",

              beginAtZero: true,

              ticks: {

                precision: 0

              },

              grid: {

                drawOnChartArea: false

              },

              title: {

                display: true,

                text: "Số câu"

              }

            }

          }

        }

      }
    )


  console.log(
    "✅ CHART CREATED",
    scoreChartInstance
  )

}


// =====================================================
// LOAD HISTORY
//
// API GIỮ NGUYÊN CỦA BẠN
// =====================================================

const loadHistory = async () => {

  try {

    loading.value = true


    const res =
      await gatewayUrl.get(
        `/api/nihongo-user/lesson-result/${lessonId.value}`
      )


    // GIỮ NGUYÊN

    results.value =
      res.data


    /*
     * Quan trọng:
     *
     * 1. loading = false
     * 2. Vue render template v-else
     * 3. nextTick()
     * 4. canvas tồn tại
     * 5. draw chart
     */

    loading.value = false


    await nextTick()


    await drawScoreChart()

  }
  catch (error) {

    console.error(
      "Không tải được lịch sử làm bài:",
      error
    )

    loading.value = false

  }

}


// =====================================================
// SUMMARY
// =====================================================

const totalExam =
  computed(() =>
    results.value.length
  )


const totalQuestion =
  computed(() =>
    results.value.reduce(
      (sum, r) =>
        sum +
        Number(
          r.totalQuestion || 0
        ),
      0
    )
  )


const totalCorrect =
  computed(() =>
    results.value.reduce(
      (sum, r) =>
        sum +
        Number(
          r.correctCount || 0
        ),
      0
    )
  )


const totalWrong =
  computed(() =>
    results.value.reduce(
      (sum, r) =>
        sum +
        Number(
          r.wrongCount || 0
        ),
      0
    )
  )


const totalUnanswered =
  computed(() => {

    return Math.max(
      totalQuestion.value -
      totalCorrect.value -
      totalWrong.value,
      0
    )

  })


const averageScore =
  computed(() => {

    if (
      !results.value.length
    ) {

      return 0

    }


    const total =
      results.value.reduce(
        (sum, r) =>
          sum +
          Number(
            r.score || 0
          ),
        0
      )


    return Math.round(
      total /
      results.value.length
    )

  })


// =====================================================
// SCORE CLASS
// =====================================================

const getScoreClass = (
  score: number
) => {

  if (score >= 90) {

    return "excellent"

  }


  if (score >= 80) {

    return "good"

  }


  if (score >= 60) {

    return "normal"

  }


  return "bad"

}


// =====================================================
// BACK
// =====================================================

const goBack = () => {

  router.back()

}


// =====================================================
// MOUNT
// =====================================================

onMounted(() => {

  loadHistory()

})


// =====================================================
// UNMOUNT
// =====================================================

onBeforeUnmount(() => {

  if (scoreChartInstance) {

    scoreChartInstance.destroy()

    scoreChartInstance = null

  }

})

</script>





<template>

  <div class="history-page">

    <!-- =========================
         HEADER
    ========================== -->

    <div class="page-header">

      <div>

        <h1>
          📊 Lịch sử làm bài
        </h1>

        <p
          v-if="results.length"
          class="lesson-name"
        >
          📘 {{ results[0]?.lessonName }}
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
        ⏳
      </div>

      Đang tải lịch sử...
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
          📚
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

        <!-- =========================
             SUMMARY
        ========================== -->

        <div class="summary">

          <!-- Số lần làm -->

          <div class="summary-card">

            <div class="summary-icon">
              📝
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
              📊
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
              📚
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
              ✅
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
              ❌
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
                📈 Biểu đồ điểm
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
                📋 Các lần làm bài
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

                    {{ totalExam - index }}

                  </div>

                </td>


                <!-- NGÀY LÀM -->

                <td>

                  <div class="date">

                    <span class="date-icon">
                      🕐
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
                      r.totalQuestion -
                      r.correctCount -
                      r.wrongCount
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

              </tr>

              </tbody>

            </table>

          </div>

        </div>

      </template>

    </template>

  </div>

</template>


<style scoped>

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

  color: #1e293b;

  font-size: 30px;

  font-weight: 800;

}


.lesson-name {

  margin: 8px 0 0;

  color: #64748b;

  font-size: 16px;

  font-weight: 500;

}


.back-btn {

  border: none;

  padding: 11px 20px;

  border-radius: 12px;

  background: white;

  color: #334155;

  font-size: 14px;

  font-weight: 700;

  cursor: pointer;

  box-shadow: 0 4px 14px rgba(15, 23, 42, .08);

  transition: .2s;

}


.back-btn:hover {

  background: #f1f5f9;

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

  color: #64748b;

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

  box-shadow: 0 4px 20px rgba(15, 23, 42, .05);

}


.empty-icon {

  font-size: 60px;

  margin-bottom: 12px;

}


.empty h3 {

  margin: 0 0 8px;

  color: #334155;

}


.empty p {

  margin: 0;

  color: #94a3b8;

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

  border: 1px solid #e2e8f0;

  border-radius: 16px;

  box-shadow: 0 4px 18px rgba(15, 23, 42, .05);

}


.summary-icon {

  width: 46px;

  height: 46px;

  flex-shrink: 0;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 12px;

  background: #f1f5f9;

  font-size: 22px;

}


.summary-content {

  min-width: 0;

}


.number {

  color: #1e293b;

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

  color: #64748b;

  font-size: 13px;

  white-space: nowrap;

}


/* =========================
   HISTORY SECTION
========================= */

.history-section {

  background: white;

  border: 1px solid #e2e8f0;

  border-radius: 20px;

  overflow: hidden;

  box-shadow: 0 5px 24px rgba(15, 23, 42, .06);

}


.section-header {

  display: flex;

  justify-content: space-between;

  align-items: center;

  padding: 22px 24px;

  border-bottom: 1px solid #e2e8f0;

}


.section-header h2 {

  margin: 0;

  color: #1e293b;

  font-size: 21px;

  font-weight: 800;

}


.section-header p {

  margin: 5px 0 0;

  color: #94a3b8;

  font-size: 14px;

}


.attempt-count {

  padding: 7px 14px;

  border-radius: 999px;

  background: #eef4ff;

  color: #2563eb;

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

  background: #f8fafc;

}


.history-table th {

  padding: 15px 18px;

  color: #64748b;

  font-size: 13px;

  font-weight: 700;

  text-align: left;

  white-space: nowrap;

  border-bottom: 1px solid #e2e8f0;

}


.history-table td {

  padding: 16px 18px;

  color: #334155;

  font-size: 14px;

  border-bottom: 1px solid #f1f5f9;

}


.history-table tbody tr {

  transition: background .2s;

}


.history-table tbody tr:hover {

  background: #f8fafc;

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

  background: #eef4ff;

  color: #2563eb;

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

  background: #f1f5f9;

  color: #475569;

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

  background: #dbeafe;

  color: #1d4ed8;

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

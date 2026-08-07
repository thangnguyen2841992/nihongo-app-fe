<script setup lang="ts">
import {computed, onMounted, ref} from "vue"
import {gatewayUrl} from "@/api/authApi"

interface LessonResult {

  resultId:number
  lessonId:number
  totalQuestion:number

  lessonName:string

  correctCount:number

  wrongCount:number

  score:number

  submittedAt:string

}

const results =
  ref<LessonResult[]>([])

const loading =
  ref(true)

const loadHistory =
  async ()=>{

    try{

      const res =
        await gatewayUrl.get(
          "/api/nihongo-user/userExerciseAttempt"
        )

      results.value =
        res.data

    }finally{

      loading.value=false

    }

  }

const totalExam =
  computed(
    ()=>results.value.length
  )

const averageScore =
  computed(()=>{

    if(results.value.length===0)
      return 0

    return (
      results.value.reduce(
        (s,x)=>s+x.score,
        0
      )/
      results.value.length
    ).toFixed(1)

  })

const totalCorrect =
  computed(()=>{

    return results.value.reduce(
      (s,x)=>s+x.correctCount,
      0
    )

  })

const totalWrong =
  computed(()=>{

    return results.value.reduce(
      (s,x)=>s+x.wrongCount,
      0
    )

  })
const totalQuestion = computed(() =>
  results.value.reduce(
    (sum, r) => sum + r.totalQuestion,
    0
  )
)

const totalUnanswered = computed(() =>
  results.value.reduce(
    (sum, r) =>
      sum +
      (r.totalQuestion -
        r.correctCount -
        r.wrongCount),
    0
  )
)
onMounted(loadHistory)
</script>

<template>

  <div class="page">

    <h1>
      📊 Lịch sử làm bài
    </h1>

    <div
      v-if="loading"
      class="loading"
    >
      Đang tải...
    </div>

    <template v-else>

      <div class="summary">

        <div class="summary-card">
          <div class="number">
            {{ totalExam }}
          </div>
          <div class="title">
            Số bài đã làm
          </div>
        </div>

        <div class="summary-card">
          <div class="number">
            {{ averageScore }}%
          </div>
          <div class="title">
            Điểm trung bình
          </div>
        </div>

        <div class="summary-card">
          <div class="number">
            {{ totalQuestion }}
          </div>
          <div class="title">
            Tổng số câu hỏi
          </div>
        </div>

        <div class="summary-card">
          <div class="number unanswered">
            {{ totalUnanswered }}
          </div>
          <div class="title">
            Chưa trả lời
          </div>
        </div>

        <div class="summary-card">
          <div class="number good">
            {{ totalCorrect }}
          </div>
          <div class="title">
            Tổng câu đúng
          </div>
        </div>

        <div class="summary-card">
          <div class="number bad">
            {{ totalWrong }}
          </div>
          <div class="title">
            Tổng câu sai
          </div>
        </div>

      </div>

      <div
        v-if="results.length==0"
        class="empty"
      >

        📚 Bạn chưa làm bài kiểm tra nào.

      </div>

      <table
        v-else
        class="history-table"
      >

        <thead>

        <tr>
          <th>Bài học</th>
          <th>Tổng câu</th>
          <th>Đúng</th>
          <th>Sai</th>
          <th>Chưa trả lời</th>
          <th>Điểm</th>
          <th>Ngày làm</th>
        </tr>

        </thead>

        <tbody>

        <tr
          v-for="r in results"
          :key="r.resultId"
        >

          <td>{{ r.lessonName }}</td>

          <td class="total">
            {{ r.totalQuestion }}
          </td>

          <td class="correct">
            {{ r.correctCount }}
          </td>

          <td class="wrong">
            {{ r.wrongCount }}
          </td>

          <td class="unanswered">
            {{
              r.totalQuestion -
              r.correctCount -
              r.wrongCount
            }}
          </td>

          <td>

    <span
      class="score"
      :class="{
        excellent:r.score>=90,
        good:r.score>=80 && r.score<90,
        normal:r.score>=60 && r.score<80,
        bad:r.score<60
      }"
    >
      {{ Math.round(r.score) }}%
    </span>

          </td>

          <td>
            {{ new Date(r.submittedAt).toLocaleString("vi-VN") }}
          </td>

        </tr>

        </tbody>

      </table>

    </template>

  </div>

</template>

<style scoped>

.page{

  padding:20px;
  width:98%;
  margin:auto;

}

h1{

  margin-bottom:30px;

  font-size:34px;

  font-weight:700;

}

.summary{

  display:grid;

  grid-template-columns:repeat(4,1fr);

  gap:20px;

  margin-bottom:30px;

}

.summary-card{

  background:white;

  border-radius:16px;

  padding:25px;

  box-shadow:0 8px 24px rgba(0,0,0,.08);

  text-align:center;

}

.number{

  font-size:36px;

  font-weight:bold;

  color:#2563eb;

}

.number.good{

  color:#16a34a;

}

.number.bad{

  color:#dc2626;

}

.title{

  margin-top:10px;

  color:#666;

}

.history-table{

  width:100%;

  border-collapse:collapse;

  background:white;

  border-radius:16px;

  overflow:hidden;

  box-shadow:0 8px 24px rgba(0,0,0,.08);

}

.history-table th{

  background:#f6f8fb;

  padding:16px;

  text-align:left;

}

.history-table td{

  padding:16px;

  border-top:1px solid #eee;

}

.history-table tr:hover{

  background:#fafcff;

}

.correct{

  color:#16a34a;

  font-weight:700;

}

.wrong{

  color:#dc2626;

  font-weight:700;

}

.score{

  padding:6px 12px;

  border-radius:999px;

  font-weight:bold;

}

.score.excellent{

  background:#dcfce7;

  color:#15803d;

}

.score.good{

  background:#dbeafe;

  color:#1d4ed8;

}

.score.normal{

  background:#fef3c7;

  color:#b45309;

}

.score.bad{

  background:#fee2e2;

  color:#b91c1c;

}

.loading,
.empty{

  text-align:center;

  padding:80px;

  color:#888;

  font-size:18px;

}

@media(max-width:900px){

  .summary{

    grid-template-columns:repeat(2,1fr);

  }

}

@media(max-width:600px){

  .summary{

    grid-template-columns:1fr;

  }

  .history-table{

    font-size:14px;

  }

}
</style>

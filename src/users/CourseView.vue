<script setup lang="ts">
import {onMounted, ref} from "vue";
import {gatewayUrl} from "@/api/authApi.ts";

interface Course {
  courseId: number
  courseName: string
  courseDescription: string
  active: string
  originalPrice: number
  salePrice: number
}

const courses = ref<Course[]>([])
const selectedCourse = ref<Course | null>(null)

const getPriceChangePercent = (course: Course) => {
  if (!course.originalPrice) {
    return 0
  }

  return Math.round(
    (
      (course.salePrice - course.originalPrice)
      / course.originalPrice
    ) * 100
  )
}

const getDiscountPercent = (course: Course) => {
  if (
    !course.originalPrice ||
    course.originalPrice <= course.salePrice
  ) {
    return 0
  }

  return Math.round(
    (
      (course.originalPrice - course.salePrice)
      / course.originalPrice
    ) * 100
  )
}

const getSavingAmount = (course: Course) => {
  return course.originalPrice - course.salePrice
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat(
    'vi-VN',
    {
      style: 'currency',
      currency: 'VND'
    }
  ).format(price)
}

const loadCourses = async () => {
  try {
    const res = await gatewayUrl.get('/api/nihongo-user/courses')
    courses.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const chooseCourse = (course: Course) => {
  selectedCourse.value = course

  // TODO gọi API đăng ký khóa học
  // await axios.post(...)
}

onMounted(() => {
  loadCourses()
})
</script>

<template>
  <h4 class="mb-4">
    📚 Danh sách khóa học
  </h4>

  <div
    v-if="courses.length"
    class="row"
  >
    <div
      v-for="course in courses"
      :key="course.courseId"
      class="col-md-4 mb-4"
    >
      <div
        class="card course-card h-100 border-0"
      >
        <div class="card-body d-flex flex-column">

          <h5 class="fw-bold">
            {{ course.courseName }}
          </h5>

          <p class="text-muted flex-grow-1">
            {{ course.courseDescription }}
          </p>

          <span
            class="course-status"
            :class="{
    active: course.active === 'Đang hoạt động',
    full: course.active === 'Đã đủ người',
    inactive: course.active === 'Tạm ngưng hoạt động'
  }"
          >
  {{ course.active }}
</span>

          <div class="mb-3">

            <div class="d-flex align-items-center gap-2 mb-1">

  <span class="original-price">
    {{ formatPrice(course.originalPrice) }}
  </span>

              <span
                class="price-change-badge"
                :class="{
      discount: getPriceChangePercent(course) < 0,
      increase: getPriceChangePercent(course) > 0,
      same: getPriceChangePercent(course) === 0
    }"
              >
    {{
                  getPriceChangePercent(course) < 0
                    ? `${Math.abs(getPriceChangePercent(course))}% OFF`
                    : getPriceChangePercent(course) > 0
                      ? `+${getPriceChangePercent(course)}%`
                      : '0%'
                }}
  </span>

            </div>

            <div class="sale-price">
              {{ formatPrice(course.salePrice) }}
            </div>

            <small
              v-if="course.originalPrice > course.salePrice"
              class="text-success saving-text"
            >
              Tiết kiệm
              {{ formatPrice(getSavingAmount(course)) }}
            </small>

          </div>

          <button
            class="btn btn-primary w-100"
            @click="chooseCourse(course)"
          >
            Đăng ký ngay
          </button>

        </div>
      </div>
    </div>
  </div>

  <div
    v-else
    class="alert alert-info"
  >
    Chưa có khóa học nào.
  </div>

  <div
    v-if="selectedCourse"
    class="mt-4 alert alert-success"
  >
    Bạn đã chọn:
    <strong>
      {{ selectedCourse.courseName }}
    </strong>
  </div>
</template>
<style scoped>
.course-card {
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.course-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
}

.course-card .card-body {
  padding: 1.5rem;
}

.course-card h5 {
  min-height: 60px;
  font-weight: 700;
  color: #212529;
}

.course-card p {
  min-height: 72px;
  line-height: 1.6;
}

.original-price {
  font-size: 0.95rem;
  color: #6c757d;
  text-decoration: line-through;
}

.sale-price {
  font-size: 1.8rem;
  font-weight: 700;
  color: #dc3545;
}

.saving-text {
  display: block;
  margin-top: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}

.course-status {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  width: fit-content;
  margin-bottom: 10px;
}

.course-status.active {
  color: #198754;
  background: #d1e7dd;
}

.course-status.full {
  color: #fd7e14;
  background: #fff3cd;
}

.course-status.inactive {
  color: #dc3545;
  background: #f8d7da;
}
.price-change-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.price-change-badge.discount {
  background: #ffe5e5;
  color: #dc3545;
}

.price-change-badge.increase {
  background: #fff3cd;
  color: #fd7e14;
}

.price-change-badge.same {
  background: #e9ecef;
  color: #6c757d;
}
</style>

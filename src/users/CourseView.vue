```vue
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

interface UserCourseRequest {
  courseId: number
}


const courses = ref<Course[]>([])
const registering = ref<number | null>(null)
const selectedCourse = ref<Course | null>(null)
const registeredCourseIds =
  ref<number[]>([])

const loadRegisteredCourses =
  async () => {
    try {

      const res =
        await gatewayUrl.get(
          '/api/nihongo-user/my-courses'
        )

      registeredCourseIds.value =
        res.data

    } catch (e) {
      console.error(e)
    }
  }

const isRegistered = (
  courseId: number
) => {
  return registeredCourseIds.value
    .includes(courseId)
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

const chooseCourse = async (course: Course) => {
  try {
    registering.value = course.courseId

    await gatewayUrl.post(
      '/api/nihongo-user/userCourses',
      {
        courseId: course.courseId
      }
    )
    registeredCourseIds.value.push(
      course.courseId
    )
    selectedCourse.value = course

  } catch (e) {
    console.error(e)
    alert('Đăng ký khóa học thất bại')
  } finally {
    registering.value = null
  }
}


onMounted(async () => {
  await Promise.all([
    loadCourses(),
    loadRegisteredCourses()
  ])
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
      <div class="card course-card h-100 border-0">

        <div class="card-body d-flex flex-column">


          <div class="course-header">

            <h5 class="course-title">
              {{ course.courseName }}
            </h5>

            <div class="course-badges">

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

              <span
                v-if="getDiscountPercent(course) > 0"
                class="discount-ribbon"
              >
      -{{ getDiscountPercent(course) }}%
    </span>

            </div>

          </div>

          <p class="text-muted flex-grow-1">
            {{ course.courseDescription }}
          </p>
          <div class="course-footer">

            <div class="price-section">

              <div class="sale-price">
                {{ formatPrice(course.salePrice) }}
              </div>

              <div
                v-if="course.originalPrice > course.salePrice"
                class="original-price"
              >
                {{ formatPrice(course.originalPrice) }}
              </div>

            </div>

            <button
              class="btn-buy"
              :class="{
    registered:
      isRegistered(
        course.courseId
      )
  }"
              :disabled="
    registering === course.courseId ||
    isRegistered(course.courseId)
  "
              @click="chooseCourse(course)"
            >
              <template
                v-if="
      isRegistered(
        course.courseId
      )
    "
              >
                ✅ Đã đăng ký
              </template>

              <template
                v-else-if="
      registering ===
      course.courseId
    "
              >
                ⏳ Đang xử lý...
              </template>

              <template v-else>
                🛒 Mua
              </template>
            </button>

          </div>

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

```css
<style scoped>
.course-card {
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.course-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
}

.course-card .card-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Header */

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.course-title {
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #212529;
  text-align: left;
}

.course-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Status */

.course-status {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
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

/* Discount */

.discount-ribbon {
  background: linear-gradient(
    135deg,
    #ff4d4f,
    #dc3545
  );

  color: white;
  font-weight: 700;
  font-size: 0.8rem;

  padding: 6px 12px;
  border-radius: 999px;

  box-shadow: 0 4px 12px rgba(220, 53, 69, .3);
}

/* Description */

.course-card p {
  min-height: 72px;
  line-height: 1.6;
  margin-bottom: 20px;
}

/* Footer */

.course-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}

/* Price */

.price-section {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.sale-price {
  font-size: 1.5rem;
  font-weight: 500;
  color: #dc3545;
  line-height: 1;
}

.original-price {
  font-size: 1rem;
  color: #6c757d;
  text-decoration: line-through;
}

/* Button */

.btn-buy {
  flex-shrink: 0;

  border: none;
  border-radius: 10px;

  padding: 10px 18px;

  color: white;
  font-size: 0.95rem;
  font-weight: 600;

  white-space: nowrap;

  background: linear-gradient(
    135deg,
    #0d6efd,
    #4f8cff
  );

  transition: all .25s ease;
}

.btn-buy:hover {
  transform: translateY(-2px);

  box-shadow: 0 8px 20px rgba(13, 110, 253, .25);
}

.btn-buy:active {
  transform: scale(.98);
}

.btn-buy:disabled {
  opacity: .7;
  cursor: not-allowed;
}
.btn-buy.registered {
  background: linear-gradient(
    135deg,
    #198754,
    #20c997
  );
}

.btn-buy.registered:hover {
  transform: none;
  box-shadow: none;
}
</style>


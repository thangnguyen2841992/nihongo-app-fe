<script setup lang="ts">
import {onMounted, ref} from "vue";
import axios from "axios";
import {gatewayUrl} from "@/api/authApi.ts";

interface Course {
  courseId: number
  courseName: string
  courseDescription: string
  active: string
}

const courses = ref<Course[]>([])
const selectedCourse = ref<Course | null>(null)

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
        class="card h-100 shadow-sm"
      >
        <div class="card-body">
          <h5>
            {{ course.courseName }}
          </h5>

          <p>
            {{ course.courseDescription }}
          </p>

          <span
            class="badge bg-success mb-3"
          >
            {{ course.active }}
          </span>

          <div>
            <button
              class="btn btn-primary"
              @click="chooseCourse(course)"
            >
              Chọn khóa học
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

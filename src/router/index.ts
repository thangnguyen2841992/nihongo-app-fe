import {createRouter, createWebHistory} from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import Home from '@/users/Home-User.vue'

import LoginView from '@/components/auth/LoginView.vue'
import CheckEmailView from '@/components/auth/CheckEmailView.vue'

// 🔥 thêm
import ActiveAccount from '@/components/auth/ActiveAccount.vue'
import ResetPassword from '@/components/auth/ResetPassword.vue'
import ActiveExpired from '@/components/auth/ActiveExpired.vue'
import ActiveFailed from '@/components/auth/ActiveFailed.vue'
import RegisterView from "@/components/auth/RegisterView.vue";
import AdminHome from "@/components/admin/Admin-home.vue";
import AdminLayout from "@/components/admin/AdminLayout.vue";
import StaffLayout from "@/components/staff/StaffLayout.vue";
import StaffHome from "@/components/staff/StaffHome.vue";
import CourseView from "@/users/CourseView.vue";
import MyCoursesView from "@/users/MyCoursesView.vue";

const routes = [
  // 🔥 layout chính
  {
    path: '/',
    component: MainLayout,
    children: [
      {path: '', component: Home},
      {
        path: '/courses',
        component: CourseView
      },
      {
        path: 'user/my-courses',
        component: MyCoursesView
      },
      {
        path: '/course/:courseId',
        name: 'course-learning',
        component: () =>
          import('@/users/CourseLearningView.vue')
      }
    ]
  },
  {
    path: '/login',
    component: LoginView
  },
  {
    path: '/register',
    component: RegisterView
  },
  {
    path: '/check-email',
    component: CheckEmailView
  },

  // 🔥 activation flow
  {
    path: '/active',
    component: ActiveAccount
  },
  {
    path: '/reset-password',
    component: ResetPassword
  },

  // 🔥 trạng thái
  {
    path: '/active-expired',
    component: ActiveExpired
  },
  {
    path: '/active-failed',
    component: ActiveFailed
  },
  //admin
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      {
        path: '',
        component: AdminHome
      },
      {
        path: 'admin-home',
        component: () => import('@/components/admin/Admin-home.vue')
      }
    ]
  },
  // STAFF
  {
    path: '/staff',
    component: StaffLayout,
    children: [
      {
        path: '',
        component: StaffHome
      },
      {
        path: 'books/:bookId',
        component: () =>
          import('@/components/staff/BookDetailView.vue')
      },
      {
        path: 'lesson/:lessonId/exercises',
        name: 'lesson-exercises',
        component: () =>
          import('@/components/staff/LessonExerciseView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

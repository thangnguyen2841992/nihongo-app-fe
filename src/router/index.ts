import {createRouter, createWebHistory, type RouteLocation} from 'vue-router'
import { authorizeRoute } from '@/services/routeAuthorization'

const MainLayout = () => import("@/layouts/MainLayout.vue")
const Home = () => import("@/users/Home-User.vue")

const LoginView = () => import("@/components/auth/LoginView.vue")
const CheckEmailView = () => import("@/components/auth/CheckEmailView.vue")

// 🔥 thêm
const ActiveAccount = () => import("@/components/auth/ActiveAccount.vue")
const ResetPassword = () => import("@/components/auth/ResetPassword.vue")
const ActiveExpired = () => import("@/components/auth/ActiveExpired.vue")
const ActiveFailed = () => import("@/components/auth/ActiveFailed.vue")
const RegisterView = () => import("@/components/auth/RegisterView.vue")
const AdminHome = () => import("@/components/admin/Admin-home.vue")
const AdminLayout = () => import("@/components/admin/AdminLayout.vue")
const StaffLayout = () => import("@/components/staff/StaffLayout.vue")
const StaffHome = () => import("@/components/staff/StaffHome.vue")
const CourseView = () => import("@/users/CourseView.vue")
const MyCoursesView = () => import("@/users/MyCoursesView.vue")
const JapaneseAiResult = () => import("@/components/staff/JapaneseAiResult.vue")
const RegisterVps = () => import("@/components/staff/monitor/RegisterVps.vue")
const GoogleSetupPassword = () => import("@/components/auth/GoogleSetupPassword.vue")

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
        meta: { requiresAuth: true },
        component: MyCoursesView
      },
      {
        path: '/course/:courseId',
        name: 'course-learning',
        meta: { requiresAuth: true },
        component: () =>
          import('@/users/CourseLearningView.vue')
      },
      {
        path: "/course/:courseId/books",
        name: "CourseBooks",
        meta: { requiresAuth: true },
        component: () => import("@/users/CourseBooksView.vue")
      },
      {
        path: '/course/book/:bookId',
        name: "CourseBookDetail",
        meta: { requiresAuth: true },
        component: () =>
          import('@/users/CourseBookDetailView.vue')
      },

      {
        path: 'course/lesson/:lessonId/exercises',
        name: 'course-lesson-exercises',
        meta: { requiresAuth: true },
        component: () =>
          import('@/users/CourseLessonExerciseView.vue')
      },

      {
        path: 'users/exercises/history/:lessonId',
        name: 'user-exercise-history',
        meta: { requiresAuth: true },
        component: () =>
          import('@/users/HistoryExercise.vue')
      },
      {
        path: '/japanese-ai',
        name: 'JapaneseAi',
        meta: { requiresAuth: true },
        component: JapaneseAiResult
      },
      {
        path: '/wallet',
        name: 'Wallet',
        component: () => import('@/users/Wallet.vue'),
        meta: {
          requiresAuth: true
        }
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
  {
    path: '/google/setup-password',
    name: 'GoogleSetupPassword',
    component: GoogleSetupPassword
  },
  //admin
  {
    path: '/admin',
    meta: { requiresAuth: true, roles: ['ADMIN'] },
    component: AdminLayout,
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminHome
      },
      {
        path: 'wallet-deposits',
        name: 'AdminWalletDeposits',
        component: () => import('@/components/admin/WalletDeposits.vue'),
        meta: { requiresAuth: true }
      }
      // {
      //   path: 'users',
      //   name: 'AdminUsers',
      //   component: () =>
      //     import('@/components/admin/AdminUsers.vue')
      // }
    ]
  },
  // STAFF
  {
    path: '/staff',
    meta: { requiresAuth: true, roles: ['ADMIN', 'STAFF'] },
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
      },
      {
        path: 'monitoring',
        name: 'staff-monitoring',
        redirect: (to: RouteLocation) => ({ path: '/staff/monitoring/vps/performance', query: to.query })
      },

      // 🔥 Đăng ký VPS
      {
        path: 'monitoring/vps/schedules',
        name: 'monitor-vps-schedules',
        redirect: (to: RouteLocation) => ({ path: '/staff/monitoring/vps/performance', query: { ...to.query, schedules: '1' } })
      },
      {
        path: 'monitoring/vps/events',
        name: 'monitor-vps-events',
        component: () => import('@/components/staff/monitor/VpsEvents.vue')
      },
      {
        path: 'monitoring/vps/performance',
        name: 'monitor-vps-performance',
        component: () => import('@/components/staff/monitor/VpsPerformance.vue')
      },
      {
        path: 'monitoring/vps/register',
        name: 'monitor-vps-register',
        component: RegisterVps
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(authorizeRoute)

export default router

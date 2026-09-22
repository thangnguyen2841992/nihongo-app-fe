import axios from 'axios'
import router from '@/router'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const gatewayUrl = axios.create({
  baseURL: 'http://localhost:8082',
  withCredentials: true
})

const publicClient = axios.create({
  baseURL: 'http://localhost:8082',
  withCredentials: true
})

let isRefreshing = false

let pendingRequests: Array<{
  resolve: () => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any = null) => {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve()
    }
  })

  pendingRequests = []
}

const logout = async () => {
  localStorage.clear()
  sessionStorage.clear()

  if (router.currentRoute.value.path !== '/login') {
    await router.replace('/login')
  }
}

gatewayUrl.interceptors.response.use(
  response => response,

  async error => {

    const originalRequest =
      error.config

    const status =
      error.response?.status

    const url =
      originalRequest?.url || ''

    console.log(
      '[AUTH] API ERROR:',
      status,
      url
    )

    // Không có response
    if (!error.response) {
      return Promise.reject(error)
    }

    // Login thất bại -> không refresh
    if (
      url.includes('/api/auth/login')
    ) {
      return Promise.reject(error)
    }

    // Refresh thất bại -> logout
    if (
      url.includes('/api/auth/refresh')
    ) {
      await logout()

      return Promise.reject(error)
    }

    // Không phải 401 -> không refresh
    if (status !== 401) {
      return Promise.reject(error)
    }

    // Request này đã retry rồi -> không retry tiếp
    if (originalRequest?._retry) {
      return Promise.reject(error)
    }

    // Đang có request refresh khác
    if (isRefreshing) {

      originalRequest._retry = true

      return new Promise<void>(
        (resolve, reject) => {

          pendingRequests.push({
            resolve,
            reject
          })

        }
      )
        .then(() => {

          return gatewayUrl(
            originalRequest
          )

        })
    }

    // Đánh dấu request đang refresh
    originalRequest._retry = true

    isRefreshing = true

    try {

      console.log(
        '[AUTH] AccessToken hết hạn'
      )

      console.log(
        '[AUTH] Gọi /api/auth/refresh'
      )

      // Chỉ dùng publicClient cho refresh
      await publicClient.post(
        '/api/auth/refresh'
      )

      console.log(
        '[AUTH] Refresh thành công'
      )

      processQueue()

      // AccessToken mới đã được backend
      // set-cookie vào browser

      return gatewayUrl(
        originalRequest
      )

    } catch (refreshError) {

      console.error(
        '[AUTH] Refresh thất bại',
        refreshError
      )

      processQueue(
        refreshError
      )

      await logout()

      return Promise.reject(
        refreshError
      )

    } finally {

      isRefreshing = false

    }
  }
)

export {
  gatewayUrl,
  publicClient
}

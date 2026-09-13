import axios from 'axios'
import router from '@/router'

/* =========================
   AXIOS RETRY TYPE
========================= */

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

/* =========================
   AXIOS INSTANCES
========================= */

const gatewayUrl = axios.create({
  baseURL: 'http://localhost:8082',
  withCredentials: true
})

const publicClient = axios.create({
  baseURL: 'http://localhost:8082',
  withCredentials: true
})

/* =========================
   REFRESH STATE
========================= */

let isRefreshing = false

let pendingRequests: Array<{
  resolve: () => void
  reject: (error: any) => void
}> = []

/* =========================
   PROCESS QUEUE
========================= */

const processQueue = (error: any = null) => {

  pendingRequests.forEach(({resolve, reject}) => {

    if (error) {
      reject(error)
    } else {
      resolve()
    }

  })

  pendingRequests = []
}

/* =========================
   LOGOUT
========================= */

const logout = async () => {

  localStorage.clear()
  sessionStorage.clear()

  if (router.currentRoute.value.path !== '/login') {
    await router.replace('/login')
  }
}

/* =========================
   RESPONSE INTERCEPTOR
========================= */

gatewayUrl.interceptors.response.use(
  /* =========================
     SUCCESS
  ========================= */

  response => {
    return response
  },

  /* =========================
     ERROR
  ========================= */

  async error => {

    const originalRequest = error.config

    /* =========================
       NETWORK ERROR
    ========================= */

    if (!error.response) {
      return Promise.reject(error)
    }

    const status = error.response.status

    const url = originalRequest?.url || ''

    /* =========================
       LOGIN API
       Không refresh khi login
    ========================= */

    if (
      url.includes('/api/auth/login')
    ) {
      return Promise.reject(error)
    }

    /* =========================
       REFRESH API
       Refresh thất bại => logout
    ========================= */

    if (
      url.includes('/api/auth/refresh')
    ) {

      await logout()

      return Promise.reject(error)
    }

    /* =========================
       CHỈ XỬ LÝ 401
    ========================= */

    if (
      status !== 401 ||
      originalRequest?._retry
    ) {
      return Promise.reject(error)
    }

    /* =========================
       ĐANG REFRESH
       Request này chờ request
       refresh hiện tại hoàn thành
    ========================= */

    if (isRefreshing) {
      originalRequest._retry = true
      return new Promise<void>((resolve, reject) => {

        pendingRequests.push({
          resolve,
          reject
        })

      }).then(() => {


        return gatewayUrl(originalRequest)

      }).catch(refreshError => {

        return Promise.reject(refreshError)

      })
    }

    /* =========================
       ĐÁNH DẤU REQUEST ĐÃ RETRY
    ========================= */

    originalRequest._retry = true

    /* =========================
       BẮT ĐẦU REFRESH
    ========================= */

    isRefreshing = true

    try {

      /* =========================
         REFRESH TOKEN
      ========================= */

      await publicClient.post(
        '/api/auth/refresh'
      )

      /* =========================
         REFRESH THÀNH CÔNG
      ========================= */

      processQueue()

      /* =========================
         RETRY REQUEST BAN ĐẦU
      ========================= */

      return gatewayUrl(originalRequest)

    } catch (refreshError) {

      /* =========================
         REFRESH THẤT BẠI
      ========================= */

      processQueue(refreshError)

      await logout()

      return Promise.reject(refreshError)

    } finally {

      /* =========================
         RESET REFRESH STATE
      ========================= */

      isRefreshing = false
    }
  }
)

/* =========================
   EXPORT
========================= */

export {
  gatewayUrl,
  publicClient
}

import axios from 'axios'
import router from '@/router'

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
  reject: (err: any) => void
}> = []

/* =========================
   PROCESS QUEUE
========================= */

const processQueue = (
  error: any = null
) => {

  pendingRequests.forEach(p => {

    if (error) {

      p.reject(error)

    } else {

      p.resolve()
    }
  })

  pendingRequests = []
}

/* =========================
   RESPONSE INTERCEPTOR
========================= */

gatewayUrl.interceptors.response.use(
  response => response,

  async error => {

    const originalRequest = error.config

    /* =========================
       NETWORK ERROR
    ========================= */

    if (!error.response) {

      return Promise.reject(error)
    }

    const status = error.response.status

    const url =
      originalRequest?.url || ''

    /* =========================
       IGNORE LOGIN API
    ========================= */

    if (
      url.includes('/api/auth/login')
    ) {

      return Promise.reject(error)
    }

    /* =========================
       REFRESH TOKEN FAILED
    ========================= */

    if (
      url.includes('/api/auth/refresh')
    ) {

      localStorage.clear()
      sessionStorage.clear()

      if (
        router.currentRoute.value.path
        !== '/login'
      ) {

        await router.replace('/login')
      }

      return Promise.reject(error)
    }

    /* =========================
       HANDLE 401
    ========================= */

    if (
      status === 401 &&
      !originalRequest._retry
    ) {

      /* =========================
         WAIT REFRESH
      ========================= */

      if (isRefreshing) {

        return new Promise(
          (resolve, reject) => {

            pendingRequests.push({

              resolve: () => {

                resolve(
                  gatewayUrl(
                    originalRequest
                  )
                )
              },

              reject
            })
          }
        )
      }

      originalRequest._retry = true

      isRefreshing = true

      try {

        /* =========================
           REFRESH TOKEN
        ========================= */

        await publicClient.post(
          '/api/auth/refresh'
        )

        processQueue()

        /* =========================
           RETRY ORIGINAL REQUEST
        ========================= */

        return gatewayUrl(
          originalRequest
        )

      } catch (refreshError) {

        processQueue(refreshError)

        localStorage.clear()
        sessionStorage.clear()

        if (
          router.currentRoute.value.path
          !== '/login'
        ) {

          await router.replace('/login')
        }

        return Promise.reject(
          refreshError
        )

      } finally {

        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export {
  gatewayUrl,
  publicClient
}

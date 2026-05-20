import axios from 'axios'
import router from "@/router"

const gatewayUrl = axios.create({
  baseURL: 'http://localhost:8082',
  withCredentials: true
})

let isRefreshing = false

let pendingRequests: any[] = []

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

gatewayUrl.interceptors.response.use(
  res => res,

  async (error) => {

    const originalRequest =
      error.config

    if (!error.response) {
      return Promise.reject(error)
    }

    const status =
      error.response.status

    const url =
      originalRequest.url || ''

    /* =========================
       REFRESH TOKEN FAIL
    ========================= */

    if (
      url.includes('/api/auth/refresh') &&
      status === 401
    ) {

      localStorage.clear()

      await router.push('/login')

      return Promise.reject(error)
    }

    /* =========================
       IGNORE LOGIN API
    ========================= */

    if (
      url.includes('/api/auth/login')
    ) {
      return Promise.reject(error)
    }

    /* =========================
       HANDLE ACCESS TOKEN EXPIRE
    ========================= */

    if (
      status === 401 &&
      !originalRequest._retry
    ) {

      if (isRefreshing) {

        return new Promise(
          (resolve, reject) => {

            pendingRequests.push({
              resolve: () =>
                resolve(
                  gatewayUrl(
                    originalRequest
                  )
                ),
              reject
            })
          }
        )
      }

      originalRequest._retry = true

      isRefreshing = true

      try {

        await gatewayUrl.post(
          '/api/auth/refresh'
        )

        processQueue()

        return gatewayUrl(
          originalRequest
        )

      } catch (err) {

        processQueue(err)

        localStorage.clear()

        await router.push('/login')

        return Promise.reject(err)

      } finally {

        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default gatewayUrl

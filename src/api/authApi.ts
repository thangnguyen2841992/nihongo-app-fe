import axios from 'axios'
import router from "@/router";

const gatewayUrl = axios.create({
  baseURL: 'http://localhost:8082',
  withCredentials: true
})

let isRefreshing = false
let pendingRequests: any[] = []

const processQueue = (error: any = null, token: string | null = null) => {
  pendingRequests.forEach(p => {
    if (error) {
      p.reject(error)
    } else {
      p.resolve(token)
    }
  })
  pendingRequests = []
}

gatewayUrl.interceptors.response.use(
  res => res,

  async (error) => {

    const originalRequest = error.config

    if (!error.response) {
      return Promise.reject(error)
    }

    const url = originalRequest.url || ''

    // ✅ bỏ qua auth APIs
    if (url.includes('/api/auth')) {
      return Promise.reject(error)
    }

    if (
      error.response.status === 401 &&
      !originalRequest._retry
    ) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {

          pendingRequests.push({
            resolve: () => resolve(gatewayUrl(originalRequest)),
            reject
          })

        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {

        await gatewayUrl.post('/api/auth/refresh')

        processQueue(null)

        return gatewayUrl(originalRequest)

      } catch (err) {

        processQueue(err)

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

import axios from 'axios'

const gatewayUrl = axios.create({
  baseURL: 'http://localhost:8082', // gateway
  withCredentials: true
})

// ================= INTERCEPTOR Ở ĐÂY =================
let isRefreshing = false
let pendingRequests: any[] = []

const processQueue = (error: any = null) => {
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
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {

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

        processQueue()

        return gatewayUrl(originalRequest)

      } catch (err) {
        processQueue(err)

        window.location.href = '/login'
        return Promise.reject(err)

      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
// ====================================================

export default gatewayUrl

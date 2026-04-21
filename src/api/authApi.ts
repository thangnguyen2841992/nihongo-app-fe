import axios from 'axios'

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

    // ❗ nếu refresh fail → logout
    if (originalRequest.url.includes('/api/auth/refresh')) {
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (error.response.status === 401 && !originalRequest._retry) {

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
        // 🔥 chỉ cần gọi refresh → cookie tự gửi
        await gatewayUrl.post('/api/auth/refresh')

        processQueue(null)

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

export default gatewayUrl

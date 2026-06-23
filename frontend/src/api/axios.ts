import axios from 'axios'

const api = axios.create({
  baseURL: ''
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token as string)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const storedRefresh = localStorage.getItem('refreshToken')
    if (!storedRefresh) {
      redirectToLogin()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const res = await axios.post<{ accessToken: string }>('/api/v1/auth/refresh', {
        refreshToken: storedRefresh
      })
      const newToken = res.data.accessToken
      localStorage.setItem('accessToken', newToken)

      const { useAuthStore } = await import('../stores/auth')
      const authStore = useAuthStore()
      authStore.setAccessToken(newToken)

      api.defaults.headers.common.Authorization = `Bearer ${newToken}`
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      processQueue(null, newToken)
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

function redirectToLogin() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export default api

import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — chỉ redirect khi token hết hạn, không áp dụng cho /auth/* endpoints
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

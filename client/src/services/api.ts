import axios, { AxiosHeaders } from 'axios'
import { useAuthStore } from '@/stores/authStore'

declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressAuthRedirect?: boolean
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
  withCredentials: true,
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  const headers = AxiosHeaders.from(config.headers)
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  config.headers = headers
  return config
})

// Handle 401 globally — chỉ redirect khi token hết hạn, không áp dụng cho /auth/* endpoints
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/')
    const suppressRedirect = err.config?.suppressAuthRedirect === true
    if (err.response?.status === 401 && !isAuthEndpoint && !suppressRedirect) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

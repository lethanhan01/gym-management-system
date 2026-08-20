import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore, type AuthUser } from '@/stores/authStore'
import { initLiff, isLiffMockEnabled, liff } from '@/lib/liff'

import { getCleanLiffRedirectUri } from '@/pages/liff/liff-redirect'

declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressAuthRedirect?: boolean
    _retry?: boolean
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

export function isLineSession(): boolean {
  const provider = useAuthStore.getState().authProvider
  if (provider === 'line') return true
  if (isLiffMockEnabled) return true
  if (typeof navigator !== 'undefined' && /Line\//i.test(navigator.userAgent)) return true
  try {
    if (typeof liff !== 'undefined' && typeof liff.isInClient === 'function' && liff.isInClient()) {
      return true
    }
  } catch {
    // Ignore error if liff is not yet initialized
  }
  return false
}

let refreshPromise: Promise<string> | null = null

async function executeSilentLineRefresh(): Promise<string> {
  const liffInstance = await initLiff()
  if (!liffInstance.isLoggedIn()) {
    throw new Error('LIFF not logged in')
  }

  // Check ID token expiration (with 30s safety buffer)
  const decoded = liffInstance.getDecodedIDToken()
  if (decoded && typeof decoded.exp === 'number') {
    const expMs = decoded.exp * 1000
    if (expMs - 30_000 <= Date.now()) {
      liffInstance.logout()
      liffInstance.login({ redirectUri: getCleanLiffRedirectUri(window.location.href) })
      throw new Error('Refreshing LIFF ID token session')
    }
  }

  const idToken = liffInstance.getIDToken()
  if (!idToken) throw new Error('Missing LINE ID token')

  const baseUrl = import.meta.env.VITE_API_URL || '/api/v1'
  const res = await axios.post<{
    success: boolean
    data: { accessToken: string; user: AuthUser }
  }>(
    `${baseUrl}/auth/line-login`,
    { idToken },
    { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
  )

  const { accessToken, user } = res.data.data
  useAuthStore.getState().setAuth(user, accessToken, 'line')
  return accessToken
}

// Handle 401 globally with Transparent Request Replay for LINE/LIFF sessions
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const url: string = config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/')
    const suppressRedirect = config?.suppressAuthRedirect === true

    if (err.response?.status === 401 && !isAuthEndpoint && !suppressRedirect && config) {
      // 1. Nếu không phải phiên LINE/LIFF -> chuyển hướng trang login thông thường
      if (!isLineSession()) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(err)
      }

      // 2. Nếu đã thử retry 1 lần mà vẫn 401 -> dừng lại, tránh vòng lặp vô hạn
      if (config._retry) {
        useAuthStore.getState().clearAuth()
        const currentPath = window.location.pathname + window.location.search
        if (currentPath.startsWith('/liff')) {
          return Promise.reject(err)
        }
        window.location.href = `/liff?redirect=${encodeURIComponent(currentPath)}`
        return Promise.reject(err)
      }

      config._retry = true

      // 3. Thực hiện Silent Refresh có Mutex Queue
      if (!refreshPromise) {
        refreshPromise = executeSilentLineRefresh().finally(() => {
          refreshPromise = null
        })
      }

      try {
        const newToken = await refreshPromise
        const headers = AxiosHeaders.from(config.headers)
        headers.set('Authorization', `Bearer ${newToken}`)
        config.headers = headers
        return api.request(config)
      } catch (refreshErr) {
        useAuthStore.getState().clearAuth()
        const currentPath = window.location.pathname + window.location.search
        if (currentPath.startsWith('/liff')) {
          return Promise.reject(refreshErr)
        }
        const redirect = currentPath.startsWith('/login') ? '/member' : currentPath
        window.location.href = `/liff?redirect=${encodeURIComponent(redirect)}`
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(err)
  }
)

export default api

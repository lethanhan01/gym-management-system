import axios from 'axios'
import i18n from './i18n'

interface ApiErrorPayload {
  code?: string
  message?: string | string[]
}

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('Network Error') ||
    !error.response ||
    (typeof error.response?.status === 'number' && [502, 503, 504].includes(error.response.status))
  )
}

export function getApiError(error: unknown, fallback?: string): string {
  const defaultFallback = fallback ?? i18n.t('error.unknown', { ns: 'common' })
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return error instanceof Error ? error.message : defaultFallback
  }

  if (isNetworkError(error) && !error.response?.data?.message && !error.response?.data?.code) {
    return fallback ?? i18n.t('error.network', { ns: 'common' })
  }

  const payload = error.response?.data
  if (payload?.code && i18n.exists(`error.api.${payload.code}`, { ns: 'common' })) {
    return i18n.t(`error.api.${payload.code}`, payload.code, { ns: 'common' })
  }

  if (fallback) return fallback

  const message = payload?.message
  if (Array.isArray(message)) return message.join(', ')
  if (message) return message
  return defaultFallback
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return undefined
  return error.response?.data?.code
}

export function isApiConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409
}

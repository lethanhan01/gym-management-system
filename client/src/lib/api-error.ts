import axios from 'axios'
import i18n from './i18n'

interface ApiErrorPayload {
  code?: string
  message?: string | string[]
}

export function getApiError(error: unknown, fallback?: string): string {
  const defaultFallback = fallback ?? i18n.t('error.unknown', { ns: 'common' })
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return error instanceof Error ? error.message : defaultFallback
  }
  const payload = error.response?.data
  if (payload?.code && i18n.exists(`error.api.${payload.code}`, { ns: 'common' })) {
    return i18n.t(`error.api.${payload.code}` as any, { ns: 'common' })
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

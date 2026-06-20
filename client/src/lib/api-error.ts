import axios from 'axios'

interface ApiErrorPayload {
  code?: string
  message?: string | string[]
}

export function getApiError(error: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return error instanceof Error ? error.message : fallback
  }
  const payload = error.response?.data
  const message = payload?.message
  if (Array.isArray(message)) return message.join(', ')
  if (message) return message
  return fallback
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return undefined
  return error.response?.data?.code
}

export function isApiConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409
}

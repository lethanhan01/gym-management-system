import api from './api'

export interface AttendanceLog {
  attendanceId: string
  memberId: string
  memberCode: string
  memberName: string
  subscriptionId: string
  sessionId: string | null
  startTime: string
  endTime: string | null
  method: 'realtime' | 'manual' | 'qr'
}

export interface QrTokenResponse {
  token: string
  payload: { version: 'v1'; date: string }
  validDate: string
  expiresAt: string
}

function monthQuery(params: {
  memberId?: string
  sessionId?: string
  method?: string
  from?: string
  to?: string
  month?: string
  page?: number
  pageSize?: number
}) {
  const { month, ...rest } = params
  const query: Record<string, unknown> = { ...rest }

  if (month) {
    const [yearStr, monthStr] = month.split('-')
    const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate()
    query.from = `${yearStr}-${monthStr}-01`
    query.to = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`
  }

  return query
}

export const attendanceService = {
  getAttendance: async (params: {
    memberId?: string
    sessionId?: string
    method?: string
    from?: string
    to?: string
    month?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: AttendanceLog[]; total: number }> => {
    const res = await api.get<{
      success: boolean
      data: AttendanceLog[]
      meta?: { totalItems: number }
    }>('/attendance-logs', { params: monthQuery(params) })
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
    }
  },

  manualCheckin: async (data: {
    memberCode: string
    occurredAt: string
  }): Promise<AttendanceLog> => {
    const res = await api.post<{ success: boolean; data: AttendanceLog }>(
      '/attendance/manual-checkin',
      data
    )
    return res.data.data
  },

  getQrToken: async (): Promise<QrTokenResponse> => {
    const res = await api.get<{ success: boolean; data: QrTokenResponse }>('/attendance/qr-token')
    return res.data.data
  },

  qrCheckin: async (token: string): Promise<AttendanceLog> => {
    const res = await api.post<{ success: boolean; data: AttendanceLog }>(
      '/attendance/qr-checkin',
      { token }
    )
    return res.data.data
  },

  checkout: async (attendanceId: string, endedAt: string): Promise<AttendanceLog> => {
    const res = await api.patch<{ success: boolean; data: AttendanceLog }>(
      `/attendance-logs/${attendanceId}/checkout`,
      { endedAt }
    )
    return res.data.data
  },
}
